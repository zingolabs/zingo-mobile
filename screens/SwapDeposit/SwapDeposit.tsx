/* eslint-disable react-native/no-inline-styles */
import React, { useCallback, useContext, useEffect, useState } from 'react';
import { View } from 'react-native';
import Clipboard from '@react-native-clipboard/clipboard';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import {
  radiusMd,
  space12,
  space16,
  space4,
  space8,
  useTheme,
} from '@app/theme';
import { AppDrawerParamList } from '@app/types';
import { Route } from '@app/AppState';
import { ContextAppLoaded, useSwapService } from '@app/context';
import {
  SwapDirectionEnum,
  SwapStatusEnum,
  formatAmountForDisplay,
  isTerminalStatus,
  providerShortLabel,
} from '@app/swap';
import { leaveFlow } from '@app/navigation/navigate';
import Text from '@ui/primitives/Text';
import Button from '@ui/primitives/Button';
import ButtonStack from '@ui/primitives/ButtonStack';
import TextField from '@ui/primitives/TextField';
import Banner from '@ui/widgets/Banner';
import { ClockIcon } from '@ui/primitives/Icons/ClockIcon';
import SwapFlowScreen from '@screens/Swap/components/SwapFlowScreen';
import DepositSlip from '@screens/Swap/components/DepositSlip';
import { useSwapRecord } from '@screens/Swap/useSwapRecord';
import { countdownText, depositDeadlineMs } from '@screens/Swap/swapProgress';

type SwapDepositProps = NativeStackScreenProps<
  AppDrawerParamList,
  typeof Route.SwapDeposit
>;

/** The error text zingolib answers when the deshield went out and the vault payment did not. */
const AFTER_DESHIELD = 'send after deshield';

/**
 * The deposit a swap waits for. Buying ZEC, it is paid from the other wallet:
 * the slip says where, how much and with what memo, and the user says when
 * it is sent or hands over its hash. Selling ZEC, this screen appears only
 * when the wallet's own broadcast failed, with the way to try again.
 */
