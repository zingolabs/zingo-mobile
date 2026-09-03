/* eslint-disable react-native/no-inline-styles */
import React, { useCallback, useContext, useRef, useState } from 'react';
import { ActivityIndicator, ScrollView, Text, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useTheme } from '@app/theme';
import { NativeStackScreenProps } from '@react-navigation/native-stack';

import BoldText from '@ui/primitives/BoldText';
import Button from '@ui/primitives/Button';
import SegmentedBar from '@ui/primitives/SegmentedBar';
import StepperHeader from '@ui/widgets/StepperHeader';
import { AppDrawerParamList } from '@app/types';
import { ContextAppLoaded } from '@app/context';
import Utils from '@app/utils/Utils';
import {
  ButtonTypeEnum,
  RouteEnum,
  TARGET_BLOCK_SPACING_SECONDS,
} from '@app/AppState';
import {
  cancelIronwoodMigration,
  migrationStatus,
  reconcileMigration,
} from '@app/walletBackend';
import {
  RPCMigrationStatusType,
  RPCBroadcastWindowType,
} from '@app/walletBackend/types/RPCMigrationStatusType';

type MigrationStatusProps = NativeStackScreenProps<
  AppDrawerParamList,
  RouteEnum.MigrationStatus
>;

const ZATS_PER_ZEC = 10 ** 8;

const fmt = (zats: number): string =>
  `${parseFloat((zats / ZATS_PER_ZEC).toFixed(4))}`;

