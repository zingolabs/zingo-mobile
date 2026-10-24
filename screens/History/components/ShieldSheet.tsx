/* eslint-disable react-native/no-inline-styles */
import React, { forwardRef, useCallback, useContext, useState } from 'react';
import DetailRows from '@screens/Swap/components/DetailRows';
import { formatZecAmount } from '@app/utils/formatZecAmount';
import { View } from 'react-native';
import { BottomSheetModal } from '@gorhom/bottom-sheet';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme, iconSize, radiusPill, space20 } from '@app/theme';
import { ContextAppLoaded } from '@app/context';
import {
  MixnetView,
  sendGateOpen,
  shownStatusKey,
} from '@app/walletBackend/transforms/mixnetView';
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
      `${formatZecAmount(value)} ${info.currencyName}`;

    const dismiss = useCallback(() => {
      (ref as React.RefObject<BottomSheetModal>)?.current?.dismiss();
    }, [ref]);

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
          <View style={{ marginTop: space20 }}>
            <DetailRows
              rows={[
                { label: t('shield.from'), value: t('shield.transparent') },
                { label: t('shield.amount'), value: zec(amount) },
                { label: t('shield.fee'), value: zec(fee) },
                {
                  label: t('shield.you-get'),
                  value: zec(Math.max(0, amount - fee)),
                  strong: true,
                },
              ]}
            />
          </View>
          {blocked && (
            <View
              testID="shield.blocked"
              style={{ alignItems: 'center', rowGap: 4, marginTop: 16 }}
            >
              <Text
                variant="bodySmall"
                tone="muted"
                style={{ textAlign: 'center' }}
              >
                {t('send.nym-blocked')}
              </Text>
              <Text
                variant="body"
                style={{ textAlign: 'center', fontWeight: '500' }}
              >
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
