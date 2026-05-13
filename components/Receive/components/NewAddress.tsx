/* eslint-disable react-native/no-inline-styles */
import React, { useContext, useState } from 'react';
import {
  View,
  TextInput,
  NativeSyntheticEvent,
  TouchableOpacity,
  Keyboard,
  Platform,
} from 'react-native';
import { useTheme } from '@react-navigation/native';

import {
  AddressBookFileClass,
  AddressKindEnum,
  ButtonTypeEnum,
  GlobalConst,
  ReceiverEnum,
  ScreenEnum,
  SnackbarDurationEnum,
} from '../../../app/AppState';
import { ThemeType } from '../../../app/types';
import RegText from '../../Components/RegText';
import { ContextAppLoaded } from '../../../app/context';
import Button from '../../Components/Button';
import { AddressUnifiedTypeEnum } from '../../../app/AppState';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { faChevronDown, faXmark } from '@fortawesome/free-solid-svg-icons';
import ContextMenu, {
  ContextMenuOnPressNativeEvent,
} from 'react-native-context-menu-view';
import RPCModule from '../../../app/RPCModule';
import { RPCUnifiedAddressType } from '../../../app/walletBackend/types/rpcAddressTypes';
import { RPCTransparentAddressType } from '../../../app/walletBackend/types/rpcAddressTypes';
import Utils from '../../../app/utils';
import { AddressBookFileImpl } from '../../AddressBook';

