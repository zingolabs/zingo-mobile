/* eslint-disable react-native/no-inline-styles */
import React, { forwardRef, useCallback } from 'react';
import { Keyboard, View } from 'react-native';
import { radiusSheet, useTheme, iconSizeMd } from '@app/theme';
import Pressable from '@ui/primitives/Pressable';
import {
  BottomSheetBackdrop,
  BottomSheetBackdropProps,
  BottomSheetModal,
  BottomSheetScrollView,
} from '@gorhom/bottom-sheet';

import Text from '@ui/primitives/Text';
import SheetRim from '@ui/primitives/SheetRim';
import { XIcon } from '@ui/primitives/Icons/XIcon';

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
        style={{ backgroundColor: colors.bgScrim }}
        opacity={1}
      />
    ),
    [colors],
  );

  const renderHandle = useCallback(
    () => (
      <View
        style={{
          paddingTop: 8,
          paddingBottom: 6,
          paddingHorizontal: 16,
          backgroundColor: colors.bgSurface,
          borderTopLeftRadius: radiusSheet,
          borderTopRightRadius: radiusSheet,
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
          <Text
            variant="barTitle"
            numberOfLines={1}
            style={{ flex: 1, textAlign: 'center' }}
          >
            {title ?? ''}
          </Text>
          <Pressable
            kind="icon"
            onPress={dismiss}
            hitSlop={8}
            style={{ paddingHorizontal: 14, paddingVertical: 4 }}
          >
            <XIcon size={iconSizeMd} color={colors.fgMuted} />
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
        borderTopLeftRadius: radiusSheet,
        borderTopRightRadius: radiusSheet,
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
            kind="row"
            key={`${idx}-${action.label}`}
            onPress={() => {
              dismiss();
              // Fire after dismiss so any Alert/follow-up sheet shows on the
              // resolved stack, not racing the close animation.
              setTimeout(() => action.onPress(), 0);
            }}
            style={{
              paddingHorizontal: 24,
              paddingVertical: 14,
            }}
          >
            <Text
              variant="body"
              tone={action.destructive ? 'danger' : 'default'}
            >
              {action.label}
            </Text>
          </Pressable>
        ))}
      </BottomSheetScrollView>
    </BottomSheetModal>
  );
});

export default React.memo(ActionMenuBottomSheet);
