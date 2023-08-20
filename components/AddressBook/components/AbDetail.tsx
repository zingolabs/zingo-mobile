/* eslint-disable react-native/no-inline-styles */
import React, { useContext, useState } from 'react';
import { View, TextInput } from 'react-native';
import { useTheme } from '@react-navigation/native';

import { AddressBookFileClass } from '../../../app/AppState';
import { ThemeType } from '../../../app/types';
import RegText from '../../Components/RegText';
import { ContextAppLoaded } from '../../../app/context';
import InputTextAddress from '../../Components/InputTextAddress';
import { ZcashURITargetClass, parseZcashURI } from '../../../app/uris';

type AbDetailProps = {
  index: number;
  item: AddressBookFileClass;
};
const AbDetail: React.FunctionComponent<AbDetailProps> = ({ index, item }) => {
  const context = useContext(ContextAppLoaded);
  const { translate, server, addLastSnackbar } = context;
  const { colors } = useTheme() as unknown as ThemeType;
  const [label, setLabel] = useState<string>(item.label);
  const [address, setAddress] = useState<string>(item.address);

  const updateAddress = async (addr: string) => {
    if (!addr) {
      return;
    }
    let newAddress: string = addr;
    // Attempt to parse as URI if it starts with zcash
    if (addr.toLowerCase().startsWith('zcash:')) {
      const target: string | ZcashURITargetClass = await parseZcashURI(addr, translate, server);
      //console.log(targets);

      if (typeof target !== 'string') {
        // redo the to addresses
        [target].forEach(tgt => {
          newAddress = tgt.address || '';
        });
      } else {
        // Show the error message as a toast
        addLastSnackbar({ message: target, type: 'Primary' });
        //return;
      }
    } else {
      newAddress = addr.replace(/[ \t\n\r]+/g, ''); // Remove spaces
    }

    setAddress(newAddress);
  };

  console.log('render Ab Detail - 5', index);

  return (
    <View testID={`addressBookDetail.${index + 1}`} style={{ display: 'flex', flexDirection: 'column' }}>
      <RegText style={{ marginTop: 10, paddingHorizontal: 10 }}>{translate('addressbook.label') as string}</RegText>
      <View
        style={{
          display: 'flex',
          flexDirection: 'row',
          justifyContent: 'flex-start',
          paddingHorizontal: 10,
          marginTop: 10,
        }}>
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
          }}>
          <TextInput
            testID="addressbook.label-field"
            style={{
              color: colors.text,
              fontWeight: '600',
              fontSize: 18,
              minWidth: 48,
              minHeight: 48,
              marginLeft: 5,
              backgroundColor: 'transparent',
            }}
            value={label}
            onChangeText={(text: string) => setLabel(text)}
            editable={true}
          />
        </View>
      </View>
      <InputTextAddress address={address} setAddress={updateAddress} />
    </View>
  );
};

export default React.memo(AbDetail);
