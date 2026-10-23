/* eslint-disable react-native/no-inline-styles */
import React, { useCallback, useContext, useState } from 'react';
import { View } from 'react-native';
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
  commitRefusalCondemnsRoute,
  depositCarriesMemo,
  depositSpendsSourceAddress,
  describeCommitFailure,
  formatAmountForDisplay,
  providerShortLabel,
  zecNetworkFeeReserve,
} from '@app/swap';
import type { DepositInstructionsType } from '@app/swap';
import { reserveRefundAddress } from '@app/walletBackend';
import { sendGateOpen } from '@app/walletBackend/transforms/mixnetView';
import { deliver } from '@app/navigation/results';
import { useBiometricGate } from '@app/hooks/useBiometricGate';
import Utils from '@app/utils';
import Text from '@ui/primitives/Text';
import Button from '@ui/primitives/Button';
import Banner from '@ui/widgets/Banner';
import { chainDisplayName } from '@ui/widgets/chainDisplayName';
import { ClockIcon } from '@ui/primitives/Icons/ClockIcon';
import { WifiIcon } from '@ui/primitives/Icons/WifiIcon';
import SwapFlowScreen from '@screens/Swap/components/SwapFlowScreen';
import SwapSummaryCard from '@screens/Swap/components/SwapSummaryCard';
import { formatSlippagePercent } from '@screens/Swap/components/SwapSettingsSheet';

type SwapReviewProps = NativeStackScreenProps<
  AppDrawerParamList,
  typeof Route.SwapReview
>;

/** Zatoshis for a ZEC amount written in display units, rounded, not drifted. */
const zecToZatoshis = (amountHumanDecimal: string): number =>
  Math.round(parseFloat(amountHumanDecimal) * 1e8);

/** The deposit call a set of instructions asks for, built in one place. */
const depositRequest = (instructions: DepositInstructionsType) => ({
  depositAddress: instructions.depositAddress,
  amountAtomic: zecToZatoshis(instructions.amountHumanDecimal),
  memoBytes: instructions.memoBytes,
  viaSourceAddress: instructions.requiresDepositFromSourceAddress,
  shieldedMemoAddress: instructions.shieldedMemoAddress,
});

/**
 * What the user agreed to, before anything is reserved. Confirming commits
 * the route at the provider and, selling ZEC, pays the deposit; buying ZEC
 * it leads to the address to pay from the other wallet. Backing out costs
 * nothing: the form behind keeps the quote.
 */
