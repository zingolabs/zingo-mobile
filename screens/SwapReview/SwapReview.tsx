/* eslint-disable react-native/no-inline-styles */
import React, { useCallback, useContext, useState } from 'react';
import { View } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { space8, useTheme, iconSizeSm } from '@app/theme';
import { AppDrawerParamList } from '@app/types';
import { GlobalConst, Route, SnackbarDurationEnum } from '@app/AppState';
import AddressBookFileImpl from '@app/services/AddressBookFileImpl';
import { ContextAppLoaded, useSwapService } from '@app/context';
import {
  DepositAfterDeshieldError,
  SwapDirectionEnum,
  canonicalChainAddress,
  commitRefusalCondemnsRoute,
  depositCarriesMemo,
  depositSpendsSourceAddress,
  describeCommitFailure,
  formatAmountForDisplay,
  isTokenAsset,
  orderNamesEphemeral,
  providerRequiresMemo,
  providerShortLabel,
  renderSwapText,
  zecNetworkFeeReserve,
  swapAddressOf,
} from '@app/swap';
import type { DepositInstructionsType } from '@app/swap';
import { reserveRefundAddress } from '@app/walletBackend';
import { sendGateOpen } from '@app/walletBackend/transforms/mixnetView';
import { deliver } from '@app/navigation/results';
import { useAuthorizeDeposit } from './useAuthorizeDeposit';
import Utils from '@app/utils';
import Text from '@ui/primitives/Text';
import Button from '@ui/primitives/Button';
import Checkbox from '@ui/primitives/Checkbox';
import { chainDisplayName } from '@ui/widgets/chainDisplayName';
import { ClockIcon } from '@ui/primitives/Icons/ClockIcon';
import { ShieldIcon } from '@ui/primitives/Icons/ShieldIcon';
import SwapFlowScreen from '@screens/Swap/components/SwapFlowScreen';
import PairHero from '@screens/Swap/components/PairHero';
import NymNote from '@screens/Swap/components/NymNote';
import DetailRows from '@screens/Swap/components/DetailRows';
import { routeFeeValue } from '@screens/Swap/routeFeeValue';
import { useShieldedRoutes } from '@screens/Swap/useShieldedRoutes';
import Avatar, { avatarCategoryOf } from '@ui/widgets/Avatar';
import { formatSlippagePercent } from '@screens/Swap/components/SwapSettingsSheet';
import { formatAmount, formatUsd } from '@app/utils/formatAmount';

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
    mixnetView,
    info,
    sendSwapDeposit,
    addressBook,
    addLastSnackbar,
    setAddressBook,
    server,
    language,
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
  const authorizeDeposit = useAuthorizeDeposit();

  const [committing, setCommitting] = useState<boolean>(false);
  const [error, setError] = useState<string>('');
  const [memoAcknowledged, setMemoAcknowledged] = useState<boolean>(false);

  const { route: chosen, quoteInput, fiatValueBasis } = review;
  const shielded = useShieldedRoutes({
    direction,
    sellChain: quoteInput.sellAsset.chain,
    providers: [chosen.provider],
  }).isShielded(chosen.provider);
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
  /** Buying ZEC, the other wallet pays: to an address alone, or with a memo it must add. */
  const paysWithMemo = !isOutbound && providerRequiresMemo(chosen.provider);
  /**
   * A token transfer has no room for the memo, so paying one to Maya or
   * THORChain takes a wallet that can add it some other way: the user says so
   * before the address is reserved.
   */
  const memoAckNeeded = paysWithMemo && isTokenAsset(quoteInput.sellAsset);
  const slippage = quoteInput.slippageBps ?? 0;
  const feeReserve = isOutbound ? zecNetworkFeeReserve(chosen.provider) : 0;
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
    const named = orderNamesEphemeral({
      isOutbound,
      quotedDestination: quoteInput.destinationAddress,
      orderedDestination: committed.record.destinationAddress,
    });
    if (named && !claimedByDeposit) {
      const reserved = await reserveRefundAddress();
      if (!reserved.ok) {
        console.error(
          `SwapReview: could not reserve the refund address ${reserved.error.message}`,
        );
      }
    }
    leave('done');
    const recordId = committed.record.recordId;
    /** The new shielded address is tagged with its swap, as any tag. */
    const madeAddress = swapAddressOf(committed.record);
    if (madeAddress) {
      const { sellAsset, receiveAsset, createdAtMs } = committed.record;
      const tag = `${sellAsset.ticker ?? sellAsset.symbol} → ${
        receiveAsset.ticker ?? receiveAsset.symbol
      } · ${Utils.formatDate(createdAtMs, 'MMM d, h:mm aaa', language)}`;
      AddressBookFileImpl.writeAddressBookItem(
        tag,
        madeAddress,
        Utils.generateColorList(1)[0],
        true,
        server.chainName,
        GlobalConst.zecSwapChain,
      )
        .then(setAddressBook)
        .catch(err => console.log(`SwapReview: could not tag ${err}`));
      addLastSnackbar(
        translate('swap.shielded-created') as string,
        SnackbarDurationEnum.short,
      );
    }
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
      // A deshield that went out belongs to this sale, so its retry resumes it.
      if (
        e instanceof DepositAfterDeshieldError &&
        e.kind === 'failed' &&
        e.deshieldTxId
      ) {
        await swapService
          .markDeshielded({ recordId, deshieldTxId: e.deshieldTxId })
          .catch(err =>
            console.log(`SwapReview: markDeshielded failed ${err}`),
          );
      }
      // The swap is reserved, so the deposit screen takes over with the way to
      // try again.
      navigation.replace(Route.SwapDeposit, {
        recordId,
        broadcastError:
          e instanceof DepositAfterDeshieldError && e.kind === 'pending'
            ? (translate('swap.deposit-other-held') as string)
            : `${e}`,
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
    addLastSnackbar,
    setAddressBook,
    server.chainName,
    language,
  ]);

  const onConfirm = async () => {
    if (isOutbound && !(await authorizeDeposit())) {
      return;
    }
    commit();
  };

  const feeValue = routeFeeValue({
    route: chosen,
    quoteInput,
    fiatValueBasis,
    isOutbound,
  });
  const receiveAmount = parseFloat(chosen.expectedReceiveAmount);
  const receiveUsd = receiveAmount * fiatValueBasis.receiveUsdUnitPrice;
  const minReceive = `${formatAmountForDisplay(chosen.minReceiveAmount)} ${receiveSymbol}`;

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
        <Text variant="bodySmall" tone="danger" style={{ textAlign: 'center' }}>
          {error}
        </Text>
      )}
      {memoAckNeeded && (
        <Checkbox
          testID="swap.review.memo-ack"
          label={(translate('swap.review-memo-ack') as string).replace(
            '{provider}',
            providerShortLabel(chosen.provider),
          )}
          checked={memoAcknowledged}
          onChange={setMemoAcknowledged}
          disabled={committing}
        />
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
        disabled={
          committing ||
          !swapService ||
          (isOutbound && !mixnetReady) ||
          (memoAckNeeded && !memoAcknowledged)
        }
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
        amount={`≈ ${formatAmountForDisplay(chosen.expectedReceiveAmount)}`}
        unit={receiveSymbol}
        line={[
          (translate('swap.review-for') as string).replace(
            '{amount}',
            `${formatAmountForDisplay(quoteInput.sellAmountHumanDecimal)} ${sellSymbol}`,
          ),
          fiatValueBasis.receiveUsdUnitPrice > 0 && Number.isFinite(receiveUsd)
            ? `≈ ${formatUsd(receiveUsd)}`
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
            isOutbound
              ? {
                  label: translate('swap.review-min') as string,
                  value: minReceive,
                  tone: 'positive' as const,
                  tip: (translate('swap.tip-min') as string).replace(
                    '{coin}',
                    sellSymbol,
                  ),
                }
              : {
                  label: translate('swap.review-you-get') as string,
                  value: translate(
                    shielded
                      ? 'swap.review-get-shielded'
                      : 'swap.review-get-transparent',
                  ) as string,
                  leading: shielded ? (
                    <ShieldIcon size={iconSizeSm} color={colors.fgAccent} />
                  ) : undefined,
                  tip: (
                    translate(
                      shielded
                        ? 'swap.tip-get-shielded'
                        : 'swap.tip-get-transparent',
                    ) as string
                  ).replace('{provider}', providerShortLabel(chosen.provider)),
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
                    value: `${formatAmount(feeReserve)} ${info.currencyName} · ${
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
                chosen.estimatedTimeText ?? '',
                providerShortLabel(chosen.provider),
              ]
                .filter(Boolean)
                .join(' · '),
              tip: isOutbound
                ? undefined
                : (translate('swap.tip-arrives') as string)
                    .replace('{min}', minReceive)
                    .replace('{sellCoin}', sellSymbol),
            },
            ...(isOutbound
              ? []
              : [
                  {
                    label: translate('swap.review-how-you-pay') as string,
                    value: translate(
                      paysWithMemo
                        ? 'swap.pay-address-memo'
                        : 'swap.pay-address-only',
                    ) as string,
                    tone: paysWithMemo ? ('warning' as const) : undefined,
                  },
                ]),
            {
              label: translate(
                isOutbound ? 'swap.review-to' : 'swap.refund-address',
              ) as string,
              value: contact
                ? `${contact.label}  ${Utils.trimToSmall(address ?? '', 6)}`
                : Utils.trimToSmall(address ?? '', 6),
              mono: !contact,
              leading: contact ? (
                <Avatar
                  kind="contact"
                  name={contact.label}
                  category={avatarCategoryOf(contact.color)}
                  size="md"
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
                      shielded
                        ? 'swap.review-refund-new-shielded'
                        : 'swap.review-refund-new-address',
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
          columnGap: 8,
          marginTop: 16,
        }}
      >
        <ClockIcon size={iconSizeSm} color={colors.fgMuted} />
        <Text variant="caption" tone="muted" style={{ flexShrink: 1 }}>
          {translate('swap.review-price-fixed') as string}
        </Text>
      </View>
      <View style={{ marginTop: 16 }}>
        {isOutbound ? (
          <NymNote text={translate('swap.review-nym-note') as string} />
        ) : (
          <Text variant="caption" tone="muted" style={{ textAlign: 'center' }}>
            {translate('swap.review-next-address') as string}
          </Text>
        )}
      </View>
    </SwapFlowScreen>
  );
};

export default SwapReview;
