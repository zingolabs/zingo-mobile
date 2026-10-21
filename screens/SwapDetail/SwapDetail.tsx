/* eslint-disable react-native/no-inline-styles */
import React, { useCallback, useContext, useEffect, useState } from 'react';
import { Linking, View } from 'react-native';
import Clipboard from '@react-native-clipboard/clipboard';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { radiusMd, space12, space16, space8, useTheme } from '@app/theme';
import { AppDrawerParamList } from '@app/types';
import { ChainNameEnum, Route, ValueTransferKindEnum } from '@app/AppState';
import type { ValueTransferType } from '@app/AppState';
import { ContextAppLoaded, useSwapRecords, useSwapService } from '@app/context';
import {
  SwapDirectionEnum,
  SwapStatusEnum,
  SwapStore,
  buildChainExplorerUrl,
  canRemoveSwap,
  formatAmountForDisplay,
  isPrePaymentStatus,
  isRealLegHash,
  isTerminalStatus,
  providerLongLabel,
  swapTxidIndex,
} from '@app/swap';
import { showConfirm } from '@app/services/showConfirm';
import Utils from '@app/utils';
import Text from '@ui/primitives/Text';
import Button from '@ui/primitives/Button';
import ButtonStack from '@ui/primitives/ButtonStack';
import TextField from '@ui/primitives/TextField';
import Tag from '@ui/widgets/Tag';
import Banner from '@ui/widgets/Banner';
import { ChevronRight } from '@ui/primitives/Icons/Chevron';
import SwapFlowScreen from '@screens/Swap/components/SwapFlowScreen';
import SwapSummaryCard from '@screens/Swap/components/SwapSummaryCard';
import DepositSlip from '@screens/Swap/components/DepositSlip';
import TokenLogo from '@screens/Swap/components/TokenLogo';
import { tokenEntryOf } from '@screens/Swap/swapAssets';
import { useSwapRecord } from '@screens/Swap/useSwapRecord';
import { swapOutcome } from '@screens/Swap/swapProgress';

type SwapDetailProps = NativeStackScreenProps<
  AppDrawerParamList,
  typeof Route.SwapDetail
>;

/**
 * A swap's record: what it traded, through whom, for how much, and where it
 * paid. A deposit still unpaid shows its slip first, since that is the one
 * thing left to do. The record is live, so a poller tick reaches it.
 */
