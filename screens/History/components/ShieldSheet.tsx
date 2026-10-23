/* eslint-disable react-native/no-inline-styles */
import React, { forwardRef, useCallback, useContext, useState } from 'react';
import { View } from 'react-native';
import { BottomSheetModal } from '@gorhom/bottom-sheet';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { radiusMd, useTheme, iconSize, radiusPill } from '@app/theme';
import { ContextAppLoaded } from '@app/context';
import {
  MixnetView,
  sendGateOpen,
  shownStatusKey,
} from '@app/walletBackend/transforms/mixnetView';
import Utils from '@app/utils';
import AppSheetModal from '@ui/primitives/AppSheetModal';
import Text from '@ui/primitives/Text';
import Button from '@ui/primitives/Button';
import { ShieldIcon } from '@ui/primitives/Icons/ShieldIcon';

type ShieldSheetProps = {
  /** What the proposal will move, in ZEC. */
  amount: number;
  fee: number;
  mixnetView: MixnetView;
  onShield: () => Promise<void>;
};

/**
 * Shielding the transparent balance, asked in place: from where, how much,
 * the network fee and what lands in Orchard. Shield waits for the mixnet,
 * like any send, and says so while it does.
 */
const ShieldSheet = forwardRef<BottomSheetModal, ShieldSheetProps>(
  ({ amount, fee, mixnetView, onShield }, ref) => {
    const { translate, info } = useContext(ContextAppLoaded);
    const { colors } = useTheme();
    const insets = useSafeAreaInsets();
    const t = (key: string) => translate(key) as string;
    const [busy, setBusy] = useState<boolean>(false);
    const open = sendGateOpen(mixnetView);
    const blocked = mixnetView.kind === 'transport' && mixnetView.sendBlocked;
    const zec = (value: number) =>
      `${Utils.parseNumberFloatToStringLocale(value, 4)} ${info.currencyName}`;

    const dismiss = useCallback(() => {
      (ref as React.RefObject<BottomSheetModal>)?.current?.dismiss();
    }, [ref]);

    const row = (
      label: string,
      value: string,
      first = false,
      total = false,
    ) => (
      <View
        style={{
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
          minHeight: 44,
          paddingHorizontal: 16,
          borderTopWidth: first ? 0 : 1,
          borderTopColor: colors.borderSubtle,
        }}
      >
        <Text variant="caption" tone="muted">
          {label}
        </Text>
        <Text variant="bodySmall" style={{ fontWeight: total ? '700' : '600' }}>
          {value}
        </Text>
      </View>
    );

    return (
      <AppSheetModal
        ref={ref}
        handle
        onDismiss={() => setBusy(false)}
        contentStyle={{ paddingBottom: insets.bottom + 24 }}
      >
        <View testID="shield.sheet" style={{ paddingHorizontal: 20 }}>
          <View style={{ alignItems: 'center', marginTop: 4 }}>
            <View
              style={{
                width: 52,
                height: 52,
                borderRadius: radiusPill,
                backgroundColor: colors.bgAccentSubtle,
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: 12,
              }}
            >
              <ShieldIcon size={iconSize} color={colors.fgAccent} />
            </View>
          </View>
          <Text
            variant="bodyStrong"
            style={{ textAlign: 'center', fontWeight: '700' }}
          >
            {t('shield.title')}
          </Text>
          <Text
            variant="caption"
            tone="muted"
            style={{ textAlign: 'center', marginTop: 8 }}
          >
            {t('shield.sub')}
          </Text>
          <View
            style={{
              marginTop: 20,
              borderRadius: radiusMd,
              borderWidth: 1,
              borderColor: colors.bottomSheetBorder,
              backgroundColor: colors.bgCanvas,
            }}
          >
            {row(t('shield.from'), t('shield.transparent'), true)}
            {row(t('shield.amount'), zec(amount))}
            {row(t('shield.fee'), zec(fee))}
            {row(
              t('shield.you-get'),
              zec(Math.max(0, amount - fee)),
              false,
              true,
            )}
          </View>
          {blocked && (
            <View
              testID="shield.blocked"
              style={{ alignItems: 'center', rowGap: 4, marginTop: 16 }}
            >
              <Text
                variant="caption"
                tone="muted"
                style={{ textAlign: 'center' }}
              >
                {t('send.nym-blocked')}
              </Text>
              <Text variant="bodySmall" style={{ textAlign: 'center' }}>
                {t(shownStatusKey(mixnetView))}
              </Text>
            </View>
          )}
          <View style={{ marginTop: 20, rowGap: 8 }}>
            <Button
              testID="shield.confirm"
              variant="primary"
              title={t('shield.button')}
              busy={busy}
              disabled={busy || !open}
              onPress={async () => {
                setBusy(true);
                dismiss();
                await onShield();
              }}
            />
            <Button
              testID="shield.cancel"
              variant="quiet"
              title={t('cancel')}
              onPress={dismiss}
            />
          </View>
        </View>
      </AppSheetModal>
    );
  },
);

export default ShieldSheet;
