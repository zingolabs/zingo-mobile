/* eslint-disable react-native/no-inline-styles */
import React, { useContext, useEffect, useState } from 'react';
import { ActivityIndicator, TouchableOpacity, View } from 'react-native';
import Clipboard from '@react-native-clipboard/clipboard';
import { ContextAppLoaded } from '../../app/context';
import RegText from './RegText';
import Utils from '../../app/utils';
import {
  AddressBookFileClass,
  SendPageStateClass,
  ToAddrClass,
  ModeEnum,
  SnackbarDurationEnum,
  RouteEnum,
  SelectServerEnum,
  ScreenEnum,
} from '../../app/AppState';
import {
  NavigationProp,
  ParamListBase,
  useNavigation,
  useTheme,
} from '@react-navigation/native';
import { ThemeType } from '../../app/types';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { faUserPlus, faPaperPlane } from '@fortawesome/free-solid-svg-icons';

type AddressItemProps = {
  address: string;
  screenName: ScreenEnum;
  oneLine?: boolean;
  onlyContact?: boolean;
  withIcon?: boolean;
  withSendIcon?: boolean;
  addressProtected?: boolean;
  ufvk?: boolean;
};

const AddressItem: React.FunctionComponent<AddressItemProps> = ({
  address,
  // screenName is still in the type for backward compat with all callers but
  // no longer consumed here — launchAddTagModal works the same regardless of
  // where it's invoked from.
  oneLine,
  onlyContact,
  withIcon,
  withSendIcon,
  addressProtected,
  ufvk,
}) => {
  const navigation = useNavigation<NavigationProp<ParamListBase>>();
  const context = useContext(ContextAppLoaded);
  const {
    translate,
    addLastSnackbar,
    addressBook,
    launchAddTagModal,
    privacy,
    readOnly,
    mode,
    totalBalance,
    selectServer,
    setSendPageState,
  } = context;
  const { colors } = useTheme() as ThemeType;

  const [expandAddress, setExpandAddress] = useState<boolean>(false);
  const [expandContact, setExpandContact] = useState<boolean>(false);
  const [numLinesAddress, setNumLinesAddress] = useState<number>(0);
  const [numLinesContact, setNumLinesContact] = useState<number>(0);
  const [contact, setContact] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    const numLinesAdd = address
      ? address.length < 50
        ? 2
        : address.length / 30
      : 0;
    let cont: string = addressBook
      .filter((ab: AddressBookFileClass) => ab.address === address)
      .map((ab: AddressBookFileClass) => ab.label)
      .join(' ');
    const numLinesCon = cont ? (cont.length < 20 ? 1 : cont.length / 20) : 0;
    setNumLinesAddress(numLinesAdd);
    setNumLinesContact(numLinesCon);
    setContact(cont);
    setLoading(false);
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
    <>
      {loading ? (
        <ActivityIndicator size="small" color={colors.primary} />
      ) : (
        <View
          style={{
            display: 'flex',
            flexDirection: 'row',
            alignItems: 'flex-start',
          }}
        >
          <View
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'flex-start',
              marginRight: onlyContact ? 0 : 10,
            }}
          >
            {contact && (
              <TouchableOpacity
                onPress={() => {
                  setExpandContact(true);
                  if (privacy) {
                    setTimeout(() => {
                      setExpandContact(false);
                    }, 5 * 1000);
                  }
                }}
              >
                <View
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    flexWrap: 'wrap',
                  }}
                >
                  {!expandContact && numLinesContact > 1 && (
                    <RegText>{Utils.trimToSmall(contact, 7)}</RegText>
                  )}
                  {!expandContact && numLinesContact === 1 && (
                    <RegText>{contact}</RegText>
                  )}
                  {expandContact &&
                    Utils.splitStringIntoChunks(
                      contact,
                      Number(numLinesContact.toFixed(0)),
                    ).map((c: string, idx: number) => (
                      <RegText key={idx}>{c}</RegText>
                    ))}
                </View>
              </TouchableOpacity>
            )}
            {(!oneLine || (oneLine && !contact)) && !onlyContact && (
              <TouchableOpacity
                onPress={() => {
                  if (address && !oneLine && !addressProtected) {
                    Clipboard.setString(address);
                    addLastSnackbar(
                      ufvk
                        ? (translate('seed.tapcopy-ufvk-message') as string)
                        : (translate('history.addresscopied') as string),
                      SnackbarDurationEnum.short,
                    );
                    setExpandAddress(true);
                    if (privacy) {
                      setTimeout(() => {
                        setExpandAddress(false);
                      }, 5 * 1000);
                    }
                  }
                }}
              >
                <View
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    flexWrap: 'wrap',
                  }}
                >
                  {!address && <RegText>{'Unknown'}</RegText>}
                  {!expandAddress && !!address && (
                    <RegText>{Utils.trimToSmall(address, 7)}</RegText>
                  )}
                  {expandAddress &&
                    !!address &&
                    Utils.splitStringIntoChunks(
                      address,
                      Number(numLinesAddress.toFixed(0)),
                    ).map((c: string, idx: number) => (
                      <RegText key={idx}>{c}</RegText>
                    ))}
                </View>
              </TouchableOpacity>
            )}
          </View>
          {withIcon && !contact && oneLine && (
            <TouchableOpacity onPress={() => launchAddTagModal(address)}>
              <View
                style={{
                  flexDirection: 'row',
                  justifyContent: 'center',
                  alignItems: 'center',
                  paddingHorizontal: 4,
                  paddingBottom: 2,
                }}
              >
                <FontAwesomeIcon
                  style={{ marginTop: 3 }}
                  size={20}
                  icon={faUserPlus}
                  color={colors.primary}
                />
              </View>
            </TouchableOpacity>
          )}
          {withIcon && !contact && !oneLine && (
            <TouchableOpacity onPress={() => launchAddTagModal(address)}>
              <FontAwesomeIcon
                style={{ marginTop: 3 }}
                size={24}
                icon={faUserPlus}
                color={colors.primary}
              />
            </TouchableOpacity>
          )}
          {withSendIcon &&
            !addressProtected &&
            contact &&
            !readOnly &&
            selectServer !== SelectServerEnum.offline &&
            !(
              mode === ModeEnum.basic &&
              totalBalance &&
              // because the action is related with `send`.
              totalBalance.totalSpendableBalance <= 0
            ) && (
              <TouchableOpacity
                style={{ marginLeft: 10 }}
                onPress={() => {
                  // enviar
                  const sendPageState = new SendPageStateClass(
                    new ToAddrClass(0),
                  );
                  sendPageState.toaddr.to = address;
                  setSendPageState(sendPageState);
                  navigation.navigate(RouteEnum.HomeStack, {
                    screen: RouteEnum.Send,
                  });
                }}
              >
                <FontAwesomeIcon
                  style={{ marginTop: 3 }}
                  size={24}
                  icon={faPaperPlane}
                  color={colors.primary}
                />
              </TouchableOpacity>
            )}
        </View>
      )}
    </>
  );
};

export default AddressItem;
