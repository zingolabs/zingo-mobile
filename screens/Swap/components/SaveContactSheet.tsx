/* eslint-disable react-native/no-inline-styles */
import React, { forwardRef, useCallback, useContext, useState } from 'react';
import { View } from 'react-native';
import { BottomSheetModal } from '@gorhom/bottom-sheet';
import { space12, space16, space8, useTheme } from '@app/theme';
import { ContextAppLoaded } from '@app/context';
import type { AddressBookFileClass } from '@app/AppState';
import { useKeyboardHeight } from '@app/hooks/useKeyboardHeight';
import AppSheetModal from '@ui/primitives/AppSheetModal';
import Text from '@ui/primitives/Text';
import TextField from '@ui/primitives/TextField';
import Button from '@ui/primitives/Button';
import { ChainLogo } from '@ui/widgets/ChainSelect';
import { chainDisplayName } from '@ui/widgets/chainDisplayName';
import SheetTitle from './SheetTitle';

type SaveContactSheetProps = {
  address: string;
  /** SwapKit chain code of the address, which the contact keeps. */
  chain: string;
  book: AddressBookFileClass[];
  onSave: (name: string) => void;
};

/**
 * Saves the swap's address to the address book under a name, filed under the
 * chain the form is on: the address alone often fits several chains (every
 * EVM network shares one format), and the form already knows which.
 */
const SaveContactSheet = forwardRef<BottomSheetModal, SaveContactSheetProps>(
  ({ address, chain, book, onSave }, ref) => {
    const { translate } = useContext(ContextAppLoaded);
    const { colors } = useTheme();
    const keyboardHeight = useKeyboardHeight();
    const [name, setName] = useState<string>('');
    const t = (key: string) => translate(key) as string;

    const dismiss = useCallback(() => {
      (ref as React.RefObject<BottomSheetModal>)?.current?.dismiss();
    }, [ref]);

    const trimmed = name.trim();
    const taken = book.some(
      c => c.label.trim().toLowerCase() === trimmed.toLowerCase(),
    );
    const error =
      trimmed.length > 0 && taken
        ? t('addressbook.dup-name').replace('{name}', trimmed)
        : undefined;

    return (
      <AppSheetModal
        ref={ref}
        handle
        onDismiss={() => setName('')}
        header={
          <SheetTitle
            title={t('addressbook.new-contact')}
            onClose={dismiss}
            closeLabel={t('swap.close')}
          />
        }
        contentStyle={{
          paddingBottom: keyboardHeight > 0 ? keyboardHeight + 20 : 30,
        }}
      >
        <View style={{ paddingHorizontal: space16, rowGap: space12 }}>
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              columnGap: space8,
              padding: space12,
              borderRadius: 12,
              backgroundColor: colors.bgMutedSubtle,
            }}
          >
            <ChainLogo chain={chain} size={24} />
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text variant="caption" tone="muted">
                {chainDisplayName(chain) || chain}
              </Text>
              <Text variant="address" numberOfLines={2}>
                {address}
              </Text>
            </View>
          </View>
          <TextField
            testID="swap.save-contact.name"
            label={t('addressbook.name')}
            value={name}
            onChangeText={setName}
            placeholder={t('addressbook.name-placeholder')}
            error={error}
          />
          <Button
            testID="swap.save-contact.save"
            variant="primary"
            title={t('save')}
            disabled={trimmed.length === 0 || taken}
            onPress={() => {
              onSave(trimmed);
              dismiss();
            }}
          />
        </View>
      </AppSheetModal>
    );
  },
);

export default SaveContactSheet;
