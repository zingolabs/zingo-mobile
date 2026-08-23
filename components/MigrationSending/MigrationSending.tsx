/* eslint-disable react-native/no-inline-styles */
import React, { useCallback, useContext, useEffect, useState } from 'react';
import { BackHandler, ScrollView, Text, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useTheme } from '../../app/theme';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useKeepAwake } from '@sayem314/react-native-keep-awake';

import BoldText from '../Components/BoldText';
import Button from '../Components/Button';
import ProgressBar from '../Migration/ProgressBar';
import { AppDrawerParamList } from '../../app/types';
import { ContextAppLoaded } from '../../app/context';
import { ButtonTypeEnum, RouteEnum } from '../../app/AppState';
import Utils from '../../app/utils';
import useTrickleProgress from '../../app/hooks/useTrickleProgress';
import { drainOrchard, drainStatus } from '../../app/walletBackend';
import { RPCDrainType } from '../../app/walletBackend/types/RPCDrainType';
import { RPCDrainStatusType } from '../../app/walletBackend/types/RPCDrainStatusType';

type MigrationSendingProps = NativeStackScreenProps<
  AppDrawerParamList,
  RouteEnum.MigrationSending
>;

const ZATS_PER_ZEC = 10 ** 8;

// Share of the progress bar each drain phase owns: building (proving, the slow
// part) fills the first 90%, broadcasting the last 10%.
const BUILD_WEIGHT = 0.9;

// Compact ZEC amount for the per-transaction note list: trims trailing zeros so
// a 10 ZEC note reads "10" and a dust note "0.01", matching the preview values.
const fmt = (zats: number): string =>
  `${parseFloat((zats / ZATS_PER_ZEC).toFixed(4))}`;

// Where a transaction is in its lifecycle, derived from the drain's live
// { built, sent, phase } snapshot. Build proves+signs each tx (queued ->
// calculating -> calculated); transmit broadcasts them (calculated -> sending
// -> sent).
type TxStatus = 'queued' | 'calculating' | 'calculated' | 'sending' | 'sent';

const deriveStatus = (
  index: number,
  progress: RPCDrainStatusType | null,
): TxStatus => {
  if (!progress) {
    return 'queued';
  }
  if (progress.phase === 'building') {
    if (index < progress.built) {
      return 'calculated';
    }
    if (index === progress.built) {
      return 'calculating';
    }
    return 'queued';
  }
  // Transmitting: every transaction is already built.
  if (index < progress.sent) {
    return 'sent';
  }
  if (index === progress.sent) {
    return 'sending';
  }
  return 'calculated';
};

