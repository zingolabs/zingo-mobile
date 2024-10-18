/* eslint-disable react-native/no-inline-styles */
import React, { useContext, useEffect, useState } from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import Clipboard from '@react-native-community/clipboard';
import { ContextAppLoaded } from '../../app/context';
import RegText from './RegText';
import Utils from '../../app/utils';
import {
  AddressBookFileClass,
  SendPageStateClass,
  ToAddrClass,
  ModeEnum,
  SnackbarDurationEnum,
  RouteEnums,
} from '../../app/AppState';
import { useTheme } from '@react-navigation/native';
import { ThemeType } from '../../app/types';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { faAddressCard, faPaperPlane } from '@fortawesome/free-solid-svg-icons';
import moment from 'moment';
import 'moment/locale/es';
import 'moment/locale/pt';
import 'moment/locale/ru';

type AddressItemProps = {
  address: string;
  closeModal: () => void;
  openModal: () => void;
  oneLine?: boolean;
  onlyContact?: boolean;
  withIcon?: boolean;
  withSendIcon?: boolean;
  setSendPageState?: (s: SendPageStateClass) => void;
  addressProtected?: boolean;
  color?: string;
};

const AddressItem: React.FunctionComponent<AddressItemProps> = ({
  address,
  oneLine,
  onlyContact,
  withIcon,
  withSendIcon,
  closeModal,
  openModal,
  setSendPageState,
  addressProtected,
  color,
}) => {
  const context = useContext(ContextAppLoaded);
  const {
    translate,
    addLastSnackbar,
    addressBook,
    launchAddressBook,
    privacy,
    navigation,
    readOnly,
    mode,
    totalBalance,
    language,
  } = context;
  const { colors } = useTheme() as unknown as ThemeType;
  moment.locale(language);

  const [expandAddress, setExpandAddress] = useState<boolean>(false);
  const [expandContact, setExpandContact] = useState<boolean>(false);
  const [numLinesAddress, setNumLinesAddress] = useState<number>(0);
  const [numLinesContact, setNumLinesContact] = useState<number>(0);
  const [contact, setContact] = useState<string>('');

  useEffect(() => {
    const numLinesAdd = address ? (address.length < 40 ? 2 : address.length / 30) : 0;
    const cont: string = addressBook
      .filter((ab: AddressBookFileClass) => ab.address === address)
      .map((ab: AddressBookFileClass) => ab.label)
      .join(' ');
    const numLinesCon = cont ? (cont.length < 20 ? 1 : cont.length / 20) : 0;
    setNumLinesAddress(numLinesAdd);
    setNumLinesContact(numLinesCon);
    setContact(cont);
    // the address prop make no sense that it is going to change,
    // but the address book can change in any moment.
  }, [address, addressBook]);

  useEffect(() => {
    if (!oneLine) {
      if (privacy) {
        setExpandAddress(false);
      }
    }
  }, [oneLine, privacy]);

  //console.log('addressItem - render');

  return (
    <View style={{ display: 'flex', flexDirection: 'row', alignItems: 'flex-start' }}>
      <View
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'flex-start',
          marginRight: onlyContact ? 0 : 10,
        }}>
        {contact && (
          <TouchableOpacity
            onPress={() => {
              setExpandContact(true);
              if (privacy) {
                setTimeout(() => {
                  setExpandContact(false);
                }, 5000);
              }
            }}>
            <View style={{ display: 'flex', flexDirection: 'column', flexWrap: 'wrap' }}>
              {!expandContact && numLinesContact > 1 && (
                <RegText color={color ? color : colors.primary}>{Utils.trimToSmall(contact, 7)}</RegText>
              )}
              {!expandContact && numLinesContact === 1 && (
                <RegText color={color ? color : colors.primary}>{contact}</RegText>
              )}
              {expandContact &&
                Utils.splitStringIntoChunks(contact, Number(numLinesContact.toFixed(0))).map(
                  (c: string, idx: number) => (
                    <RegText color={color ? color : colors.primary} key={idx}>
                      {c}
                    </RegText>
                  ),
                )}
            </View>
          </TouchableOpacity>
        )}
        {(!oneLine || (oneLine && !contact)) && !onlyContact && (
          <TouchableOpacity
            onPress={() => {
              if (address && !oneLine && !addressProtected) {
                Clipboard.setString(address);
                addLastSnackbar({
                  message: translate('history.addresscopied') as string,
                  duration: SnackbarDurationEnum.short,
                });
                setExpandAddress(true);
                if (privacy) {
                  setTimeout(() => {
                    setExpandAddress(false);
                  }, 5000);
                }
              }
            }}>
            <View style={{ display: 'flex', flexDirection: 'column', flexWrap: 'wrap' }}>
              {!address && <RegText>{'Unknown'}</RegText>}
              {!expandAddress && !!address && <RegText>{Utils.trimToSmall(address, 7)}</RegText>}
              {expandAddress &&
                !!address &&
                Utils.splitStringIntoChunks(address, Number(numLinesAddress.toFixed(0))).map(
                  (c: string, idx: number) => <RegText key={idx}>{c}</RegText>,
                )}
            </View>
          </TouchableOpacity>
        )}
      </View>
      {withIcon && !contact && oneLine && (
        <TouchableOpacity onPress={() => launchAddressBook(address, closeModal, openModal)}>
          <View
            style={{
              flexDirection: 'row',
              justifyContent: 'center',
              alignItems: 'center',
              paddingHorizontal: 4,
              paddingBottom: 2,
              borderWidth: 1,
              borderColor: colors.primary,
              borderRadius: 5,
            }}>
            <Text style={{ fontSize: 13, color: colors.border }}>{translate('addressbook.addto') as string}</Text>
            <FontAwesomeIcon style={{ marginTop: 3 }} size={20} icon={faAddressCard} color={colors.primary} />
          </View>
        </TouchableOpacity>
      )}
      {withIcon && !contact && !oneLine && (
        <TouchableOpacity onPress={() => launchAddressBook(address, closeModal, openModal)}>
          <FontAwesomeIcon style={{ marginTop: 3 }} size={30} icon={faAddressCard} color={colors.primary} />
        </TouchableOpacity>
      )}
      {withSendIcon &&
        setSendPageState &&
        !addressProtected &&
        contact &&
        !readOnly &&
        !(
          mode === ModeEnum.basic &&
          totalBalance &&
          totalBalance.spendableOrchard + totalBalance.spendablePrivate <= 0
        ) && (
          <TouchableOpacity
            style={{ marginLeft: 10 }}
            onPress={() => {
              // enviar
              const sendPageState = new SendPageStateClass(new ToAddrClass(0));
              sendPageState.toaddr.to = address;
              setSendPageState(sendPageState);
              closeModal();
              navigation.navigate(RouteEnums.LoadedApp, {
                screen: translate('loadedapp.send-menu'),
                initial: false,
              });
            }}>
            <FontAwesomeIcon style={{ marginTop: 3 }} size={30} icon={faPaperPlane} color={colors.primary} />
          </TouchableOpacity>
        )}
    </View>
  );
};

export default AddressItem;
