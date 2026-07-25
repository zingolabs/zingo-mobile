/* eslint-disable react-native/no-inline-styles */
import React, { useCallback, useContext, useState } from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import { useFocusEffect, useTheme } from '@react-navigation/native';

import { ContextAppLoaded } from '../../../app/context';
import { ThemeType } from '../../../app/types';
import Utils from '../../../app/utils';
import { RouteEnum } from '../../../app/AppState';
import { migrationStatus, reconcileMigration } from '../../../app/walletBackend';
import {
  RPCMigrationStatusType,
  RPCBroadcastWindowType,
} from '../../../app/walletBackend/types/RPCMigrationStatusType';

const ZATS_PER_ZEC = 10 ** 8;

type IronwoodMigrationBannerProps = {
  // Orchard balance still sitting in the pool, in ZEC.
  amount: number;
  currencyName: string;
  onStart: () => void;
  // Deep-link back into the in-flight private migration, at whichever screen
  // its phase needs next.
  onResume: (
    route: RouteEnum.MigrationSplitting | RouteEnum.MigrationStatus,
  ) => void;
};

// Renders a translated string, coloring the `**…**`-wrapped spans with the
// warning accent so a single translation keeps its natural word order.
const HighlightedText: React.FunctionComponent<{
  text: string;
  color: string;
  highlight: string;
}> = ({ text, color, highlight }) => (
  <Text style={{ color, fontSize: 13, lineHeight: 19 }}>
    {text.split('**').map((part: string, i: number) =>
      i % 2 === 1 ? (
        <Text key={i} style={{ color: highlight, fontWeight: '700' }}>
          {part}
        </Text>
      ) : (
        <Text key={i}>{part}</Text>
      ),
    )}
  </Text>
);

/**
 * Persistent call-to-action on top of the History list. Two variants:
 *
 * - Default: warns that funds in the Orchard pool need to migrate to
 *   Ironwood (NU6.3); Start opens the "Meet Ironwood" onboarding.
 * - In flight: a private migration exists in the wallet file. Shows the
 *   remaining Orchard-pool figure (the ZIP 318 compliance figure — a unified
 *   balance alone is not compliant while migrating) plus part progress, and
 *   Continue deep-links to the phase's screen. This is also the rescue path
 *   after a kill: splitting resumes on the splitting screen, a scheduled
 *   migration opens its "underway" status monitor.
 */
const IronwoodMigrationBanner: React.FunctionComponent<
  IronwoodMigrationBannerProps