// The private path's "home" while a migration is in flight: the landing after
// the schedule is confirmed, and where the parts_scheduled banner resumes to.
// It only reads migrationStatus — nothing is broadcast here. Each window is a
// batch the user sends when its boundary opens; reminders never send for them.
const MigrationStatus: React.FunctionComponent<MigrationStatusProps> = ({
  navigation,
}) => {
  const context = useContext(ContextAppLoaded);
  const { translate, info, language } = context;
  const { colors } = useTheme();

  const [status, setStatus] = useState<RPCMigrationStatusType | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [clearing, setClearing] = useState<boolean>(false);
  // Whether a status has ever rendered, so a later failed read can be ignored.
  const rendered = useRef<boolean>(false);

  // A window opens at a block boundary, and `due_now` is what puts the Send
  // Batch button on screen. Reading only on focus left the user watching a
  // screen whose window had already opened, so the tip drives the refresh.
  const height = info?.latestBlock ?? 0;

  // Re-read on focus and on every new block: the phase advances while the user
  // watches (parts confirm, windows open), so a status screen must reflect the
  // live truth.
  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      (async () => {
        // A background refresh that fails leaves the last good render in
        // place. Only the first read has nothing to fall back to.
        const fail = (msg: string) => {
          if (!rendered.current) {
            setErrorMsg(msg);
          }
        };
        await reconcileMigration();
        if (cancelled) {
          return;
        }
        const statusResult = await migrationStatus();
        if (cancelled) {
          return;
        }
        if (!statusResult.ok) {
          fail(statusResult.error.message);
          setLoading(false);
          return;
        }
        try {
          const parsed = JSON.parse(
            statusResult.value,
          ) as RPCMigrationStatusType;
          if (parsed.error) {
            fail(parsed.error);
          } else {
            rendered.current = true;
            setStatus(parsed);
            setErrorMsg(null);
          }
        } catch (e) {
          fail(`${e}`);
        }
        setLoading(false);
      })();
      return () => {
        cancelled = true;
      };
      // `height` is a trigger, not a value the body reads: a new block is the
      // only thing that can open a window while this screen stays mounted.
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [height]),
  );

  const goHome = useCallback(() => {
    navigation.reset({ index: 0, routes: [{ name: RouteEnum.HomeStack }] });
  }, [navigation]);

  // Clearing the migration frees the wallet to plan again from the notes it
  // actually holds. Confirmed parts stand; a stalled migration has none.
  const onStartOver = useCallback(async () => {
    setClearing(true);
    const cancelled = await cancelIronwoodMigration();
    setClearing(false);
    if (cancelled.ok) {
      goHome();
    } else {
      setErrorMsg(cancelled.error.message);
    }
  }, [goHome]);

  // ----- Loading / error -----
  if (loading || errorMsg) {
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: colors.bgCanvas,
          alignItems: 'center',
          justifyContent: 'center',
          padding: 24,
        }}
      >
        {loading ? (
          <ActivityIndicator size="large" color={colors.fgAccent} />
        ) : (
          <Text
            style={{
              color: colors.fgMuted,
              fontSize: 14,
              textAlign: 'center',
            }}
          >
            {errorMsg}
          </Text>
        )}
      </View>
    );
  }

  const wakes: RPCBroadcastWindowType[] = status?.upcoming_windows ?? [];
  // per_bucket is parts-per-window; a batch counts as confirmed once all of its
  // parts confirm (floor division), so partial windows don't over-report.
  const perBucket = Math.max(1, status?.per_bucket ?? 1);
  const partsTotal = status?.parts_total ?? 0;
  const partsConfirmed = status?.parts_confirmed ?? 0;
  const bucketModulus = status?.bucket_modulus ?? 144;

  const batchesTotal = Math.max(1, Math.ceil(partsTotal / perBucket));
  const batchesConfirmed = Math.min(
    batchesTotal,
    Math.floor(partsConfirmed / perBucket),
  );

  // The bar counts notes, not batches: a cadence that fits every note into one
  // window would otherwise draw a single undivided block. The batch cards below
  // are where the windows are enumerated.
  const notesTotal = Math.max(1, partsTotal);
  const notesConfirmed = Math.min(notesTotal, partsConfirmed);
  const pct = Math.round((notesConfirmed / notesTotal) * 100);

  // A scheduled migration that bound no parts has nothing to send and no way
  // to gain any: every entry point refuses while it exists. Offer the one exit.
  if (status?.phase?.kind === 'parts_scheduled' && partsTotal === 0) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.bgCanvas }}>
        <StepperHeader splitDone={true} sendActive={true} />
        <View
          style={{
            flex: 1,
            alignItems: 'center',
            justifyContent: 'center',
            paddingHorizontal: 32,
          }}
        >
          <BoldText
            style={{ fontSize: 18, marginBottom: 10, textAlign: 'center' }}
          >
            {translate('migrationstatus.stalled-title') as string}
          </BoldText>
          <Text
            style={{
              color: colors.fgMuted,
              fontSize: 15,
              lineHeight: 22,
              textAlign: 'center',
            }}
          >
            {translate('migrationstatus.stalled-body') as string}
          </Text>
        </View>
        <View
          style={{
            flexDirection: 'row',
            justifyContent: 'space-evenly',
            alignItems: 'center',
            paddingBottom: 24,
            paddingHorizontal: 24,
          }}
        >
          <Button
            testID="migrationstatus.home"
            type={ButtonTypeEnum.Ghost}
            title={translate('migrationstatus.back') as string}
            onPress={goHome}
            twoButtons={true}
          />
          <Button
            testID="migrationstatus.start-over"
            type={ButtonTypeEnum.Primary}
            title={translate('migrationstatus.start-over') as string}
            onPress={onStartOver}
            disabled={clearing}
            twoButtons={true}
          />
        </View>
      </View>
    );
  }

  const nextWake = wakes[0];
  // The batch to send right now: the window the chain is currently inside,
  // reported by the backend. upcoming_windows lists only future windows and cannot
  // carry this one, so the Send action reads it from here. Null means a tap
  // would broadcast nothing, so the action stays hidden.
  const dueNow = status?.due_now ?? null;
  const confirming = !dueNow && (status?.parts_broadcast ?? 0) > 0;
  // The bar's broadcast run outlives `confirming`: a new window can open while
  // the batch still mines, which surfaces the dueNow card but changes nothing
  // about the parts in flight. Keyed to parts_broadcast alone, the run stays
  // lit until those parts confirm, and the confirm flash lands on lit segments
  // instead of blanks.
  const broadcasting = (status?.parts_broadcast ?? 0) > 0;

  // One card per visible batch: the open one (dueNow) first, then the upcoming
  // scheduled windows. Batch numbers continue from the confirmed count so
  // "Batch 3" means the same here as on the plan screen.
  const nextWakeBase = batchesConfirmed + (dueNow || confirming ? 2 : 1);
  const batchCards = [
    ...(dueNow
      ? [
          {
            key: 'due',
            n: batchesConfirmed + 1,
            denominations: dueNow.denominations,
            anchor: dueNow.boundary,
            open: true,
          },
        ]
      : []),
    ...wakes.map((wake, i) => ({
      key: `w${wake.bucket_index}`,
      n: nextWakeBase + i,
      denominations: wake.denominations,
      anchor: wake.boundary,
      open: false,
    })),
  ];

  // Notes, matching the bar directly above it. The cards below carry the batch
  // count, so nothing is lost by counting the finer unit here.
  const progressLine = (translate('migrationstatus.progress') as string)
    .replace('{confirmed}', String(notesConfirmed))
    .replace('{total}', String(notesTotal))
    .replace('{pct}', String(pct));

  // The info box: the "**…**"-wrapped boundary is emphasized, so one string
  // keeps its natural word order across locales.
  const nextLine = dueNow
    ? (translate('migrationstatus.next-open-now') as string).replace(
        '{n}',
        String(batchesConfirmed + 1),
      )
    : confirming
      ? (translate('migrationstatus.confirming') as string).replace(
          '{n}',
          String(batchesConfirmed + 1),
        )
      : nextWake
        ? (translate('migrationstatus.next-opens') as string)
            .replace(
              '{blocks}',
              String(Math.max(0, nextWake.boundary - height)),
            )
            .replace(
              '{time}',
              // The block count is exact; the wall-clock it covers is the
              // estimate, at the observed spacing when one has converged.
              Utils.formatDurationMs(
                Math.max(0, nextWake.boundary - height) *
                  (info?.secondsPerBlock ?? TARGET_BLOCK_SPACING_SECONDS) *
                  1000,
                language,
              ),
            )
        : (translate('migrationstatus.all-sent') as string);
  const remindersLine =
    wakes.length === 1
      ? (translate('migrationstatus.reminders-one') as string)
      : (translate('migrationstatus.reminders') as string).replace(
          '{n}',
          String(wakes.length),
        );

  return (
    <View style={{ flex: 1, backgroundColor: colors.bgCanvas }}>
      <StepperHeader splitDone={true} sendActive={true} />
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{
          paddingHorizontal: 20,
          paddingTop: 24,
          paddingBottom: 24,
        }}
      >
        <BoldText style={{ fontSize: 22, marginBottom: 14 }}>
          {translate('migrationstatus.title') as string}
        </BoldText>

        <View style={{ marginBottom: 10 }}>
          <SegmentedBar
            segments={notesTotal}
            progress={notesConfirmed / notesTotal}
            active={broadcasting ? notesConfirmed : undefined}
            activeSpan={status?.parts_broadcast ?? 0}
            activeColor={colors.fgSyncing}
          />
        </View>
        <Text
          style={{
            color: colors.fgMuted,
            fontSize: 15,
            marginBottom: 20,
          }}
        >
          {progressLine}
        </Text>

        {/* Next-batch info box */}
        <View
          style={{
            borderWidth: 1,
            borderColor: colors.bottomSheetBorder,
            backgroundColor: colors.bgSurface,
            borderRadius: 12,
            paddingHorizontal: 16,
            paddingVertical: 14,
            marginBottom: 20,
          }}
        >
          <Text style={{ color: colors.fgMuted, fontSize: 14, lineHeight: 21 }}>
            {nextLine.split('**').map((part: string, i: number) =>
              i % 2 === 1 ? (
                <Text
                  key={i}
                  style={{ color: colors.fgDefault, fontWeight: '700' }}
                >
                  {part}
                </Text>
              ) : (
                <Text key={i}>{part}</Text>
              ),
            )}
          </Text>
          {wakes.length > 0 && (
            <Text
              style={{
                color: colors.fgMuted,
                fontSize: 14,
                lineHeight: 21,
              }}
            >
              {remindersLine}
            </Text>
          )}
        </View>

        {/* One card per batch: the open one (dueNow) first, then upcoming. */}
        {batchCards.map(card => {
          const open = card.open;
          return (
            <View
              key={card.key}
              style={{
                borderWidth: 1,
                borderColor: colors.bottomSheetBorder,
                backgroundColor: colors.bgSurface,
                borderRadius: 14,
                padding: 16,
                marginBottom: 14,
              }}
            >
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginBottom: 12,
                }}
              >
                <Text
                  style={{
                    color: colors.fgDefault,
                    fontSize: 17,
                    fontWeight: '700',
                  }}
                >
                  {(translate('migrationstatus.batch') as string).replace(
                    '{n}',
                    String(card.n),
                  )}
                </Text>
                {/* SCHEDULED until the window opens, then OPEN in the accent. */}
                <View
                  style={{
                    borderWidth: 1,
                    borderColor: open
                      ? colors.borderAccent
                      : colors.bottomSheetBorder,
                    borderRadius: 20,
                    paddingHorizontal: 12,
                    paddingVertical: 4,
                  }}
                >
                  <Text
                    style={{
                      color: open ? colors.fgAccent : colors.fgMuted,
                      fontSize: 12,
                      fontWeight: '600',
                    }}
                  >
                    {open
                      ? (translate('migrationstatus.open') as string)
                      : (translate('migrationstatus.scheduled') as string)}
                  </Text>
                </View>
              </View>
              <View
                style={{
                  flexDirection: 'row',
                  flexWrap: 'wrap',
                  marginBottom: 12,
                }}
              >
                {card.denominations.map((denomination: number, d: number) => (
                  <View
                    key={d}
                    style={{
                      borderWidth: 1,
                      borderColor: colors.bottomSheetBorder,
                      borderRadius: 16,
                      paddingHorizontal: 12,
                      paddingVertical: 5,
                      marginRight: 8,
                      marginBottom: 8,
                    }}
                  >
                    <Text style={{ color: colors.fgDefault, fontSize: 14 }}>
                      {fmt(denomination)}
                    </Text>
                  </View>
                ))}
              </View>
              {/* Wall-clock is irrelevant here; the batch is gated by height. */}
              <Text
                style={{
                  color: colors.fgMuted,
                  fontSize: 12,
                  fontStyle: 'italic',
                }}
              >
                {(translate('migrationstatus.tech-line') as string)
                  .replace('{anchor}', String(card.anchor))
                  .replace('{sendby}', String(card.anchor + bucketModulus))}
              </Text>
            </View>
          );
        })}

        <Text
          style={{
            color: colors.fgMuted,
            fontSize: 14,
            lineHeight: 21,
            marginTop: 6,
          }}
        >
          {translate('migrationstatus.footer') as string}
        </Text>
      </ScrollView>

      {dueNow ? (
        // A batch is due: sending it is the primary action, Back is demoted.
        <View
          style={{
            flexDirection: 'row',
            justifyContent: 'space-evenly',
            alignItems: 'center',
            paddingTop: 24,
            paddingBottom: 24,
            paddingHorizontal: 24,
          }}
        >
          <Button
            testID="migrationstatus.home"
            type={ButtonTypeEnum.Ghost}
            title={translate('migrationstatus.back') as string}
            onPress={goHome}
            twoButtons={true}
          />
          <Button
            testID="migrationstatus.send"
            type={ButtonTypeEnum.Primary}
            title={translate('migrationstatus.send') as string}
            onPress={() =>
              navigation.navigate(RouteEnum.MigrationBatchSending, {
                denominations: dueNow.denominations,
              })
            }
            twoButtons={true}
          />
        </View>
      ) : (
        <View
          style={{
            paddingTop: 24,
            paddingBottom: 24,
            paddingHorizontal: 24,
            alignItems: 'center',
          }}
        >
          <Button
            testID="migrationstatus.home"
            type={ButtonTypeEnum.Primary}
            title={translate('migrationstatus.back') as string}
            onPress={goHome}
          />
        </View>
      )}
    </View>
  );
};

export default MigrationStatus;
