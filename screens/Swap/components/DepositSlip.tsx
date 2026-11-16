/* eslint-disable react-native/no-inline-styles */
import React, { useContext } from 'react';
import DetailRows from './DetailRows';
import CopyPill from './CopyPill';
import { View } from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import { radiusMd, space12, space4, useTheme } from '@app/theme';
import { ContextAppLoaded } from '@app/context';
import {
  buildDepositQr,
  formatAmountForDisplay,
  isEvmSourceChain,
  isTokenAsset,
  isUtxoSourceChain,
  memoToHexCalldata,
  providerShortLabel,
  requiresExactAmountWarning,
} from '@app/swap';
import type { SwapRecordType } from '@app/swap';
import { formatExactAmount } from '@app/utils/formatAmount';
import Text from '@ui/primitives/Text';
import { useInsetFill } from '@ui/primitives/Surface';
import Banner from '@ui/widgets/Banner';
import { chainDisplayName } from '@ui/widgets/chainDisplayName';

/** The memo a provider's order carries, when its data names one. */
export function depositMemoOf(record: SwapRecordType): string | undefined {
  const memo = (record.providerData as { memo?: string } | undefined)?.memo;
  return memo && memo.length > 0 ? memo : undefined;
}

type DepositSlipProps = {
  record: SwapRecordType;
  /** The QR goes once this wallet paid: a code for a paid deposit invites paying twice. */
  paid?: boolean;
  /** Inside Swap details, whose hero and status already give the amount and the provider. */
  inDetail?: boolean;
};

/**
 * Everything the user needs to pay a swap's deposit from another wallet: the
 * QR with what it carries, the address with Copy address and Copy link, the
 * network the coin must travel on, the exact amount and the memo with where
 * it goes. The detail shows the same slip for a deposit still unpaid.
 */
export default function DepositSlip({
  record,
  paid,
  inDetail,
}: DepositSlipProps) {
  const { translate, info } = useContext(ContextAppLoaded);
  const { colors } = useTheme();
  const inset = useInsetFill();
  const t = (key: string) => translate(key) as string;
  const memo = depositMemoOf(record);
  const asset = record.sellAsset;
  const ticker = asset.ticker ?? asset.symbol;
  const qr = buildDepositQr({
    sellAsset: asset,
    depositAddress: record.depositAddress,
    amountHumanDecimal: record.sellAmountHumanDecimal,
    memoText: memo,
  });
  const isToken = asset.chain !== asset.symbol;
  const network = chainDisplayName(asset.chain) || asset.chain;
  const showExactAmount = requiresExactAmountWarning(record);
  const utxo = isUtxoSourceChain(asset.chain);
  const bitcoin = asset.chain === 'BTC';

  /** A token transfer has no data field of its own: the memo is the wallet's to add. */
  const token = isTokenAsset(asset);
  /** No code can carry it, so the one banner under the box says both rules. */
  const tokenMemo = token && !!memo;
  const memoHint = token
    ? t('swap.memo-hint-token')
    : isEvmSourceChain(asset.chain)
      ? t('swap.memo-hint-evm')
      : bitcoin
        ? t('swap.memo-hint-btc')
        : t('swap.memo-hint-other');
  const provider = providerShortLabel(record.provider);
  const amount = `${formatExactAmount(record.sellAmountHumanDecimal)} ${ticker}`;
  /** What the code holds, said under it: a bare address leaves the amount to type. */
  const qrCaption = memo
    ? 'swap.qr-carries-memo'
    : qr?.value === record.depositAddress
      ? 'swap.qr-carries-address'
      : 'swap.qr-carries-amount';

  return (
    <View style={{ rowGap: space12 }}>
      {/* Exchanges take their fee out of the withdrawal, which is what refunds these. */}
      {showExactAmount && !memo && !paid && (
        <Banner
          testID="swap.deposit.exchange-fee"
          tone="warning"
          title={t('swap.exact-amount-exchange')
            .replace('{amount}', amount)
            .replace('{provider}', provider)}
        />
      )}
      <View
        style={{
          alignItems: 'center',
          paddingTop: 20,
          paddingHorizontal: 16,
          paddingBottom: 16,
          borderRadius: radiusMd,
          backgroundColor: inset,
          borderWidth: 1,
          borderColor: colors.bottomSheetBorder,
        }}
      >
        {!paid && qr ? (
          <>
            <View
              style={{
                padding: 12,
                borderRadius: radiusMd,
                backgroundColor: colors.bgQrPaper,
              }}
            >
              <QRCode value={qr.value} size={180} ecl="M" />
            </View>
            <Text
              variant="caption"
              tone="muted"
              style={{ textAlign: 'center', marginTop: 12 }}
            >
              {t(qrCaption)}
            </Text>
          </>
        ) : !paid && memo && !token ? (
          <Banner
            testID="swap.deposit.no-qr"
            tone="warning"
            title={t('swap.qr-no-memo')}
          />
        ) : null}
        <Text
          variant="address"
          selectable
          style={{ marginTop: 12, textAlign: 'center' }}
        >
          {record.depositAddress}
        </Text>
        <View
          style={{
            flexDirection: 'row',
            columnGap: 12,
            marginTop: 16,
            alignSelf: 'stretch',
          }}
        >
          <CopyPill
            testID="swap.deposit.address"
            label={t('swap.copy-address')}
            value={record.depositAddress}
          />
          {!!qr && (
            <CopyPill
              testID="swap.deposit.link"
              label={t('swap.copy-link')}
              value={qr.value}
            />
          )}
        </View>
      </View>

      {(isToken || tokenMemo) && (
        <Banner
          testID={tokenMemo ? 'swap.deposit.network-memo' : undefined}
          tone="warning"
          title={t(tokenMemo ? 'swap.network-memo-only' : 'swap.network-only')
            .replace('{coin}', ticker)
            .replace('{network}', network)}
        />
      )}

      <DetailRows
        rows={[
          {
            label: t(memo ? 'swap.amount' : 'swap.send-exactly'),
            value: amount,
            tip: memo ? undefined : t('swap.tip-exact'),
            copy: record.sellAmountHumanDecimal,
            mono: false,
          },
          ...(memo
            ? [
                {
                  label: t('swap.memo'),
                  value: '',
                  block: (
                    <View style={{ rowGap: space4 }}>
                      <Text variant="address" selectable>
                        {memo}
                      </Text>
                      <Text variant="caption" tone="muted">
                        {memoHint}
                      </Text>
                      <View
                        style={{
                          flexDirection: 'row',
                          columnGap: space12,
                          marginTop: space4,
                        }}
                      >
                        <CopyPill
                          testID="swap.deposit.memo"
                          label={t('swap.copy-memo')}
                          value={memo}
                        />
                        {isEvmSourceChain(asset.chain) && !token && (
                          <CopyPill
                            testID="swap.deposit.memo-hex"
                            label={t('swap.memo-hex')}
                            value={memoToHexCalldata(memo)}
                          />
                        )}
                      </View>
                    </View>
                  ),
                },
              ]
            : []),
          ...(inDetail
            ? []
            : [
                {
                  label: t('swap.deposit-you-get'),
                  value: `≈ ${formatAmountForDisplay(record.expectedReceiveAmount)} ${info.currencyName}`,
                },
                {
                  label: t('swap.provider'),
                  value: provider,
                },
              ]),
        ]}
      />

      {/* The row and its tip already say exactly; only a BTC wallet's fee needs a word. */}
      {showExactAmount && !memo && utxo && bitcoin && (
        <Banner tone="warning" title={t('swap.exact-amount-btc')} />
      )}
    </View>
  );
}