> = ({ amount, currencyName, onStart, onResume }) => {
  const context = useContext(ContextAppLoaded);
  const { translate, info } = context;
  const { colors } = useTheme() as ThemeType;

  const [migration, setMigration] = useState<RPCMigrationStatusType | null>(
    null,
  );

  // Re-check on every focus: the phase advances while the user is elsewhere
  // in the flow, and this banner is what routes them back correctly.
  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      (async () => {
        // Apply confirmations that landed since the last pass before reading.
        // migration_status reports persisted part state, and reconcile is what
        // promotes a mined batch out of Broadcast. Launch is the only other
        // place it runs, so without this a batch that confirms mid-session
        // reads as unsent until relaunch. Offline, a no-op with no migration.
        await reconcileMigration();
        if (cancelled) {
          return;
        }
        const statusResult = await migrationStatus();
        if (cancelled) {
          return;
        }
        if (!statusResult.ok) {
          return;
        }
        try {
          const parsed = JSON.parse(
            statusResult.value,
          ) as RPCMigrationStatusType;
          if (!parsed.error) {
            setMigration(parsed);
          }
        } catch {
          // Transient; keep whatever variant we last rendered.
        }
      })();
      return () => {
        cancelled = true;
      };
    }, []),
  );

  const phaseKind = migration?.phase?.kind;
  const inFlight =
    phaseKind === 'planned' ||
    phaseKind === 'note_splitting' ||
    phaseKind === 'parts_scheduled';

  // ----- In-flight variant -----
  if (inFlight && migration) {
    const splitting = phaseKind === 'note_splitting';
    const resumeRoute =
      phaseKind === 'parts_scheduled'
        ? RouteEnum.MigrationStatus
        : RouteEnum.MigrationSplitting;

    // Batches (windows) rather than raw parts: a batch counts as confirmed once
    // all its parts do (floor division), mirroring the MigrationStatus screen.
    const perBucket = Math.max(1, migration.per_bucket ?? 1);
    const batchesTotal = Math.max(
      1,
      Math.ceil(migration.parts_total / perBucket),
    );
    const batchesConfirmed = Math.min(
      batchesTotal,
      Math.floor(migration.parts_confirmed / perBucket),
    );

    // The segmented bar is a batch counter: one segment per batch, each lit
    // whole or not at all, so the percentage tracks confirmed batches rather
    // than value (which would half-fill a segment mid-confirmation).
    const pct = Math.round((batchesConfirmed / batchesTotal) * 100);

    const orchardLeftStr = `${Utils.parseNumberFloatToStringLocale(
      migration.orchard_confirmed_spendable / ZATS_PER_ZEC,
      4,
    )} ${currencyName}`;

    // A batch is ready to send exactly when the backend reports a due batch:
    // the window the chain is currently inside, which upcoming_windows cannot
    // carry. upcoming_windows stays the source for the "waiting N blocks"
    // countdown to the next scheduled window.
    const height = info?.latestBlock ?? 0;
    const wakes: RPCBroadcastWindowType[] = migration.upcoming_windows ?? [];
    const nextWake = wakes[0];
    const blocksUntil = nextWake ? Math.max(0, nextWake.boundary - height) : 0;
    const ready = migration.due_now != null;
    // A batch broadcast but not yet mined: sent, confirming on-chain. Its window
    // is gone from both due_now and upcoming_windows, so without this signal it would
    // read as the next batch still pending.
    const confirming = !splitting && !ready && migration.parts_broadcast > 0;

    // Status pill (dot + word): Splitting while notes split, Ready when a batch
    // can be sent now, Confirming while a sent batch mines, Pending while the
    // next window is still ahead.
    const statusKind = splitting
      ? 'splitting'
      : ready
        ? 'ready'
        : confirming
          ? 'confirming'
          : 'pending';
    const statusColor =
      statusKind === 'ready'
        ? colors.primary
        : statusKind === 'splitting' || statusKind === 'confirming'
          ? colors.syncing
          : colors.warning.primary;
    const statusLabel = translate(
      `ironwoodbanner.status-${statusKind}`,
    ) as string;

    // Next action: keep splitting, send the ready batch, or wait N blocks for
    // the next window. Amber (warning) while waiting, green (primary) to act.
    const nextActionText = splitting
      ? (translate('ironwoodbanner.next-splitting') as string)
      : ready
        ? (translate('ironwoodbanner.next-send-now') as string).replace(
            '{n}',
            String(batchesConfirmed + 1),
          )
        : confirming
          ? (translate('ironwoodbanner.next-confirming') as string).replace(
              '{n}',
              String(batchesConfirmed + 1),
            )
          : !nextWake
            ? (translate('ironwoodbanner.next-all-sent') as string)
            : (translate('ironwoodbanner.next-in-blocks') as string)
                .replace('{n}', String(batchesConfirmed + 1))
                .replace('{blocks}', String(blocksUntil));
    const nextActionActive = !splitting && (ready || !nextWake);
    const nextActionColor = confirming
      ? colors.syncing
      : nextActionActive
        ? colors.primary
        : colors.warning.primary;

    return (
      <View style={{ paddingHorizontal: 12, paddingTop: 6, paddingBottom: 12 }}>
        <TouchableOpacity
          testID="ironwoodbanner.resume"
          activeOpacity={0.85}
          onPress={() => onResume(resumeRoute)}
          style={{
            backgroundColor: colors.bottomSheetBackground,
            borderColor: colors.bottomSheetBorder,
            borderWidth: 1,
            borderRadius: 16,
            paddingHorizontal: 18,
            paddingVertical: 12,
          }}
        >
          {/* Header: title + Details link */}
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: 10,
            }}
          >
            <Text
              style={{
                color: colors.placeholder,
                fontSize: 14,
                fontWeight: '700',
              }}
            >
              {translate('ironwoodbanner.inflight-title') as string}
            </Text>
            <Text
              style={{
                color: colors.placeholder,
                fontSize: 12,
                textDecorationLine: 'underline',
              }}
            >
              {translate('ironwoodbanner.details') as string}
            </Text>
          </View>

          {/* Progress bar + percentage */}
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              marginBottom: 10,
            }}
          >
            <View style={{ flex: 1, flexDirection: 'row', marginRight: 14 }}>
              {Array.from({ length: batchesTotal }).map((_, i) => {
                // Whole-segment fill, never partial: solid for a confirmed
                // batch, the syncing accent for the one in flight, empty track
                // otherwise.
                const fillColor =
                  i < batchesConfirmed
                    ? colors.primary
                    : confirming && i === batchesConfirmed
                      ? colors.syncing
                      : null;
                return (
                  <View
                    key={i}
                    style={{
                      flex: 1,
                      height: 8,
                      borderRadius: 4,
                      backgroundColor: colors.bottomSheetBorder,
                      overflow: 'hidden',
                      marginRight: i < batchesTotal - 1 ? 3 : 0,
                    }}
                  >
                    {fillColor && (
                      <View
                        style={{
                          width: '100%',
                          height: '100%',
                          borderRadius: 4,
                          backgroundColor: fillColor,
                        }}
                      />
                    )}
                  </View>
                );
              })}
            </View>
            <Text
              style={{
                color: colors.primary,
                fontSize: 17,
                fontWeight: '800',
              }}
            >
              {pct}%
            </Text>
          </View>

          <View
            style={{
              height: 1,
              backgroundColor: colors.bottomSheetBorder,
              marginBottom: 10,
            }}
          />

          {/* Next action */}
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: 8,
            }}
          >
            <Text style={{ color: colors.placeholder, fontSize: 13 }}>
              {translate('ironwoodbanner.next-action-label') as string}
            </Text>
            <View
              style={{
                paddingHorizontal: 10,
                paddingVertical: 4,
                borderRadius: 12,
                backgroundColor: `${nextActionColor}22`,
                flexShrink: 1,
              }}
            >
              <Text
                style={{
                  color: nextActionColor,
                  fontSize: 12,
                  fontWeight: '700',
                }}
              >
                {nextActionText}
              </Text>
            </View>
          </View>

          {/* Status + amount left */}
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <View
                style={{
                  width: 10,
                  height: 10,
                  borderRadius: 5,
                  backgroundColor: statusColor,
                  marginRight: 8,
                }}
              />
              <Text
                style={{ color: colors.text, fontSize: 14, fontWeight: '700' }}
              >
                {statusLabel}
              </Text>
            </View>
            <Text style={{ color: colors.text, fontSize: 14 }}>
              {orchardLeftStr}
            </Text>
          </View>
        </TouchableOpacity>
      </View>
    );
  }

  // ----- Default variant -----
  const amountStr = `${Utils.parseNumberFloatToStringLocale(
    amount,
    4,
  )} ${currencyName}`;
  const warning = (translate('ironwoodbanner.warning') as string).replace(
    '{amount}',
    amountStr,
  );

  return (
    <View style={{ paddingHorizontal: 12, paddingTop: 8, paddingBottom: 18 }}>
      {/* Warning strip */}
      <View
        style={{
          backgroundColor: '#1A1200',
          borderColor: '#3D2A00',
          borderWidth: 1,
          borderRadius: 10,
          paddingHorizontal: 14,
          paddingVertical: 12,
          marginBottom: 10,
        }}
      >
        <HighlightedText
          text={warning}
          color={colors.placeholder}
          highlight={colors.warning.primary}
        />
      </View>

      {/* Orchard "at risk" card with the Start action */}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          backgroundColor: colors.bottomSheetBackground,
          borderColor: colors.bottomSheetBorder,
          borderWidth: 1,
          borderRadius: 12,
          paddingHorizontal: 16,
          paddingVertical: 14,
        }}
      >
        <View style={{ flex: 1, marginRight: 12 }}>
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              marginBottom: 6,
            }}
          >
            <View
              style={{
                width: 9,
                height: 9,
                borderRadius: 5,
                backgroundColor: colors.warning.primary,
                marginRight: 8,
              }}
            />
            <Text
              style={{ color: colors.text, fontSize: 15, fontWeight: '700' }}
            >
              {translate('ironwoodbanner.pool') as string}
            </Text>
            <View
              style={{
                marginLeft: 8,
                paddingHorizontal: 8,
                paddingVertical: 2,
                borderRadius: 6,
                backgroundColor: 'rgba(249, 157, 0, 0.15)',
              }}
            >
              <Text style={{ color: colors.warning.primary, fontSize: 12 }}>
                {translate('ironwoodbanner.at-risk') as string}
              </Text>
            </View>
          </View>
          <Text style={{ color: colors.placeholder, fontSize: 13 }}>
            {translate('ironwoodbanner.balance') as string}{' '}
            <Text style={{ color: colors.text, fontWeight: '700' }}>
              {Utils.parseNumberFloatToStringLocale(amount, 4)}
            </Text>{' '}
            {currencyName}
          </Text>
        </View>

        <TouchableOpacity
          testID="ironwoodbanner.start"
          onPress={onStart}
          activeOpacity={0.8}
          style={{
            backgroundColor: colors.primary,
            borderRadius: 24,
            paddingHorizontal: 22,
            paddingVertical: 10,
          }}
        >
          <Text
            style={{
              color: colors.background,
              fontSize: 15,
              fontWeight: '700',
            }}
          >
            {translate('ironwoodbanner.start') as string}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

export default IronwoodMigrationBanner;
