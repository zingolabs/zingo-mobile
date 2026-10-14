/* eslint-disable react-native/no-inline-styles */
import React, { useContext, useState } from 'react';
import { Keyboard, TextInput, TouchableOpacity, View } from 'react-native';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { faXmark } from '@fortawesome/free-solid-svg-icons';

import { useTheme } from '@app/theme';
import { AddressBookFileClass, GlobalConst } from '@app/AppState';
import { ContextAppLoaded } from '@app/context';
import AddressBookFileImpl from '@app/services/AddressBookFileImpl';
import Utils from '@app/utils';
import BoldText from '@ui/primitives/BoldText';
import Button, { ButtonTypeEnum } from '@ui/primitives/Button';
import RegText from '@ui/primitives/RegText';
import ChainSelect from '@ui/widgets/ChainSelect';

const NAME_MAX = 32;

type NewAddressTagProps = {
  /** One of this wallet's own addresses. */
  address: string;
  closeSheet: () => void;
  setAddressBook: (ab: AddressBookFileClass[]) => void;
};

// Names one of the wallet's own addresses, in the same shape as the New
// contact sheet: the tag, the chain (Zcash) and the address it names.
const NewAddressTag: React.FunctionComponent<NewAddressTagProps> = ({
  address,
  closeSheet,
  setAddressBook,
}) => {
  const { translate, server } = useContext(ContextAppLoaded);
  const { colors } = useTheme();
  const [label, setLabel] = useState('');
  const [saving, setSaving] = useState(false);

  const save = async () => {
    Keyboard.dismiss();
    setSaving(true);
    setAddressBook(
      await AddressBookFileImpl.writeAddressBookItem(
        label.trim(),
        address,
        Utils.generateColorList(1)[0],
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
    borderColor: colors.borderMuted,
  };

  return (
    <View testID="addresstag.sheet" style={{ paddingHorizontal: 22 }}>
      <BoldText
        style={{
          marginTop: 4,
          textAlign: 'center',
          fontSize: 15.5,
          lineHeight: 21,
        }}
      >
        {translate('addressbook.add-tag') as string}
      </BoldText>

      <View style={{ marginTop: 10 }}>
        <RegText>{translate('addressbook.tag') as string}</RegText>
        <View
          style={[
            box,
            { flexDirection: 'row', alignItems: 'center', minHeight: 48 },
          ]}
        >
          <TextInput
            testID="addresstag.label-field"
            value={label}
            onChangeText={setLabel}
            maxLength={NAME_MAX}
            placeholder={translate('addressbook.label-placeholder') as string}
            placeholderTextColor={colors.fgMuted}
            autoCorrect={false}
            style={{
              flex: 1,
              padding: 10,
              color: colors.fgDefault,
              fontWeight: '600',
              fontSize: 14,
              backgroundColor: 'transparent',
            }}
          />
          {!!label && (
            <TouchableOpacity onPress={() => setLabel('')}>
              <FontAwesomeIcon
                style={{ marginRight: 10 }}
                size={20}
                icon={faXmark}
                color={colors.fgAccentDisabled}
              />
            </TouchableOpacity>
          )}
        </View>
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
            style={{ fontWeight: '600', fontSize: 14 }}
          >
            {address}
          </RegText>
        </View>
      </View>

      <Button
        testID="addresstag.save"
        type={ButtonTypeEnum.Primary}
        title={translate('save') as string}
        disabled={!label.trim() || saving}
        onPress={save}
        fullWidth
        style={{ marginTop: 20, minHeight: 46, borderRadius: 23 }}
        textStyle={{ fontSize: 15 }}
      />
      <Button
        testID="addresstag.cancel"
        type={ButtonTypeEnum.Link}
        title={translate('cancel') as string}
        onPress={() => {
          Keyboard.dismiss();
          closeSheet();
        }}
        fullWidth
        style={{ marginTop: 8 }}
      />
    </View>
  );
};

export default React.memo(NewAddressTag);
