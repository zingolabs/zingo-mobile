import React, { forwardRef, useCallback, useContext } from 'react';
import { BottomSheetModal } from '@gorhom/bottom-sheet';
import { NavigationProp, ParamListBase } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import {
  AddressBookFileClass,
  SnackbarDurationEnum,
  TranslateType,
} from '@app/AppState';
import { ContextAppLoaded } from '@app/context';
import AddressBookFileImpl from '@app/services/AddressBookFileImpl';
import { useKeyboardHeight } from '@app/hooks/useKeyboardHeight';
import AppSheetModal from '@ui/primitives/AppSheetModal';
import ContactSheet from '@ui/widgets/ContactSheet';

type AddTagModalHostProps = {
  // Latest target the host should render. Pass `null` while the modal is
  // hidden. The address and label key the inner form, which resets between
  // presentations.
  target: {
    address: string;
    own: boolean;
    swapChain: string;
    initialLabel?: string;
  } | null;
  setAddressBook: (ab: AddressBookFileClass[]) => void;
  translate: (key: string) => TranslateType;
  /** The sheet is portaled above the navigator, so the scanner opens through this. */
  navigation?: NavigationProp<ParamListBase>;
};

// The New contact sheet every "add to address book" button opens, with the
// address already filled in.
const AddTagModalHost = forwardRef<
  React.ComponentRef<typeof BottomSheetModal>,
  AddTagModalHostProps
>(({ target, setAddressBook, translate, navigation }, ref) => {
  const { addressBook, walletChainName, server, addLastSnackbar } =
    useContext(ContextAppLoaded);
  const insets = useSafeAreaInsets();
  const keyboardHeight = useKeyboardHeight();
  const walletChain = walletChainName || server.chainName;

  const dismiss = useCallback(() => {
    (
      ref as React.RefObject<React.ComponentRef<typeof BottomSheetModal>>
    )?.current?.dismiss();
  }, [ref]);

  const save = async (name: string, address: string) => {
    setAddressBook(
      await AddressBookFileImpl.saveContact(
        undefined,
        name,
        address,
        walletChain,
      ),
    );
    dismiss();
    addLastSnackbar(
      (translate('addressbook.added') as string).replace('{name}', name),
      SnackbarDurationEnum.short,
    );
  };

  return (
    <AppSheetModal
      ref={ref}
      handle
      contentStyle={{
        paddingBottom:
          keyboardHeight > 0 ? keyboardHeight + 20 : insets.bottom + 24,
      }}
    >
      {target && (
        <ContactSheet
          key={`${target.address}-${target.initialLabel ?? ''}`}
          edit={{
            kind: 'new',
            preset: target.address,
            label: target.initialLabel ?? '',
          }}
          book={addressBook}
          walletChain={walletChain}
          onSave={save}
          onCancel={dismiss}
          navigation={navigation}
        />
      )}
    </AppSheetModal>
  );
});

export default React.memo(AddTagModalHost);
