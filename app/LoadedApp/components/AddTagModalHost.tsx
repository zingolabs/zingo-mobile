/* eslint-disable react-native/no-inline-styles */
import React, { forwardRef, useCallback } from 'react';
import { Pressable, View } from 'react-native';
import { useTheme } from '../../theme';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { faXmark } from '@fortawesome/free-solid-svg-icons';
import { BottomSheetModal } from '@gorhom/bottom-sheet';

import { AddressBookFileClass, TranslateType } from '../../AppState';
import BoldText from '@ui/primitives/BoldText';
import AppSheetModal from '@ui/primitives/AppSheetModal';
import NewAddressTag from '@screens/Receive/components/NewAddressTag';
import { useKeyboardHeight } from '../../hooks/useKeyboardHeight';

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
  const { colors } = useTheme();
  const keyboardHeight = useKeyboardHeight();

  const dismiss = useCallback(() => {
    (
      ref as React.RefObject<React.ComponentRef<typeof BottomSheetModal>>
    )?.current?.dismiss();
  }, [ref]);

  const addTagHeader = (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingTop: 8,
        paddingBottom: 6,
        paddingHorizontal: 16,
      }}
    >
      <View style={{ width: 48 }} />
      <BoldText
        numberOfLines={1}
        style={{ flex: 1, fontSize: 16, lineHeight: 28, textAlign: 'center' }}
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
        <FontAwesomeIcon icon={faXmark} size={20} color={colors.fgMuted} />
      </Pressable>
    </View>
  );

  return (
    <AppSheetModal
      ref={ref}
      header={addTagHeader}
      contentStyle={{
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
    </AppSheetModal>
  );
});

export default React.memo(AddTagModalHost);
