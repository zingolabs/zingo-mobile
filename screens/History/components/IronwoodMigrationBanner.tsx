/* eslint-disable react-native/no-inline-styles */
import React, { useCallback, useContext, useState } from 'react';
import { Pressable, Text, View, ViewStyle } from 'react-native';
import Animated, {
  Easing,
  FadeIn,
  FadeOut,
  LinearTransition,
  ReduceMotion,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { useFocusEffect } from '@react-navigation/native';
import { useTheme } from '@app/theme';

import SegmentedBar from '@ui/primitives/SegmentedBar';
import { ContextAppLoaded } from '@app/context';
import Utils from '@app/utils';
import { RouteEnum } from '@app/AppState';
import {
  migrationStatus,
  reconcileMigration,
} from '@app/walletBackend';
import {
  RPCMigrationStatusType,
  RPCBroadcastWindowType,
} from '@app/walletBackend/types/RPCMigrationStatusType';

const ZATS_PER_ZEC = 10 ** 8;

const PRESS_SCALE = 0.97;
const PRESS_MS = 160;
const STATUS_FADE_MS = 200;

// Colour and opacity are what reduced motion keeps, so the fades run either
// way. The height change between the two variants is movement, and does not.
const bannerLayout = () =>
  LinearTransition.duration(260).reduceMotion(ReduceMotion.System);
const bannerExit = () => FadeOut.duration(140).reduceMotion(ReduceMotion.Never);
const variantEnter = () =>
  FadeIn.duration(200).reduceMotion(ReduceMotion.Never);

// Press feedback for the two cards. Scale reads as a push on a target this
// large, where a wash of opacity reads as the card dimming for its own reasons.
const PressScale: React.FunctionComponent<{
  testID: string;
  onPress: () => void;
  style: ViewStyle;
  children: React.ReactNode;
}> = ({ testID, onPress, style, children }) => {
  const pressed = useSharedValue(0);
  const press = useAnimatedStyle(() => ({
    transform: [
      {
        scale: withTiming(1 - pressed.value * (1 - PRESS_SCALE), {
          duration: PRESS_MS,
          easing: Easing.out(Easing.cubic),
          reduceMotion: ReduceMotion.System,
        }),
      },
    ],
  }));
  return (
    <Pressable
      testID={testID}
      onPress={onPress}
      onPressIn={() => {
        pressed.value = 1;
      }}
      onPressOut={() => {
        pressed.value = 0;
      }}
    >
      <Animated.View style={[style, press]}>{children}</Animated.View>
    </Pressable>
  );
};

// The dot and the pill are the only signal that the phase moved on, and the
// phase moves a handful of times across a whole migration. Cutting the colour
// reads as a re-render; fading it reads as the state changing.
const StatusDot: React.FunctionComponent<{ color: string; size: number }> = ({
  color,
  size,
}) => {
  const tint = useAnimatedStyle(() => ({
    backgroundColor: withTiming(color, {
      duration: STATUS_FADE_MS,
      reduceMotion: ReduceMotion.Never,
    }),
  }));
  return (
    <Animated.View
      style={[
        { width: size, height: size, borderRadius: size / 2, marginRight: 8 },
        tint,
      ]}
    />
  );
};

const StatusPill: React.FunctionComponent<{ color: string; label: string }> = ({
  color,
  label,
}) => {
  const tint = useAnimatedStyle(() => ({
    backgroundColor: withTiming(`${color}22`, {
      duration: STATUS_FADE_MS,
      reduceMotion: ReduceMotion.Never,
    }),
  }));
  const ink = useAnimatedStyle(() => ({
    color: withTiming(color, {
      duration: STATUS_FADE_MS,
      reduceMotion: ReduceMotion.Never,
    }),
  }));
  return (
    <Animated.View
      style={[
        {
          paddingHorizontal: 10,
          paddingVertical: 4,
          borderRadius: 12,
          flexShrink: 1,
        },
        tint,
      ]}
    >
      <Animated.Text style={[{ fontSize: 12, fontWeight: '700' }, ink]}>
        {label}
      </Animated.Text>
    </Animated.View>
  );
};

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
  const { colors } = useTheme();

  const [migration, setMigration] = useState<RPCMigrationStatusType | null>(
    null,
  );

  // A window opens at a block boundary, so `due_now` flips while the user sits
  // on History with nothing to re-trigger a read. Keying the refresh to the
  // chain tip is what catches it: focus alone left the countdown at zero and
  // the pill on Pending until the user navigated away and back.
  const height = info?.latestBlock ?? 0;

  // Re-check on focus and on every new block: the phase advances while the
  // user is elsewhere in the flow, and this banner is what routes them back
  // correctly.
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
      // `height` is a trigger, not a value the body reads: a new block is the
      // only thing that can open a window while this screen stays mounted.
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [height]),
  );

  const phaseKind = migration?.phase?.kind;
  const inFlight =
    phaseKind === 'planned' ||
    phaseKind === 'note_splitting' ||
    phaseKind === 'parts_scheduled';

  // ----- In-flight variant -----
  if (inFlight && migration) {
    const splitting = phaseKind === 'note_splitting';
    const scheduled = phaseKind === 'parts_scheduled';
    const resumeRoute = scheduled
      ? RouteEnum.MigrationStatus
      : RouteEnum.MigrationSplitting;

    // The bar counts notes, one segment each. Batches would be the coarser
    // unit, but a cadence that fits the whole plan into one window leaves a
    // single undivided block, and before the cadence is chosen per_bucket
    // carries zingolib's provisional k_max of 8 rather than anything the user
    // picked. parts_total is projected from the plan through Phase 1 and is the
    // bound count afterwards, so the segments hold their meaning throughout.
    const notesTotal = Math.max(1, migration.parts_total);
    const notesConfirmed = Math.min(notesTotal, migration.parts_confirmed);
    const pct = Math.round((notesConfirmed / notesTotal) * 100);

    // Batch numbering for the next-action line only. A batch counts as
    // confirmed once all its notes do (floor division), as on the status
    // screen, so "Batch 3" means the same in both places.
    const perBucket = scheduled ? Math.max(1, migration.per_bucket ?? 1) : 1;
    const batchesConfirmed = Math.floor(migration.parts_confirmed / perBucket);

    const orchardLeftStr = `${Utils.parseNumberFloatToStringLocale(
      migration.orchard_confirmed_spendable / ZATS_PER_ZEC,
      4,
    )} ${currencyName}`;

    // A batch is ready to send exactly when the backend reports a due batch:
    // the window the chain is currently inside, which upcoming_windows cannot
    // carry. upcoming_windows stays the source for the "waiting N blocks"
    // countdown to the next scheduled window.
    const wakes: RPCBroadcastWindowType[] = migration.upcoming_windows ?? [];
    const nextWake = wakes[0];
    const blocksUntil = nextWake ? Math.max(0, nextWake.boundary - height) : 0;
    const ready = migration.due_now != null;
    // A batch broadcast but not yet mined: sent, confirming on-chain. Its window
    // is gone from both due_now and upcoming_windows, so without this signal it would
    // read as the next batch still pending.
    const confirming = !splitting && !ready && migration.parts_broadcast > 0;
    // The bar's broadcast run outlives `confirming`: a new window can open
    // while the batch still mines, which flips the pill to Ready but changes
    // nothing about the parts in flight. Keyed to parts_broadcast alone, the
    // run stays lit until those parts confirm, and the confirm flash lands on
    // lit segments instead of blanks.
    const broadcasting = migration.parts_broadcast > 0;

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
        ? colors.fgAccent
        : statusKind === 'splitting' || statusKind === 'confirming'
          ? colors.fgSyncing
          : colors.fgWarning;
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
      ? colors.fgSyncing
      : nextActionActive
        ? colors.fgAccent
        : colors.fgWarning;

    return (
      <Animated.View
        style={{ paddingHorizontal: 12, paddingTop: 6, paddingBottom: 12 }}
        layout={bannerLayout()}
        exiting={bannerExit()}
      >
        {/* Keyed so the swap between variants remounts the card and fades it
            in, while the wrapper above persists and eases the height gap. */}
        <Animated.View key="inflight" entering={variantEnter()}>
          <PressScale
            testID="ironwoodbanner.resume"
            onPress={() => onResume(resumeRoute)}
            style={{
              backgroundColor: colors.bgSurface,
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
                  color: colors.fgMuted,
                  fontSize: 14,
                  fontWeight: '700',
                }}
              >
                {translate('ironwoodbanner.inflight-title') as string}
              </Text>
              <Text
                style={{
                  color: colors.fgMuted,
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
              <View style={{ flex: 1, marginRight: 14 }}>
                {/* Whole-segment fill, never partial: a note confirms at once.
                    The broadcast batch lights up ahead of the confirmed run. */}
                <SegmentedBar
                  segments={notesTotal}
                  progress={notesConfirmed / notesTotal}
                  active={broadcasting ? notesConfirmed : undefined}
                  activeSpan={migration.parts_broadcast}
                  activeColor={colors.fgSyncing}
                  height={8}
                />
              </View>
              <Text
                style={{
                  color: colors.fgAccent,
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
              <Text style={{ color: colors.fgMuted, fontSize: 13 }}>
                {translate('ironwoodbanner.next-action-label') as string}
              </Text>
              <StatusPill color={nextActionColor} label={nextActionText} />
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
                <StatusDot color={statusColor} size={10} />
                <Text
                  style={{
                    color: colors.fgDefault,
                    fontSize: 14,
                    fontWeight: '700',
                  }}
                >
                  {statusLabel}
                </Text>
              </View>
              <Text style={{ color: colors.fgDefault, fontSize: 14 }}>
                {orchardLeftStr}
              </Text>
            </View>
          </PressScale>
        </Animated.View>
      </Animated.View>
    );
  }

  // ----- Default variant -----
  return (
    <Animated.View
      style={{ paddingHorizontal: 12, paddingTop: 0, paddingBottom: 18 }}
      layout={bannerLayout()}
      exiting={bannerExit()}
    >
      <Animated.View key="default" entering={variantEnter()}>
        {/* Orchard pool card with the Start action */}
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            backgroundColor: colors.bgSurface,
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
                  backgroundColor: colors.fgWarning,
                  marginRight: 8,
                }}
              />
              <Text
                style={{ color: colors.fgDefault, fontSize: 15, fontWeight: '700' }}
              >
                {translate('ironwoodbanner.pool') as string}
              </Text>
            </View>
            <Text style={{ color: colors.fgMuted, fontSize: 13 }}>
              {translate('ironwoodbanner.balance') as string}{' '}
              <Text style={{ color: colors.fgDefault, fontWeight: '700' }}>
                {Utils.parseNumberFloatToStringLocale(amount, 4)}
              </Text>{' '}
              {currencyName}
            </Text>
          </View>

          <PressScale
            testID="ironwoodbanner.start"
            onPress={onStart}
            style={{
              backgroundColor: colors.bgAccent,
              borderRadius: 24,
              paddingHorizontal: 22,
              paddingVertical: 10,
            }}
          >
            <Text
              style={{
                color: colors.bgCanvas,
                fontSize: 15,
                fontWeight: '700',
              }}
            >
              {translate('ironwoodbanner.start') as string}
            </Text>
          </PressScale>
        </View>
      </Animated.View>
    </Animated.View>
  );
};

export default IronwoodMigrationBanner;
