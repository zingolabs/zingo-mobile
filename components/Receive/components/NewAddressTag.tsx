/* eslint-disable react-native/no-inline-styles */
import React, { useContext, useState } from 'react';
import { View, TextInput, TouchableOpacity, Keyboard } from 'react-native';
import { useTheme } from '@react-navigation/native';

import { AddressBookFileClass, ButtonTypeEnum } from '../../../app/AppState';
import { ThemeType } from '../../../app/types';
import RegText from '../../Components/RegText';
import { ContextAppLoaded } from '../../../app/context';
import Button from '../../Components/Button';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { faXmark } from '@fortawesome/free-solid-svg-icons';
import Utils from '../../../app/utils';
import { AddressBookFileImpl } from '../../AddressBook';

type NewAddressTagProps = {
  address: string;
  closeSheet: () => void;
  setAddressBook: (ab: AddressBookFileClass[]) => void;
  setHeightLayout: (h: number) => void;
};
const NewAddressTag: React.FunctionComponent<NewAddressTagProps> = ({
  address,
  closeSheet,
  setAddressBook,
  setHeightLayout,
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
      //console.log(label, address);
      const randomColors = Utils.generateColorList(1);
      const ab = await AddressBookFileImpl.writeAddressBookItem(
        label,
        address,
        randomColors[0],
        true,
      );
      //console.log(ab);
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
      onLayout={e => {
        const { height } = e.nativeEvent.layout;
        //console.log('LAYOUTTT', height);
        setHeightLayout(height + 70);
      }}
      style={{
        backgroundColor: colors.background,
      }}
    >
      <TouchableOpacity
        onPress={() => {
          setLabel('');
          Keyboard.dismiss();
          setTimeout(() => {
            closeSheet();
          }, 100);
        }}
      >
        <FontAwesomeIcon
          size={30}
          icon={faXmark}
          color={colors.text}
          style={{ marginTop: 10, marginRight: 20, alignSelf: 'flex-end' }}
        />
      </TouchableOpacity>
      <RegText
        style={{ marginTop: 0, paddingHorizontal: 10, alignSelf: 'center' }}
      >
        {translate('receive.add-tag') as string}
      </RegText>
      <View style={{ display: 'flex', flexDirection: 'column', margin: 10 }}>
        <RegText style={{ marginTop: 10, paddingHorizontal: 10 }}>
          {'Tag'}
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
              borderRadius: 5,
              borderColor: colors.text,
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
                marginLeft: 5,
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
            marginTop: 30,
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
