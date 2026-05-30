/* eslint-disable react-native/no-inline-styles */
import React, { forwardRef, useCallback } from 'react';
import { Pressable, View } from 'react-native';
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
  target: { address: string; own: boolean } | null;
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
          borderLeftWidth: 1,
          borderRightWidth: 1,
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
          <View style={{ width: 28 }} />
          <BoldText style={{ fontSize: 16, lineHeight: 28 }}>
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
      keyboardBehavior={'interactive'}
      keyboardBlurBehavior={'restore'}
      android_keyboardInputMode={'adjustResize'}
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
            closeSheet={dismiss}
            setAddressBook={setAddressBook}
          />
        )}
      </BottomSheetView>
    </BottomSheetModal>
  );
});

export default React.memo(AddTagModalHost);
