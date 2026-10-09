/* eslint-disable react-native/no-inline-styles */
import React, { forwardRef, useCallback } from 'react';
import { Pressable, View } from 'react-native';
import { radiusSheet, useTheme } from '@app/theme';
import {
  BottomSheetBackdrop,
  BottomSheetBackdropProps,
  BottomSheetModal,
  BottomSheetView,
} from '@gorhom/bottom-sheet';

import { TranslateType, WalletType } from '@app/AppState';
import BoldText from '@ui/primitives/BoldText';
import RegText from '@ui/primitives/RegText';
import SheetRim from '@ui/primitives/SheetRim';

const SeedHandle: React.FC = () => {
  const { colors } = useTheme();
  return (
    <View
      style={{
        paddingTop: 8,
        backgroundColor: colors.bgSurface,
        borderTopLeftRadius: radiusSheet,
        borderTopRightRadius: radiusSheet,
      }}
    >
      <SheetRim />
    </View>
  );
};

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
      (ref as React.RefObject<BottomSheetModal>)?.current?.dismiss();
    }, [ref]);

    const renderBackdrop = useCallback(
      (props: BottomSheetBackdropProps) => (
        <BottomSheetBackdrop
          {...props}
          disappearsOnIndex={-1}
          appearsOnIndex={0}
          opacity={0.62}
          pressBehavior="close"
        />
      ),
      [],
    );

    return (
      <BottomSheetModal
        ref={ref}
        accessible={false}
        enableDynamicSizing
        enablePanDownToClose
        backdropComponent={renderBackdrop}
        handleComponent={SeedHandle}
        backgroundStyle={{
          backgroundColor: colors.bgSurface,
          borderTopLeftRadius: radiusSheet,
          borderTopRightRadius: radiusSheet,
        }}
      >
        <BottomSheetView
          style={{
            backgroundColor: colors.bgSurface,
            paddingHorizontal: 24,
            paddingTop: 20,
            paddingBottom: 32,
          }}
        >
          <BoldText
            style={{ fontSize: 14.5, lineHeight: 20, textAlign: 'center' }}
          >
            {
              translate(
                wallet?.seed ? 'seedsheet.title' : 'seedsheet.title-key',
              ) as string
            }
          </BoldText>
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
                        borderRadius: 8,
                        backgroundColor: colors.bgCanvas,
                        borderWidth: 1,
                        borderColor: colors.bottomSheetBorder,
                      }}
                    >
                      <RegText style={{ fontSize: 10, color: colors.fgMuted }}>
                        {String(r * 3 + c + 1)}
                      </RegText>
                      <RegText style={{ fontSize: 12.5 }} selectable={false}>
                        {word}
                      </RegText>
                    </View>
                  ))}
                </View>
              ))}
            </View>
          ) : (
            <View
              style={{
                marginTop: 24,
                padding: 12,
                borderRadius: 8,
                backgroundColor: colors.bgCanvas,
                borderWidth: 1,
                borderColor: colors.bottomSheetBorder,
              }}
            >
              <RegText style={{ fontSize: 12.5 }}>{wallet?.ufvk ?? ''}</RegText>
            </View>
          )}
          <View
            style={{
              marginTop: 20,
              height: 38,
              borderRadius: 10,
              borderWidth: 1,
              borderColor: colors.bottomSheetBorder,
              backgroundColor: colors.bgCanvas,
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              paddingHorizontal: 15,
            }}
          >
            <RegText style={{ fontSize: 11, color: colors.fgMuted }}>
              {translate('seedsheet.birthday') as string}
            </RegText>
            <BoldText style={{ fontSize: 12.5 }}>
              {(wallet?.birthday ?? 0).toLocaleString()}
            </BoldText>
          </View>
          <Pressable
            onPress={dismiss}
            accessibilityRole="button"
            style={({ pressed }) => ({
              marginTop: 20,
              height: 44,
              borderRadius: 22,
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: colors.bgAccent,
              transform: [{ scale: pressed ? 0.97 : 1 }],
            })}
          >
            <RegText
              style={{
                color: colors.bgCanvas,
                fontSize: 16,
                fontWeight: '500',
              }}
            >
              {translate('seedsheet.done') as string}
            </RegText>
          </Pressable>
        </BottomSheetView>
      </BottomSheetModal>
    );
  },
);

export default SeedSheet;
