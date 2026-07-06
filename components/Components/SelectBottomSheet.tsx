/* eslint-disable react-native/no-inline-styles */
import React, { forwardRef, useCallback } from 'react';
import { Keyboard, Pressable, View } from 'react-native';
import { useTheme } from '@react-navigation/native';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { faCheck, faXmark } from '@fortawesome/free-solid-svg-icons';
import {
  BottomSheetBackdrop,
  BottomSheetBackdropProps,
  BottomSheetModal,
  BottomSheetScrollView,
} from '@gorhom/bottom-sheet';

import BoldText from './BoldText';
import RegText from './RegText';
import { ThemeType } from '../../app/types';

export type SelectBottomSheetItem = {
  label: string;
  value: string;
};

type SelectBottomSheetProps = {
  title: string;
  items: SelectBottomSheetItem[];
  value: string;
  onChange: (value: string) => void;
  testID?: string;
};

const SelectBottomSheet = forwardRef<BottomSheetModal, SelectBottomSheetProps>(
  ({ title, items, value, onChange, testID }, ref) => {
    const { colors } = useTheme() as ThemeType;

    const dismiss = useCallback(() => {
      (ref as React.RefObject<BottomSheetModal>)?.current?.dismiss();
    }, [ref]);

    const renderBackdrop = useCallback(
      (props: BottomSheetBackdropProps) => (
        <BottomSheetBackdrop
          {...props}
          disappearsOnIndex={-1}
          appearsOnIndex={0}
          pressBehavior="close"
        />
      ),
      [],
    );

    const renderHandle = useCallback(
      () => (
        <View
          style={{
            paddingTop: 8,
            paddingBottom: 6,
            paddingHorizontal: 16,
            backgroundColor: colors.bottomSheetBackground,
            borderTopLeftRadius: 40,
            borderTopRightRadius: 40,
            borderTopWidth: 1,
            borderLeftWidth: 0.5,
            borderRightWidth: 0.5,
            borderTopColor: colors.bottomSheetBorder,
            borderLeftColor: colors.bottomSheetBorder,
            borderRightColor: colors.bottomSheetBorder,
          }}
        >
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            {/* Left spacer matches the X Pressable's width (14×2 + 20 = 48). */}
            <View style={{ width: 48 }} />
            <BoldText
              numberOfLines={1}
              style={{
                flex: 1,
                fontSize: 16,
                lineHeight: 28,
                textAlign: 'center',
              }}
            >
              {title}
            </BoldText>
            <Pressable
              onPress={dismiss}
              hitSlop={8}
              style={{ paddingHorizontal: 14, paddingVertical: 4 }}
            >
              <FontAwesomeIcon icon={faXmark} size={20} color={colors.zingo} />
            </Pressable>
          </View>
        </View>
      ),
      [colors, dismiss, title],
    );

    return (
      <BottomSheetModal
        ref={ref}
        accessible={false}
        enableDynamicSizing={true}
        enablePanDownToClose
        stackBehavior="push"
        keyboardBehavior={'interactive'}
        keyboardBlurBehavior={'restore'}
        android_keyboardInputMode={'adjustResize'}
        onAnimate={(from, to) => {
          // Opening (from === -1) dismisses a keyboard left open by the
          // underlying screen so the sheet never renders behind it. Guard
          // avoids fighting a keyboard the sheet itself focuses later.
          if (from === -1 && to >= 0) {
            Keyboard.dismiss();
          }
        }}
        handleComponent={renderHandle}
        backgroundStyle={{
          backgroundColor: colors.bottomSheetBackground,
          borderTopLeftRadius: 40,
          borderTopRightRadius: 40,
        }}
        backdropComponent={renderBackdrop}
      >
        <BottomSheetScrollView
          testID={testID}
          style={{ backgroundColor: colors.bottomSheetBackground }}
          contentContainerStyle={{ paddingBottom: 30 }}
        >
          {items.map(item => {
            const selected = item.value === value;
            return (
              <Pressable
                key={item.value}
                onPress={() => {
                  onChange(item.value);
                  dismiss();
                }}
                style={({ pressed }) => ({
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  paddingHorizontal: 24,
                  paddingVertical: 14,
                  opacity: pressed ? 0.6 : 1,
                })}
              >
                <RegText
                  style={{
                    fontSize: 16,
                    color: selected ? colors.primary : colors.text,
                    fontWeight: selected ? '600' : '400',
                  }}
                >
                  {item.label}
                </RegText>
                {selected && (
                  <FontAwesomeIcon
                    icon={faCheck}
                    size={16}
                    color={colors.primary}
                  />
                )}
              </Pressable>
            );
          })}
        </BottomSheetScrollView>
      </BottomSheetModal>
    );
  },
);

export default React.memo(SelectBottomSheet);
