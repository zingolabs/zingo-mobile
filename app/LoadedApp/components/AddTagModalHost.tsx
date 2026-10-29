import React, {
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';
import { BottomSheetModal } from '@gorhom/bottom-sheet';

import { SnackbarDurationEnum } from '@app/AppState';
import { ContextAppLoaded } from '@app/context';
import AddressBookFileImpl from '@app/services/AddressBookFileImpl';
import { AddTagTarget, registerAddTagListener } from '@app/services/showAddTag';
import { useKeyboardHeight } from '@app/hooks/useKeyboardHeight';
import AppSheetModal from '@ui/primitives/AppSheetModal';
import ContactSheet from '@ui/widgets/ContactSheet';
import NewAddressTag, {
  newAddressTagTitleKey,
} from '@ui/widgets/NewAddressTag';
import TitleBar from '@ui/widgets/TitleBar';
import { XIcon } from '@ui/primitives/Icons/XIcon';

// The sheet every "add to address book" button opens (showAddTag), with the
// address already filled in: New contact, or the own tag sheet for the
// wallet's own. The last host mounted answers.
const AddTagModalHost: React.FunctionComponent = () => {
  const {
    addressBook,
    walletChainName,
    server,
    addLastSnackbar,
    setAddressBook,
    translate,
  } = useContext(ContextAppLoaded);
  const ref = useRef<BottomSheetModal>(null);
  const [target, setTarget] = useState<AddTagTarget | null>(null);
  const keyboardHeight = useKeyboardHeight();
  /** A fresh form each time the sheet closes, however it closes. */
  const [nonce, setNonce] = useState<number>(0);
  const walletChain = walletChainName || server.chainName;

  useEffect(() => registerAddTagListener(setTarget), []);
  /** Each call brings a new target, so the sheet opens on every one. */
  useEffect(() => {
    if (target) {
      ref.current?.present();
    }
  }, [target]);

  const dismiss = useCallback(() => ref.current?.dismiss(), []);

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
};

export default AddTagModalHost;