const MigrationSending: React.FunctionComponent<MigrationSendingProps> = ({
  navigation,
  route,
}) => {
  // Keep the screen awake for the whole broadcast: proving each transaction can
  // take a while and the user should be able to watch it finish. The hook holds
  // the lock only while this screen is mounted, so it is scoped to exactly here
  // and released the moment we navigate away.
  useKeepAwake();

  const context = useContext(ContextAppLoaded);
  const { translate, addLastSnackbar, info } = context;
  const { colors } = useTheme();

  const transactions = route.params?.transactions ?? [];
  const txCount = transactions.length;
  // Total value landing in the Ironwood pool across every transaction (the sum
  // of the single output each drain transaction creates).
  const totalTransferred = transactions.reduce((sum, tx) => sum + tx.output, 0);
  const totalTransferredStr = `${Utils.parseNumberFloatToStringLocale(
    totalTransferred / ZATS_PER_ZEC,
    4,
  )} ${info.currencyName}`;

  const [progress, setProgress] = useState<RPCDrainStatusType | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const goHome = useCallback(() => {
    navigation.reset({ index: 0, routes: [{ name: RouteEnum.HomeStack }] });
  }, [navigation]);

  // Broadcasting can't be interrupted, so block hardware-back for the whole
  // screen. Success resets to Home on its own; the error state offers a button.
  useFocusEffect(
    useCallback(() => {
      const sub = BackHandler.addEventListener('hardwareBackPress', () => true);
      return () => sub.remove();
    }, []),
  );

  // Always-animated progress bar: real progress events push its ceiling
  // forward; completion glides it to 100% and then navigates.
  const trickle = useTrickleProgress();
  const { setCeiling, stop, finish } = trickle;

  // Run the drain once, polling the native side channel for progress while the
  // single long drain call is in flight. Both run concurrently on separate
  // native queues; drainStatus reads a side channel, not the lightclient lock
  // the drain holds, so the poll stays live throughout.
  useEffect(() => {
    let cancelled = false;
    let polling = false;
    const poll = setInterval(async () => {
      if (polling) {
        return;
      }
      polling = true;
      try {
        const status = await drainStatus();
        if (status.ok) {
          const parsed = JSON.parse(status.value) as RPCDrainStatusType | null;
          if (parsed && !cancelled) {
            setProgress(parsed);
          }
        }
      } catch {
        // Transient read/parse between ticks; the next tick recovers.
      } finally {
        polling = false;
      }
    }, 300);

    (async () => {
      let failure: string | null = null;
      try {
        const drain = await drainOrchard();
        if (!drain.ok) {
          failure = drain.error.message;
        } else {
          const parsed: RPCDrainType = JSON.parse(drain.value);
          if (parsed.error) {
            failure = parsed.error;
          }
        }
      } catch (e) {
        failure = `${e}`;
      }
      clearInterval(poll);
      if (cancelled) {
        return;
      }
      if (failure) {
        // Stop the trickle; the drain is no longer progressing.
        stop();
        setErrorMsg(failure);
        return;
      }
      // Mark every transaction sent, then glide the bar to 100% and navigate.
      // (The transmit phase is near-instant next to proving, so the poll
      // rarely observes it — this is what makes the bar reliably finish full
      // instead of stalling where building left it.)
      setProgress({
        total: txCount,
        built: txCount,
        sent: txCount,
        phase: 'transmitting',
      });
      addLastSnackbar(translate('migrationsending.success') as string);
      finish(goHome);
    })();

    return () => {
      cancelled = true;
      clearInterval(poll);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Recompute the ceiling as real progress lands: one step of headroom beyond
  // confirmed work. Building (proving, the slow part) owns the first 90% of the
  // bar and broadcasting the last 10%, so a step is worth 0.9/total while
  // building and 0.1/total while transmitting.
  useEffect(() => {
    if (!progress) {
      return;
    }
    const total = progress.total || txCount;
    if (total <= 0) {
      return;
    }
    const real =
      (BUILD_WEIGHT * progress.built + (1 - BUILD_WEIGHT) * progress.sent) /
      total;
    const step =
      (progress.phase === 'transmitting' ? 1 - BUILD_WEIGHT : BUILD_WEIGHT) /
      total;
    setCeiling(real + step);
  }, [progress, txCount, setCeiling]);

  const statusMeta: Record<TxStatus, { key: string; color: string }> = {
    queued: {
      key: 'migrationsending.status-queued',
      color: colors.fgMuted,
    },
    calculating: {
      key: 'migrationsending.status-calculating',
      color: colors.fgAccent,
    },
    calculated: {
      key: 'migrationsending.status-calculated',
      color: colors.fgDefault,
    },
    sending: {
      key: 'migrationsending.status-sending',
      color: colors.fgAccent,
    },
    sent: {
      key: 'migrationsending.status-sent',
      color: colors.fgAccent,
    },
  };

  const title = (
    <BoldText style={{ fontSize: 22, marginBottom: 10 }}>
      {translate('migrationsending.title') as string}
    </BoldText>
  );

  // ----- Error -----
  if (errorMsg) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.bgCanvas }}>
        <ScrollView
          contentContainerStyle={{ padding: 24, paddingTop: 40, flexGrow: 1 }}
        >
          {title}
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
              {translate('migrationsending.error-title') as string}
            </Text>
            <Text
              style={{
                color: colors.fgMuted,
                fontSize: 14,
                textAlign: 'center',
              }}
            >
              {errorMsg}
            </Text>
          </View>
        </ScrollView>
        <View
          style={{
            paddingBottom: 24,
            paddingHorizontal: 24,
            alignItems: 'center',
          }}
        >
          <Button
            type={ButtonTypeEnum.Primary}
            title={translate('migrationsending.close') as string}
            onPress={goHome}
          />
        </View>
      </View>
    );
  }

  // ----- Sending -----
  return (
    <View style={{ flex: 1, backgroundColor: colors.bgCanvas }}>
      <ScrollView
        contentContainerStyle={{
          paddingHorizontal: 24,
          paddingTop: 40,
          paddingBottom: 24,
        }}
      >
        {title}
        <Text
          style={{
            color: colors.fgMuted,
            fontSize: 15,
            lineHeight: 22,
            marginBottom: 18,
          }}
        >
          {translate('migrationsending.subtitle') as string}
        </Text>

        {/* Total value moving into Ironwood across all transactions. */}
        <View
          style={{
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: 28,
          }}
        >
          <Text style={{ color: colors.fgMuted, fontSize: 14 }}>
            {translate('migrationsending.total') as string}
          </Text>
          <Text
            style={{ color: colors.fgDefault, fontSize: 16, fontWeight: '700' }}
          >
            {totalTransferredStr}
          </Text>
        </View>

        {transactions.map((tx, i) => {
          const meta = statusMeta[deriveStatus(i, progress)];
          // The value this transaction moves into Ironwood (its single output).
          const value = fmt(tx.output);
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
                {(translate('migrationsending.tx') as string).replace(
                  '{n}',
                  String(i + 1),
                )}
              </Text>
              <Text
                style={{ color: colors.fgAccent, fontSize: 14, flexShrink: 1 }}
                numberOfLines={1}
              >
                {value}
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

      {/* Pinned above the hint. Proving reports no discrete steps, so the
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
          {translate('migrationsending.hint') as string}
        </Text>
      </View>
    </View>
  );
};

export default MigrationSending;
