/* eslint-disable react-native/no-inline-styles */
import React, {
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';
import { View } from 'react-native';
import Clipboard from '@react-native-clipboard/clipboard';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { space12, space16, space8, useTheme } from '@app/theme';
import { AppDrawerParamList } from '@app/types';
import { Route } from '@app/AppState';
import { ContextAppLoaded, useSwapService } from '@app/context';
import {
  DepositAfterDeshieldError,
  SwapDirectionEnum,
  SwapStatusEnum,
  canResendSale,
  depositDeadlineMs,
  formatAmountForDisplay,
  heldDeshield,
  isRefunding,
  isTerminalStatus,
  prefillFromRecord,
  providerShortLabel,
  saleDepositRequest,
  unsentSale,
} from '@app/swap';
import { leaveFlow } from '@app/navigation/navigate';
import Text from '@ui/primitives/Text';
import Button from '@ui/primitives/Button';
import ButtonStack from '@ui/primitives/ButtonStack';
import TextField from '@ui/primitives/TextField';
import { ClipboardPasteIcon } from '@ui/primitives/Icons/ClipboardPasteIcon';
import Banner from '@ui/widgets/Banner';
import SwapFlowScreen from '@screens/Swap/components/SwapFlowScreen';
import DepositSlip from '@screens/Swap/components/DepositSlip';
import DepositSentSheet from '@screens/Swap/components/DepositSentSheet';
import { BottomSheetModal } from '@gorhom/bottom-sheet';
import { useSwapRecord } from '@screens/Swap/useSwapRecord';
import { useRemoveSwap } from '@screens/Swap/useRemoveSwap';
import AuthorizeSheet from '@screens/SwapReview/AuthorizeSheet';

type SwapDepositProps = NativeStackScreenProps<
  AppDrawerParamList,
  typeof Route.SwapDeposit
>;

/**
 * The deposit a swap waits for. Buying ZEC, it is paid from the other wallet:
 * the slip says where, how much and with what memo, and the user says when
 * it is sent. Opened again from the tracking, the slip is read-only and the
 * arrow goes back there. No time shows. Selling ZEC, it is the sale whose
 * ZEC did not leave: sent again while its quote holds, a new quote after,
 * or deleted.
 */
const SwapDeposit: React.FunctionComponent<SwapDepositProps> = ({
  navigation,
  route,
}) => {
  const { recordId, broadcastError } = route.params;
  const { translate, biometrics, sendSwapDeposit, resumeSwapDeposit } =
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
  const sentSheetRef = useRef<BottomSheetModal>(null);
  const authSheetRef = useRef<BottomSheetModal>(null);

  useEffect(() => {
    const timer = setInterval(() => setNowMs(Date.now()), 30_000);
    return () => clearInterval(timer);
  }, []);

  const isOutbound = record?.direction === SwapDirectionEnum.Outbound;
  const deadlineMs = record ? depositDeadlineMs(record) : 0;
  const remainingMs = deadlineMs - nowMs;
  const awaiting =
    !!record && record.status === SwapStatusEnum.AwaitingExternalDeposit;

  // A record that moved on is no longer this screen's. One out of time is
  // asked about once; the poller expires it and the record leaves by itself.
  const expiryAsked = useRef<boolean>(false);
  useEffect(() => {
    if (!record) {
      return;
    }
    if (isTerminalStatus(record.status)) {
      navigation.replace(
        record.status === SwapStatusEnum.Expired
          ? Route.SwapDetail
          : Route.SwapResult,
        { recordId },
      );
      return;
    }
    if (isOutbound ? !unsentSale(record) : !awaiting) {
      navigation.replace(
        isRefunding(record) ? Route.SwapDetail : Route.SwapTracking,
        { recordId },
      );
      return;
    }
    if (awaiting && remainingMs <= 0 && swapService && !expiryAsked.current) {
      expiryAsked.current = true;
      swapService.forceRefresh().catch(() => {});
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
    // Once this sale's deshield went out, zingolib holds its vault payment
    // for a resume until the app restarts; after that it is sent anew.
    const deshieldTxId =
      record.broadcast?.txId === undefined
        ? record.broadcast?.allTxIds?.[0]
        : undefined;
    const resume = heldDeshield(deshieldTxId);
    try {
      let txIds: string[];
      try {
        txIds = resume
          ? await resumeSwapDeposit()
          : await sendSwapDeposit(saleDepositRequest(record));
      } catch (e) {
        if (
          e instanceof DepositAfterDeshieldError &&
          e.kind === 'failed' &&
          e.deshieldTxId &&
          !resume
        ) {
          await swapService.markDeshielded({
            recordId,
            deshieldTxId: e.deshieldTxId,
          });
        }
        throw e;
      }
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
      // Another sale's held deposit refuses this one before anything leaves.
      setRetryError(
        e instanceof DepositAfterDeshieldError &&
          e.kind === 'pending' &&
          e.deshieldTxId !== deshieldTxId
          ? (translate('swap.deposit-other-held') as string)
          : `${e}`,
      );
    } finally {
      setRetrying(false);
    }
  }, [
    record,
    swapService,
    resumeSwapDeposit,
    sendSwapDeposit,
    recordId,
    navigation,
    translate,
  ]);
  const onRetry = () => {
    if (biometrics) {
      authSheetRef.current?.present();
      return;
    }
    retry();
  };
  const leave = useCallback(() => leaveFlow(navigation), [navigation]);
  const removeSwap = useRemoveSwap(leave);

  if (!record) {
    return <View style={{ flex: 1, backgroundColor: colors.bgCanvas }} />;
  }

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
        trailingIcon={ClipboardPasteIcon}
        trailingLabel={translate('paste') as string}
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
    // Past its quote the ZEC is not sent again: a new quote takes over.
    const resendable = canResendSale(record, nowMs);
    return (
      <SwapFlowScreen
        testID="swap.deposit"
        title={translate('swap.deposit-unsent-title') as string}
        onClose={() => leaveFlow(navigation)}
        footer={
          <ButtonStack>
            <Button
              testID="swap.deposit.remove"
              variant="dangerText"
              title={translate('swap.delete') as string}
              disabled={retrying}
              onPress={() => removeSwap(record)}
            />
            {resendable ? (
              <Button
                testID="swap.deposit.retry"
                variant="nym"
                title={translate('swap.deposit-retry') as string}
                busy={retrying}
                disabled={retrying}
                onPress={onRetry}
              />
            ) : (
              <Button
                testID="swap.deposit.new-quote"
                variant="primary"
                title={translate('swap.get-new-quote') as string}
                onPress={() =>
                  navigation.navigate(
                    Route.Home,
                    {
                      screen: Route.Swap,
                      params: {
                        prefill: prefillFromRecord(record, Date.now()),
                      },
                    },
                    { pop: true },
                  )
                }
              />
            )}
          </ButtonStack>
        }
      >
        <Banner
          tone="warning"
          title={
            translate(
              resendable
                ? 'swap.deposit-unsent'
                : 'swap.deposit-unsent-expired',
            ) as string
          }
        >
          {(resendable && retryError) || undefined}
        </Banner>
        <View style={{ height: space12 }} />
        <DepositSlip record={record} paid />
        <View style={{ marginTop: space16 }}>
          <Text variant="caption" tone="muted">
            {translate('swap.deposit-left-anyway') as string}
          </Text>
          <View style={{ height: space8 }} />
          {hashBox}
        </View>
        <AuthorizeSheet
          ref={authSheetRef}
          summary={`${translate('swap.auth-line-1') as string} ${formatAmountForDisplay(record.sellAmountHumanDecimal)} ${record.sellAsset.symbol} ${translate('swap.auth-line-2') as string} ${providerShortLabel(record.provider)}.`}
          onAuthorized={retry}
        />
      </SwapFlowScreen>
    );
  }

  const toTracking = () => navigation.replace(Route.SwapTracking, { recordId });
  const sent = record.depositSentAtMs !== undefined;

  return (
    <SwapFlowScreen
      testID="swap.deposit"
      title={translate('swap.deposit-title') as string}
      onBack={sent ? toTracking : undefined}
      footer={
        sent ? undefined : (
          <View style={{ rowGap: space8 }}>
            <Button
              testID="swap.deposit.sent"
              variant="primary"
              title={translate('swap.deposit-sent') as string}
              onPress={() => sentSheetRef.current?.present()}
            />
            <Text
              variant="caption"
              tone="muted"
              style={{ textAlign: 'center' }}
            >
              {translate('swap.deposit-leave-note') as string}
            </Text>
          </View>
        )
      }
    >
      <DepositSlip record={record} />
      <DepositSentSheet
        ref={sentSheetRef}
        record={record}
        onConfirm={async () => {
          await swapService
            ?.markDepositSent({ recordId })
            .catch(e =>
              console.log(`SwapDeposit: markDepositSent failed ${e}`),
            );
        }}
        onConfirmed={toTracking}
      />
    </SwapFlowScreen>
  );
};

export default SwapDeposit;
