/* eslint-disable react-native/no-inline-styles */
import React, { useCallback, useContext, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  BackHandler,
  ScrollView,
  Text,
  View,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useTheme } from '@app/theme';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useKeepAwake } from '@sayem314/react-native-keep-awake';

import BoldText from '@ui/primitives/BoldText';
import Button, { ButtonTypeEnum } from '@ui/primitives/Button';
import SegmentedBar from '@ui/primitives/SegmentedBar';
import { AppDrawerParamList } from '@app/types';
import { ContextAppLoaded } from '@app/context';
import { RouteEnum } from '@app/AppState';
import {
  executeDueParts,
  executeDuePartsStatus,
  migrationStatus,
} from '@app/walletBackend';
import { RPCBatchReportType } from '@app/walletBackend/types/RPCBatchReportType';
import { RPCBatchStatusType } from '@app/walletBackend/types/RPCBatchStatusType';
import { RPCMigrationStatusType } from '@app/walletBackend/types/RPCMigrationStatusType';
import { deriveBatchVerdict } from './batchVerdict';

type MigrationBatchSendingProps = NativeStackScreenProps<
  AppDrawerParamList,
  RouteEnum.MigrationBatchSending
>;

const ZATS_PER_ZEC = 10 ** 8;

// The delay sequenced between this batch's individual part-sends. The parts are
// all due in the same window, so a modest gap keeps them from broadcasting
// simultaneously (a weak correlation signal) without making a foreground send
// feel stuck. Provisional — the manual-execution disclosure, shown once when
// the cadence is chosen, already covers the user-present correlation.
const BATCH_SEND_SPACING_MS = 3000;

const fmt = (zats: number): string =>
  `${parseFloat((zats / ZATS_PER_ZEC).toFixed(4))}`;

// Broadcasts the open window's due batch via execute_due_parts, polling the
// native side channel for "Sending i/N" while the one long call is in flight —
// the same shape as MigrationSending's drain. On success it returns to the
// status monitor, which re-reads migrationStatus and drops the sent window.
const MigrationBatchSending: React.FunctionComponent<
  MigrationBatchSendingProps
