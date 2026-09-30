/* eslint-disable react-native/no-inline-styles */
import React, { forwardRef, useCallback } from 'react';
import { Pressable, View } from 'react-native';
import { useTheme } from '@app/theme';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { faXmark } from '@fortawesome/free-solid-svg-icons';
import { BottomSheetModal } from '@gorhom/bottom-sheet';

import { AddressBookFileClass, TranslateType } from '@app/AppState';
import type { AddTagModalState } from '@app/AppState/uiAtoms';
import BoldText from '@ui/primitives/BoldText';
import AppSheetModal from '@ui/primitives/AppSheetModal';
import NewAddressTag from '@ui/widgets/NewAddressTag';
import { useKeyboardHeight } from '@app/hooks/useKeyboardHeight';

type AddTagModalHostProps = {
  target: AddTagModalState;
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
        {translate('addressbook.add-contact') as string}
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
      {target.kind === 'shown' && (
        <NewAddressTag
          key={target.launch}
          address={target.address}
          own={false}
          swapChain={target.swapChain}
          initialLabel={target.initialLabel}
          closeSheet={dismiss}
          setAddressBook={setAddressBook}
        />
      )}
    </AppSheetModal>
  );
});

export default React.memo(AddTagModalHost);