const SwapDeposit: React.FunctionComponent<SwapDepositProps> = ({
  navigation,
  route,
}) => {
  const { recordId, broadcastError } = route.params;
  const { translate, sendSwapDeposit, resumeSwapDeposit } =
    useContext(ContextAppLoaded);
  const { colors } = useTheme();
  const swapService = useSwapService();
  const record = useSwapRecord(recordId);

  const [nowMs, setNowMs] = useState<number>(() => Date.now());
  const [hash, setHash] = useState<string>('');
  const [attaching, setAttaching] = useState<boolean>(false);
  const [attachError, setAttachError] = useState<string>('');
  const [retryError, setRetryError] = useState<string>(broadcastError ?? '');
  const [retrying, setRetrying] = useState<boolean>(false);

  useEffect(() => {
    const timer = setInterval(() => setNowMs(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  const isOutbound = record?.direction === SwapDirectionEnum.Outbound;
  const deadlineMs = record ? depositDeadlineMs(record) : 0;
  const remainingMs = deadlineMs - nowMs;
  const awaiting =
    !!record && record.status === SwapStatusEnum.AwaitingExternalDeposit;

  // A record that moved on, or ran out of time, is no longer this screen's.
  useEffect(() => {
    if (!record) {
      return;
    }
    if (isTerminalStatus(record.status)) {
      navigation.replace(Route.SwapResult, { recordId });
      return;
    }
    if (!isOutbound && !awaiting) {
      navigation.replace(Route.SwapTracking, { recordId });
      return;
    }
    if (awaiting && remainingMs <= 0 && swapService) {
      navigation.replace(Route.SwapResult, { recordId });
    }
  }, [
    record,
    isOutbound,
    awaiting,
    remainingMs,
    swapService,
    navigation,
    recordId,
  ]);

  const attach = useCallback(async () => {
    const trimmed = hash.trim();
    if (!trimmed || !swapService || !record) {
      return;
    }
    setAttaching(true);
    setAttachError('');
    try {
      if (isOutbound) {
        await swapService.markBroadcasted({ recordId, txId: trimmed });
      } else {
        await swapService.setObservedDepositTxHash({ recordId, hash: trimmed });
      }
      navigation.replace(Route.SwapTracking, { recordId });
    } catch (e) {
      setAttachError(`${e}`);
    } finally {
      setAttaching(false);
    }
  }, [hash, swapService, record, isOutbound, recordId, navigation]);

  const retry = useCallback(async () => {
    if (!record || !swapService) {
      return;
    }
    setRetrying(true);
    setRetryError('');
    try {
      // Once the deshield went out, zingolib keeps the vault payment for a
      // resume; proposing again would drop it.
      const resume = retryError.toLowerCase().includes(AFTER_DESHIELD);
      const txIds = resume
        ? await resumeSwapDeposit()
        : await sendSwapDeposit({
            depositAddress: record.depositAddress,
            amountAtomic: Math.round(
              parseFloat(record.sellAmountHumanDecimal) * 1e8,
            ),
            memoBytes: (record.providerData as { memo?: string }).memo
              ? new TextEncoder().encode(
                  (record.providerData as { memo?: string }).memo,
                )
              : undefined,
            viaSourceAddress:
              !!record.sourceAddress &&
              !!(record.providerData as { memo?: string }).memo,
            shieldedMemoAddress: (
              record.providerData as { shieldedMemoAddress?: string }
            ).shieldedMemoAddress,
          });
      await swapService.markBroadcasted({
        recordId,
        txId: txIds[txIds.length - 1],
        allTxIds:
          resume && record.broadcast?.allTxIds
            ? [...record.broadcast.allTxIds, ...txIds]
            : txIds,
      });
      navigation.replace(Route.SwapTracking, { recordId });
    } catch (e) {
      setRetryError(`${e}`);
    } finally {
      setRetrying(false);
    }
  }, [
    record,
    swapService,
    retryError,
    resumeSwapDeposit,
    sendSwapDeposit,
    recordId,
    navigation,
  ]);

  if (!record) {
    return <View style={{ flex: 1, backgroundColor: colors.bgCanvas }} />;
  }

  const receiveSymbol =
    record.receiveAsset.ticker ?? record.receiveAsset.symbol;
  const hashBox = (
    <View style={{ rowGap: space8 }}>
      <TextField
        testID="swap.deposit.hash"
        label={translate('swap.deposit-hash') as string}
        value={hash}
        onChangeText={setHash}
        placeholder={translate('swap.deposit-hash-placeholder') as string}
        mono
        error={attachError || undefined}
        trailingLabel={translate('swap.paste') as string}
        onTrailingPress={async () =>
          setHash((await Clipboard.getString()).trim())
        }
      />
      <Button
        testID="swap.deposit.attach"
        inline
        variant="text"
        title={translate('swap.deposit-follow') as string}
        disabled={attaching || hash.trim().length === 0}
        busy={attaching}
        onPress={attach}
      />
    </View>
  );

  if (isOutbound) {
    return (
      <SwapFlowScreen
        testID="swap.deposit"
        title={translate('swap.deposit-unsent-title') as string}
        onClose={() => leaveFlow(navigation)}
        footer={
          <ButtonStack>
            <Button
              variant="quiet"
              title={translate('swap.back-to-zingo') as string}
              onPress={() => leaveFlow(navigation)}
            />
            <Button
              testID="swap.deposit.retry"
              variant="nym"
              title={translate('swap.deposit-retry') as string}
              busy={retrying}
              disabled={retrying}
              onPress={retry}
            />
          </ButtonStack>
        }
      >
        <Banner
          tone="warning"
          title={translate('swap.deposit-unsent') as string}
        >
          {!!retryError && <Text variant="bodySmall">{retryError}</Text>}
        </Banner>
        <View style={{ height: space12 }} />
        <DepositSlip record={record} paid />
        <View style={{ marginTop: space16 }}>
          <Text variant="bodySmall" tone="muted">
            {translate('swap.deposit-paid-elsewhere') as string}
          </Text>
          <View style={{ height: space8 }} />
          {hashBox}
        </View>
      </SwapFlowScreen>
    );
  }

  return (
    <SwapFlowScreen
      testID="swap.deposit"
      title={translate('swap.deposit-title') as string}
      footer={
        <View style={{ rowGap: space8 }}>
          <Button
            testID="swap.deposit.sent"
            variant="primary"
            title={translate('swap.deposit-sent') as string}
            onPress={() => navigation.replace(Route.SwapTracking, { recordId })}
          />
          <Text variant="caption" tone="muted" style={{ textAlign: 'center' }}>
            {translate('swap.deposit-leave-note') as string}
          </Text>
        </View>
      }
    >
      <DepositSlip record={record} />
      <View
        style={{
          marginTop: space12,
          borderWidth: 1,
          borderColor: colors.bottomSheetBorder,
          borderRadius: radiusMd,
          paddingHorizontal: space16,
        }}
      >
        <View
          style={{
            flexDirection: 'row',
            justifyContent: 'space-between',
            paddingVertical: 11,
          }}
        >
          <Text variant="bodySmall" tone="muted">
            {translate('swap.you-receive') as string}
          </Text>
          <Text variant="bodyStrong">
            {`≈ ${formatAmountForDisplay(record.expectedReceiveAmount)} ${receiveSymbol}`}
          </Text>
        </View>
        <View
          style={{ height: 1, backgroundColor: colors.bottomSheetBorder }}
        />
        <View
          style={{
            flexDirection: 'row',
            justifyContent: 'space-between',
            paddingVertical: 11,
          }}
        >
          <Text variant="bodySmall" tone="muted">
            {translate('swap.route') as string}
          </Text>
          <Text variant="bodyStrong">
            {providerShortLabel(record.provider)}
          </Text>
        </View>
      </View>
      <View style={{ marginTop: space16 }}>
        <Text variant="bodySmall" tone="muted">
          {translate('swap.deposit-already-paid') as string}
        </Text>
        <View style={{ height: space8 }} />
        {hashBox}
      </View>
      <View
        style={{
          flexDirection: 'row',
          justifyContent: 'center',
          alignItems: 'center',
          columnGap: space4,
          marginTop: space16,
        }}
      >
        <ClockIcon size={14} color={colors.fgMuted} />
        <Text variant="caption" tone="muted">
          {`${translate('swap.deposit-time-left') as string} ${countdownText(remainingMs)}`}
        </Text>
      </View>
    </SwapFlowScreen>
  );
};

export default SwapDeposit;
