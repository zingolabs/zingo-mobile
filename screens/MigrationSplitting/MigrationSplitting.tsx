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
  BackHandler,
  ScrollView,
  Text,
  View,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useTheme } from '@app/theme';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useKeepAwake } from '@sayem314/react-native-keep-awake';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { faCheck } from '@fortawesome/free-solid-svg-icons';

import BoldText from '@ui/primitives/BoldText';
import Button, { ButtonTypeEnum } from '@ui/primitives/Button';
import ProgressBar from '@ui/primitives/ProgressBar';
import StepperHeader from '@ui/widgets/StepperHeader';
import { AppDrawerParamList } from '@app/types';
import { ContextAppLoaded } from '@app/context';
import { RouteEnum } from '@app/AppState';
import useTrickleProgress from '@app/hooks/useTrickleProgress';
import { planIronwoodMigration, quickSplit } from '@app/walletBackend';
import { RPCSplitOutcomeType } from '@app/walletBackend/types/RPCSplitOutcomeType';
import { RPCMigrationPlanType } from '@app/walletBackend/types/RPCMigrationPlanType';

type MigrationSplittingProps = NativeStackScreenProps<
  AppDrawerParamList,
  RouteEnum.MigrationSplitting
>;

const ZATS_PER_ZEC = 10 ** 8;

// How often the driver re-checks a pending round. Confirmations land with new
// blocks (~75s target spacing), so a 15s cadence notices them promptly without
// hammering the wallet.
const POLL_MS = 15 * 1000;

// Compact ZEC amount: trims trailing zeros so a 10 ZEC total reads "10" and a
// dust total "0.01", matching the plan values.
const fmt = (zats: number): string =>
  `${parseFloat((zats / ZATS_PER_ZEC).toFixed(4))}`;

// The transaction's total re-noted value, matching the plan's Amount row. The
// individual note denominations stay off this screen.
const outputsLabel = (outputs: number[]): string =>
  fmt(outputs.reduce((sum, v) => sum + v, 0));

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