> = ({ navigation, route }) => {
  // Proving each part can take a while; keep the screen awake for the whole
  // batch. Scoped to this screen's lifetime, released on navigate-away.
  useKeepAwake();

  const context = useContext(ContextAppLoaded);
  const { translate, addLastSnackbar } = context;
  const { colors } = useTheme();

  const denominations = route.params?.denominations ?? [];

  const [progress, setProgress] = useState<RPCBatchStatusType | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  // Every part skipped without sending (slid or not due): nothing broadcast,
  // nothing lost. Distinct from the error state because nothing failed.
  const [notSendable, setNotSendable] = useState<boolean>(false);

  const goStatus = useCallback(() => {
    navigation.reset({
      index: 0,
      routes: [{ name: RouteEnum.MigrationStatus }],
    });
  }, [navigation]);

  // The batch can't be interrupted mid-broadcast, so block hardware-back for
  // the whole screen. Success returns to the monitor on its own; the error
  // state offers a button.
  useFocusEffect(
    useCallback(() => {
      const sub = BackHandler.addEventListener('hardwareBackPress', () => true);
      return () => sub.remove();
    }, []),
  );

  // Run the batch once, polling the native side channel for progress while the
  // single long execute call is in flight. Both run concurrently on separate
  // native queues; executeDuePartsStatus reads a side channel, not the
  // lightclient lock the batch holds, so the poll stays live throughout.
  useEffect(() => {
    let cancelled = false;
    let polling = false;
    const poll = setInterval(async () => {
      if (polling) {
        return;
      }
      polling = true;
      try {
        const status = await executeDuePartsStatus();
        if (status.ok) {
          const parsed = JSON.parse(status.value) as RPCBatchStatusType | null;
          if (parsed && !cancelled) {
            setProgress(parsed);
          }
        }
      } catch {
        // Transient read/parse between ticks; the next tick recovers.
      } finally {
        polling = false;
      }
    }, 400);

    (async () => {
      let failure: string | null = null;
      let report: RPCBatchReportType | null = null;
      try {
        const reportResult = await executeDueParts(BATCH_SEND_SPACING_MS);
        if (!reportResult.ok) {
          failure = reportResult.error.message;
        } else {
          const parsed = JSON.parse(reportResult.value) as RPCBatchReportType;
          if (parsed.error) {
            failure = parsed.error;
          } else {
            report = parsed;
          }
        }
      } catch (e) {
        failure = `${e}`;
      }
      clearInterval(poll);
      if (cancelled) {
        return;
      }
      // A part that did not come back `sent` may never have reached the
      // network (a failed submission reports as `slid`), so ask which of them
      // are still due. Skipped on a clean batch; a failed read leaves the
      // verdict to the report alone.
      let dueNowPartIds: number[] | null = null;
      const outcomes = report?.outcomes ?? [];
      if (
        !failure &&
        !report?.halted &&
        outcomes.some(o => o.result.kind !== 'sent')
      ) {
        try {
          const statusResult = await migrationStatus();
          if (statusResult.ok) {
            const parsed = JSON.parse(
              statusResult.value,
            ) as RPCMigrationStatusType;
            if (!parsed.error) {
              dueNowPartIds = parsed.due_now?.part_ids ?? [];
            }
          }
        } catch {
          // Unreadable status: fall back to the report alone.
        }
        if (cancelled) {
          return;
        }
      }
      const verdict = deriveBatchVerdict(failure, report, dueNowPartIds);
      switch (verdict.kind) {
        case 'failed':
          // A halted batch stopped on a submission error partway; surface it so
          // the user can retry (the retry folds the un-sent parts back in).
          setErrorMsg(verdict.message);
          return;
        case 'unsent':
          // Still due in this window, so a retry from the monitor sends them.
          // They may already show in History as pending; say so, or the user
          // reads the batch as sent.
          setErrorMsg(
            (translate('migrationbatchsending.unsent') as string)
              .replace('{unsent}', String(verdict.unsent))
              .replace('{total}', String(verdict.total)),
          );
          return;
        case 'nothing':
          // Reached with nothing actually due (the window has not opened yet,
          // or every part already confirmed or slid to a later window); the
          // monitor will show why.
          addLastSnackbar(translate('migrationbatchsending.nothing') as string);
          break;
        case 'not-sendable':
          // The batch was due but no part could be built and none is still due
          // (slid to a coming window). Bouncing straight back reads as a silent
          // failure, so hold here and say what happened.
          setNotSendable(true);
          return;
        case 'sent':
          addLastSnackbar(
            (translate('migrationbatchsending.success') as string)
              .replace('{sent}', String(verdict.sent))
              .replace('{total}', String(verdict.total)),
          );
          break;
      }
      goStatus();
    })();

    return () => {
      cancelled = true;
      clearInterval(poll);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ----- Not sendable yet -----
  if (notSendable) {
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: colors.bgCanvas,
          padding: 24,
          justifyContent: 'center',
        }}
      >
        <BoldText
          style={{ fontSize: 20, marginBottom: 12, textAlign: 'center' }}
        >
          {translate('migrationbatchsending.slid-title') as string}
        </BoldText>
        <Text
          style={{
            color: colors.fgMuted,
            fontSize: 14,
            lineHeight: 21,
            textAlign: 'center',
            marginBottom: 28,
          }}
        >
          {translate('migrationbatchsending.slid-body') as string}
        </Text>
        <View style={{ alignItems: 'center' }}>
          <Button
            testID="migrationbatchsending.slid-back"
            type={ButtonTypeEnum.Primary}
            title={translate('migrationbatchsending.back') as string}
            onPress={goStatus}
          />
        </View>
      </View>
    );
  }

  // ----- Error state -----
  if (errorMsg) {
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: colors.bgCanvas,
          padding: 24,
          justifyContent: 'center',
        }}
      >
        <BoldText
          style={{ fontSize: 20, marginBottom: 12, textAlign: 'center' }}
        >
          {translate('migrationbatchsending.error-title') as string}
        </BoldText>
        <Text
          style={{
            color: colors.fgMuted,
            fontSize: 14,
            textAlign: 'center',
            marginBottom: 28,
          }}
        >
          {errorMsg}
        </Text>
        <View style={{ alignItems: 'center' }}>
          <Button
            testID="migrationbatchsending.back"
            type={ButtonTypeEnum.Primary}
            title={translate('migrationbatchsending.back') as string}
            onPress={goStatus}
          />
        </View>
      </View>
    );
  }

  const total = progress?.total ?? denominations.length;
  const done = progress?.resolved ?? 0;
  const progressLine =
    total > 0
      ? (translate('migrationbatchsending.progress') as string)
          .replace('{done}', String(done))
          .replace('{total}', String(total))
      : (translate('migrationbatchsending.starting') as string);

  return (
    <View
      style={{
        flex: 1,
        backgroundColor: colors.bgCanvas,
        padding: 24,
        justifyContent: 'center',
      }}
    >
      <ScrollView
        contentContainerStyle={{ flexGrow: 1, justifyContent: 'center' }}
        scrollEnabled={false}
      >
        <BoldText
          style={{ fontSize: 22, marginBottom: 10, textAlign: 'center' }}
        >
          {translate('migrationbatchsending.title') as string}
        </BoldText>
        <Text
          style={{
            color: colors.fgMuted,
            fontSize: 15,
            lineHeight: 22,
            textAlign: 'center',
            marginBottom: 24,
          }}
        >
          {translate('migrationbatchsending.subtitle') as string}
        </Text>

        {denominations.length > 0 && (
          <View
            style={{
              flexDirection: 'row',
              flexWrap: 'wrap',
              justifyContent: 'center',
              marginBottom: 28,
            }}
          >
            {denominations.map((denomination: number, d: number) => (
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
        )}

        {/* One segment per part in the batch, matching the chips above it. */}
        <View style={{ marginBottom: 14 }}>
          <SegmentedBar
            segments={total}
            progress={total > 0 ? done / total : 0}
            active={done < total ? done : undefined}
            activeColor={colors.fgSyncing}
          />
        </View>

        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <ActivityIndicator size="small" color={colors.fgAccent} />
          <Text
            style={{ color: colors.fgDefault, fontSize: 15, marginLeft: 10 }}
          >
            {progressLine}
          </Text>
        </View>
      </ScrollView>
    </View>
  );
};

export default MigrationBatchSending;
