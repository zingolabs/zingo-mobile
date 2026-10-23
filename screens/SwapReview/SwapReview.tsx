/* eslint-disable react-native/no-inline-styles */
import React, { useCallback, useContext, useRef, useState } from 'react';
import { View } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { space8, useTheme } from '@app/theme';
import { AppDrawerParamList } from '@app/types';
import { Route } from '@app/AppState';
import { ContextAppLoaded, useSwapService } from '@app/context';
import {
  SwapDirectionEnum,
  canonicalChainAddress,
  commitRefusalCondemnsRoute,
  depositCarriesMemo,
  depositSpendsSourceAddress,
  describeCommitFailure,
  formatAmountForDisplay,
  providerShortLabel,
  renderSwapText,
  zecNetworkFeeReserve,
} from '@app/swap';
import type { DepositInstructionsType } from '@app/swap';
import { reserveRefundAddress } from '@app/walletBackend';
import { sendGateOpen } from '@app/walletBackend/transforms/mixnetView';
import { deliver } from '@app/navigation/results';
import { BottomSheetModal } from '@gorhom/bottom-sheet';
import AuthorizeSheet from './AuthorizeSheet';
import Utils from '@app/utils';
import Text from '@ui/primitives/Text';
import Button from '@ui/primitives/Button';
import { chainDisplayName } from '@ui/widgets/chainDisplayName';
import { ClockIcon } from '@ui/primitives/Icons/ClockIcon';
import SwapFlowScreen from '@screens/Swap/components/SwapFlowScreen';
import PairHero from '@screens/Swap/components/PairHero';
import NymNote from '@screens/Swap/components/NymNote';
import DetailRows from '@screens/Swap/components/DetailRows';
import ContactInitial from '@screens/Swap/components/ContactInitial';
import { InfoTipHost } from '@ui/widgets/InfoTip';
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
    mixnetView,
    info,
    sendSwapDeposit,
    addressBook,
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

  // Spending from this wallet asks for the device lock when Confirm is
  // pressed. A deposit paid from the other wallet takes nothing here.
  const authSheetRef = useRef<BottomSheetModal>(null);

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
      const reason = renderSwapText(
        describeCommitFailure(e, chosen.provider),
        key => (translate(key) as string).trim(),
      );
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
    translate,
  ]);

  const onConfirm = () => {
    if (isOutbound && biometrics) {
      authSheetRef.current?.present();
      return;
    }
    commit();
  };

  /** The fee as a share of what is sold, with its dollars; the amount when no share can be told. */
  const sellAmount = parseFloat(quoteInput.sellAmountHumanDecimal);
  const feesInSell = parseFloat(chosen.totalFeesInSellAsset ?? '');
  const feesInReceive = parseFloat(chosen.totalFeesInReceiveAsset ?? '');
  const receiveAmount = parseFloat(chosen.expectedReceiveAmount);
  const feeShare = Number.isFinite(feesInSell)
    ? feesInSell / sellAmount
    : Number.isFinite(feesInReceive)
      ? feesInReceive / (receiveAmount + feesInReceive)
      : NaN;
  const feeUsd = Number.isFinite(feesInSell)
    ? feesInSell * fiatValueBasis.sellUsdUnitPrice
    : feesInReceive * fiatValueBasis.receiveUsdUnitPrice;
  const feeValue = Number.isFinite(feeShare)
    ? [
        `${(feeShare * 100).toFixed(2)}%`,
        Number.isFinite(feeUsd) && feeUsd > 0 ? `≈ $${feeUsd.toFixed(2)}` : '',
      ]
        .filter(Boolean)
        .join(' · ')
    : feeText;
  const receiveUsd = receiveAmount * fiatValueBasis.receiveUsdUnitPrice;

  const counterpartyChain = counterparty.chain;
  const contact = address
    ? addressBook.find(
        c =>
          c.swapChain.toUpperCase() === counterpartyChain.toUpperCase() &&
          c.address === canonicalChainAddress(counterpartyChain, address),
      )
    : undefined;

  const footer = (
    <View style={{ rowGap: space8 }}>
      {!!error && (
        <Text variant="caption" tone="danger" style={{ textAlign: 'center' }}>
          {error}
        </Text>
      )}
      <Button
        testID="swap.review.confirm"
        variant={isOutbound ? 'nym' : 'primary'}
        title={
          isOutbound
            ? mixnetReady
              ? (translate('swap.review-confirm') as string)
              : (translate('swap.review-mixnet-wait') as string)
            : (translate('swap.review-generate') as string)
        }
        busy={committing}
        disabled={committing || !swapService || (isOutbound && !mixnetReady)}
        onPress={onConfirm}
      />
      <Button
        testID="swap.review.cancel"
        variant="quiet"
        title={translate('swap.cancel') as string}
        disabled={committing}
        onPress={back}
      />
    </View>
  );

  return (
    <InfoTipHost>
      <SwapFlowScreen
        testID="swap.review"
        title={translate('swap.review-title') as string}
        onBack={committing ? undefined : back}
        footer={footer}
      >
        <PairHero
          from={quoteInput.sellAsset}
          to={quoteInput.receiveAsset}
          processing={
            isOutbound
              ? (translate('send.nym-processing-title') as string)
              : undefined
          }
          title={(
            translate(
              isOutbound ? 'swap.review-swap-to' : 'swap.review-swap-from',
            ) as string
          ).replace('{coin}', isOutbound ? receiveSymbol : sellSymbol)}
          amount={formatAmountForDisplay(chosen.expectedReceiveAmount)}
          unit={receiveSymbol}
          line={[
            (translate('swap.review-for') as string).replace(
              '{amount}',
              `${formatAmountForDisplay(quoteInput.sellAmountHumanDecimal)} ${sellSymbol}`,
            ),
            fiatValueBasis.receiveUsdUnitPrice > 0 &&
            Number.isFinite(receiveUsd)
              ? `≈ $${receiveUsd.toFixed(2)}`
              : '',
          ]
            .filter(Boolean)
            .join(' · ')}
        />
        <View style={{ marginTop: 24 }}>
          <DetailRows
            rows={[
              {
                label: translate('swap.you-send') as string,
                value: `${formatAmountForDisplay(quoteInput.sellAmountHumanDecimal)} ${sellSymbol}`,
              },
              {
                label: translate('swap.review-min') as string,
                value: `${formatAmountForDisplay(chosen.minReceiveAmount)} ${receiveSymbol}`,
                tone: 'positive',
                tip: translate('swap.tip-min') as string,
              },
              {
                label: translate('swap.review-fees') as string,
                value: feeValue,
                tip: translate('swap.tip-fees') as string,
              },
              ...(isOutbound
                ? [
                    {
                      label: translate('swap.review-zcash-fee') as string,
                      value: `${Utils.parseNumberFloatToStringLocale(feeReserve, 4)} ${info.currencyName} · ${
                        translate(
                          depositCarriesMemo(chosen.provider)
                            ? 'swap.review-two-tx'
                            : 'swap.review-one-tx',
                        ) as string
                      }`,
                      tip: translate('swap.tip-net') as string,
                    },
                  ]
                : []),
              ...(counterpartyNetwork
                ? [
                    {
                      label: translate(
                        isOutbound
                          ? 'swap.review-dest-network'
                          : 'swap.review-source-network',
                      ) as string,
                      value: counterpartyNetwork,
                    },
                  ]
                : []),
              {
                label: translate('swap.review-arrives') as string,
                value: [
                  chosen.estimatedTimeText
                    ? `~${chosen.estimatedTimeText}`
                    : '',
                  providerShortLabel(chosen.provider),
                ]
                  .filter(Boolean)
                  .join(' · '),
              },
              {
                label: translate(
                  isOutbound ? 'swap.review-to' : 'swap.refund-address',
                ) as string,
                value: contact
                  ? `${contact.label}  ${Utils.trimToSmall(address ?? '', 6)}`
                  : Utils.trimToSmall(address ?? '', 6),
                mono: !contact,
                leading: contact ? (
                  <ContactInitial
                    name={contact.label}
                    color={contact.color}
                    size={24}
                  />
                ) : undefined,
              },
              {
                label: translate('swap.slippage') as string,
                value: `${formatSlippagePercent(slippage)}%`,
                tip: translate('swap.tip-slip') as string,
              },
              ...(isOutbound
                ? [
                    {
                      label: translate('swap.review-if-refunded') as string,
                      value: translate(
                        'swap.review-refund-new-address',
                      ) as string,
                    },
                  ]
                : []),
            ]}
          />
        </View>
        <View
          style={{
            flexDirection: 'row',
            justifyContent: 'center',
            alignItems: 'center',
            columnGap: 6,
            marginTop: 14,
          }}
        >
          <ClockIcon size={14} color={colors.fgMuted} />
          <Text variant="caption" tone="muted">
            {translate('swap.review-price-fixed') as string}
          </Text>
        </View>
        <View style={{ marginTop: 16 }}>
          {isOutbound ? (
            <NymNote text={translate('swap.review-nym-note') as string} />
          ) : (
            <Text
              variant="caption"
              tone="muted"
              style={{ textAlign: 'center' }}
            >
              {translate('swap.review-next-address') as string}
            </Text>
          )}
        </View>
        <AuthorizeSheet
          ref={authSheetRef}
          summary={`${translate('swap.auth-line-1') as string} ${formatAmountForDisplay(quoteInput.sellAmountHumanDecimal)} ${sellSymbol} ${translate('swap.auth-line-2') as string} ${providerShortLabel(chosen.provider)}.`}
          onAuthorized={commit}
        />
      </SwapFlowScreen>
    </InfoTipHost>
  );
};

export default SwapReview;
