/* eslint-disable react-native/no-inline-styles */
import React, { useContext, useMemo, useRef, useState } from 'react';
import {
  View,
  TextInput,
  Keyboard,
  Pressable,
  TouchableOpacity,
} from 'react-native';
import { useTheme } from '@app/theme';

import {
  AddressBookFileClass,
  AddressKindEnum,
  ReceiverEnum,
  ScreenEnum,
  SnackbarDurationEnum,
} from '@app/AppState';
import RegText from '@ui/primitives/RegText';
import { ContextAppLoaded } from '@app/context';
import Button, { ButtonTypeEnum } from '@ui/primitives/Button';
import { AddressUnifiedTypeEnum } from '@app/AppState';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { faChevronDown, faXmark } from '@fortawesome/free-solid-svg-icons';
import { BottomSheetModal } from '@gorhom/bottom-sheet';
import SelectBottomSheet from '@ui/widgets/SelectBottomSheet';
import {
  createNewTransparentAddress,
  createNewUnifiedAddress,
} from '@app/walletBackend';
import { RPCUnifiedAddressType } from '@app/walletBackend/types/RPCUnifiedAddressType';
import { RPCTransparentAddressType } from '@app/walletBackend/types/RPCTransparentAddressType';
import Utils from '@app/utils';
import AddressBookFileImpl from '@app/services/AddressBookFileImpl';

type NewAddressProps = {
  addressKind: AddressKindEnum;
  closeSheet: () => void;
  setAddressBook: (ab: AddressBookFileClass[]) => void;
  screenName: ScreenEnum;
};
const NewAddress: React.FunctionComponent<NewAddressProps> = ({
  addressKind,
  closeSheet,
  setAddressBook,
}) => {
  const context = useContext(ContextAppLoaded);
  const { translate, addLastSnackbar } = context;
  const { colors } = useTheme();

  const [label, setLabel] = useState<string>('');
  const [type, setType] = useState<AddressUnifiedTypeEnum>(
    AddressUnifiedTypeEnum.orchard,
  );
  const uTypeSelectRef = useRef<BottomSheetModal>(null);

  const uTypeItems = useMemo(
    () => [
      {
        label: translate('receive.shielded-orchard') as string,
        value: AddressUnifiedTypeEnum.orchard,
      },
      {
        label: translate('receive.shielded-orchard-sapling') as string,
        value: AddressUnifiedTypeEnum.orchardAndSapling,
      },
      {
        label: translate('receive.shielded-sapling') as string,
        value: AddressUnifiedTypeEnum.sapling,
      },
    ],
    [translate],
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
      const newAddressResult = receivers
        ? await createNewUnifiedAddress(receivers)
        : await createNewTransparentAddress();

      if (!newAddressResult.ok) {
        addLastSnackbar(
          translate('receive.transparent.new-error') as string,
          SnackbarDurationEnum.short,
        );
      } else if (label) {
        let newAddress: string;
        if (receivers) {
          const newUnifiedAddressJSON: RPCUnifiedAddressType = await JSON.parse(
            newAddressResult.value,
          );
          newAddress = newUnifiedAddressJSON.encoded_address;
        } else {
          const newTransparentAddressJSON: RPCTransparentAddressType =
            await JSON.parse(newAddressResult.value);
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
        backgroundColor: colors.bgSurface,
      }}
    >
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
              borderRadius: 12,
              borderColor: colors.borderMuted,
              minWidth: 48,
              minHeight: 48,
              maxHeight: 150,
              flexDirection: 'row',
              alignItems: 'center',
            }}
          >
            <TextInput
              style={{
                color: colors.fgDefault,
                fontWeight: '600',
                fontSize: 14,
                flex: 1,
                minHeight: 48,
                marginLeft: 5,
                backgroundColor: 'transparent',
              }}
              placeholder={translate('addressbook.label-placeholder') as string}
              placeholderTextColor={colors.fgMuted}
              value={label}
              onChangeText={(text: string) => setLabel(text)}
              maxLength={50}
            />
            {label && (
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
              <Pressable
                onPress={() => uTypeSelectRef.current?.present()}
                style={{ flexGrow: 1 }}
              >
                <View
                  style={{
                    flexGrow: 1,
                    flexDirection: 'row',
                    borderWidth: 1,
                    borderRadius: 5,
                    borderColor: colors.fgDefault,
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
                      color: colors.fgDefault,
                      fontWeight: '600',
                      marginLeft: 20,
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
                    color={colors.fgDefault}
                    style={{ marginRight: 20 }}
                  />
                </View>
              </Pressable>
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
              createAddress();
            }}
            twoButtons={true}
          />
        </View>
      </View>
      <SelectBottomSheet
        ref={uTypeSelectRef}
        title={translate('loadedapp.options') as string}
        items={uTypeItems}
        value={type}
        onChange={v => setType(v as AddressUnifiedTypeEnum)}
      />
    </View>
  );
};

export default React.memo(NewAddress);
