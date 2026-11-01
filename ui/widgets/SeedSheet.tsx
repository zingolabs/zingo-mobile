/* eslint-disable react-native/no-inline-styles */
import React, { forwardRef, useCallback } from 'react';
import { View } from 'react-native';
import { useTheme, radiusSm, space12 } from '@app/theme';
import { ease } from '@app/theme/motion';
import { BottomSheetModal } from '@gorhom/bottom-sheet';

import { TranslateType, WalletType } from '@app/AppState';
import { formatInteger } from '@app/utils/formatAmount';
import Text from '@ui/primitives/Text';
import AppSheetModal, { SheetFooter } from '@ui/primitives/AppSheetModal';
import Button from '@ui/primitives/Button';

// Rises as every sheet does; Done drops it quickly, 260 ms ease-in.
const CLOSE = { duration: 260, easing: ease.in };

type SeedSheetProps = {
  wallet: WalletType | null;
  translate: (key: string) => TranslateType;
};

// The 24 words in three columns, the birthday under them, and Done.
const SeedSheet = forwardRef<BottomSheetModal, SeedSheetProps>(
  ({ wallet, translate }, ref) => {
    const { colors } = useTheme();
    const words = wallet?.seed ? wallet.seed.split(' ') : [];
    const columns = [0, 1, 2].map(c => words.filter((_, i) => i % 3 === c));

    const dismiss = useCallback(() => {
      (ref as React.RefObject<BottomSheetModal>)?.current?.dismiss(CLOSE);
    }, [ref]);

    return (
      <AppSheetModal ref={ref}>
        <View style={{ paddingHorizontal: 24, paddingTop: 28 }}>
          <Text variant="bodyStrong" style={{ textAlign: 'center' }}>
            {
              translate(
                wallet?.seed ? 'seedsheet.title' : 'seedsheet.title-key',
              ) as string
            }
          </Text>
          {wallet?.seed ? (
            <View style={{ flexDirection: 'row', marginTop: 24, gap: 13 }}>
              {columns.map((col, c) => (
                <View key={c} style={{ flex: 1, gap: 9 }}>
                  {col.map((word, r) => (
                    <View
                      key={word + r}
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        gap: 6,
                        height: 30,
                        paddingHorizontal: 10,
                        borderRadius: radiusSm,
                        backgroundColor: colors.bgCanvas,
                        borderWidth: 1,
                        borderColor: colors.bottomSheetBorder,
                      }}
                    >
                      <Text variant="caption" tone="muted">
                        {String(r * 3 + c + 1)}
                      </Text>
                      <Text variant="bodySmall" selectable={false}>
                        {word}
                      </Text>
                    </View>
                  ))}
                </View>
              ))}
            </View>
          ) : (
            <View
              style={{
                marginTop: 24,
                padding: space12,
                borderRadius: radiusSm,
                backgroundColor: colors.bgCanvas,
                borderWidth: 1,
                borderColor: colors.bottomSheetBorder,
              }}
            >
              <Text variant="address">{wallet?.ufvk ?? ''}</Text>
            </View>
          )}
          <View
            style={{
              marginTop: 20,
              height: 38,
              borderRadius: radiusSm,
              borderWidth: 1,
              borderColor: colors.bottomSheetBorder,
              backgroundColor: colors.bgCanvas,
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              paddingHorizontal: 15,
            }}
          >
            <Text variant="caption" tone="muted">
              {translate('seedsheet.birthday') as string}
            </Text>
            <Text variant="bodySmall" style={{ fontWeight: '600' }}>
              {formatInteger(wallet?.birthday ?? 0)}
            </Text>
          </View>
          <SheetFooter style={{ paddingHorizontal: 24 }}>
            <Button
              variant="primary"
              title={translate('seedsheet.done') as string}
              onPress={dismiss}
              style={{ marginTop: 20 }}
            />
          </SheetFooter>
        </View>
      </AppSheetModal>
    );
  },
);

export default SeedSheet;
