/* eslint-disable react-native/no-inline-styles */
import React, {
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { ActivityIndicator, ScrollView, Text, View } from 'react-native';
import { useTheme } from '@app/theme';
import { NativeStackScreenProps } from '@react-navigation/native-stack';

import BoldText from '@ui/primitives/BoldText';
import Button from '@ui/primitives/Button';
import StepperHeader from '@ui/widgets/StepperHeader';
import { AppDrawerParamList } from '@app/types';
import { ContextAppLoaded } from '@app/context';
import {
  ButtonTypeEnum,
  RouteEnum,
  TARGET_BLOCK_SPACING_SECONDS,
  estimatedTimestampMs,
  windowTargetHeight,
} from '@app/AppState';
import Utils from '@app/utils';
import { migrationStatus } from '@app/walletBackend';
import {
  RPCMigrationStatusType,
  RPCBroadcastWindowType,
} from '@app/walletBackend/types/RPCMigrationStatusType';
import {
  armBatchReminders,
  requestReminderPermission,
} from '@app/notifications/reminders';

type MigrationScheduleProps = NativeStackScreenProps<
  AppDrawerParamList,
  RouteEnum.MigrationSchedule
>;

const ZATS_PER_ZEC = 10 ** 8;

const fmt = (zats: number): string =>
  `${parseFloat((zats / ZATS_PER_ZEC).toFixed(4))}`;

// The schedule review: one card per coming window with its batch (the
// denominations due) and when its reminder will fire. Confirm asks for
// notification permission, arms one reminder per window at its advisory target
// time (each batch is due from its boundary; the target only paces the nudge),
// then attempts the first batch right away. It opened in the current bucket,
// so it is due now and sends without waiting for a reminder.
const MigrationSchedule: React.FunctionComponent<MigrationScheduleProps> = ({
  navigation,
}) => {
  const context = useContext(ContextAppLoaded);
  const { translate, language, addLastSnackbar, info } = context;
  const { colors } = useTheme();

  // The payload's unix estimates assume mainnet spacing; re-derive each
  // target's wall-clock moment from its block distance and the spacing the
  // wallet actually observes, so the times hold on faster chains too. Without
  // a chain tip there is no distance to scale, so the payload's own estimate
  // stands.
  const wakeTargetMs = useCallback(
    (wake: RPCBroadcastWindowType): number =>
      info?.latestBlock
        ? estimatedTimestampMs(
            windowTargetHeight(wake),
            info.latestBlock,
            info.secondsPerBlock ?? TARGET_BLOCK_SPACING_SECONDS,
            Date.now(),
          )
        : wake.latest_target_unix_time * 1000,
    [info],
  );

  const [status, setStatus] = useState<RPCMigrationStatusType | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [confirming, setConfirming] = useState<boolean>(false);

  // The cadence chooser just called start_ironwood_migration, which bound the
  // parts and scheduled them — so this fetch, after it, is the schedule's truth.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const statusResult = await migrationStatus();
      if (cancelled) {
        return;
      }
      if (!statusResult.ok) {
        setErrorMsg(statusResult.error.message);
        setLoading(false);
        return;
      }
      try {
        const parsed = JSON.parse(statusResult.value) as RPCMigrationStatusType;
        if (parsed.error) {
          setErrorMsg(parsed.error);
        } else {
          setStatus(parsed);
        }
      } catch (e) {
        setErrorMsg(`${e}`);
      }
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Confirming lands on the in-flight monitor (reset, so Back can't return to
  // the planning flow), whether or not reminders were granted — the migration
  // is scheduled either way and the status screen is its home from here.
  const goStatus = useCallback(() => {
    navigation.reset({
      index: 0,
      routes: [{ name: RouteEnum.MigrationStatus }],
    });
  }, [navigation]);

  const wakes = useMemo(() => status?.upcoming_windows ?? [], [status]);

  // upcoming_windows carries only future windows. The first batch opens in the
  // current bucket, so it rides in due_now (immediately sendable) and never
  // appears here — number the coming windows past it, exactly as the status
  // screen does, or the first future window would mislabel as "Batch 1".
  const perBucket = Math.max(1, status?.per_bucket ?? 1);
  const batchesTotal = Math.max(
    1,
    Math.ceil((status?.parts_total ?? 0) / perBucket),
  );
  const batchesConfirmed = Math.min(
    batchesTotal,
    Math.floor((status?.parts_confirmed ?? 0) / perBucket),
  );
  const dueNow = status?.due_now ?? null;
  const nextWakeBase = batchesConfirmed + (dueNow ? 2 : 1);

  // Consent covers every batch, including the one that leaves the moment the
  // user confirms. It rides in due_now, which upcoming_windows structurally
  // omits, so without a card of its own it would be sent unseen.
  const batchCards = [
    ...(dueNow
      ? [
          {
            key: 'due',
            n: batchesConfirmed + 1,
            denominations: dueNow.denominations,
            when: translate('migrationschedule.sends-now') as string,
            tech: (
              translate('migrationschedule.tech-line-now') as string
            ).replace('{anchor}', String(dueNow.boundary)),
          },
        ]
      : []),
    ...wakes.map((wake: RPCBroadcastWindowType, i: number) => ({
      key: `w${wake.bucket_index}`,
      n: nextWakeBase + i,
      denominations: wake.denominations,
      when: (translate('migrationschedule.due') as string).replace(
        '{time}',
        Utils.formatDate(wakeTargetMs(wake), 'EEE, MMM d · HH:mm', language),
      ),
      tech: (translate('migrationschedule.tech-line') as string)
        .replace('{anchor}', String(wake.boundary))
        .replace('{window}', String(wake.bucket_index)),
    })),
  ];

  const onConfirm = useCallback(async () => {
    if (confirming) {
      return;
    }
    setConfirming(true);
    const granted = await requestReminderPermission();
    if (granted) {
      await armBatchReminders(
        wakes.map((wake: RPCBroadcastWindowType, i: number) => ({
          id: String(wake.bucket_index),
          timestampMs: wakeTargetMs(wake),
          title: (
            translate('migrationschedule.reminder-title') as string
          ).replace('{n}', String(nextWakeBase + i)),
          body: translate('migrationschedule.reminder-body') as string,
        })),
      );
      addLastSnackbar(translate('migrationschedule.armed') as string);
    } else {
      // Without permission no reminder can fire; the home banner remains the
      // way back in, so say so instead of failing.
      addLastSnackbar(translate('migrationschedule.denied') as string);
    }
    setConfirming(false);
    // The plan is agreed. The first batch opened in the current bucket, so it's
    // due now. Attempt it immediately instead of parking on the monitor for a
    // manual tap: MigrationBatchSending auto-runs execute_due_parts on mount and
    // resets to the monitor when done. Later batches wait for their reminders.
    if (dueNow && dueNow.denominations.length > 0) {
      navigation.reset({
        index: 0,
        routes: [
          {
            name: RouteEnum.MigrationBatchSending,
            params: { denominations: dueNow.denominations },
          },
        ],
      });
    } else {
      goStatus();
    }
  }, [
    confirming,
    wakes,
    wakeTargetMs,
    nextWakeBase,
    dueNow,
    navigation,
    translate,
    addLastSnackbar,
    goStatus,
  ]);

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
        <BoldText style={{ fontSize: 22, marginBottom: 10 }}>
          {translate('migrationschedule.title') as string}
        </BoldText>
        <Text
          style={{
            color: colors.fgMuted,
            fontSize: 15,
            lineHeight: 22,
            marginBottom: 20,
          }}
        >
          {(translate('migrationschedule.intro') as string)
            .split('**')
            .map((part: string, i: number) =>
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

        {batchCards.map(card => (
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
                {(translate('migrationschedule.batch') as string).replace(
                  '{n}',
                  String(card.n),
                )}
              </Text>
              {/* Wall-clock time leads; block heights are the metadata. */}
              <Text
                style={{
                  color: colors.fgDefault,
                  fontSize: 14,
                  fontWeight: '600',
                }}
              >
                {card.when}
              </Text>
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
            <Text
              style={{
                color: colors.fgMuted,
                fontSize: 12,
                fontStyle: 'italic',
              }}
            >
              {card.tech}
            </Text>
          </View>
        ))}
      </ScrollView>

      <View
        style={{
          flexDirection: 'row',
          justifyContent: 'space-evenly',
          alignItems: 'center',
          paddingVertical: 24,
          paddingHorizontal: 24,
        }}
      >
        <Button
          testID="migrationschedule.back"
          type={ButtonTypeEnum.Ghost}
          title={translate('migrationschedule.back') as string}
          onPress={() => navigation.goBack()}
          twoButtons={true}
        />
        <Button
          testID="migrationschedule.confirm"
          type={ButtonTypeEnum.Primary}
          title={translate('migrationschedule.confirm') as string}
          onPress={onConfirm}
          twoButtons={true}
          disabled={confirming}
        />
      </View>
    </View>
  );
};

export default MigrationSchedule;
