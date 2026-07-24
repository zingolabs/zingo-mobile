/* eslint-disable react-native/no-inline-styles */
import React, { useCallback, useContext, useState } from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import { useFocusEffect, useTheme } from '@react-navigation/native';

import { ContextAppLoaded } from '../../../app/context';
import { ThemeType } from '../../../app/types';
import Utils from '../../../app/utils';
import { RouteEnum } from '../../../app/AppState';
import { migrationStatus } from '../../../app/walletBackend';
import {
  RPCMigrationStatusType,
  RPCWakePointType,
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

    // The ZIP 318 schedule draws each part its own window, so progress counts
    // parts directly, mirroring the MigrationStatus screen.
    const batchesTotal = Math.max(1, migration.parts_total);
    const batchesConfirmed = Math.min(
      batchesTotal,
      migration.parts_confirmed,
    );

    // Value-migrated drives the bar, matching the MigrationStatus screen's
    // canonical progress figure.
    const pct =
      migration.value_total > 0
        ? Math.round((migration.value_migrated / migration.value_total) * 100)
        : 0;

    const orchardLeftStr = `${Utils.parseNumberFloatToStringLocale(
      migration.orchard_confirmed_spendable / ZATS_PER_ZEC,
      4,
    )} ${currencyName}`;

    // A batch is ready to send exactly when the backend reports a due batch:
    // the window the chain is currently inside, which next_wakes cannot carry.
    // next_wakes stays the source for the "waiting N blocks" countdown to the
    // next scheduled window.
    const height = info?.latestBlock ?? 0;
    const wakes: RPCWakePointType[] = migration.next_wakes ?? [];
    const nextWake = wakes[0];
    const blocksUntil = nextWake ? Math.max(0, nextWake.boundary - height) : 0;
    const ready = migration.due_now != null;

    // Status pill (dot + word): Splitting while notes split, Ready when a batch
    // can be sent now, Pending while the next window is still ahead.
    const statusKind = splitting
      ? 'splitting'
      : ready
        ? 'ready'
        : 'pending';
    const statusColor =
      statusKind === 'ready'
        ? colors.primary
        : statusKind === 'splitting'
          ? colors.syncing
          : colors.warning.primary;
    const statusLabel = translate(
      `ironwoodbanner.status-${statusKind}`,
    ) as string;

    const batchesValue = (translate('ironwoodbanner.batches-value') as string)
      .replace('{confirmed}', String(batchesConfirmed))
      .replace('{total}', String(batchesTotal));

    // Next action: keep splitting, send the ready batch, or wait N blocks for
    // the next window. Amber (warning) while waiting, green (primary) to act.
    const nextActionText = splitting
      ? (translate('ironwoodbanner.next-splitting') as string)
      : ready
        ? (translate('ironwoodbanner.next-send-now') as string).replace(
            '{n}',
            String(batchesConfirmed + 1),
          )
        : !nextWake
          ? (translate('ironwoodbanner.next-all-sent') as string)
          : (translate('ironwoodbanner.next-in-blocks') as string)
              .replace('{n}', String(batchesConfirmed + 1))
              .replace('{blocks}', String(blocksUntil));
    const nextActionActive = !splitting && (ready || !nextWake);
    const nextActionColor = nextActionActive
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
            <View
              style={{
                flex: 1,
                height: 8,
                borderRadius: 4,
                backgroundColor: colors.bottomSheetBorder,
                overflow: 'hidden',
                marginRight: 14,
              }}
            >
              <View
                style={{
                  width: `${pct}%`,
                  height: '100%',
                  borderRadius: 4,
                  backgroundColor: colors.primary,
                }}
              />
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

          {/* Batches */}
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: 8,
            }}
          >
            <Text style={{ color: colors.placeholder, fontSize: 13 }}>
              {translate('ironwoodbanner.batches-label') as string}
            </Text>
            <Text
              style={{ color: colors.text, fontSize: 14, fontWeight: '700' }}
            >
              {batchesValue}
            </Text>
          </View>

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
