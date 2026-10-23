import React, { forwardRef, useCallback, useContext, useState } from 'react';
import { BottomSheetModal } from '@gorhom/bottom-sheet';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ContextAppLoaded } from '@app/context';
import type { AddressBookFileClass } from '@app/AppState';
import { useKeyboardHeight } from '@app/hooks/useKeyboardHeight';
import AppSheetModal from '@ui/primitives/AppSheetModal';
import ContactSheet from '@ui/widgets/ContactSheet';

type SaveContactSheetProps = {
  address: string;
  /** SwapKit chain code of the address: the contact sheet shows it fixed. */
  chain: string;
  book: AddressBookFileClass[];
  onSave: (name: string) => void;
};

/**
 * The address book's own New contact sheet, opened from a swap with the
 * address filled in and the swap's chain fixed: an address alone often fits
 * several chains, and the swap already knows which.
 */
const SaveContactSheet = forwardRef<BottomSheetModal, SaveContactSheetProps>(
  ({ address, chain, book, onSave }, ref) => {
    const { walletChainName, server } = useContext(ContextAppLoaded);
    const insets = useSafeAreaInsets();
    const keyboardHeight = useKeyboardHeight();
    /** A fresh form each time the sheet opens. */
    const [nonce, setNonce] = useState<number>(0);

    const dismiss = useCallback(() => {
      (ref as React.RefObject<BottomSheetModal>)?.current?.dismiss();
    }, [ref]);

    return (
      <AppSheetModal
        ref={ref}
        handle
        onDismiss={() => setNonce(n => n + 1)}
        contentStyle={{
          paddingBottom:
            keyboardHeight > 0 ? keyboardHeight + 20 : insets.bottom + 24,
        }}
      >
        <ContactSheet
          key={`${nonce}:${chain}:${address}`}
          edit={{ kind: 'new', preset: address, label: '', chain }}
          book={book}
          walletChain={walletChainName || server.chainName}
          onSave={async name => {
            onSave(name);
            dismiss();
          }}
          onCancel={dismiss}
        />
      </AppSheetModal>
    );
  },
);

export default SaveContactSheet;
