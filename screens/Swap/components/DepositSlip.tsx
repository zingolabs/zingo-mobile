/* eslint-disable react-native/no-inline-styles */
import React, { useContext } from 'react';
import DetailRows from './DetailRows';
import { View } from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import Clipboard from '@react-native-clipboard/clipboard';
import { radiusMd, space12, space4, useTheme } from '@app/theme';
import { ContextAppLoaded } from '@app/context';
import {
  buildDepositQr,
  formatAmountForDisplay,
  isEvmSourceChain,
  isUtxoSourceChain,
  memoToHexCalldata,
  providerShortLabel,
  requiresExactAmountWarning,
} from '@app/swap';
import type { SwapRecordType } from '@app/swap';
import Text from '@ui/primitives/Text';
import { useInsetFill } from '@ui/primitives/Surface';
import Button from '@ui/primitives/Button';
import Banner from '@ui/widgets/Banner';
import { CopyIcon } from '@ui/primitives/Icons/CopyIcon';
import { CheckIcon } from '@ui/primitives/Icons/CheckIcon';
import { chainDisplayName } from '@ui/widgets/chainDisplayName';

/** The memo a provider's order carries, when its data names one. */
export function depositMemoOf(record: SwapRecordType): string | undefined {
  const memo = (record.providerData as { memo?: string }).memo;
  return memo && memo.length > 0 ? memo : undefined;
}

type DepositSlipProps = {
  record: SwapRecordType;
  /** The QR goes once this wallet paid: a code for a paid deposit invites paying twice. */
  paid?: boolean;
};

/**
 * Everything the user needs to pay a swap's deposit from another wallet: the
 * QR with what it carries, the address with Copy address and Copy link, the
 * network the coin must travel on, the exact amount and the memo with where
 * it goes. The detail shows the same slip for a deposit still unpaid.
 */
export default function DepositSlip({ record, paid }: DepositSlipProps) {
  const { translate, info } = useContext(ContextAppLoaded);
  const { colors } = useTheme();
  const inset = useInsetFill();
  const t = (key: string) => translate(key) as string;
  const [copiedKey, setCopiedKey] = React.useState<string>('');
  const copy = (key: string, value: string) => {
    Clipboard.setString(value);
    setCopiedKey(key);
    setTimeout(
      () => setCopiedKey(current => (current === key ? '' : current)),
      1600,
    );
  };

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

  const memoHint = isEvmSourceChain(asset.chain)
    ? t('swap.memo-hint-evm')
    : bitcoin
      ? t('swap.memo-hint-btc')
      : t('swap.memo-hint-other');

  const pill = (key: string, label: string, value: string) => {
    const done = copiedKey === key;
    return (
      <View style={{ flex: 1 }}>
        <Button
          testID={`swap.deposit.${key}`}
          variant="secondary"
          size="small"
          icon={done ? CheckIcon : CopyIcon}
          title={done ? t('swap.copied') : label}
          onPress={() => copy(key, value)}
        />
      </View>
    );
  };

  return (
    <View style={{ rowGap: space12 }}>
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
              {t(memo ? 'swap.qr-carries-memo' : 'swap.qr-carries-amount')}
            </Text>
          </>
        ) : !paid && memo ? (
          <Banner tone="warning" title={t('swap.qr-no-memo')} />
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
          {pill('address', t('swap.copy-address'), record.depositAddress)}
          {!!qr && pill('link', t('swap.copy-link'), qr.value)}
        </View>
      </View>

      {isToken && (
        <Banner
          tone="warning"
          title={t('swap.network-only')
            .replace('{coin}', ticker)
            .replace('{network}', network)}
        />
      )}

      <DetailRows
        rows={[
          {
            label: t(memo ? 'swap.amount' : 'swap.send-exactly'),
            value: `${formatAmountForDisplay(record.sellAmountHumanDecimal)} ${ticker}`,
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
                      <View style={{ flexDirection: 'row', columnGap: 16 }}>
                        <Button
                          variant="text"
                          size="small"
                          inline
                          title={
                            copiedKey === 'memo'
                              ? t('swap.copied')
                              : t('swap.copy-memo')
                          }
                          onPress={() => copy('memo', memo)}
                        />
                        {isEvmSourceChain(asset.chain) && (
                          <Button
                            variant="text"
                            size="small"
                            inline
                            title={
                              copiedKey === 'memo-hex'
                                ? t('swap.copied')
                                : t('swap.memo-hex')
                            }
                            onPress={() =>
                              copy('memo-hex', memoToHexCalldata(memo))
                            }
                          />
                        )}
                      </View>
                    </View>
                  ),
                },
              ]
            : []),
          {
            label: t('swap.deposit-you-get'),
            value: `≈ ${formatAmountForDisplay(record.expectedReceiveAmount)} ${info.currencyName}`,
          },
          {
            label: t('swap.provider'),
            value: providerShortLabel(record.provider),
          },
        ]}
      />

      {showExactAmount && !memo && (
        <Banner
          tone="warning"
          title={
            utxo && bitcoin
              ? `${t('swap.exact-amount')} ${t('swap.exact-amount-btc')}`
              : t('swap.exact-amount')
          }
        />
      )}
    </View>
  );
}