type NewAddressProps = {
  addressKind: AddressKindEnum;
  closeSheet: () => void;
  setAddressBook: (ab: AddressBookFileClass[]) => void;
  screenName: ScreenEnum;
  setHeightLayout: (h: number) => void;
};
const NewAddress: React.FunctionComponent<NewAddressProps> = ({
  addressKind,
  closeSheet,
  setAddressBook,
  setHeightLayout,
}) => {
  const context = useContext(ContextAppLoaded);
  const { translate, addLastSnackbar } = context;
  const { colors } = useTheme() as ThemeType;

  const [label, setLabel] = useState<string>('');
  const [type, setType] = useState<AddressUnifiedTypeEnum>(
    AddressUnifiedTypeEnum.orchard,
  );

  const createAddress = async () => {
    const receivers: string =
      addressKind === AddressKindEnum.u &&
      type === AddressUnifiedTypeEnum.orchard
        ? ReceiverEnum.o
        : addressKind === AddressKindEnum.u &&
            type === AddressUnifiedTypeEnum.sapling
          ? ReceiverEnum.z
          : addressKind === AddressKindEnum.u &&
              type === AddressUnifiedTypeEnum.orchardAndSapling
            ? ReceiverEnum.o + ReceiverEnum.z
            : '';
    try {
      let newAddressStr: string;
      if (receivers) {
        newAddressStr =
          await RPCModule.createNewUnifiedAddressProcess(receivers);
      } else {
        newAddressStr = await RPCModule.createNewTransparentAddressProcess();
      }

      if (newAddressStr) {
        if (newAddressStr.toLowerCase().startsWith(GlobalConst.error)) {
          console.log(`Error new address ${newAddressStr}`);

          addLastSnackbar(
            translate('receive.transparent.new-error') as string,
            SnackbarDurationEnum.short,
          );

          // return newAddressStr;
        }
      } else {
        console.log('Internal Error new address ');
      }

      if (label) {
        let newAddress: string;
        if (receivers) {
          const newUnifiedAddressJSON: RPCUnifiedAddressType =
            await JSON.parse(newAddressStr);
          newAddress = newUnifiedAddressJSON.encoded_address;
        } else {
          const newTransparentAddressJSON: RPCTransparentAddressType =
            await JSON.parse(newAddressStr);
          newAddress = newTransparentAddressJSON.encoded_address;
        }
        //console.log(label, newAddress);
        const randomColors = Utils.generateColorList(1);
        const ab = await AddressBookFileImpl.writeAddressBookItem(
          label,
          newAddress,
          randomColors[0],
          true,
        );
        //console.log(ab);
        setAddressBook(ab);
      }

      //return newAddressStr;
    } catch (error) {
      console.log(`Critical Error new address ${error}`);
      //return `Error: ${error}`;
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
        setHeightLayout(height + 80);
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
          size={24}
          icon={faXmark}
          color={colors.text}
          style={{ marginTop: 10, marginRight: 20, alignSelf: 'flex-end' }}
        />
      </TouchableOpacity>
      <RegText
        style={{ marginTop: 0, paddingHorizontal: 10, alignSelf: 'center' }}
      >
        {
          (addressKind === AddressKindEnum.u
            ? translate('receive.newu-option')
            : translate('receive.transparent.newt-option')) as string
        }
      </RegText>
      <View style={{ display: 'flex', flexDirection: 'column', margin: 10 }}>
        <RegText style={{ marginTop: 10, paddingHorizontal: 10 }}>
          {'Tag (Optional)'}
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

        {addressKind === AddressKindEnum.u && (
          <>
            <RegText style={{ marginTop: 30, paddingHorizontal: 10 }}>
              {'Type of Address'}
            </RegText>
            <View
              style={{
                display: 'flex',
                flexDirection: 'row',
                justifyContent: 'center',
                alignItems: 'center',
                paddingHorizontal: 10,
                marginTop: 10,
              }}
            >
              <ContextMenu
                title={translate('loadedapp.options') as string}
                dropdownMenuMode={true}
                style={{
                  flexGrow: 1,
                }}
                actions={[
                  { title: translate('receive.shielded-orchard') as string },
                  {
                    title: translate(
                      'receive.shielded-orchard-sapling',
                    ) as string,
                  },
                  { title: translate('receive.shielded-sapling') as string },
                ]}
                onPress={(
                  e: NativeSyntheticEvent<ContextMenuOnPressNativeEvent>,
                ) => {
                  if (e.nativeEvent.index === 0) {
                    setType(AddressUnifiedTypeEnum.orchard);
                  } else if (e.nativeEvent.index === 1) {
                    setType(AddressUnifiedTypeEnum.orchardAndSapling);
                  } else if (e.nativeEvent.index === 2) {
                    setType(AddressUnifiedTypeEnum.sapling);
                  }
                }}
              >
                <View
                  style={{
                    flexGrow: 1,
                    flexDirection: 'row',
                    borderWidth: 1,
                    borderRadius: 5,
                    borderColor: colors.text,
                    backgroundColor: '#303d4f',
                    minWidth: 48,
                    minHeight: 48,
                    maxHeight: 48,
                    justifyContent: 'space-between',
                    alignItems: 'center',
                  }}
                >
                  <RegText
                    style={{
                      color: colors.text,
                      fontWeight: '600',
                      minWidth: 48,
                      minHeight: 48,
                      maxHeight: 48,
                      marginLeft: 20,
                      marginTop:
                        Platform.OS === GlobalConst.platformOSandroid ? 17 : 25,
                      backgroundColor: 'transparent',
                    }}
                  >
                    {type === AddressUnifiedTypeEnum.orchard
                      ? (translate('receive.shielded-orchard') as string)
                      : type === AddressUnifiedTypeEnum.orchardAndSapling
                        ? (translate(
                            'receive.shielded-orchard-sapling',
                          ) as string)
                        : type === AddressUnifiedTypeEnum.sapling
                          ? (translate('receive.shielded-sapling') as string)
                          : ''}
                  </RegText>
                  <FontAwesomeIcon
                    size={12}
                    icon={faChevronDown}
                    color={colors.text}
                    style={{ marginRight: 20 }}
                  />
                </View>
              </ContextMenu>
            </View>
          </>
        )}

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
              createAddress();
            }}
            twoButtons={true}
          />
        </View>
      </View>
    </View>
  );
};

export default React.memo(NewAddress);
