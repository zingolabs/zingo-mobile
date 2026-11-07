/* eslint-disable react-native/no-inline-styles */
import React, {
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';
import { View } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { space12, space8, useTheme } from '@app/theme';
import { AppDrawerParamList } from '@app/types';
import { Route } from '@app/AppState';
import { ContextAppLoaded, useSwapService } from '@app/context';
import {
  DepositAfterDeshieldError,
  SwapDirectionEnum,
  SwapStatusEnum,
  canResendSale,
  depositDeadlineMs,
  heldDeshield,
  isRefunding,
  isTerminalStatus,
  isThorchainFamily,
  prefillFromRecord,
  saleDepositRequest,
  sentPaymentsFrom,
  unsentSale,
} from '@app/swap';
import { leaveFlow } from '@app/navigation/navigate';
import Text from '@ui/primitives/Text';
import Button from '@ui/primitives/Button';
import ButtonStack from '@ui/primitives/ButtonStack';
import Banner from '@ui/widgets/Banner';
import SwapFlowScreen from '@screens/Swap/components/SwapFlowScreen';
import DepositSlip from '@screens/Swap/components/DepositSlip';
import DepositSentSheet from '@screens/Swap/components/DepositSentSheet';
import { BottomSheetModal } from '@gorhom/bottom-sheet';
import { useSwapRecord } from '@screens/Swap/useSwapRecord';
import { useRemoveSwap } from '@screens/Swap/useRemoveSwap';
import { useAuthorizeDeposit } from '@screens/SwapReview/useAuthorizeDeposit';

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
 * or deleted. Maya and THORChain sales show no slip: `/track` follows them by
 * the hash of the payment, which only this wallet's own send gives the app.
 */
const SwapDeposit: React.FunctionComponent<SwapDepositProps> = ({
  navigation,
  route,
}) => {
  const { recordId, broadcastError } = route.params;
  const { translate, sendSwapDeposit, resumeSwapDeposit, valueTransfers } =
    useContext(ContextAppLoaded);
  const { colors } = useTheme();
  const swapService = useSwapService();
  const record = useSwapRecord(recordId);

  const [nowMs, setNowMs] = useState<number>(() => Date.now());
  const [retryError, setRetryError] = useState<string>(broadcastError ?? '');
  const [retrying, setRetrying] = useState<boolean>(false);
  const sentSheetRef = useRef<BottomSheetModal>(null);
  const authorizeDeposit = useAuthorizeDeposit();

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

  const retry = useCallback(async () => {
    if (!record || !swapService) {
      return;
    }
    setRetrying(true);
    setRetryError('');
    /** A deposit the wallet already shows leaving is this sale's: never pay twice. */
    const found = await swapService
      .claimSaleDeposits(sentPaymentsFrom(valueTransfers ?? []))
      .catch(() => [] as string[]);
    if (found.includes(recordId)) {
      setRetrying(false);
      navigation.replace(Route.SwapTracking, { recordId });
      return;
    }
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
    valueTransfers,
  ]);
  const onRetry = async () => {
    if (!(await authorizeDeposit())) {
      return;
    }
    retry();
  };
  const leave = useCallback(() => leaveFlow(navigation), [navigation]);
  const removeSwap = useRemoveSwap(leave);

  if (!record) {
    return <View style={{ flex: 1, backgroundColor: colors.bgCanvas }} />;
  }

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
        {!isThorchainFamily(record.provider) && (
          <>
            <View style={{ height: space12 }} />
            <DepositSlip record={record} paid />
          </>
        )}
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
