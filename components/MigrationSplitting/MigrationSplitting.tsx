/* eslint-disable react-native/no-inline-styles */
import React, {
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';
import {
  ActivityIndicator,
  Animated,
  BackHandler,
  ScrollView,
  Text,
  View,
} from 'react-native';
import { useFocusEffect, useTheme } from '@react-navigation/native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useKeepAwake } from '@sayem314/react-native-keep-awake';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { faCheck } from '@fortawesome/free-solid-svg-icons';

import BoldText from '../Components/BoldText';
import Button from '../Components/Button';
import StepperHeader from '../Migration/StepperHeader';
import { AppDrawerParamList, ThemeType } from '../../app/types';
import { ContextAppLoaded } from '../../app/context';
import { ButtonTypeEnum, RouteEnum } from '../../app/AppState';
import useTrickleProgress from '../../app/hooks/useTrickleProgress';
import {
  continueNoteSplitting,
  migrationStatus,
} from '../../app/walletBackend';
import { RPCSplitStepType } from '../../app/walletBackend/types/RPCSplitStepType';
import { RPCMigrationStatusType } from '../../app/walletBackend/types/RPCMigrationStatusType';

type MigrationSplittingProps = NativeStackScreenProps<
  AppDrawerParamList,
  RouteEnum.MigrationSplitting
>;

const ZATS_PER_ZEC = 10 ** 8;

// How often the driver re-checks a pending round. Confirmations land with new
// blocks (~75s target spacing), so a 15s cadence notices them promptly without
// hammering the wallet.
const POLL_MS = 15 * 1000;

// Compact ZEC amount for the per-transaction output list: trims trailing zeros
// so a 10 ZEC note reads "10" and a dust note "0.01", matching the plan values.
const fmt = (zats: number): string =>
  `${parseFloat((zats / ZATS_PER_ZEC).toFixed(4))}`;

// "10, 10, 1" with repeats collapsed to "10 (×2), 1".
const outputsLabel = (outputs: number[]): string => {
  const groups: { value: number; count: number }[] = [];
  for (const v of outputs) {
    const existing = groups.find(g => g.value === v);
    if (existing) {
      existing.count += 1;
    } else {
      groups.push({ value: v, count: 1 });
    }
  }
  return groups
    .map(g => (g.count > 1 ? `${fmt(g.value)} (×${g.count})` : fmt(g.value)))
    .join(', ');
};

// Round-granular truth is all the splitting API offers (there is no per-tx
// build side channel like the drain's): a row is queued until its round
// broadcasts, sent until its txid leaves the pending list, then confirmed.
type TxStatus = 'queued' | 'creating' | 'sent' | 'confirmed';

type RowData = {
  round: number;
  label: string;
  txid: string | null;
  status: TxStatus;
};

// What the driver last learned, which is what the headline renders.
type StepState =
  | { kind: 'starting' }
  | { kind: 'broadcast'; round: number }
  | { kind: 'awaiting'; round: number; pending: number }
  | { kind: 'complete' };

// Phase 1's interactive ceremony: drives sync -> continue_note_splitting
// through every round to SplittingComplete, keeping the user present (like
// the drain: keep-awake, hardware-back blocked). The terminal state is the
// "Split complete" view whose button unlocks the phase 2 cadence chooser.
// If the app dies anyway, zingolib's persisted round state plus the home
// banner bring the user back here — that is the rescue path (`plan` absent),
// rendered coarsely from migration_status.
const MigrationSplitting: React.FunctionComponent<MigrationSplittingProps> = ({
  navigation,
  route,
}) => {
  useKeepAwake();

  const context = useContext(ContextAppLoaded);
  const { translate } = context;
  const { colors } = useTheme() as ThemeType;

  const plan = route.params?.plan;
  const roundCount = plan?.split_rounds?.length ?? 0;

  const [rows, setRows] = useState<RowData[]>(() => {
    if (!plan?.split_rounds) {
      return [];
    }
    return plan.split_rounds.flatMap((round, r) =>
      round.map(tx => ({
        round: r,
        label: outputsLabel(tx.outputs),
        txid: null,
        status: 'queued' as TxStatus,
      })),
    );
  });
  const [step, setStep] = useState<StepState>({ kind: 'starting' });
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const complete = step.kind === 'complete';

  // Splitting rounds can't be interrupted and the flow only moves forward;
  // block hardware-back for the whole screen (the terminal state navigates
  // onward, the error state offers explicit buttons).
  useFocusEffect(
    useCallback(() => {
      const sub = BackHandler.addEventListener('hardwareBackPress', () => true);
      return () => sub.remove();
    }, []),
  );

  const trickle = useTrickleProgress();
  const { setCeiling, finish } = trickle;

  // Progress accounting: each transaction is worth two units, one for its
  // broadcast and one for its confirmation. Coarse, but honest — it moves
  // exactly when the chain does.
  const totalTxsRef = useRef(rows.length);
  useEffect(() => {
    if (rows.length > 0) {
      totalTxsRef.current = rows.length;
    }
  }, [rows]);

  const updateCeilingFromRows = useCallback(
    (nextRows: RowData[]) => {
      const total = totalTxsRef.current;
      if (total <= 0) {
        return;
      }
      const units = nextRows.reduce((sum, row) => {
        if (row.status === 'confirmed') {
          return sum + 2;
        }
        if (row.status === 'sent') {
          return sum + 1;
        }
        return sum;
      }, 0);
      setCeiling(units / (2 * total) + 1 / (2 * total));
    },
    [setCeiling],
  );

  // Marks every round before `round` confirmed: round N only builds after
  // round N-1's outputs confirmed and reached the anchor.
  const applyBroadcast = useCallback(
    (round: number, txids: string[]) => {
      setRows(prev => {
        let assigned = 0;
        const next = prev.map(row => {
          if (row.round < round) {
            return { ...row, status: 'confirmed' as TxStatus };
          }
          if (row.round === round) {
            const txid = txids[assigned] ?? null;
            assigned += 1;
            return { ...row, txid, status: 'sent' as TxStatus };
          }
          return row;
        });
        updateCeilingFromRows(next);
        return next;
      });
    },
    [updateCeilingFromRows],
  );

  const applyPending = useCallback(
    (pending: string[]) => {
      setRows(prev => {
        const stillPending = new Set(pending);
        const next = prev.map(row => {
          if (
            row.status === 'sent' &&
            row.txid &&
            !stillPending.has(row.txid)
          ) {
            return { ...row, status: 'confirmed' as TxStatus };
          }
          return row;
        });
        updateCeilingFromRows(next);
        return next;
      });
    },
    [updateCeilingFromRows],
  );

  // The splitting loop. One driver call per tick: it either builds and
  // broadcasts the next round (slow: Halo2 proving), reports the pending
  // round's remaining txids (fast), or reports completion. Between ticks the
  // app's continuous background sync brings in the confirmations the next
  // tick observes.
  useEffect(() => {
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | null = null;

    const schedule = (fn: () => void, ms: number) => {
      timer = setTimeout(fn, ms);
    };

    const drive = async () => {
      if (cancelled) {
        return;
      }
      const stepResult = await continueNoteSplitting();
      if (cancelled) {
        return;
      }
      let failure: string | null = null;
      let parsed: RPCSplitStepType | null = null;
      if (!stepResult.ok) {
        failure = stepResult.error.message;
      } else {
        try {
          parsed = JSON.parse(stepResult.value) as RPCSplitStepType;
          if (parsed.error) {
            failure = parsed.error;
          }
        } catch (e) {
          failure = `${e}`;
        }
      }
      if (failure) {
        // Transmit failures leave a reconcilable state; the retry button
        // re-enters the same loop.
        setErrorMsg(failure);
        return;
      }
      if (!parsed || !parsed.step) {
        setErrorMsg('Error: malformed splitting step');
        return;
      }
      if (parsed.step === 'splitting_complete') {
        setRows(prev =>
          prev.map(row => ({ ...row, status: 'confirmed' as TxStatus })),
        );
        setStep({ kind: 'complete' });
        finish();
        return;
      }
      if (parsed.step === 'round_broadcast') {
        const round = parsed.round ?? 0;
        applyBroadcast(round, parsed.txids ?? []);
        setStep({
          kind: 'awaiting',
          round,
          pending: (parsed.txids ?? []).length,
        });
        schedule(drive, POLL_MS);
        return;
      }
      // awaiting_confirmation: pending lists what is still in flight; empty
      // means confirmed but the anchor hasn't reached the outputs yet.
      const pending = parsed.pending ?? [];
      applyPending(pending);
      setStep(prev => ({
        kind: 'awaiting',
        round:
          prev.kind === 'awaiting' || prev.kind === 'broadcast'
            ? prev.round
            : 0,
        pending: pending.length,
      }));
      schedule(drive, POLL_MS);
    };

    // Rescue re-entry (no plan param): learn where the migration stands
    // before driving, so an already-scheduled migration lands directly on
    // the terminal state instead of an empty working view.
    (async () => {
      if (!plan) {
        const statusResult = await migrationStatus();
        if (cancelled) {
          return;
        }
        if (statusResult.ok) {
          try {
            const status = JSON.parse(
              statusResult.value,
            ) as RPCMigrationStatusType;
            if (
              status.phase?.kind === 'parts_scheduled' ||
              status.phase?.kind === 'complete'
            ) {
              setStep({ kind: 'complete' });
              finish();
              return;
            }
            if (status.phase?.kind === 'note_splitting') {
              // Coarse rows: one per pending transaction, values unknown.
              setRows(
                (status.phase.pending_txids ?? []).map(txid => ({
                  round: status.phase?.round ?? 0,
                  label: '',
                  txid,
                  status: 'sent' as TxStatus,
                })),
              );
            }
          } catch {
            // Fall through to the driver, which re-derives everything.
          }
        }
      }
      drive();
    })();

    return () => {
      cancelled = true;
      if (timer) {
        clearTimeout(timer);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onRetry = useCallback(() => {
    // Re-enter the loop by remounting the effect's world: simplest is to
    // clear the error and drive once more via a fresh navigation replace.
    setErrorMsg(null);
    navigation.replace(RouteEnum.MigrationSplitting, { plan });
  }, [navigation, plan]);

  const goHome = useCallback(() => {
    navigation.reset({ index: 0, routes: [{ name: RouteEnum.HomeStack }] });
  }, [navigation]);

  const statusMeta: Record<TxStatus, { key: string; color: string }> = {
    queued: {
      key: 'migrationsplitting.status-queued',
      color: colors.placeholder,
    },
    creating: {
      key: 'migrationsplitting.status-creating',
      color: colors.primary,
    },
    sent: {
      key: 'migrationsplitting.status-sent',
      color: colors.text,
    },
    confirmed: {
      key: 'migrationsplitting.status-confirmed',
      color: colors.primary,
    },
  };

  // ----- Error -----
  if (errorMsg) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background }}>
        <ScrollView
          contentContainerStyle={{ padding: 24, paddingTop: 40, flexGrow: 1 }}
        >
          <BoldText style={{ fontSize: 22, marginBottom: 10 }}>
            {translate('migrationsplitting.title') as string}
          </BoldText>
          <View
            style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}
          >
            <Text
              style={{
                color: colors.text,
                fontSize: 17,
                fontWeight: '700',
                marginBottom: 10,
                textAlign: 'center',
              }}
            >
              {translate('migrationsplitting.error-title') as string}
            </Text>
            <Text
              style={{
                color: colors.placeholder,
                fontSize: 14,
                textAlign: 'center',
                marginBottom: 10,
              }}
            >
              {errorMsg}
            </Text>
            <Text
              style={{
                color: colors.placeholder,
                fontSize: 13,
                textAlign: 'center',
              }}
            >
              {translate('migrationsplitting.error-hint') as string}
            </Text>
          </View>
        </ScrollView>
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
            type={ButtonTypeEnum.Ghost}
            title={translate('migrationsplitting.close') as string}
            onPress={goHome}
            twoButtons={true}
          />
          <Button
            type={ButtonTypeEnum.Primary}
            title={translate('migrationsplitting.retry') as string}
            onPress={onRetry}
            twoButtons={true}
          />
        </View>
      </View>
    );
  }

  // ----- Terminal: split complete (mock 2) -----
  if (complete) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background }}>
        <StepperHeader splitDone={true} sendActive={false} />
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{
            paddingHorizontal: 20,
            paddingTop: 24,
            paddingBottom: 24,
          }}
        >
          <BoldText style={{ fontSize: 22, marginBottom: 10 }}>
            {translate('migrationsplitting.complete-title') as string}
          </BoldText>
          <Text
            style={{
              color: colors.placeholder,
              fontSize: 15,
              lineHeight: 22,
              marginBottom: 20,
            }}
          >
            {translate('migrationsplitting.complete-subtitle') as string}
          </Text>
          {rows.map((row, i) => (
            <View
              key={i}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                borderWidth: 1,
                borderColor: colors.bottomSheetBorder,
                backgroundColor: colors.bottomSheetBackground,
                borderRadius: 12,
                paddingHorizontal: 16,
                paddingVertical: 16,
                marginBottom: 14,
              }}
            >
              <FontAwesomeIcon
                icon={faCheck}
                size={16}
                color={colors.primary}
              />
              <Text
                style={{
                  color: colors.text,
                  fontSize: 15,
                  fontWeight: '700',
                  marginLeft: 14,
                  marginRight: 12,
                }}
              >
                {(translate('migrationsplitting.tx') as string).replace(
                  '{n}',
                  String(i + 1),
                )}
              </Text>
              <Text
                style={{ color: colors.primary, fontSize: 14, flexShrink: 1 }}
                numberOfLines={1}
              >
                {row.label}
              </Text>
              <Text
                style={{
                  marginLeft: 'auto',
                  color: colors.primary,
                  fontSize: 12,
                  fontWeight: '600',
                  letterSpacing: 1,
                }}
              >
                {(
                  translate('migrationsplitting.status-confirmed') as string
                ).toUpperCase()}
              </Text>
            </View>
          ))}
        </ScrollView>
        <View
          style={{
            paddingBottom: 24,
            paddingHorizontal: 24,
            alignItems: 'center',
          }}
        >
          <Button
            testID="migrationsplitting.continue"
            type={ButtonTypeEnum.Primary}
            title={translate('migrationsplitting.continue') as string}
            onPress={() => navigation.navigate(RouteEnum.MigrationCadence)}
          />
        </View>
      </View>
    );
  }

  // ----- Working / waiting -----
  const headline = (() => {
    if (step.kind === 'starting') {
      return translate('migrationsplitting.creating') as string;
    }
    // Awaiting a pending round. Zero pending means every transaction
    // confirmed and the anchor (or the next round's build) is catching up.
    const pending = step.kind === 'awaiting' ? step.pending : 0;
    if (pending === 0) {
      return roundCount > 1
        ? (translate('migrationsplitting.preparing-round') as string)
        : (translate('migrationsplitting.finalizing') as string);
    }
    const roundLabel =
      roundCount > 1
        ? ` ${(translate('migrationsplitting.round-of') as string)
            .replace(
              '{n}',
              String((step.kind === 'awaiting' ? step.round : 0) + 1),
            )
            .replace('{r}', String(roundCount))}`
        : '';
    return `${translate('migrationsplitting.confirming') as string}${roundLabel}`;
  })();

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <StepperHeader splitDone={false} sendActive={false} />
      <ScrollView
        contentContainerStyle={{
          paddingHorizontal: 24,
          paddingTop: 24,
          paddingBottom: 24,
        }}
      >
        <BoldText style={{ fontSize: 22, marginBottom: 10 }}>
          {translate('migrationsplitting.title') as string}
        </BoldText>
        <Text
          style={{
            color: colors.placeholder,
            fontSize: 15,
            lineHeight: 22,
            marginBottom: 18,
          }}
        >
          {translate('migrationsplitting.subtitle') as string}
        </Text>

        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            marginBottom: 20,
          }}
        >
          <ActivityIndicator size="small" color={colors.primary} />
          <Text
            style={{
              color: colors.text,
              fontSize: 15,
              fontWeight: '600',
              marginLeft: 10,
            }}
          >
            {headline}
          </Text>
        </View>

        {rows.map((row, i) => {
          const status: TxStatus =
            step.kind === 'starting' && row.round === 0
              ? 'creating'
              : row.status;
          const meta = statusMeta[status];
          return (
            <View
              key={i}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                borderWidth: 1,
                borderColor: colors.bottomSheetBorder,
                backgroundColor: colors.bottomSheetBackground,
                borderRadius: 12,
                paddingHorizontal: 16,
                paddingVertical: 16,
                marginBottom: 14,
              }}
            >
              <View
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: 4,
                  backgroundColor: meta.color,
                  marginRight: 14,
                }}
              />
              <Text
                style={{
                  color: colors.text,
                  fontSize: 15,
                  fontWeight: '700',
                  marginRight: 12,
                }}
              >
                {(translate('migrationsplitting.tx') as string).replace(
                  '{n}',
                  String(i + 1),
                )}
              </Text>
              <Text
                style={{ color: colors.primary, fontSize: 14, flexShrink: 1 }}
                numberOfLines={1}
              >
                {row.label}
              </Text>
              <Text
                style={{
                  marginLeft: 'auto',
                  color: meta.color,
                  fontSize: 12,
                  fontWeight: '600',
                  letterSpacing: 1,
                }}
              >
                {(translate(meta.key) as string).toUpperCase()}
              </Text>
            </View>
          );
        })}
      </ScrollView>

      {/* Always-animated progress bar, pinned above the hint. */}
      <View style={{ paddingHorizontal: 24, paddingBottom: 28 }}>
        <View
          style={{
            width: '100%',
            height: 6,
            borderRadius: 3,
            backgroundColor: colors.bottomSheetBorder,
            overflow: 'hidden',
          }}
        >
          <Animated.View
            style={{
              height: '100%',
              borderRadius: 3,
              backgroundColor: colors.primary,
              width: trickle.progress.interpolate({
                inputRange: [0, 1],
                outputRange: ['0%', '100%'],
              }),
            }}
          />
        </View>
        <Text
          style={{
            color: colors.placeholder,
            fontSize: 13,
            marginTop: 14,
            textAlign: 'center',
          }}
        >
          {translate('migrationsplitting.hint') as string}
        </Text>
      </View>
    </View>
  );
};

export default MigrationSplitting;
