/* eslint-disable react-native/no-inline-styles */
import React, { forwardRef, useCallback, useContext, useState } from 'react';
import { View } from 'react-native';
import { BottomSheetModal } from '@gorhom/bottom-sheet';
import { space4, space8, space12, space20, useTheme } from '@app/theme';
import { ContextAppLoaded } from '@app/context';
import type { SwapRecordType } from '@app/swap';
import Utils from '@app/utils';
import { formatExactAmount } from '@app/utils/formatAmount';
import AppSheetModal, { SheetFooter } from '@ui/primitives/AppSheetModal';
import Text from '@ui/primitives/Text';
import Button from '@ui/primitives/Button';
import TokenLogo from './TokenLogo';
import { tokenEntryOf } from '@screens/Swap/swapAssets';

/** An exact amount with at least one decimal and no trailing zeros, on the device's separator. */
const exact = (dotted: string): string => {
  const trimmed = dotted.includes('.')
    ? dotted.replace(/0+$/, '').replace(/\.$/, '.0')
    : `${dotted}.0`;
  return formatExactAmount(trimmed);
};

/**
 * Asks before a purchase's deposit is marked sent: the coin, how much and
 * where it had to go. Yes marks it and the tracking takes over; Not yet, a
 * swipe or the scrim only close the sheet.
 */
const DepositSentSheet = forwardRef<
  BottomSheetModal,
  {
    record: SwapRecordType;
    /** Marks the deposit sent. */
    onConfirm: () => Promise<void>;
    /** Once the sheet has closed: the tracking takes over. */
    onConfirmed: () => void;
  }
>(({ record, onConfirm, onConfirmed }, ref) => {
  const { translate } = useContext(ContextAppLoaded);
  const { colors } = useTheme();
  const t = (key: string) => translate(key) as string;
  const [busy, setBusy] = useState<boolean>(false);
  const coin = record.sellAsset.ticker ?? record.sellAsset.symbol;

  const dismiss = useCallback(() => {
    (ref as React.RefObject<BottomSheetModal>)?.current?.dismiss();
  }, [ref]);

  const strong = (text: string) => (
    <Text
      variant="caption"
      color={colors.fgDefault}
      style={{ fontWeight: '700' }}
    >
      {text}
    </Text>
  );
  const parts = t('swap.sent-confirm-body').split(
    /(\{amount\} \{coin\}|\{address\})/,
  );

  return (
    <AppSheetModal ref={ref} handle onDismiss={() => setBusy(false)}>
      <View
        testID="swap.sent-confirm"
        style={{ paddingHorizontal: space20, alignItems: 'center' }}
      >
        <View style={{ marginTop: space4, marginBottom: space12 }}>
          <TokenLogo
            token={tokenEntryOf(record.sellAsset)}
            size={52}
            surfaceColor={colors.bgSurface}
          />
        </View>
        <Text
          variant="bodyStrong"
          style={{ textAlign: 'center', fontWeight: '700' }}
        >
          {t('swap.sent-confirm-title')}
        </Text>
        <Text
          variant="caption"
          tone="muted"
          style={{ textAlign: 'center', marginTop: space8 }}
        >
          {parts.map((part, i) =>
            part === '{amount} {coin}' ? (
              <React.Fragment key={i}>
                {strong(`${exact(record.sellAmountHumanDecimal)} ${coin}`)}
              </React.Fragment>
            ) : part === '{address}' ? (
              <Text key={i} variant="address" color={colors.fgDefault}>
                {Utils.trimToSmall(record.depositAddress, 6)}
              </Text>
            ) : (
              part
            ),
          )}
        </Text>
        <SheetFooter style={{ paddingHorizontal: space20 }}>
          <View
            style={{ alignSelf: 'stretch', marginTop: space20, rowGap: space8 }}
          >
            <Button
              testID="swap.sent-confirm.yes"
              variant="primary"
              title={t('swap.sent-confirm-yes')}
              busy={busy}
              onPress={async () => {
                setBusy(true);
                await onConfirm();
                dismiss();
                onConfirmed();
              }}
            />
            <Button
              testID="swap.sent-confirm.no"
              variant="quiet"
              title={t('swap.sent-confirm-no')}
              onPress={dismiss}
            />
          </View>
        </SheetFooter>
      </View>
    </AppSheetModal>
  );
});

export default DepositSentSheet;