const SwapDetail: React.FunctionComponent<SwapDetailProps> = ({
  navigation,
  route,
}) => {
  const { recordId } = route.params;
  const {
    translate,
    language,
    walletChainName,
    blockExplorer,
    addLastSnackbar,
    valueTransfers,
    info,
  } = useContext(ContextAppLoaded);
  const { colors } = useTheme();
  const swapService = useSwapService();
  const records = useSwapRecords();
  const record = useSwapRecord(recordId);
  const [hash, setHash] = useState<string>('');
  const [attaching, setAttaching] = useState<boolean>(false);
  const [attachError, setAttachError] = useState<string>('');

  // A finished swap is no longer polled, so one that finished before the
  // tracker kept some detail is asked about once, here.
  useEffect(() => {
    if (!swapService) {
      return;
    }
    swapService
      .backfillFinishedRecord(recordId)
      .catch(err =>
        console.log(`SwapDetail: backfill failed for ${recordId}: ${err}`),
      );
  }, [swapService, recordId]);

  const close = useCallback(() => {
    if (navigation.canGoBack()) {
      navigation.goBack();
    }
  }, [navigation]);

  const attach = useCallback(async () => {
    const trimmed = hash.trim();
    if (!trimmed || !swapService || !record) {
      return;
    }
    setAttaching(true);
    setAttachError('');
    try {
      if (record.direction === SwapDirectionEnum.Outbound) {
        await swapService.markBroadcasted({ recordId, txId: trimmed });
      } else {
        await swapService.setObservedDepositTxHash({ recordId, hash: trimmed });
      }
      setHash('');
    } catch (e) {
      setAttachError(`${e}`);
    } finally {
      setAttaching(false);
    }
  }, [hash, swapService, record, recordId]);

  const remove = useCallback(() => {
    if (!record) {
      return;
    }
    showConfirm({
      title: translate('swap.detail-remove-title') as string,
      message: translate(
        isPrePaymentStatus(record.status)
          ? 'swap.detail-remove-unpaid'
          : 'swap.detail-remove-body',
      ) as string,
      buttons: [
        { text: translate('swap.close') as string, style: 'cancel' },
        {
          text: translate('swap.detail-remove') as string,
          style: 'destructive',
          onPress: () => {
            SwapStore.deleteByRecordId(recordId).then(close);
          },
        },
      ],
    });
  }, [record, recordId, translate, close]);

  if (!record) {
    return <View style={{ flex: 1, backgroundColor: colors.bgCanvas }} />;
  }

  const isOutbound = record.direction === SwapDirectionEnum.Outbound;
  const outcome = swapOutcome(record.status);
  const receiveSymbol =
    record.receiveAsset.ticker ?? record.receiveAsset.symbol;
  const sellSymbol = record.sellAsset.ticker ?? record.sellAsset.symbol;
  const hasDepositEvidence =
    isRealLegHash(record.broadcast?.txId) ||
    isRealLegHash(record.observedDepositTxHash);
  const awaitingDeposit =
    !isTerminalStatus(record.status) && !hasDepositEvidence;
  const endedBadlyReason =
    record.refundInfo?.refundReason ?? record.failureReason;
  const stateKey =
    outcome === 'completed'
      ? 'swap.history-done'
      : outcome === 'refunded'
        ? 'swap.history-refunded'
        : outcome === 'failed' || outcome === 'expired'
          ? 'swap.history-failed'
          : 'swap.history-in-progress';
  const stateTone =
    outcome === 'completed'
      ? 'accent'
      : outcome === 'refunded'
        ? 'warning'
        : outcome === 'failed' || outcome === 'expired'
          ? 'danger'
          : 'neutral';

  const explorerUrl = (chain: string, txid: string): string | null =>
    buildChainExplorerUrl({
      chain,
      hash: txid,
      zecChainName: walletChainName as ChainNameEnum,
      zecBlockExplorer: blockExplorer,
    });
  const links: { label: string; url: string }[] = [];
  const depositHash = isRealLegHash(record.broadcast?.txId)
    ? record.broadcast?.txId
    : isRealLegHash(record.observedDepositTxHash)
      ? record.observedDepositTxHash
      : undefined;
  if (depositHash) {
    const url = explorerUrl(record.sellAsset.chain, depositHash);
    if (url) {
      links.push({ label: translate('swap.detail-deposit-tx') as string, url });
    }
  }
  if (isRealLegHash(record.destinationTxHash)) {
    const url = explorerUrl(
      record.receiveAsset.chain,
      record.destinationTxHash as string,
    );
    if (url) {
      links.push({ label: translate('swap.detail-payout-tx') as string, url });
    }
  }
  if (isRealLegHash(record.refundInfo?.refundTxHash)) {
    const url = explorerUrl(
      record.sellAsset.chain,
      record.refundInfo?.refundTxHash as string,
    );
    if (url) {
      links.push({ label: translate('swap.detail-refund-tx') as string, url });
    }
  }

  // The Zcash transactions this swap made in this wallet: the deposit, the
  // hop through the ephemeral address before it, and the delivery or refund.
  const index = swapTxidIndex(records);
  const legs = (valueTransfers ?? [])
    .filter(vt => index.get(vt.txid) === recordId)
    .sort((a, b) => a.time - b.time);
  const legLabel = (leg: ValueTransferType): string => {
    if (leg.kind === ValueTransferKindEnum.Received) {
      return translate(
        outcome === 'refunded' ? 'swap.leg-refund' : 'swap.leg-delivery',
      ) as string;
    }
    const hop =
      record.broadcast?.allTxIds &&
      record.broadcast.allTxIds.length > 1 &&
      record.broadcast.allTxIds[0] === leg.txid;
    return translate(hop ? 'swap.leg-hop' : 'swap.leg-deposit') as string;
  };

  const row = (
    label: string,
    value: string,
    mono?: boolean,
    onCopy?: () => void,
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
      <Text
        variant={mono ? 'address' : 'bodyStrong'}
        style={{ flexShrink: 1, textAlign: 'right' }}
        onPress={onCopy}
        selectable
      >
        {value}
      </Text>
    </View>
  );
  const divider = (
    <View style={{ height: 1, backgroundColor: colors.bottomSheetBorder }} />
  );
  const copyAddress = (address: string) => {
    Clipboard.setString(address);
    addLastSnackbar(translate('swap.copied') as string);
  };

  return (
    <SwapFlowScreen
      testID="swap.detail"
      title={translate('swap.detail-title') as string}
      onBack={close}
      footer={
        <ButtonStack>
          {canRemoveSwap(record.status) && (
            <Button
              testID="swap.detail.remove"
              variant="quiet"
              title={translate('swap.detail-remove') as string}
              onPress={remove}
            />
          )}
          {links.length > 0 && (
            <Button
              testID="swap.detail.explorer"
              variant="text"
              title={`${translate('swap.detail-explorer') as string}`}
              onPress={() => Linking.openURL(links[0].url)}
            />
          )}
        </ButtonStack>
      }
    >
      <View style={{ alignItems: 'center', rowGap: 10, marginBottom: space16 }}>
        <View
          style={{ flexDirection: 'row', alignItems: 'center', columnGap: 10 }}
        >
          <TokenLogo
            token={tokenEntryOf(record.sellAsset)}
            size={40}
            surfaceColor={colors.bgSurface}
            forceBadge
          />
          <ChevronRight size={20} color={colors.fgMuted} />
          <TokenLogo
            token={tokenEntryOf(record.receiveAsset)}
            size={40}
            surfaceColor={colors.bgSurface}
            forceBadge
          />
        </View>
        <Tag tone={stateTone}>
          {(translate(stateKey) as string).toUpperCase()}
        </Tag>
        <Text variant="bodySmall" tone="muted">
          {Utils.formatDate(
            record.createdAtMs,
            'MMM d, yyyy · h:mm aaa',
            language,
          )}
        </Text>
      </View>

      {awaitingDeposit && (
        <View style={{ marginBottom: space16, rowGap: space12 }}>
          <Text variant="bodyStrong">
            {
              translate(
                isOutbound ? 'swap.deposit-unsent-title' : 'swap.deposit-title',
              ) as string
            }
          </Text>
          <DepositSlip record={record} paid={isOutbound} />
          <Text variant="bodySmall" tone="muted">
            {
              translate(
                isOutbound
                  ? 'swap.deposit-paid-elsewhere'
                  : 'swap.deposit-already-paid',
              ) as string
            }
          </Text>
          <TextField
            testID="swap.detail.hash"
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
            inline
            variant="text"
            title={translate('swap.deposit-follow') as string}
            disabled={attaching || hash.trim().length === 0}
            busy={attaching}
            onPress={attach}
          />
        </View>
      )}

      <SwapSummaryCard
        sides={[
          {
            label: translate('swap.detail-sent') as string,
            asset: record.sellAsset,
            amount: record.sellAmountHumanDecimal,
            usdUnitPrice: record.fiatValueBasis.sellUsdUnitPrice,
          },
          outcome === 'refunded' && record.refundInfo?.refundedAmountText
            ? {
                label: translate('swap.result-refunded-amount') as string,
                asset: record.sellAsset,
                amount: record.refundInfo.refundedAmountText,
                usdUnitPrice: record.fiatValueBasis.sellUsdUnitPrice,
              }
            : {
                label: translate(
                  outcome === 'completed'
                    ? 'swap.detail-received'
                    : 'swap.detail-expected',
                ) as string,
                asset: record.receiveAsset,
                amount:
                  record.actualReceiveAmount ?? record.expectedReceiveAmount,
                usdUnitPrice: record.fiatValueBasis.receiveUsdUnitPrice,
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
          translate('swap.provider') as string,
          providerLongLabel(record.provider),
        )}
        {!!record.totalFeesInReceiveAsset && (
          <>
            {divider}
            {row(
              translate('swap.review-fees') as string,
              `${formatAmountForDisplay(record.totalFeesInReceiveAsset)} ${receiveSymbol}`,
            )}
          </>
        )}
        {divider}
        {row(
          translate(
            isOutbound ? 'swap.detail-sent-to' : 'swap.detail-received-at',
          ) as string,
          Utils.trimToSmall(record.destinationAddress, 8),
          true,
          () => copyAddress(record.destinationAddress),
        )}
        {!!record.minReceiveAmount && (
          <>
            {divider}
            {row(
              translate('swap.review-min') as string,
              `${formatAmountForDisplay(record.minReceiveAmount)} ${receiveSymbol}`,
            )}
          </>
        )}
        {!!endedBadlyReason && (
          <>
            {divider}
            {row(translate('swap.result-reason') as string, endedBadlyReason)}
          </>
        )}
        {record.status === SwapStatusEnum.Refunded &&
          !!record.refundInfo?.refundFeeText && (
            <>
              {divider}
              {row(
                translate('swap.result-refund-fee') as string,
                `− ${formatAmountForDisplay(record.refundInfo.refundFeeText)} ${sellSymbol}`,
              )}
            </>
          )}
      </View>

      {links.length > 1 && (
        <View style={{ marginTop: space12, rowGap: space8 }}>
          {links.slice(1).map(link => (
            <Button
              key={link.label}
              inline
              variant="text"
              title={link.label}
              onPress={() => Linking.openURL(link.url)}
            />
          ))}
        </View>
      )}

      {legs.length > 0 && (
        <View style={{ marginTop: space16 }}>
          <Text variant="caption" tone="muted" style={{ marginBottom: space8 }}>
            {translate('swap.detail-zcash-moves') as string}
          </Text>
          <View
            style={{
              borderWidth: 1,
              borderColor: colors.bottomSheetBorder,
              borderRadius: radiusMd,
              paddingHorizontal: space16,
            }}
          >
            {legs.map((leg, index) => (
              <View key={leg.txid}>
                {index > 0 && divider}
                <View
                  style={{
                    flexDirection: 'row',
                    justifyContent: 'space-between',
                    alignItems: 'flex-start',
                    columnGap: space12,
                    paddingVertical: 11,
                  }}
                >
                  <View style={{ flexShrink: 1 }}>
                    <Text variant="bodyStrong">{legLabel(leg)}</Text>
                    <Text variant="caption" tone="muted">
                      {Utils.formatDate(
                        leg.time * 1000,
                        'MMM d, h:mm aaa',
                        language,
                      )}
                    </Text>
                  </View>
                  <Text
                    variant="bodyStrong"
                    tone={
                      leg.kind === ValueTransferKindEnum.Received
                        ? 'accent'
                        : 'default'
                    }
                  >
                    {`${leg.kind === ValueTransferKindEnum.Received ? '+' : '−'}${Utils.parseNumberFloatToStringLocale(leg.amount, 4)} ${info.currencyName}`}
                  </Text>
                </View>
              </View>
            ))}
          </View>
        </View>
      )}

      {((outcome === 'completed' && !isOutbound) ||
        (outcome === 'refunded' && isOutbound)) && (
        <View style={{ marginTop: space12 }}>
          <Banner
            tone="warning"
            title={
              translate(
                outcome === 'completed'
                  ? 'swap.result-shield-note-received'
                  : 'swap.result-shield-note-refund',
              ) as string
            }
          />
        </View>
      )}
    </SwapFlowScreen>
  );
};

export default SwapDetail;
