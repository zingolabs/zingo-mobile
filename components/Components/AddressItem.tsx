/* eslint-disable react-native/no-inline-styles */
import React, { useContext, useState } from 'react';
import { TouchableOpacity, View } from 'react-native';
import Clipboard from '@react-native-community/clipboard';
import FadeText from './FadeText';
import { ContextAppLoaded } from '../../app/context';
import RegText from './RegText';
import Utils from '../../app/utils';
import { AddressBookFileClass } from '../../app/AppState';
import { useTheme } from '@react-navigation/native';
import { ThemeType } from '../../app/types';

type AddressItemProps = {
  address: string;
  oneLine?: boolean;
  label?: string;
};

const AddressItem: React.FunctionComponent<AddressItemProps> = ({ address, oneLine, label }) => {
  const context = useContext(ContextAppLoaded);
  const { translate, addLastSnackbar, addressBook } = context;
  const { colors } = useTheme() as unknown as ThemeType;
  const [expandAddress, setExpandAddress] = useState(false);
  const [expandContact, setExpandContact] = useState(false);

  const numLinesAddress = address ? (address.length < 40 ? 2 : address.length / 30) : 0;
  const contact: string = addressBook
    .filter((ab: AddressBookFileClass) => ab.address === address)
    .map((ab: AddressBookFileClass) => ab.label)
    .join(' ');
  const numLinesContact = contact ? (contact.length < 20 ? 1 : contact.length / 20) : 0;

  return (
    <View style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', marginTop: oneLine ? 0 : 10 }}>
      {!oneLine && <FadeText>{label ? label : (translate('history.address') as string)}</FadeText>}
      {contact && (
        <TouchableOpacity
          onPress={() => {
            if (contact && !oneLine) {
              Clipboard.setString(contact);
              addLastSnackbar({
                message: translate('history.contactcopied') as string,
                type: 'Primary',
                duration: 'short',
              });
              setExpandContact(true);
            }
          }}>
          <View style={{ display: 'flex', flexDirection: 'column', flexWrap: 'wrap' }}>
            {!expandContact && numLinesContact > 1 && (
              <RegText color={colors.primaryDisabled}>{Utils.trimToSmall(contact, 7)}</RegText>
            )}
            {!expandContact && numLinesContact === 1 && <RegText color={colors.primaryDisabled}>{contact}</RegText>}
            {expandContact &&
              Utils.splitStringIntoChunks(contact, Number(numLinesContact.toFixed(0))).map((c: string, idx: number) => (
                <RegText color={colors.primaryDisabled} key={idx}>
                  {c}
                </RegText>
              ))}
          </View>
        </TouchableOpacity>
      )}
      {(!oneLine || (oneLine && !contact)) && (
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
            }
          }}>
          <View style={{ display: 'flex', flexDirection: 'column', flexWrap: 'wrap' }}>
            {!address && <RegText>{'Unknown'}</RegText>}
            {!expandAddress && !!address && <RegText>{Utils.trimToSmall(address, 10)}</RegText>}
            {expandAddress &&
              !!address &&
              Utils.splitStringIntoChunks(address, Number(numLinesAddress.toFixed(0))).map((c: string, idx: number) => (
                <RegText key={idx}>{c}</RegText>
              ))}
          </View>
        </TouchableOpacity>
      )}
    </View>
  );
};

export default AddressItem;
