/* eslint-disable react-native/no-inline-styles */
import React, { useContext, useState, useEffect, useRef } from 'react';
import { View, ScrollView, TouchableOpacity, Text } from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import { NavigationProp, ParamListBase, useNavigation } from '@react-navigation/native';
import { useTheme } from '../../app/theme';

import { ContextAppLoaded } from '../../app/context';
import {
  AddressKindEnum,
  ModeEnum,
  RouteEnum,
  SnackbarDurationEnum,
  TransparentAddressClass,
  UnifiedAddressClass,
} from '../../app/AppState';
import RegText from '../primitives/RegText';
import FadeText from '../primitives/FadeText';
import Clipboard from '@react-native-clipboard/clipboard';
import { CopyIcon } from '../primitives/Icons/CopyIcon';
import { EyeIcon } from '../primitives/Icons/EyeIcon';
import { TriangleAlert } from '../primitives/Icons/TriangleAlert';
import { ShieldIcon } from '../primitives/Icons/ShieldIcon';
import { ListIcon } from '../primitives/Icons/ListIcon';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { faCircleCheck } from '@fortawesome/free-regular-svg-icons';
import Address from './Address/Address';
import { getZingoLogo } from '../../app/utils/ZingoAppData';

type SingleAddressProps = {
  address?: UnifiedAddressClass | TransparentAddressClass;
  ufvk?: string;
  index: number;
  setIndex: (i: number) => void;
  total: number;
  show: (s: 'NA' | 'VA' | 'NAT' | 'TW' | 'EA') => void;
  hasTransparent?: boolean;
};

