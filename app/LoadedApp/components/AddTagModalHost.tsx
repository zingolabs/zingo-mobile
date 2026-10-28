import React, { forwardRef, useCallback, useContext, useState } from 'react';
import { BottomSheetModal } from '@gorhom/bottom-sheet';

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
import NewAddressTag, {
  newAddressTagTitleKey,
} from '@ui/widgets/NewAddressTag';
import TitleBar from '@ui/widgets/TitleBar';
import { XIcon } from '@ui/primitives/Icons/XIcon';

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
};

// The sheet every "add to address book" button opens, with the address
// already filled in: New contact, or the own tag sheet for the wallet's own.
const AddTagModalHost = forwardRef<
  React.ComponentRef<typeof BottomSheetModal>,
  AddTagModalHostProps
>(({ target, setAddressBook, translate }, ref) => {
  const { addressBook, walletChainName, server, addLastSnackbar } =
    useContext(ContextAppLoaded);
  const keyboardHeight = useKeyboardHeight();
  /** A fresh form each time the sheet closes, however it closes. */
  const [nonce, setNonce] = useState<number>(0);
  const walletChain = walletChainName || server.chainName;

  const dismiss = useCallback(() => {
    (
      ref as React.RefObject<React.ComponentRef<typeof BottomSheetModal>>
    )?.current?.dismiss();
  }, [ref]);

  const save = async (name: string, address: string, chain: string) => {
    setAddressBook(
      await AddressBookFileImpl.saveContact(
        undefined,
        name,
        address,
        walletChain,
        chain,
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
      onDismiss={() => setNonce(n => n + 1)}
      header={
        <TitleBar
          title={
            translate(
              target?.own ? newAddressTagTitleKey() : 'addressbook.new-contact',
            ) as string
          }
          right={{
            icon: XIcon,
            accessibilityLabel: translate('close') as string,
            onPress: dismiss,
          }}
        />
      }
      contentStyle={
        keyboardHeight > 0 ? { paddingBottom: keyboardHeight + 20 } : undefined
      }
    >
      {target?.own && (
        <NewAddressTag
          key={`${nonce}:${target.address}`}
          address={target.address}
          closeSheet={dismiss}
          setAddressBook={setAddressBook}
        />
      )}
      {target && !target.own && (
        <ContactSheet
          key={`${nonce}:${target.address}-${target.initialLabel ?? ''}`}
          edit={{
            kind: 'new',
            preset: target.address,
            label: target.initialLabel ?? '',
          }}
          book={addressBook}
          walletChain={walletChain}
          onSave={save}
        />
      )}
    </AppSheetModal>
  );
});

export default React.memo(AddTagModalHost);
