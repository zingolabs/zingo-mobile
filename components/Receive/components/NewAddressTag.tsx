/* eslint-disable react-native/no-inline-styles */
import React, { useContext, useState } from 'react';
import { View, TextInput, Keyboard, TouchableOpacity } from 'react-native';
import { useTheme } from '../../../app/theme';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { faXmark } from '@fortawesome/free-solid-svg-icons';

import {
  AddressBookFileClass,
  ButtonTypeEnum,
  ChainNameEnum,
  GlobalConst,
} from '../../../app/AppState';
import RegText from '../../Components/RegText';
import { ContextAppLoaded } from '../../../app/context';
import { showConfirm } from '../../../app/showConfirm';
import Button from '../../Components/Button';
import ChainSelect from '../../Components/ChainSelect';
import { chainDisplayName } from '../../Swap/components/chainDisplayName';
import Utils from '../../../app/utils';
import { AddressBookFileImpl } from '../../AddressBook';

type NewAddressTagProps = {
  address: string;
  own: boolean;
  // SwapKit chain code of the address ('ZEC' by default). Non-ZEC contacts are
  // saved with chain = mainnet (swaps live in mainnet context).
  swapChain?: string;
  closeSheet: () => void;
  setAddressBook: (ab: AddressBookFileClass[]) => void;
};
const NewAddressTag: React.FunctionComponent<NewAddressTagProps> = ({
  address,
  own,
  swapChain,
  closeSheet,
  setAddressBook,
}) => {
  const context = useContext(ContextAppLoaded);
  const { translate, server } = context;
  const { colors } = useTheme();

  const [label, setLabel] = useState<string>('');
  // The chain is fixed to whatever triggered the save (Send → ZEC; Swap → the
  // selected token's chain), so the selector shows a single, non-editable
  // option — same value used to persist the contact.
  const effectiveSwapChain = swapChain ?? GlobalConst.zecSwapChain;

  const writeContact = async () => {
    try {
      if (!label) {
        return;
      }
      const randomColors = Utils.generateColorList(1);
      // ZEC → the wallet's network; non-ZEC swap contacts → mainnet.
      const chain =
        effectiveSwapChain === GlobalConst.zecSwapChain
          ? server.chainName
          : ChainNameEnum.mainChainName;
      const ab = await AddressBookFileImpl.writeAddressBookItem(
        label,
        address,
        randomColors[0],
        own,
        chain,
        effectiveSwapChain,
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

  const createAddressTag = () => {
    if (!label) {
      return;
    }
    // Own-address tags (Receive) save directly; contacts saved from Send/Swap
    // confirm the detected network first — same safety step as the address-book
    // add flow, so an overlapping chain format can't be saved unnoticed.
    if (own) {
      writeContact();
      return;
    }
    Keyboard.dismiss();
    showConfirm({
      title: translate('addressbook.add-confirm-title') as string,
      message: `${translate('addressbook.add-confirm-message') as string}\n\n${chainDisplayName(
        effectiveSwapChain,
      )}\n${address}`,
      buttons: [
        { text: translate('confirm') as string, onPress: writeContact },
        { text: translate('cancel') as string, style: 'cancel' },
      ],
    });
  };

  return (
    <View
      style={{
        backgroundColor: colors.bgSurface,
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
                padding: 10,
                backgroundColor: 'transparent',
              }}
              placeholder={translate('addressbook.label-placeholder') as string}
              placeholderTextColor={colors.fgMuted}
              value={label}
              onChangeText={(text: string) => setLabel(text)}
              maxLength={50}
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

        <View style={{ paddingHorizontal: 10, marginTop: 18 }}>
          <ChainSelect
            label={translate('addressbook.chain') as string}
            value={effectiveSwapChain}
            options={[effectiveSwapChain]}
            onChange={() => {}}
            translate={translate}
          />
        </View>

        <View
          style={{
            flexGrow: 1,
            flexDirection: 'row',
            justifyContent: 'center',
            alignItems: 'center',
            gap: 10,
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
