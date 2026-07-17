/* eslint-disable react-native/no-inline-styles */
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Dimensions, Keyboard, View } from 'react-native';
import { useTheme } from '@react-navigation/native';
import {
  BottomSheetBackdrop,
  BottomSheetBackdropProps,
  BottomSheetModal,
  BottomSheetView,
} from '@gorhom/bottom-sheet';

import BoldText from './BoldText';
import RegText from './RegText';
import Button from './Button';
import { ButtonTypeEnum } from '../../app/AppState';
import { ThemeType } from '../../app/types';
import { ConfirmOptions, registerConfirmListener } from '../../app/showConfirm';

// Vertical lift: pushes the detached sheet up roughly into screen center.
// Dynamic sizing measures height after render, so this is a heuristic
// rather than perfect centering; works for short alerts (~200–400px tall).
const VERTICAL_LIFT = Math.round(Dimensions.get('window').height * 0.32);

const ConfirmBottomSheet: React.FC = () => {
  const { colors } = useTheme() as ThemeType;
  const ref = useRef<BottomSheetModal>(null);
  const [options, setOptions] = useState<ConfirmOptions | null>(null);
  const resolvedRef = useRef<boolean>(false);

  useEffect(() => {
    registerConfirmListener(opts => {
      resolvedRef.current = false;
      setOptions(opts);
      ref.current?.present();
    });
    return () => registerConfirmListener(null);
  }, []);

  const dismiss = useCallback(() => {
    ref.current?.dismiss();
  }, []);

  const handleButton = useCallback(
    (button: { text: string; onPress?: () => void }) => {
      resolvedRef.current = true;
      dismiss();
      if (button.onPress) {
        setTimeout(button.onPress, 0);
      }
    },
    [dismiss],
  );

  const handleSheetDismissed = useCallback(() => {
    if (resolvedRef.current || !options) {
      return;
    }
    resolvedRef.current = true;
    const cancel = options.buttons.find(b => b.style === 'cancel');
    if (cancel?.onPress) {
      setTimeout(cancel.onPress, 0);
    }
  }, [options]);

  // Matches the original Alert.alert behaviour with `cancelable: false`:
  // the backdrop dims the screen but tapping it does NOT dismiss the
  // dialog. The user must tap a button (or the X). Also avoids a stacked-
  // sheet quirk where a backdrop tap inside ConfirmBottomSheet propagated
  // to the underlying modal's backdrop and closed both.
  const renderBackdrop = useCallback(
    (props: BottomSheetBackdropProps) => (
      <BottomSheetBackdrop
        {...props}
        disappearsOnIndex={-1}
        appearsOnIndex={0}
        pressBehavior="none"
      />
    ),
    [],
  );

  // No X, no swipe-to-close: matches Alert.alert(cancelable: false) — the
  // dialog can only be closed by pressing one of its buttons. Title-only
  // header with a thin divider below separates it from the message/buttons.
  const renderHandle = useCallback(
    () => (
      <View
        style={{
          paddingTop: 12,
          paddingBottom: 10,
          paddingHorizontal: 16,
          backgroundColor: colors.bottomSheetBackground,
          borderBottomWidth: 0.5,
          borderBottomColor: colors.bottomSheetBorder,
        }}
      >
        <BoldText
          numberOfLines={1}
          style={{
            fontSize: 16,
            lineHeight: 28,
            textAlign: 'center',
          }}
        >
          {options?.title ?? ''}
        </BoldText>
      </View>
    ),
    [colors, options?.title],
  );

  return (
    <BottomSheetModal
      ref={ref}
      accessible={false}
      enableDynamicSizing={true}
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
      detached={true}
      bottomInset={VERTICAL_LIFT}
      handleComponent={renderHandle}
      // marginHorizontal goes on `style` (the sheet card) not on the
      // hosting container — the container is what hosts the backdrop, and
      // shrinking it leaves bare gaps where taps fall through to the
      // underlying sheet's backdrop, closing two sheets at once.
      style={{
        marginHorizontal: 20,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: colors.bottomSheetBorder,
        overflow: 'hidden',
      }}
      backgroundStyle={{
        backgroundColor: colors.bottomSheetBackground,
        borderRadius: 20,
      }}
      backdropComponent={renderBackdrop}
      onDismiss={handleSheetDismissed}
    >
      <BottomSheetView
        style={{
          backgroundColor: colors.bottomSheetBackground,
          paddingHorizontal: 6,
          paddingTop: 18,
          paddingBottom: 24,
        }}
      >
        {!!options?.message && (
          <RegText
            style={{
              fontSize: 15,
              lineHeight: 22,
              textAlign: 'center',
              marginBottom: 20,
            }}
          >
            {options.message}
          </RegText>
        )}
        {(() => {
          const all = options?.buttons ?? [];
          const cancel = all.find(b => b.style === 'cancel');
          const actions = all.filter(b => b.style !== 'cancel');
          // 3+ buttons would overflow horizontally (Button at 40% each):
          // stack actions in one row and cancel below on its own.
          const stacked = all.length > 2 && !!cancel;
          // App-wide standard for two-button rows: Secondary/Cancel on the
          // LEFT, Primary action on the RIGHT (matches every inline sheet body
          // — VerifyAddress, NewAddressTag, AbDetail, CustomServer). Callers
          // pass the action first and cancel last, so pull cancel to the front
          // here rather than requiring every caller to reorder.
          const rowButtons = stacked
            ? actions
            : cancel
              ? [cancel, ...actions]
              : all;
          const useTwoButtonsWidth = rowButtons.length > 1 || stacked;
          return (
            <>
              <View
                style={{
                  flexDirection: 'row',
                  justifyContent: 'center',
                  alignItems: 'center',
                  gap: 10,
                }}
              >
                {rowButtons.map((b, i) => (
                  <Button
                    key={`${i}-${b.text}`}
                    // Destructive actions share the Secondary (outline) shape as
                    // cancel but carry a soft-coral border/text so the risky
                    // choice reads as a warning rather than the positive Primary.
                    type={
                      b.style === 'cancel' || b.style === 'destructive'
                        ? ButtonTypeEnum.Secondary
                        : ButtonTypeEnum.Primary
                    }
                    title={b.text}
                    style={
                      b.style === 'destructive'
                        ? { borderColor: colors.danger.text }
                        : undefined
                    }
                    textStyle={
                      b.style === 'destructive'
                        ? { color: colors.danger.text }
                        : undefined
                    }
                    onPress={() => handleButton(b)}
                    twoButtons={useTwoButtonsWidth}
                  />
                ))}
              </View>
              {stacked && cancel && (
                <View
                  style={{
                    flexDirection: 'row',
                    justifyContent: 'center',
                    alignItems: 'center',
                    marginTop: 10,
                  }}
                >
                  <Button
                    type={ButtonTypeEnum.Secondary}
                    title={cancel.text}
                    onPress={() => handleButton(cancel)}
                    twoButtons={true}
                  />
                </View>
              )}
            </>
          );
        })()}
      </BottomSheetView>
    </BottomSheetModal>
  );
};

export default React.memo(ConfirmBottomSheet);
