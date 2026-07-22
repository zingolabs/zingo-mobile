/* eslint-disable react-native/no-inline-styles */
import React, { useCallback, useContext, useState } from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import { useFocusEffect, useTheme } from '@react-navigation/native';

import { ContextAppLoaded } from '../../../app/context';
import { ThemeType } from '../../../app/types';
import Utils from '../../../app/utils';
import { GlobalConst, RouteEnum } from '../../../app/AppState';
import { migrationStatus } from '../../../app/walletBackend';
import { RPCMigrationStatusType } from '../../../app/walletBackend/types/RPCMigrationStatusType';

type IronwoodMigrationBannerProps = {
  // Orchard balance still sitting in the pool, in ZEC.
  amount: number;
  currencyName: string;
  onStart: () => void;
  // Deep-link back into the in-flight private migration, at whichever screen
  // its phase needs next.
  onResume: (
    route: RouteEnum.MigrationSplitting | RouteEnum.MigrationCadence,
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
 *   after a kill: splitting resumes on the splitting screen, an unchosen
 *   cadence re-offers the chooser.
 */
const IronwoodMigrationBanner: React.FunctionComponent<
  IronwoodMigrationBannerProps
> = ({ amount, currencyName, onStart, onResume }) => {
  const context = useContext(ContextAppLoaded);
  const { translate } = context;
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
        const statusStr = await migrationStatus();
        if (cancelled) {
          return;
        }
        if (statusStr.toLowerCase().startsWith(GlobalConst.error)) {
          return;
        }
        try {
          const parsed = JSON.parse(statusStr) as RPCMigrationStatusType;
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
    const resumeRoute =
      phaseKind === 'parts_scheduled'
        ? RouteEnum.MigrationCadence
        : RouteEnum.MigrationSplitting;
    const orchardLeftStr = `${Utils.parseNumberFloatToStringLocale(
      migration.orchard_confirmed_spendable / 10 ** 8,
      4,
    )} ${currencyName}`;
    const progress = (translate('ironwoodbanner.inflight-progress') as string)
      .replace('{confirmed}', String(migration.parts_confirmed))
      .replace('{total}', String(migration.parts_total));

    return (
      <View style={{ paddingHorizontal: 12, paddingTop: 8, paddingBottom: 18 }}>
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
                  backgroundColor: colors.primary,
                  marginRight: 8,
                }}
              />
              <Text
                style={{ color: colors.text, fontSize: 15, fontWeight: '700' }}
              >
                {translate('ironwoodbanner.inflight-title') as string}
              </Text>
            </View>
            <Text style={{ color: colors.placeholder, fontSize: 13 }}>
              {phaseKind === 'parts_scheduled'
                ? progress
                : (translate('ironwoodbanner.inflight-splitting') as string)}
            </Text>
            <Text style={{ color: colors.placeholder, fontSize: 13 }}>
              {translate('ironwoodbanner.inflight-left') as string}{' '}
              <Text style={{ color: colors.text, fontWeight: '700' }}>
                {orchardLeftStr}
              </Text>
            </Text>
          </View>

          <TouchableOpacity
            testID="ironwoodbanner.resume"
            onPress={() => onResume(resumeRoute)}
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
              {translate('ironwoodbanner.continue') as string}
            </Text>
          </TouchableOpacity>
        </View>
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
