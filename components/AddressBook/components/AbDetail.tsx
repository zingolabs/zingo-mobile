/* eslint-disable react-native/no-inline-styles */
import React, { useContext, useState, useEffect } from 'react';
import { View, TextInput, Keyboard } from 'react-native';
import {
  NavigationProp,
  ParamListBase,
  useTheme,
} from '@react-navigation/native';

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
import Utils from '../../../app/utils';
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
  screenName: ScreenEnum;
  routeStack: RouteEnum;
  // AbDetail is rendered inside a portaled BottomSheetModal; the host screen
  // (AddressBook) must pass its own `navigation` so the QR button can
  // navigate to ScannerAddress (useNavigation context is lost in the portal).
  navigation: NavigationProp<ParamListBase>;
};
const AbDetail: React.FunctionComponent<AbDetailProps> = ({
  index,
  item,
  cancel,
  action: actionProp,
  doAction,
  currentAddress,
  screenName,
  routeStack,
  navigation,
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

      // Audit Issue H — surface the parser error and abort before any
      // address-state mutation. parseZcashURI returns an empty target
      // when error is non-empty, but the explicit guard keeps intent
      // obvious here and protects against future contract changes.
      if (errorTarget) {
        setError(errorTarget);
        return;
      }

      if (target) {
        // redo the to addresses
        [target].forEach(tgt => {
          if (tgt.address) {
            setAddress(tgt.address);
          }
        });
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
        backgroundColor: colors.bottomSheetBackground,
        paddingBottom: 5,
      }}
    >
      {action === AddressBookActionEnum.Add ? (
        <TextInputAddress
          address={address}
          setAddress={updateAddress}
          setError={setErrorAddress}
          disabled={false}
          showLabel={true}
          screenName={screenName}
          routeStack={routeStack}
          navigation={navigation}
        />
      ) : (
        // Modify / Delete: address is read-only — same UX as NewAddressTag.
        // To change an address the user must delete this entry and create a
        // new one.
        <View>
          <RegText style={{ marginTop: 10, paddingHorizontal: 10 }}>
            {translate('addressbook.address') as string}
          </RegText>
          <View style={{ paddingHorizontal: 10, marginTop: 6 }}>
            <RegText>{Utils.trimToSmall(address, 10)}</RegText>
          </View>
        </View>
      )}
      <RegText style={{ marginTop: 18, paddingHorizontal: 10 }}>
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
            borderRadius: 12,
            borderColor: colors.border,
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
          marginTop: 15,
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
