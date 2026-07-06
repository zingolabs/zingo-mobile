/* eslint-disable react-native/no-inline-styles */
import React, { useContext, useState } from 'react';
import { View, TextInput, Keyboard } from 'react-native';
import { useTheme } from '@react-navigation/native';

import { AddressBookFileClass, ButtonTypeEnum } from '../../../app/AppState';
import { ThemeType } from '../../../app/types';
import RegText from '../../Components/RegText';
import { ContextAppLoaded } from '../../../app/context';
import Button from '../../Components/Button';
import Utils from '../../../app/utils';
import { AddressBookFileImpl } from '../../AddressBook';

type NewAddressTagProps = {
  address: string;
  own: boolean;
  closeSheet: () => void;
  setAddressBook: (ab: AddressBookFileClass[]) => void;
};
const NewAddressTag: React.FunctionComponent<NewAddressTagProps> = ({
  address,
  own,
  closeSheet,
  setAddressBook,
}) => {
  const context = useContext(ContextAppLoaded);
  const { translate } = context;
  const { colors } = useTheme() as ThemeType;

  const [label, setLabel] = useState<string>('');

  const createAddressTag = async () => {
    try {
      if (!label) {
        return;
      }
      const randomColors = Utils.generateColorList(1);
      const ab = await AddressBookFileImpl.writeAddressBookItem(
        label,
        address,
        randomColors[0],
        own,
      );
      setAddressBook(ab);
    } catch (error) {
      console.log(`Critical Error new address ${error}`);
    }

    setLabel('');
    Keyboard.dismiss();
    setTimeout(() => {
      closeSheet();
    }, 100);
  };

  return (
    <View
      style={{
        backgroundColor: colors.bottomSheetBackground,
      }}
    >
      <View style={{ display: 'flex', flexDirection: 'column', margin: 10 }}>
        <RegText style={{ marginTop: 10, paddingHorizontal: 10 }}>
          {translate('addressbook.address') as string}
        </RegText>
        <View
          style={{
            paddingHorizontal: 10,
            marginTop: 6,
          }}
        >
          <RegText>{Utils.trimToSmall(address, 10)}</RegText>
        </View>

        <RegText style={{ marginTop: 18, paddingHorizontal: 10 }}>
          {
            (own
              ? translate('addressbook.tag')
              : translate('addressbook.contact')) as string
          }
        </RegText>
        <View
          style={{
            display: 'flex',
            flexDirection: 'row',
            justifyContent: 'flex-start',
            paddingHorizontal: 10,
            marginTop: 10,
          }}
        >
          <View
            accessible={true}
            style={{
              flexGrow: 1,
              borderWidth: 1,
              borderRadius: 12,
              borderColor: colors.border,
              minWidth: 48,
              minHeight: 48,
              maxHeight: 150,
            }}
          >
            <TextInput
              style={{
                color: colors.text,
                fontWeight: '600',
                fontSize: 14,
                minWidth: 48,
                minHeight: 48,
                padding: 10,
                backgroundColor: 'transparent',
              }}
              placeholder={translate('addressbook.label-placeholder') as string}
              placeholderTextColor={colors.placeholder}
              value={label}
              onChangeText={(text: string) => setLabel(text)}
              maxLength={50}
            />
          </View>
        </View>

        <View
          style={{
            flexGrow: 1,
            flexDirection: 'row',
            justifyContent: 'center',
            alignItems: 'center',
            marginVertical: 5,
            marginTop: 15,
          }}
        >
          <Button
            type={ButtonTypeEnum.Secondary}
            title={translate('cancel') as string}
            onPress={() => {
              setLabel('');
              Keyboard.dismiss();
              setTimeout(() => {
                closeSheet();
              }, 100);
            }}
            twoButtons={true}
          />
          <Button
            type={ButtonTypeEnum.Primary}
            title={translate('save') as string}
            style={{ marginLeft: 10 }}
            onPress={() => {
              createAddressTag();
            }}
            twoButtons={true}
            disabled={!label}
          />
        </View>
      </View>
    </View>
  );
};

export default React.memo(NewAddressTag);