const SwapReview: React.FunctionComponent<SwapReviewProps> = ({
  navigation,
  route,
}) => {
  const { review, direction } = route.params;
  const context = useContext(ContextAppLoaded);
  const {
    translate,
    biometrics,
    addLastSnackbar,
    mixnetView,
    info,
    language,
    sendSwapDeposit,
  } = context;
  const { colors } = useTheme();
  const swapService = useSwapService();
  const isOutbound = direction === SwapDirectionEnum.Outbound;
  const mixnetReady = sendGateOpen(mixnetView);

  const leave = useCallback((outcome: 'cancel' | 'done' | string) => {
    deliver('swap.review', outcome);
  }, []);
  const back = useCallback(() => {
    leave('cancel');
    navigation.goBack();
  }, [leave, navigation]);

  // Spending from this wallet asks for the device lock on entry, as Confirm
  // does for a send. A deposit paid from the other wallet takes nothing here.
  const screenGate = useBiometricGate({
    needsAuth: biometrics && isOutbound,
    translate,
    addLastSnackbar,
    onCancel: back,
  });

  const [committing, setCommitting] = useState<boolean>(false);
  const [error, setError] = useState<string>('');

  const { route: chosen, quoteInput, fiatValueBasis } = review;
  const sellSymbol = quoteInput.sellAsset.ticker ?? quoteInput.sellAsset.symbol;
  const receiveSymbol =
    quoteInput.receiveAsset.ticker ?? quoteInput.receiveAsset.symbol;
  const counterparty = isOutbound
    ? quoteInput.receiveAsset
    : quoteInput.sellAsset;
  const counterpartyNetwork =
    counterparty.chain !== counterparty.symbol
      ? chainDisplayName(counterparty.chain) || counterparty.chain
      : '';
  const slippage = quoteInput.slippageBps ?? 0;
  const feeReserve = isOutbound ? zecNetworkFeeReserve(chosen.provider) : 0;
  const feeText = isOutbound
    ? chosen.totalFeesInSellAsset
      ? `${formatAmountForDisplay(chosen.totalFeesInSellAsset)} ${sellSymbol}`
      : '—'
    : chosen.totalFeesInReceiveAsset
      ? `${formatAmountForDisplay(chosen.totalFeesInReceiveAsset)} ${receiveSymbol}`
      : '—';
  const minReceiveUsd =
    parseFloat(chosen.minReceiveAmount) * fiatValueBasis.receiveUsdUnitPrice;
  // Inbound, the far side is the source: where the sold asset returns.
  const address = isOutbound
    ? quoteInput.destinationAddress
    : quoteInput.sourceAddress;

  const commit = useCallback(async () => {
    if (!swapService) {
      return;
    }
    setCommitting(true);
    setError('');
    let committed;
    try {
      committed = await swapService.commitRoute({
        quoteInput,
        chosenRoute: chosen,
        direction,
        fiatValueBasis,
      });
    } catch (e) {
      const reason = describeCommitFailure(e, chosen.provider);
      setCommitting(false);
      if (commitRefusalCondemnsRoute(e)) {
        leave(`refused:${chosen.provider}:${reason}`);
        navigation.goBack();
        return;
      }
      setError(reason);
      return;
    }
    // The address the commit named is spoken for, paid or not, so the next
    // swap is handed the following one. A deposit paid through the source
    // address reserves it itself through the proposal it applies.
    const claimedByDeposit =
      isOutbound &&
      depositSpendsSourceAddress(depositRequest(committed.instructions));
    if (!claimedByDeposit) {
      const reserved = await reserveRefundAddress();
      if (!reserved.ok) {
        console.error(
          `SwapReview: could not reserve the refund address ${reserved.error.message}`,
        );
      }
    }
    leave('done');
    const recordId = committed.record.recordId;
    if (!isOutbound) {
      navigation.replace(Route.SwapDeposit, { recordId });
      return;
    }
    try {
      const txIds = await sendSwapDeposit(
        depositRequest(committed.instructions),
      );
      // The provider watches the transaction that pays the vault, the last.
      await swapService.markBroadcasted({
        recordId,
        txId: txIds[txIds.length - 1],
        allTxIds: txIds,
      });
      navigation.replace(Route.SwapTracking, { recordId });
    } catch (e) {
      // The swap is reserved and payable by hand, so the deposit screen takes
      // over with the address and the way to try again.
      navigation.replace(Route.SwapDeposit, {
        recordId,
        broadcastError: `${e}`,
      });
    }
  }, [
    swapService,
    quoteInput,
    chosen,
    direction,
    fiatValueBasis,
    isOutbound,
    sendSwapDeposit,
    navigation,
    leave,
  ]);

  if (screenGate.kind !== 'passed') {
    return <View style={{ flex: 1, backgroundColor: colors.bgCanvas }} />;
  }

  const row = (
    label: string,
    value: string,
    sub?: string,
    valueTone: 'default' | 'accent' = 'default',
  ) => (
    <View
      style={{
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        columnGap: space12,
        paddingVertical: 11,
      }}
    >
      <Text variant="bodySmall" tone="muted">
        {label}
      </Text>
      <View style={{ alignItems: 'flex-end', flexShrink: 1 }}>
        <Text
          variant="bodyStrong"
          tone={valueTone}
          style={{ textAlign: 'right' }}
        >
          {value}
        </Text>
        {!!sub && (
          <Text variant="caption" tone="muted">
            {sub}
          </Text>
        )}
      </View>
    </View>
  );
  const divider = (
    <View style={{ height: 1, backgroundColor: colors.bottomSheetBorder }} />
  );

  const footer = (
    <View style={{ rowGap: space8 }}>
      {!!error && (
        <Text variant="caption" tone="danger" style={{ textAlign: 'center' }}>
          {error}
        </Text>
      )}
      <View
        style={{
          flexDirection: 'row',
          justifyContent: 'center',
          alignItems: 'center',
          columnGap: space4,
        }}
      >
        {isOutbound && !mixnetReady ? (
          <>
            <WifiIcon size={14} color={colors.fgWarning} />
            <Text variant="caption" tone="warning">
              {translate('swap.review-mixnet-wait') as string}
            </Text>
          </>
        ) : (
          <>
            <ClockIcon size={14} color={colors.fgMuted} />
            <Text variant="caption" tone="muted">
              {translate('swap.review-price-fixed') as string}
            </Text>
          </>
        )}
      </View>
      <Button
        testID="swap.review.confirm"
        variant={isOutbound ? 'nym' : 'primary'}
        title={
          isOutbound
            ? (translate('swap.review-confirm') as string)
            : (translate('swap.review-generate') as string)
        }
        busy={committing}
        disabled={committing || !swapService || (isOutbound && !mixnetReady)}
        onPress={commit}
      />
    </View>
  );

  return (
    <SwapFlowScreen
      testID="swap.review"
      title={
        isOutbound
          ? (translate('swap.review-title-sell') as string)
          : (translate('swap.review-title-buy') as string)
      }
      onBack={committing ? undefined : back}
      footer={footer}
    >
      <SwapSummaryCard
        testID="swap.review.summary"
        sides={[
          {
            label: translate('swap.you-send') as string,
            asset: quoteInput.sellAsset,
            amount: quoteInput.sellAmountHumanDecimal,
            usdUnitPrice: fiatValueBasis.sellUsdUnitPrice,
          },
          {
            label: isOutbound
              ? (translate('swap.you-receive') as string)
              : (translate('swap.receive-in-zingo') as string),
            asset: quoteInput.receiveAsset,
            amount: chosen.expectedReceiveAmount,
            usdUnitPrice: fiatValueBasis.receiveUsdUnitPrice,
          },
        ]}
      />
      <View
        style={{
          marginTop: space12,
          borderWidth: 1,
          borderColor: colors.bottomSheetBorder,
          borderRadius: radiusMd,
          paddingHorizontal: space16,
        }}
      >
        {row(
          translate('swap.review-min') as string,
          `${formatAmountForDisplay(chosen.minReceiveAmount)} ${receiveSymbol}`,
          fiatValueBasis.receiveUsdUnitPrice > 0 &&
            Number.isFinite(minReceiveUsd)
            ? `≈ $${minReceiveUsd.toFixed(2)}`
            : undefined,
          'accent',
        )}
        {divider}
        {row(translate('swap.review-fees') as string, feeText)}
        {isOutbound && (
          <>
            {divider}
            {row(
              translate('swap.review-zcash-fee') as string,
              `${Utils.parseNumberFloatToStringLocale(feeReserve, 4)} ${info.currencyName}`,
              translate(
                depositCarriesMemo(chosen.provider)
                  ? 'swap.review-two-tx'
                  : 'swap.review-one-tx',
              ) as string,
            )}
          </>
        )}
        {!!counterpartyNetwork && (
          <>
            {divider}
            {row(
              translate(
                isOutbound
                  ? 'swap.review-dest-network'
                  : 'swap.review-source-network',
              ) as string,
              counterpartyNetwork,
            )}
          </>
        )}
        {divider}
        {row(
          translate('swap.review-arrives') as string,
          `${chosen.estimatedTimeText ? `${chosen.estimatedTimeText} · ` : ''}${providerShortLabel(chosen.provider)}`,
        )}
        {divider}
        {row(
          translate(
            isOutbound ? 'swap.review-to-address' : 'swap.refund-address',
          ) as string,
          Utils.trimToSmall(address ?? '', 8),
        )}
      </View>
      {!isOutbound && (
        <Text
          variant="caption"
          tone="muted"
          style={{ textAlign: 'center', marginTop: space12 }}
        >
          {translate('swap.review-next-address') as string}
        </Text>
      )}
      <View
        style={{
          marginTop: space12,
          borderWidth: 1,
          borderColor: colors.bottomSheetBorder,
          borderRadius: radiusMd,
          paddingHorizontal: space16,
        }}
      >
        {row(
          translate('swap.slippage') as string,
          `${formatSlippagePercent(slippage)}%`,
        )}
        {isOutbound && (
          <>
            {divider}
            {row(
              translate('swap.review-if-refunded') as string,
              translate('swap.review-refund-new-address') as string,
            )}
          </>
        )}
      </View>
      {isOutbound && (
        <View style={{ marginTop: space12 }}>
          <Banner
            tone="info"
            title={translate('swap.review-irreversible') as string}
          />
        </View>
      )}
      <Text
        variant="caption"
        tone="muted"
        style={{ textAlign: 'center', marginTop: space12 }}
      >
        {Utils.formatDate(Date.now(), 'MMM d, h:mm aaa', language)}
      </Text>
    </SwapFlowScreen>
  );
};

export default SwapReview;