// Phase 1's interactive ceremony (ADR 0016): drives sync -> quick_split through
// every round to `complete`, keeping the user present (like the drain:
// keep-awake, hardware-back blocked). The terminal state is the "Split complete"
// view whose button hands off to the Phase 2 cadence chooser. quick_split
// persists no migration state — each call re-plans against current notes — so a
// mid-round kill is recovered by re-entering this screen, which just calls
// quick_split again; the fallback (`plan` absent) re-fetches the plan for the
// row labels.
const MigrationSplitting: React.FunctionComponent<MigrationSplittingProps> = ({
  navigation,
  route,
}) => {
  useKeepAwake();

  const context = useContext(ContextAppLoaded);
  const { translate } = context;
  const { colors } = useTheme();

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

  // The splitting loop (ADR 0016). One quick_split call per tick: it builds and
  // broadcasts the next round (slow: Halo2 proving), reports that a prior round
  // is still confirming, or reports completion. quick_split does not return a
  // round index — it persists no state — so we count rounds locally as they
  // broadcast. Between ticks the app's continuous background sync brings in the
  // confirmations the next tick needs.
  const roundRef = useRef(0);

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
      const result = await quickSplit();
      if (cancelled) {
        return;
      }
      let failure: string | null = null;
      let parsed: RPCSplitOutcomeType | null = null;
      if (!result.ok) {
        failure = result.error.message;
      } else {
        try {
          parsed = JSON.parse(result.value) as RPCSplitOutcomeType;
          if (parsed.error) {
            failure = parsed.error;
          }
        } catch (e) {
          failure = `${e}`;
        }
      }
      if (failure) {
        // A transmit failure leaves every unsent note spendable; the retry
        // button re-enters the same loop, which re-plans the remainder.
        setErrorMsg(failure);
        return;
      }
      if (!parsed || !parsed.outcome) {
        setErrorMsg('Error: malformed splitting outcome');
        return;
      }
      if (parsed.outcome === 'complete') {
        setRows(prev =>
          prev.map(row => ({ ...row, status: 'confirmed' as TxStatus })),
        );
        setStep({ kind: 'complete' });
        finish();
        return;
      }
      if (parsed.outcome === 'round') {
        const round = roundRef.current;
        applyBroadcast(round, parsed.txids ?? []);
        roundRef.current = round + 1;
        setStep({
          kind: 'awaiting',
          round,
          pending: (parsed.txids ?? []).length,
        });
        schedule(drive, POLL_MS);
        return;
      }
      // awaiting_confirmation: a prior round has not confirmed yet; nothing was
      // built or sent. Its rows stay `sent` and confirm when the next round
      // broadcasts (or on `complete`). Sync and retry.
      setStep(prev => ({
        kind: 'awaiting',
        round:
          prev.kind === 'awaiting' || prev.kind === 'broadcast'
            ? prev.round
            : 0,
        pending: prev.kind === 'awaiting' ? prev.pending : 0,
      }));
      schedule(drive, POLL_MS);
    };

    // Fallback re-entry (no plan param): quick_split re-plans internally
    // regardless, so this only re-fetches the plan for the row labels. An empty
    // split_rounds means the notes are already fully split — hand straight to
    // the terminal state.
    (async () => {
      if (!plan) {
        const planResult = await planIronwoodMigration();
        if (cancelled) {
          return;
        }
        if (planResult.ok) {
          try {
            const parsed = JSON.parse(planResult.value) as RPCMigrationPlanType;
            if (!parsed.error && parsed.split_rounds) {
              if (parsed.split_rounds.length === 0) {
                setRows([]);
                setStep({ kind: 'complete' });
                finish();
                return;
              }
              setRows(
                parsed.split_rounds.flatMap((round, r) =>
                  round.map(tx => ({
                    round: r,
                    label: outputsLabel(tx.outputs),
                    txid: null,
                    status: 'queued' as TxStatus,
                  })),
                ),
              );
            }
          } catch {
            // Fall through to the driver, which re-plans regardless.
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
      color: colors.fgMuted,
    },
    creating: {
      key: 'migrationsplitting.status-creating',
      color: colors.fgAccent,
    },
    sent: {
      key: 'migrationsplitting.status-sent',
      color: colors.fgDefault,
    },
    confirmed: {
      key: 'migrationsplitting.status-confirmed',
      color: colors.fgAccent,
    },
  };

  // ----- Error -----
  if (errorMsg) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.bgCanvas }}>
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
                color: colors.fgDefault,
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
                color: colors.fgMuted,
                fontSize: 14,
                textAlign: 'center',
                marginBottom: 10,
              }}
            >
              {errorMsg}
            </Text>
            <Text
              style={{
                color: colors.fgMuted,
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
      <View style={{ flex: 1, backgroundColor: colors.bgCanvas }}>
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
              color: colors.fgMuted,
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
                backgroundColor: colors.bgSurface,
                borderRadius: 12,
                paddingHorizontal: 16,
                paddingVertical: 16,
                marginBottom: 14,
              }}
            >
              <FontAwesomeIcon
                icon={faCheck}
                size={16}
                color={colors.fgAccent}
              />
              <Text
                style={{
                  color: colors.fgDefault,
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
                style={{ color: colors.fgAccent, fontSize: 14, flexShrink: 1 }}
                numberOfLines={1}
              >
                {row.label}
              </Text>
              <Text
                style={{
                  marginLeft: 'auto',
                  color: colors.fgAccent,
                  fontSize: 12,
                  fontWeight: '600',
                }}
              >
                {translate('migrationsplitting.status-confirmed') as string}
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
    <View style={{ flex: 1, backgroundColor: colors.bgCanvas }}>
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
            color: colors.fgMuted,
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
          <ActivityIndicator size="small" color={colors.fgAccent} />
          <Text
            style={{
              color: colors.fgDefault,
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
                backgroundColor: colors.bgSurface,
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
                  color: colors.fgDefault,
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
                style={{ color: colors.fgAccent, fontSize: 14, flexShrink: 1 }}
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
                }}
              >
                {translate(meta.key) as string}
              </Text>
            </View>
          );
        })}
      </ScrollView>

      {/* Pinned above the hint. Splitting reports no discrete steps, so the
          trickle keeps a continuous bar moving rather than counting pieces. */}
      <View style={{ paddingHorizontal: 24, paddingBottom: 28 }}>
        <ProgressBar progress={trickle.progress} />
        <Text
          style={{
            color: colors.fgMuted,
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
