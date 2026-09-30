/* eslint-disable react-native/no-inline-styles */
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Pressable, View } from 'react-native';
import { useTheme } from '@app/theme';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { faXmark } from '@fortawesome/free-solid-svg-icons';

import { AddressBookFileClass, TranslateType } from '@app/AppState';
import type { AddTagModalState, AddTagTarget } from '@app/AppState/uiAtoms';
import BoldText from '@ui/primitives/BoldText';
import AppSheetModal, { useSheetDismiss } from '@ui/primitives/AppSheetModal';
import NewAddressTag from '@ui/widgets/NewAddressTag';
import { useKeyboardHeight } from '@app/hooks/useKeyboardHeight';

type AddTagModalHostProps = {
  target: AddTagModalState;
  setAddressBook: (ab: AddressBookFileClass[]) => void;
  translate: (key: string) => TranslateType;
};

const AddTagHeader = ({ title }: { title: string }) => {
  const { colors } = useTheme();
  const dismiss = useSheetDismiss();
  return (
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
        {title}
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
};

// One launched target, held by the sheet instance that shows it.
type Shown =
  { kind: 'none' } | { kind: 'shown'; sheet: number; target: Launched };
type Launched = Extract<AddTagModalState, { kind: 'launched' }>;

// The sheet instance is keyed on the launch that opened it, and the form on
// the launch it shows. A launch while the sheet is open retargets the open
// instance. A launch during the close animation waits for the dismissal, and
// a fresh instance then mounts and presents. The library drops a present()
// during a close and keeps the closing node until the close ends, so the
// instance never unmounts mid-close and never presents into a close.
const AddTagModalHost = ({
  target,
  setAddressBook,
  translate,
}: AddTagModalHostProps) => {
  const keyboardHeight = useKeyboardHeight();
  const [shown, setShown] = useState<Shown>({ kind: 'none' });
  const closing = useRef(false);
  const pending = useRef<Launched | undefined>(undefined);

  useEffect(() => {
    if (target.kind !== 'launched') {
      return;
    }
    if (closing.current) {
      pending.current = target;
      return;
    }
    setShown(prior =>
      prior.kind === 'shown'
        ? { ...prior, target }
        : { kind: 'shown', sheet: target.launch, target },
    );
  }, [target]);

  const onClosing = useCallback(() => {
    closing.current = true;
  }, []);

  const onDismiss = useCallback(() => {
    closing.current = false;
    const next = pending.current;
    pending.current = undefined;
    setShown(
      next === undefined
        ? { kind: 'none' }
        : { kind: 'shown', sheet: next.launch, target: next },
    );
  }, []);

  if (shown.kind === 'none') {
    return null;
  }
  const form: AddTagTarget = shown.target;
  return (
    <AppSheetModal
      key={shown.sheet}
      presentOnMount
      onClosing={onClosing}
      onDismiss={onDismiss}
      header={
        <AddTagHeader title={translate('addressbook.add-contact') as string} />
      }
      contentStyle={{
        paddingBottom: keyboardHeight > 0 ? keyboardHeight + 20 : 30,
      }}
    >
      <NewAddressTag
        key={shown.target.launch}
        address={form.address}
        // Every launcher (Send, address rows) saves a recipient, a contact.
        // Tagging one of the wallet's own addresses is the Receive flow,
        // which renders NewAddressTag with own={true} directly.
        own={false}
        swapChain={form.swapChain}
        initialLabel={form.initialLabel}
        setAddressBook={setAddressBook}
      />
    </AppSheetModal>
  );
};

export default React.memo(AddTagModalHost);
