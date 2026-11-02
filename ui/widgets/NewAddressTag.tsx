/* eslint-disable react-native/no-inline-styles */
import React, { useContext, useState } from 'react';
import { Keyboard, View } from 'react-native';

import { space12, space4, space16, space20 } from '@app/theme';
import { AddressBookFileClass, GlobalConst } from '@app/AppState';
import { ContextAppLoaded } from '@app/context';
import AddressBookFileImpl from '@app/services/AddressBookFileImpl';
import Utils from '@app/utils';
import Button from '@ui/primitives/Button';
import Card from '@ui/widgets/Card';
import ChainSelect from '@ui/widgets/ChainSelect';
import Text from '@ui/primitives/Text';
import TextField from '@ui/primitives/TextField';
import { SheetFooter } from '@ui/primitives/AppSheetModal';

const NAME_MAX = 32;

/** The title of the sheet it opens in, which the host puts in its bar with the X. */
export const newAddressTagTitleKey = (
  current?: AddressBookFileClass,
): string => (current ? 'receive.edit-tag' : 'addressbook.add-tag');

type NewAddressTagProps = {
  /** One of this wallet's own addresses. */
  address: string;
  /** The tag being edited, from Your addresses; absent to add one. */
  current?: AddressBookFileClass;
  closeSheet: () => void;
  setAddressBook: (ab: AddressBookFileClass[]) => void;
};

// Names one of the wallet's own addresses, in the same shape as the New
// contact sheet: the tag, the chain (Zcash) and the address it names.
const NewAddressTag: React.FunctionComponent<NewAddressTagProps> = ({
  address,
  current,
  closeSheet,
  setAddressBook,
}) => {
  const { translate, server } = useContext(ContextAppLoaded);
  const [label, setLabel] = useState(current?.label ?? '');
  const [saving, setSaving] = useState(false);
  const ready = label.trim().length > 0;

  const save = async () => {
    Keyboard.dismiss();
    setSaving(true);
    setAddressBook(
      await AddressBookFileImpl.writeAddressBookItem(
        label.trim(),
        address,
        current?.color ?? Utils.generateColorList(1)[0],
        true,
        server.chainName,
        GlobalConst.zecSwapChain,
      ),
    );
    closeSheet();
  };

  return (
    <View testID="addresstag.sheet" style={{ paddingHorizontal: space20 }}>
      <Text variant="caption" tone="muted" style={{ textAlign: 'center' }}>
        {translate('receive.tag-sub') as string}
      </Text>

      <View style={{ marginTop: space12 }}>
        <TextField
          testID="addresstag.label-field"
          label={translate('addressbook.tag') as string}
          value={label}
          onChangeText={setLabel}
          maxLength={NAME_MAX}
          placeholder={translate('addressbook.label-placeholder') as string}
          autoCorrect={false}
          clearable
          clearLabel={translate('clear') as string}
        />
      </View>

      <View style={{ marginTop: space16 }}>
        <ChainSelect
          label={translate('addressbook.chain') as string}
          value={GlobalConst.zecSwapChain}
          options={[GlobalConst.zecSwapChain]}
          onChange={() => {}}
          translate={translate}
          disabled
        />
      </View>

      <View style={{ marginTop: space16, rowGap: space4 }}>
        <Text variant="bodySmall" tone="muted" style={{ fontWeight: '600' }}>
          {translate('addressbook.address') as string}
        </Text>
        <Card>
          <Text testID="addresstag.address" variant="address">
            {address}
          </Text>
        </Card>
      </View>

      <SheetFooter style={{ paddingHorizontal: space20 }}>
        <View style={{ marginTop: space20 }}>
          <Button
            testID="addresstag.save"
            variant="primary"
            title={translate('save') as string}
            disabled={saving || !ready}
            onPress={save}
          />
        </View>
      </SheetFooter>
    </View>
  );
};

export default React.memo(NewAddressTag);
