/* eslint-disable react-native/no-inline-styles */
import React, { useContext, useEffect, useState } from 'react';
import { TouchableOpacity, View } from 'react-native';
import Clipboard from '@react-native-community/clipboard';
import { ContextAppLoaded } from '../../app/context';
import RegText from './RegText';
import Utils from '../../app/utils';
import { AddressBookFileClass, SendPageStateClass, ToAddrClass } from '../../app/AppState';
import { useTheme } from '@react-navigation/native';
import { ThemeType } from '../../app/types';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { faAddressCard, faArrowUp } from '@fortawesome/free-solid-svg-icons';

type AddressItemProps = {
  address: string;
  closeModal: () => void;
  openModal: () => void;
  oneLine?: boolean;
  onlyContact?: boolean;
  withIcon?: boolean;
  withSendIcon?: boolean;
  setSendPageState?: (s: SendPageStateClass) => void;
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
}) => {
  const context = useContext(ContextAppLoaded);
  const { translate, addLastSnackbar, addressBook, launchAddressBook, privacy, navigation, readOnly } = context;
  const { colors } = useTheme() as unknown as ThemeType;
  const [expandAddress, setExpandAddress] = useState(false);
  const [expandContact, setExpandContact] = useState(false);

  const numLinesAddress = address ? (address.length < 40 ? 2 : address.length / 30) : 0;
  const contact: string = addressBook
    .filter((ab: AddressBookFileClass) => ab.address === address)
    .map((ab: AddressBookFileClass) => ab.label)
    .join(' ');
  const numLinesContact = contact ? (contact.length < 20 ? 1 : contact.length / 20) : 0;

  useEffect(() => {
    if (!oneLine) {
      if (privacy) {
        setExpandAddress(false);
      }
    }
  }, [oneLine, privacy]);

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
              // make no sense to copy the label to the clipboard, it's useless.
              //if (!oneLine) {
              //  Clipboard.setString(contact);
              //  addLastSnackbar({
              //    message: translate('history.contactcopied') as string,
              //    type: 'Primary',
              //    duration: 'short',
              //  });
              //}
              setExpandContact(true);
              if (privacy) {
                setTimeout(() => {
                  setExpandContact(false);
                }, 5000);
              }
            }}>
            <View style={{ display: 'flex', flexDirection: 'column', flexWrap: 'wrap' }}>
              {!expandContact && numLinesContact > 1 && (
                <RegText color={colors.primaryDisabled}>{Utils.trimToSmall(contact, 7)}</RegText>
              )}
              {!expandContact && numLinesContact === 1 && <RegText color={colors.primaryDisabled}>{contact}</RegText>}
              {expandContact &&
                Utils.splitStringIntoChunks(contact, Number(numLinesContact.toFixed(0))).map(
                  (c: string, idx: number) => (
                    <RegText color={colors.primaryDisabled} key={idx}>
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
              if (address && !oneLine) {
                Clipboard.setString(address);
                addLastSnackbar({
                  message: translate('history.addresscopied') as string,
                  type: 'Primary',
                  duration: 'short',
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
      {withIcon && !contact && (
        <TouchableOpacity onPress={() => launchAddressBook(address, closeModal, openModal)}>
          <FontAwesomeIcon style={{ marginTop: 3 }} size={20} icon={faAddressCard} color={colors.primary} />
        </TouchableOpacity>
      )}
      {withSendIcon && setSendPageState && contact && !readOnly && (
        <TouchableOpacity
          style={{ marginLeft: 10 }}
          onPress={() => {
            // enviar
            const sendPageState = new SendPageStateClass(new ToAddrClass(0));
            sendPageState.toaddr.to = address;
            setSendPageState(sendPageState);
            closeModal();
            navigation.navigate('LoadedApp', {
              screen: translate('loadedapp.send-menu'),
              initial: false,
            });
          }}>
          <FontAwesomeIcon style={{ marginTop: 3 }} size={20} icon={faArrowUp} color={colors.primary} />
        </TouchableOpacity>
      )}
    </View>
  );
};

export default AddressItem;
