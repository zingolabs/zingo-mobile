/* eslint-disable react-native/no-inline-styles */
import React from 'react';
import { Pressable, View } from 'react-native';
import { useTheme } from '@app/theme';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { faXmark } from '@fortawesome/free-solid-svg-icons';

import { AddressBookFileClass, TranslateType } from '@app/AppState';
import type { AddTagModalState } from '@app/AppState/uiAtoms';
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

// One sheet instance per launch, keyed on the launch count. The instance
// presents itself when it mounts, and a relaunch during its close animation
// replaces it.
const AddTagModalHost = ({
  target,
  setAddressBook,
  translate,
}: AddTagModalHostProps) => {
  const keyboardHeight = useKeyboardHeight();
  if (target.kind === 'none') {
    return null;
  }
  return (
    <AppSheetModal
      key={target.launch}
      presentOnMount
      header={
        <AddTagHeader title={translate('addressbook.add-contact') as string} />
      }
      contentStyle={{
        paddingBottom: keyboardHeight > 0 ? keyboardHeight + 20 : 30,
      }}
    >
      <NewAddressTag
        address={target.address}
        // Every launcher (Send, address rows) saves a recipient, a contact.
        // Tagging one of the wallet's own addresses is the Receive flow,
        // which renders NewAddressTag with own={true} directly.
        own={false}
        swapChain={target.swapChain}
        initialLabel={target.initialLabel}
        setAddressBook={setAddressBook}
      />
    </AppSheetModal>
  );
};

export default React.memo(AddTagModalHost);
