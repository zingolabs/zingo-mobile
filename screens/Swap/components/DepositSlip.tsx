/* eslint-disable react-native/no-inline-styles */
import React, { useContext } from 'react';
import { Pressable, View } from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import Clipboard from '@react-native-clipboard/clipboard';
import {
  radiusMd,
  radiusPill,
  space12,
  space16,
  space4,
  space8,
  useTheme,
} from '@app/theme';
import { ContextAppLoaded } from '@app/context';
import {
  buildDepositQr,
  formatAmountForDisplay,
  isEvmSourceChain,
  isUtxoSourceChain,
  memoToHexCalldata,
  providerRequiresMemo,
  requiresExactAmountWarning,
} from '@app/swap';
import type { SwapRecordType } from '@app/swap';
import Text from '@ui/primitives/Text';
import Banner from '@ui/widgets/Banner';
import { CopyIcon } from '@ui/primitives/Icons/CopyIcon';
import { CheckIcon } from '@ui/primitives/Icons/CheckIcon';
import { chainDisplayName } from '@ui/widgets/chainDisplayName';

/** The memo a provider's order carries, when its data names one. */
export function depositMemoOf(record: SwapRecordType): string | undefined {
  const memo = (record.providerData as { memo?: string }).memo;
  return memo && memo.length > 0 ? memo : undefined;
}

/** A row the user copies: label, mono value, and a copy button. */
function CopyRow({
  label,
  value,
  copied,
  onCopy,
  copyLabel,
  copiedLabel,
}: {
  label: string;
  value: string;
  copied: boolean;
  onCopy: () => void;
  copyLabel: string;
  copiedLabel: string;
}) {
  const { colors } = useTheme();
  return (
    <View style={{ paddingVertical: space8 }}>
      <Text variant="caption" tone="muted">
        {label}
      </Text>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          columnGap: space12,
          marginTop: space4,
        }}
      >
        <Text variant="address" style={{ flex: 1 }} selectable>
          {value}
        </Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={copyLabel}
          onPress={onCopy}
          hitSlop={8}
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            columnGap: space4,
            paddingHorizontal: space12,
            minHeight: 32,
            borderRadius: radiusPill,
          }}
        >
          {copied ? (
            <CheckIcon size={14} color={colors.fgAccent} />
          ) : (
            <CopyIcon size={14} color={colors.fgAccent} />
          )}
          <Text variant="bodySmall" tone="accent">
            {copied ? copiedLabel : copyLabel}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

type DepositSlipProps = {
  record: SwapRecordType;
  /** The QR goes once this wallet paid: a code for a paid deposit invites paying twice. */
  paid?: boolean;
};

/**
 * Everything the user needs to pay a swap's deposit from another wallet: a
 * QR carrying as much as the chain can express, the same values as rows to
 * copy, and the warnings that decide whether the deposit is routed or
 * refunded. The detail shows the same slip for a deposit still unpaid, so
 * both say the same thing about where the memo goes.
 */
export default function DepositSlip({ record, paid }: DepositSlipProps) {
  const { translate } = useContext(ContextAppLoaded);
  const { colors } = useTheme();
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
  const qr = paid
    ? null
    : buildDepositQr({
        sellAsset: asset,
        depositAddress: record.depositAddress,
        amountHumanDecimal: record.sellAmountHumanDecimal,
        memoText: memo,
      });
  const isToken = asset.chain !== asset.symbol;
  const network = chainDisplayName(asset.chain) || asset.chain;
  const showMemoHint = !!memo && providerRequiresMemo(record.provider);
  const showExactAmount = requiresExactAmountWarning(record);
  const copyLabel = translate('swap.copy') as string;
  const copiedLabel = translate('swap.copied') as string;

  const memoHint = isEvmSourceChain(asset.chain)
    ? (translate('swap.memo-hint-evm') as string)
    : isUtxoSourceChain(asset.chain)
      ? (translate('swap.memo-hint-utxo') as string)
      : `${translate('swap.memo-hint-other') as string} ${network}.`;

  return (
    <View style={{ rowGap: space12 }}>
      {qr ? (
        <View style={{ alignItems: 'center', rowGap: space8 }}>
          <View
            style={{
              padding: 10,
              borderRadius: radiusMd,
              backgroundColor: colors.bgQrPaper,
            }}
          >
            <QRCode value={qr.value} size={170} ecl="M" />
          </View>
          <Text variant="caption" tone="muted" style={{ textAlign: 'center' }}>
            {
              translate(
                memo ? 'swap.qr-carries-memo' : 'swap.qr-carries-amount',
              ) as string
            }
          </Text>
        </View>
      ) : null}
      {isToken && (
        <Banner
          tone="warning"
          title={`${translate('swap.network-only') as string} ${ticker} ${translate('swap.network-only-via') as string} ${network}. ${translate('swap.network-only-loss') as string}`}
        />
      )}
      <View
        style={{
          borderWidth: 1,
          borderColor: colors.bottomSheetBorder,
          borderRadius: radiusMd,
          paddingHorizontal: space16,
        }}
      >
        <CopyRow
          label={translate('swap.deposit-address') as string}
          value={record.depositAddress}
          copied={copiedKey === 'address'}
          onCopy={() => copy('address', record.depositAddress)}
          copyLabel={copyLabel}
          copiedLabel={copiedLabel}
        />
        <View
          style={{ height: 1, backgroundColor: colors.bottomSheetBorder }}
        />
        <CopyRow
          label={
            showExactAmount
              ? (translate('swap.send-exactly') as string)
              : (translate('swap.amount') as string)
          }
          value={`${formatAmountForDisplay(record.sellAmountHumanDecimal)} ${ticker}`}
          copied={copiedKey === 'amount'}
          onCopy={() => copy('amount', record.sellAmountHumanDecimal)}
          copyLabel={copyLabel}
          copiedLabel={copiedLabel}
        />
        {!!memo && (
          <>
            <View
              style={{ height: 1, backgroundColor: colors.bottomSheetBorder }}
            />
            <CopyRow
              label={translate('swap.memo') as string}
              value={memo}
              copied={copiedKey === 'memo'}
              onCopy={() => copy('memo', memo)}
              copyLabel={copyLabel}
              copiedLabel={copiedLabel}
            />
            {isEvmSourceChain(asset.chain) && (
              <CopyRow
                label={translate('swap.memo-hex') as string}
                value={memoToHexCalldata(memo)}
                copied={copiedKey === 'memo-hex'}
                onCopy={() => copy('memo-hex', memoToHexCalldata(memo))}
                copyLabel={copyLabel}
                copiedLabel={copiedLabel}
              />
            )}
          </>
        )}
      </View>
      {showMemoHint && <Banner tone="warning" title={memoHint} />}
      {showExactAmount && (
        <Banner
          tone="warning"
          title={
            isUtxoSourceChain(asset.chain)
              ? (translate('swap.exact-amount-utxo') as string)
              : (translate('swap.exact-amount') as string)
          }
        />
      )}
    </View>
  );
}
