/* eslint-disable react-native/no-inline-styles */
import React, { useContext, useState, useEffect } from 'react';
import { View, TextInput } from 'react-native';
import { useTheme } from '@react-navigation/native';

import { AddressBookFileClass } from '../../../app/AppState';
import { ThemeType } from '../../../app/types';
import RegText from '../../Components/RegText';
import { ContextAppLoaded } from '../../../app/context';
import InputTextAddress from '../../Components/InputTextAddress';
import { ZcashURITargetClass, parseZcashURI } from '../../../app/uris';
import Button from '../../Components/Button';
import FadeText from '../../Components/FadeText';

type AbDetailProps = {
  index: number;
  item: AddressBookFileClass;
  cancel: () => void;
  action: 'Add' | 'Modify' | 'Delete';
  doAction: (action: 'Add' | 'Modify' | 'Delete', label: string, address: string) => void;
  addressBookCurrentAddress?: string;
};
const AbDetail: React.FunctionComponent<AbDetailProps> = ({
  index,
  item,
  cancel,
  action: actionProp,
  doAction,
  addressBookCurrentAddress,
}) => {
  const context = useContext(ContextAppLoaded);
  const { translate, server, addLastSnackbar, addressBook } = context;
  const { colors } = useTheme() as unknown as ThemeType;
  const [label, setLabel] = useState<string>(item.label);
  const [address, setAddress] = useState<string>(item.address);
  const [action, setAction] = useState<'Add' | 'Modify' | 'Delete'>(actionProp);
  const [error, setError] = useState<string>('');
  const [errorAddress, setErrorAddress] = useState<string>('');

  useEffect(() => {
    if (addressBookCurrentAddress) {
      setAddress(addressBookCurrentAddress);
    }
    if (item.label !== label && item.address !== address) {
      setAction('Add');
    } else {
      setAction(actionProp);
    }
    setError('');
    if ((!label || !address) && action === 'Modify') {
      setError(translate('addressbook.fillboth') as string);
    }
    if (item.label !== label && addressBook.filter((elem: AddressBookFileClass) => elem.label === label).length > 0) {
      if (
        item.address !== address &&
        addressBook.filter((elem: AddressBookFileClass) => elem.address === address).length > 0
      ) {
        setError(translate('addressbook.bothexists') as string);
      } else {
        setError(translate('addressbook.labelexists') as string);
      }
    } else {
      if (
        item.address !== address &&
        addressBook.filter((elem: AddressBookFileClass) => elem.address === address).length > 0
      ) {
        setError(translate('addressbook.addressexists') as string);
      } else {
        if (item.label === label && item.address === address && action === 'Modify') {
          setError(translate('addressbook.nochanges') as string);
        }
      }
    }
  }, [
    action,
    actionProp,
    address,
    addressBook,
    addressBookCurrentAddress,
    error,
    item.address,
    item.label,
    label,
    translate,
  ]);

  const updateAddress = async (addr: string) => {
    if (!addr) {
      setAddress('');
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

  //console.log('render Ab Detail - 5', index, address, label);
  //console.log(error, errorAddress);

  return (
    <View
      testID={`addressBookDetail.${index + 1}`}
      style={{ display: 'flex', flexDirection: 'column', borderColor: colors.primary, borderWidth: 1, margin: 10 }}>
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
            placeholder={translate('addressbook.label-placeholder') as string}
            placeholderTextColor={colors.placeholder}
            value={label}
            onChangeText={(text: string) => setLabel(text)}
            editable={action !== 'Delete'}
          />
        </View>
      </View>
      <InputTextAddress
        address={address}
        setAddress={updateAddress}
        setError={setErrorAddress}
        disabled={action === 'Delete'}
      />
      {(!!error || !!errorAddress) && (
        <View
          style={{
            flexGrow: 1,
            flexDirection: 'row',
            justifyContent: 'center',
            alignItems: 'center',
            marginVertical: 5,
          }}>
          <FadeText style={{ color: colors.primary }}>{error + errorAddress}</FadeText>
        </View>
      )}
      <View
        style={{
          flexGrow: 1,
          flexDirection: 'row',
          justifyContent: 'center',
          alignItems: 'center',
          marginVertical: 5,
        }}>
        <Button
          testID="addressbook.button.action"
          type="Primary"
          title={translate(`addressbook.${action.toLowerCase()}`) as string}
          onPress={() => {
            doAction(action, label, address);
          }}
          disabled={action === 'Delete' ? false : error || errorAddress ? true : false}
        />
        <Button type="Secondary" title={translate('cancel') as string} style={{ marginLeft: 10 }} onPress={cancel} />
      </View>
    </View>
  );
};

export default React.memo(AbDetail);