const SingleAddress: React.FunctionComponent<SingleAddressProps> = ({
  address,
  ufvk,
  show,
  total,
  index,
  setIndex,
}) => {
  const navigation = useNavigation<NavigationProp<ParamListBase>>();
  const context = useContext(ContextAppLoaded);
  const { translate, privacy, addLastSnackbar, mode, addressBook } = context;
  const { colors } = useTheme();

  const [expandQRAddress, setExpandQRAddress] = useState<boolean>(true);
  const scrollViewRef = useRef<ScrollView>(null);

  const isBasic = ModeEnum.basic === mode;
  const isUnified = address?.addressKind === AddressKindEnum.u;

  useEffect(() => {
    if (privacy) {
      setExpandQRAddress(false);
    } else {
      setExpandQRAddress(true);
    }
  }, [privacy]);

  useEffect(() => {
    if (!expandQRAddress && !privacy) {
      setExpandQRAddress(true);
    }
  }, [expandQRAddress, privacy]);

  function contactFromAddress() {
    const contact = addressBook.find(c => c.address === address?.address);
    return contact ? contact.label : '';
  }

  const doCopy = () => {
    Clipboard.setString(ufvk ? ufvk : address ? address.address : '');
    addLastSnackbar(
      ufvk
        ? (translate('seed.tapcopy-ufvk-message') as string)
        : (translate('history.addresscopied') as string),
      SnackbarDurationEnum.short,
    );
  };

  const doAddressList = () => {
    navigation.navigate(RouteEnum.AddressList, {
      addressKind: address ? address.addressKind : AddressKindEnum.u,
      setIndex: setIndex,
    });
  };

  return (
    <View style={{ flexDirection: 'column', width: '100%' }}>
      <ScrollView
        ref={scrollViewRef}
        bounces={false}
        alwaysBounceVertical={false}
        style={{ width: '100%' }}
        contentContainerStyle={{
          alignItems: 'center',
          paddingBottom: 100,
        }}
      >
        {ufvk ||
        (address &&
          address.address !== (translate('receive.noaddress') as string)) ? (
          <>
            {address && !isBasic && !isUnified && (
              <View
                style={{
                  alignSelf: 'center',
                  display: 'flex',
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'flex-start',
                  backgroundColor: colors.bgSurface,
                  borderRadius: 10,
                  borderColor: colors.bottomSheetBorder,
                  borderWidth: 1,
                  paddingHorizontal: 19,
                  paddingVertical: 13,
                  marginTop: 10,
                }}
              >
                <TriangleAlert
                  color="#F79700"
                  size={20}
                  style={{ marginRight: 10 }}
                />
                <Text
                  style={{
                    color: '#F79700',
                    fontSize: 14,
                    flexShrink: 1,
                  }}
                >
                  {translate('receive.transparent-expose-warning') as string}
                </Text>
              </View>
            )}
            <View
              style={{
                flexDirection: 'row',
                justifyContent: 'center',
                alignItems: 'center',
                marginTop: 10,
                marginBottom: 5,
              }}
            >
              {!isBasic && address && isUnified && (
                <View
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginTop: 10,
                  }}
                >
                  <View
                    style={{
                      flexDirection: 'row',
                      justifyContent: 'center',
                      alignItems: 'center',
                    }}
                  >
                    <ShieldIcon
                      color={colors.fgAccent}
                      size={20}
                      style={{ marginRight: 10 }}
                    />
                    <RegText
                      style={{
                        fontWeight: 'bold',
                        opacity: 0.9,
                        marginRight: 10,
                      }}
                    >
                      {
                        (address &&
                        address.has_orchard === true &&
                        address.has_sapling === false
                          ? translate('receive.shielded-orchard')
                          : address &&
                              address.has_orchard === true &&
                              address.has_sapling === true
                            ? translate('receive.shielded-orchard-sapling')
                            : address &&
                                address.has_orchard === false &&
                                address.has_sapling === true
                              ? translate('receive.shielded-sapling')
                              : '') as string
                      }
                    </RegText>
                  </View>
                </View>
              )}
              {address && !isBasic && !isUnified && (
                <View
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginTop: 10,
                  }}
                >
                  <View
                    style={{
                      flexDirection: 'row',
                      justifyContent: 'center',
                      alignItems: 'center',
                    }}
                  >
                    <EyeIcon
                      color={colors.fgWarningDark}
                      size={20}
                      style={{ marginRight: 10 }}
                    />
                    <RegText
                      style={{
                        fontWeight: 'bold',
                        opacity: 0.9,
                        marginRight: 10,
                      }}
                    >
                      {address && (translate('receive.t-title') as string)}
                    </RegText>
                  </View>
                </View>
              )}
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginTop: 10,
                }}
              >
                <View
                  style={{
                    flexDirection: 'row',
                    justifyContent: 'center',
                    alignItems: 'center',
                  }}
                >
                  {total > 1 && (
                    <FadeText>{` (${index + 1} / ${total}) `}</FadeText>
                  )}
                </View>
              </View>
            </View>

            <View
              style={{
                marginTop: 10,
                marginHorizontal: 20,
                padding: 10,
                backgroundColor: colors.fgDefault,
              }}
            >
              {ufvk ? (
                <>
                  {expandQRAddress ? (
                    <QRCode
                      value={ufvk}
                      size={200}
                      ecl="L"
                      backgroundColor={colors.fgDefault}
                      logo={getZingoLogo()}
                      logoSize={30}
                      logoBackgroundColor={colors.fgDefault}
                      logoBorderRadius={7} /* android not soported */
                      logoMargin={3}
                    />
                  ) : (
                    <View
                      style={{
                        width: 200,
                        height: 200,
                        justifyContent: 'center',
                        alignItems: 'center',
                        borderWidth: 1,
                        borderColor: colors.fgDefault,
                      }}
                    >
                      <TouchableOpacity
                        onPress={() => {
                          setExpandQRAddress(true);
                          setTimeout(() => {
                            setExpandQRAddress(false);
                          }, 5 * 1000);
                        }}
                      >
                        <Text
                          style={{
                            color: colors.fgMuted,
                            textDecorationLine: 'underline',
                            marginTop: 15,
                            minHeight: 48,
                          }}
                        >
                          {translate('seed.tapreveal') as string}
                        </Text>
                      </TouchableOpacity>
                    </View>
                  )}
                </>
              ) : (
                <QRCode
                  value={address ? address.address : ''}
                  size={200}
                  ecl="L"
                  backgroundColor={colors.fgDefault}
                  logo={getZingoLogo()}
                  logoSize={30}
                  logoBackgroundColor={colors.fgDefault}
                  logoBorderRadius={7} /* android not soported */
                  logoMargin={3}
                />
              )}
            </View>
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                marginVertical: 0,
                width: '100%',
                justifyContent: 'space-evenly',
              }}
            >
              <View
                style={{
                  flexDirection: 'row',
                  justifyContent: 'center',
                  alignItems: 'center',
                  marginTop: 20,
                  marginBottom: 5,
                }}
              >
                <TouchableOpacity onPress={doCopy}>
                  <View
                    style={{
                      borderRadius: 30,
                      borderColor: colors.borderMuted,
                      paddingHorizontal: 5,
                      paddingVertical: 5,
                      marginHorizontal: 10,
                    }}
                  >
                    <CopyIcon
                      color={colors.fgDefault}
                      size={20}
                      opacity={0.9}
                      style={{ margin: 3 }}
                    />
                  </View>
                </TouchableOpacity>
                {address && !isBasic && (
                  <>
                    <TouchableOpacity onPress={() => show('VA')}>
                      <View
                        style={{
                          borderRadius: 30,
                          borderColor: colors.borderMuted,
                          paddingHorizontal: 5,
                          paddingVertical: 5,
                          marginHorizontal: 10,
                        }}
                      >
                        <FontAwesomeIcon
                          style={{ margin: 5, opacity: 0.9 }}
                          size={20}
                          icon={faCircleCheck}
                          color={colors.fgDefault}
                        />
                      </View>
                    </TouchableOpacity>
                    {total > 1 && (
                      <TouchableOpacity onPress={doAddressList}>
                        <View
                          style={{
                            borderRadius: 30,
                            borderColor: colors.borderMuted,
                            paddingHorizontal: 5,
                            paddingVertical: 5,
                            marginHorizontal: 10,
                          }}
                        >
                          <ListIcon
                            color={colors.fgDefault}
                            size={20}
                            opacity={0.9}
                            style={{ margin: 3 }}
                          />
                        </View>
                      </TouchableOpacity>
                    )}
                  </>
                )}
              </View>
            </View>
            {ufvk && (
              <Address
                address={ufvk}
                style={{ color: colors.fgDefault, fontSize: 18, opacity: 0.8 }}
                onPress={() => show('EA')}
              />
            )}
            {address && (
              <View
                style={{
                  flexDirection: 'column',
                  width: '100%',
                  justifyContent: 'center',
                  alignItems: 'center',
                  marginBottom: 20,
                }}
              >
                {contactFromAddress() ? (
                  <Text
                    style={{
                      color: colors.fgMuted,
                      fontSize: 16,
                    }}
                  >
                    {contactFromAddress()}
                  </Text>
                ) : (
                  <TouchableOpacity onPress={() => show('NAT')}>
                    <Text
                      style={{
                        color: colors.fgMuted,
                        textDecorationLine: 'underline',
                        fontSize: 16,
                      }}
                    >
                      {translate('receive.add-tag') as string}
                    </Text>
                  </TouchableOpacity>
                )}
                <Address
                  address={address.address}
                  style={{ color: colors.fgDefault, fontSize: 18, opacity: 0.8 }}
                  onPress={() => show('EA')}
                  testID={
                    address.addressKind === AddressKindEnum.u
                      ? 'receive.unified-address'
                      : undefined
                  }
                />
              </View>
            )}
          </>
        ) : (
          <View
            style={{
              display: 'flex',
              flexDirection: 'row',
              justifyContent: 'center',
              marginTop: 50,
              marginBottom: 30,
            }}
          >
            <RegText>{ufvk ? ufvk : address ? address.address : ''}</RegText>
          </View>
        )}
      </ScrollView>
    </View>
  );
};

export default SingleAddress;
