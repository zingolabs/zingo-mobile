/* eslint-disable react-native/no-inline-styles */
import React, { forwardRef, useCallback } from 'react';
import { Keyboard, Pressable, View } from 'react-native';
import { useTheme } from '../../app/theme';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { faXmark } from '@fortawesome/free-solid-svg-icons';
import {
  BottomSheetBackdrop,
  BottomSheetBackdropProps,
  BottomSheetModal,
  BottomSheetScrollView,
} from '@gorhom/bottom-sheet';

import BoldText from './BoldText';
import RegText from './RegText';
import SheetRim from './SheetRim';

export type ActionMenuBottomSheetAction = {
  label: string;
  onPress: () => void;
  destructive?: boolean;
};

type ActionMenuBottomSheetProps = {
  title?: string;
  actions: ActionMenuBottomSheetAction[];
  testID?: string;
};

const ActionMenuBottomSheet = forwardRef<
  BottomSheetModal,
  ActionMenuBottomSheetProps
>(({ title, actions, testID }, ref) => {
  const { colors } = useTheme();

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
          backgroundColor: colors.bgSurface,
          borderTopLeftRadius: 40,
          borderTopRightRadius: 40,
        }}
      >
        <SheetRim />
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
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
            {title ?? ''}
          </BoldText>
          <Pressable
            onPress={dismiss}
            hitSlop={8}
            style={{ paddingHorizontal: 14, paddingVertical: 4 }}
          >
            <FontAwesomeIcon icon={faXmark} size={20} color={colors.fgMuted} />
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
        backgroundColor: colors.bgSurface,
        borderTopLeftRadius: 40,
        borderTopRightRadius: 40,
      }}
      backdropComponent={renderBackdrop}
    >
      <BottomSheetScrollView
        testID={testID}
        style={{ backgroundColor: colors.bgSurface }}
        contentContainerStyle={{ paddingBottom: 30 }}
      >
        {actions.map((action, idx) => (
          <Pressable
            key={`${idx}-${action.label}`}
            onPress={() => {
              dismiss();
              // Fire after dismiss so any Alert/follow-up sheet shows on the
              // resolved stack, not racing the close animation.
              setTimeout(() => action.onPress(), 0);
            }}
            style={({ pressed }) => ({
              paddingHorizontal: 24,
              paddingVertical: 14,
              opacity: pressed ? 0.6 : 1,
            })}
          >
            <RegText
              style={{
                fontSize: 16,
                color: action.destructive ? colors.fgDangerEmphasis : colors.fgDefault,
                fontWeight: '400',
              }}
            >
              {action.label}
            </RegText>
          </Pressable>
        ))}
      </BottomSheetScrollView>
    </BottomSheetModal>
  );
});

export default React.memo(ActionMenuBottomSheet);
