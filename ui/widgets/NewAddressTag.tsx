/* eslint-disable react-native/no-inline-styles */
import React, { useContext, useState } from 'react';
import { Keyboard, View } from 'react-native';

import { space8, space12, useTheme } from '@app/theme';
import { AddressBookFileClass, GlobalConst } from '@app/AppState';
import { ContextAppLoaded } from '@app/context';
import AddressBookFileImpl from '@app/services/AddressBookFileImpl';
import Utils from '@app/utils';
import BoldText from '@ui/primitives/BoldText';
import Button from '@ui/primitives/Button';
import RegText from '@ui/primitives/RegText';
import ChainSelect from '@ui/widgets/ChainSelect';
import Text from '@ui/primitives/Text';
import TextField from '@ui/primitives/TextField';

const NAME_MAX = 32;

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
  const { colors } = useTheme();
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

  const box = {
    marginTop: 5,
    borderWidth: 1,
    borderRadius: 12,
    borderColor: colors.bottomSheetBorder,
    backgroundColor: colors.bgCanvas,
  };

  return (
    <View testID="addresstag.sheet" style={{ paddingHorizontal: 22 }}>
      <BoldText
        style={{
          marginTop: 4,
          textAlign: 'center',
          fontSize: 15,
          lineHeight: 21,
        }}
      >
        {
          translate(
            current ? 'receive.edit-tag' : 'addressbook.add-tag',
          ) as string
        }
      </BoldText>
      <Text
        variant="caption"
        tone="muted"
        style={{ marginTop: space8, textAlign: 'center' }}
      >
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

      <View style={{ marginTop: 18 }}>
        <ChainSelect
          label={translate('addressbook.chain') as string}
          value={GlobalConst.zecSwapChain}
          options={[GlobalConst.zecSwapChain]}
          onChange={() => {}}
          translate={translate}
          disabled
        />
      </View>

      <View style={{ marginTop: 18 }}>
        <RegText>{translate('addressbook.address') as string}</RegText>
        <View style={[box, { padding: 10, minHeight: 58 }]}>
          <RegText
            testID="addresstag.address"
            style={{ fontWeight: '600', fontSize: 15 }}
          >
            {address}
          </RegText>
        </View>
      </View>

      <Button
        testID="addresstag.save"
        variant="primary"
        title={translate('save') as string}
        disabled={saving || !ready}
        onPress={save}
        style={{ marginTop: 20 }}
      />
      <Button
        testID="addresstag.cancel"
        variant="quiet"
        title={translate('cancel') as string}
        onPress={() => {
          Keyboard.dismiss();
          closeSheet();
        }}
        style={{ marginTop: 8 }}
      />
    </View>
  );
};

export default React.memo(NewAddressTag);
