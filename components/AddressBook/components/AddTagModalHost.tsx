/* eslint-disable react-native/no-inline-styles */
import React, { forwardRef, useCallback } from 'react';
import { Keyboard, Pressable, View } from 'react-native';
import { useTheme } from '@react-navigation/native';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { faXmark } from '@fortawesome/free-solid-svg-icons';
import {
  BottomSheetBackdrop,
  BottomSheetBackdropProps,
  BottomSheetModal,
  BottomSheetView,
} from '@gorhom/bottom-sheet';

import { AddressBookFileClass, TranslateType } from '../../../app/AppState';
import { ThemeType } from '../../../app/types';
import BoldText from '../../Components/BoldText';
import NewAddressTag from '../../Receive/components/NewAddressTag';
import { useKeyboardHeight } from '../../../app/hooks/useKeyboardHeight';

type AddTagModalHostProps = {
  // Latest target the host should render. Pass `null` while the modal is
  // hidden. Bump `key` (via the address/own pair) to force-remount the inner
  // form so its local state resets between presentations.
  target: { address: string; own: boolean; swapChain: string } | null;
  setAddressBook: (ab: AddressBookFileClass[]) => void;
  translate: (key: string) => TranslateType;
};

const AddTagModalHost = forwardRef<
  React.ComponentRef<typeof BottomSheetModal>,
  AddTagModalHostProps
>(({ target, setAddressBook, translate }, ref) => {
  const { colors } = useTheme() as ThemeType;
  const keyboardHeight = useKeyboardHeight();

  const dismiss = useCallback(() => {
    (
      ref as React.RefObject<React.ComponentRef<typeof BottomSheetModal>>
    )?.current?.dismiss();
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
          {/* Left spacer width matches the X Pressable's measured width
              (paddingHorizontal: 14 × 2 + icon size 20 = 48) so the title
              stays perfectly centered. The BoldText flex-fills the middle
              space so a long localized title ellipsizes instead of being
              clipped. */}
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
            {
              (target?.own
                ? translate('addressbook.add-tag')
                : translate('addressbook.add-contact')) as string
            }
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
    [colors, dismiss, target?.own, translate],
  );

  return (
    <BottomSheetModal
      ref={ref}
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
      <BottomSheetView
        style={{
          backgroundColor: colors.bottomSheetBackground,
          paddingBottom: keyboardHeight > 0 ? keyboardHeight + 20 : 30,
        }}
      >
        {target && (
          <NewAddressTag
            key={`${target.address}-${target.own}`}
            address={target.address}
            own={target.own}
            swapChain={target.swapChain}
            closeSheet={dismiss}
            setAddressBook={setAddressBook}
          />
        )}
      </BottomSheetView>
    </BottomSheetModal>
  );
});

export default React.memo(AddTagModalHost);
