/* eslint-disable react-native/no-inline-styles */
import React, { useContext, useState, useEffect } from 'react';
import { View, TextInput, Keyboard } from 'react-native';
import { useTheme } from '@react-navigation/native';

import {
  AddressBookActionEnum,
  AddressBookFileClass,
  ButtonTypeEnum,
  GlobalConst,
  RouteEnum,
  ScreenEnum,
  //SecurityType,
} from '../../../app/AppState';
import { ThemeType } from '../../../app/types';
import RegText from '../../Components/RegText';
import { ContextAppLoaded } from '../../../app/context';
import TextInputAddress from '../../Components/TextInputAddress';
import { parseZcashURI } from '../../../app/uris';
import Button from '../../Components/Button';
import FadeText from '../../Components/FadeText';

type AbDetailProps = {
  index: number;
  item: AddressBookFileClass;
  cancel: () => void;
  action: AddressBookActionEnum;
  doAction: (
    action: AddressBookActionEnum,
    label: string,
    address: string,
    color: string,
  ) => void;
  currentAddress?: string;
  //setSecurityOption: (s: SecurityType) => Promise<void>;
  screenName: ScreenEnum;
  routeStack: RouteEnum;
};
const AbDetail: React.FunctionComponent<AbDetailProps> = ({
  index,
  item,
  cancel,
  action: actionProp,
  doAction,
  currentAddress,
  //setSecurityOption,
  screenName,
  routeStack,
}) => {
  const context = useContext(ContextAppLoaded);
  const { translate, server, addressBook } = context;
  const { colors } = useTheme() as ThemeType;

  const [label, setLabel] = useState<string>(item.label);
  const [address, setAddress] = useState<string>(item.address);
  const [action, setAction] = useState<AddressBookActionEnum>(actionProp);
  const [error, setError] = useState<string>('');
  const [errorAddress, setErrorAddress] = useState<string>('');

  useEffect(() => {
    if (currentAddress) {
      setAddress(currentAddress);
    }
    if (item.label !== label && item.address !== address) {
      setAction(AddressBookActionEnum.Add);
    } else {
      setAction(actionProp);
    }
    setError('');
    if ((!label || !address) && action === AddressBookActionEnum.Modify) {
      setError(translate('addressbook.fillboth') as string);
    }
    if (
      item.label !== label &&
      addressBook.filter((elem: AddressBookFileClass) => elem.label === label)
        .length > 0
    ) {
      if (
        item.address !== address &&
        addressBook.filter(
          (elem: AddressBookFileClass) => elem.address === address,
        ).length > 0
      ) {
        setError(translate('addressbook.bothexists') as string);
      } else {
        setError(translate('addressbook.labelexists') as string);
      }
    } else {
      if (
        item.address !== address &&
        addressBook.filter(
          (elem: AddressBookFileClass) => elem.address === address,
        ).length > 0
      ) {
        setError(translate('addressbook.addressexists') as string);
      } else {
        if (
          item.label === label &&
          item.address === address &&
          action === AddressBookActionEnum.Modify
        ) {
          setError(translate('addressbook.nochanges') as string);
        }
      }
    }
  }, [
    action,
    actionProp,
    address,
    addressBook,
    currentAddress,
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
    // Attempt to parse as URI if it starts with zcash
    if (
      addr.toLowerCase().startsWith(GlobalConst.zcash) ||
      addr.toLowerCase().includes(':')
    ) {
      const { error: errorTarget, target } = await parseZcashURI(
        addr,
        translate,
        server,
      );
      //console.log(targets);

      if (target) {
        // redo the to addresses
        [target].forEach(tgt => {
          if (tgt.address) {
            setAddress(tgt.address);
          }
        });
      }
      if (errorTarget) {
        // Show the error message as a toast
        setError(errorTarget);
        //return;
      }
    } else {
      setAddress(addr.replace(/[ \t\n\r]+/g, '')); // Remove spaces
    }
  };

  //console.log('render Ab Detail - 5', index, address, label);
  //console.log(error, errorAddress);

  return (
    <View
      testID={`addressbookdetail.${index + 1}`}
      style={{
        display: 'flex',
        flexDirection: 'column',
        borderColor: colors.primary,
        borderWidth: 1,
        margin: 10,
      }}
    >
      <RegText style={{ marginTop: 10, paddingHorizontal: 10 }}>
        {translate('addressbook.label') as string}
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
            testID="addressbook.label-field"
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
            editable={action !== AddressBookActionEnum.Delete}
            maxLength={50}
          />
        </View>
      </View>
      <TextInputAddress
        address={address}
        setAddress={updateAddress}
        setError={setErrorAddress}
        disabled={action === AddressBookActionEnum.Delete || item.own}
        showLabel={true}
        screenName={screenName}
        routeStack={routeStack}
      />
      {(!!error || !!errorAddress) && (
        <View
          style={{
            flexGrow: 1,
            flexDirection: 'row',
            justifyContent: 'center',
            alignItems: 'center',
            marginVertical: 5,
          }}
        >
          <FadeText style={{ color: colors.primary }}>
            {error + errorAddress}
          </FadeText>
        </View>
      )}
      <View
        style={{
          flexGrow: 1,
          flexDirection: 'row',
          justifyContent: 'center',
          alignItems: 'center',
          marginVertical: 5,
        }}
      >
        <Button
          type={ButtonTypeEnum.Secondary}
          title={translate('cancel') as string}
          onPress={() => {
            cancel();
            Keyboard.dismiss();
          }}
          twoButtons={true}
        />
        <Button
          testID="addressbook.button.action"
          type={ButtonTypeEnum.Primary}
          title={translate(`addressbook.${action.toLowerCase()}`) as string}
          style={{ marginLeft: 10 }}
          onPress={() => {
            doAction(
              action,
              label.trim(),
              address,
              item.color ? item.color : '',
            );
            Keyboard.dismiss();
          }}
          disabled={
            action === AddressBookActionEnum.Delete
              ? false
              : error ||
                  errorAddress ||
                  !label ||
                  (label && !label.trim()) ||
                  !address
                ? true
                : false
          }
          twoButtons={true}
        />
      </View>
    </View>
  );
};

export default React.memo(AbDetail);
