/* eslint-disable react-native/no-inline-styles */
import React, { useContext, useState, useEffect, useRef } from 'react';
import { View, ScrollView, TouchableOpacity, Text } from 'react-native';
import Clipboard from '@react-native-clipboard/clipboard';
import QRCode from 'react-native-qrcode-svg';
import { useTheme } from '@react-navigation/native';
import { faCircleCheck, faCopy, faList } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import Share from 'react-native-share';
import ViewShot from 'react-native-view-shot';

import { ThemeType } from '../../app/types';
import { ContextAppLoaded } from '../../app/context';
import AddressItem from './AddressItem';
import moment from 'moment';
import 'moment/locale/es';
import 'moment/locale/pt';
import 'moment/locale/ru';
import { AddressKindEnum, ButtonTypeEnum, ModeEnum, SecurityType, SnackbarDurationEnum, TransparentAddressClass, UnifiedAddressClass } from '../../app/AppState';
import RegText from './RegText';
import Button from './Button';

type SingleAddressProps = {
  address?: UnifiedAddressClass | TransparentAddressClass;
  ufvk?: string;
  index: number;
  total: number;
  prev: () => void;
  next: () => void;
  setSecurityOption: (s: SecurityType) => Promise<void>;
  newAddressShow?: () => void;
};

const SingleAddress: React.FunctionComponent<SingleAddressProps> = ({
  address,
  ufvk,
  setSecurityOption,
  newAddressShow,
}) => {
  const context = useContext(ContextAppLoaded);
  const { translate, privacy, addLastSnackbar, language, security, mode } = context;
  const { colors } = useTheme()  as ThemeType;
  moment.locale(language);

  const [expandQRAddress, setExpandQRAddress] = useState<boolean>(true);

  const qrCodeRef = useRef<ViewShot>(null);

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

  const doCopy = () => {
    Clipboard.setString(ufvk ? ufvk : (address ? address.address : ''));
    addLastSnackbar({
      message: ufvk ? (translate('seed.tapcopy-ufvk-message') as string) : (translate('history.addresscopied') as string),
      duration: SnackbarDurationEnum.short,
    });
  };

  const doShare = async () => {
    if (qrCodeRef.current && qrCodeRef.current.capture) {
      let changed: boolean = false;
      if (security.foregroundApp) {
        // deactivate temporarily this
        changed = true;
        const newSecurity = {
          startApp: security.startApp,
          foregroundApp: false,
          sendConfirm: security.sendConfirm,
          seedUfvkScreen: security.seedUfvkScreen,
          rescanScreen: security.rescanScreen,
          settingsScreen: security.settingsScreen,
          changeWalletScreen: security.changeWalletScreen,
          restoreWalletBackupScreen: security.restoreWalletBackupScreen,
        } as SecurityType;
        setSecurityOption(newSecurity);
      }
      try {
        const uri = await qrCodeRef.current.capture(); // Capture the QR code as an image URI
        const shareOptions = {
          title: 'QR',
          url: uri,
          type: 'image/png',
        };
        await Share.open(shareOptions);
      } catch (error) {
        // https://github.com/react-native-share/react-native-share/issues/1664
        console.log('Error sharing QR code:', error);
      }
      if (changed) {
        // activate again in 5 seconds
        setTimeout(() => {
          const newSecurity = {
            startApp: security.startApp,
            foregroundApp: true,
            sendConfirm: security.sendConfirm,
            seedUfvkScreen: security.seedUfvkScreen,
            rescanScreen: security.rescanScreen,
            settingsScreen: security.settingsScreen,
            changeWalletScreen: security.changeWalletScreen,
            restoreWalletBackupScreen: security.restoreWalletBackupScreen,
          } as SecurityType;
          setSecurityOption(newSecurity);
        }, 5 * 1000);
      }
    }
  };

  return (
    <View style={{ flexDirection: 'column', width: '100%' }}>
      <ScrollView
        style={{ width: '100%' }}
        contentContainerStyle={{
          alignItems: 'center',
        }}>
        {(ufvk || (address && address.address !== (translate('receive.noaddress') as string))) ? (
          <>
            <View style={{ flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginTop: 10, marginBottom: 5 }}>
              {mode === ModeEnum.advanced && address && address.addressKind === AddressKindEnum.u && (
                <View
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginTop: 10,
                  }}>
                  <View
                    style={{
                      flexDirection: 'row',
                      justifyContent: 'center',
                      alignItems: 'center',
                    }}>
                    <RegText
                      style={{
                        fontWeight: 'bold',
                        opacity: 0.9,
                        marginRight: 5,
                      }}>
                      {(address && address.has_orchard  === true && address.has_sapling === false
                        ? translate('receive.shielded-orchard')
                        : address && address.has_orchard === true && address.has_sapling === true
                        ? translate('receive.shielded-orchard-sapling')
                        : address && address.has_orchard === false && address.has_sapling === true
                        ? translate('receive.shielded-sapling')
                        : '') as string}
                    </RegText>
                  </View>
                </View>
              )}
            </View>

            <View style={{ marginTop: 20, marginHorizontal: 20, padding: 10, backgroundColor: colors.text }}>
              <TouchableOpacity
                onPress={() => {
                  doCopy();
                  setExpandQRAddress(true);
                  if (privacy) {
                    setTimeout(() => {
                      setExpandQRAddress(false);
                    }, 5 * 1000);
                  }
                }}>
                {ufvk ? (
                  <>
                    {expandQRAddress ? (
                      <ViewShot ref={qrCodeRef} options={{ format: 'png', quality: 1 }}>
                        <QRCode
                          value={ufvk}
                          size={200}
                          ecl="L"
                          backgroundColor={colors.text}
                          logo={require('../../assets/img/logobig-zingo.png')}
                          logoSize={30}
                          logoBackgroundColor={colors.text}
                          logoBorderRadius={5} /* android not soported */
                          logoMargin={3}
                        />
                      </ViewShot>
                    ) : (
                      <View
                        style={{
                          width: 200,
                          height: 200,
                          justifyContent: 'center',
                          alignItems: 'center',
                          borderWidth: 1,
                          borderColor: colors.text,
                        }}>
                        <Text
                          style={{
                            color: colors.zingo,
                            textDecorationLine: 'underline',
                            marginTop: 15,
                            minHeight: 48,
                          }}>
                          {translate('seed.tapreveal') as string}
                        </Text>
                      </View>
                    )}
                  </>
                ) : (
                  <ViewShot ref={qrCodeRef} options={{ format: 'png', quality: 1 }}>
                    <QRCode
                      value={address ? address.address : ''}
                      size={200}
                      ecl="L"
                      backgroundColor={colors.text}
                      logo={require('../../assets/img/logobig-zingo.png')}
                      logoSize={30}
                      logoBackgroundColor={colors.text}
                      logoBorderRadius={5} /* android not soported */
                      logoMargin={3}
                    />
                  </ViewShot>
                )}
              </TouchableOpacity>
            </View>
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                marginVertical: 0,
                width: '100%',
                justifyContent: 'space-evenly',
              }}>
              <View style={{ flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginTop: 20, marginBottom: 5 }}>
                <TouchableOpacity onPress={doCopy}>
                  <View
                    style={{
                      backgroundColor: colors.sideMenuBackground,
                      borderRadius: 30,
                      borderColor: colors.zingo,
                      borderWidth: 1,
                      paddingHorizontal: 5,
                      paddingVertical: 5,
                      marginHorizontal: 10,
                    }}>
                    <FontAwesomeIcon style={{ margin: 5, opacity: 0.9 }} size={20} icon={faCopy} color={colors.money} />
                  </View>
                </TouchableOpacity>
                {address && mode === ModeEnum.advanced && (
                  <>
                    <TouchableOpacity onPress={doCopy}>
                      <View
                        style={{
                          backgroundColor: colors.sideMenuBackground,
                          borderRadius: 30,
                          borderColor: colors.zingo,
                          borderWidth: 1,
                          paddingHorizontal: 5,
                          paddingVertical: 5,
                          marginHorizontal: 10,
                        }}>
                        <FontAwesomeIcon style={{ margin: 5, opacity: 0.9 }} size={20} icon={faCircleCheck} color={colors.money} />
                      </View>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={doCopy}>
                      <View
                        style={{
                          backgroundColor: colors.sideMenuBackground,
                          borderRadius: 30,
                          borderColor: colors.zingo,
                          borderWidth: 1,
                          paddingHorizontal: 5,
                          paddingVertical: 5,
                          marginHorizontal: 10,
                        }}>
                        <FontAwesomeIcon style={{ margin: 5, opacity: 0.9 }} size={20} icon={faList} color={colors.money} />
                      </View>
                    </TouchableOpacity>
                  </>
                )}
              </View>
            </View>
            <View
              style={{
                display: 'flex',
                flexDirection: 'row',
                justifyContent: 'center',
                marginTop: 10,
                marginBottom: 20,
              }}>
              <AddressItem ufvk={!!ufvk} address={ufvk ? ufvk : (address ? address.address : '')} />
            </View>
            <View style={{ flexDirection: 'column', width: '100%', justifyContent: 'center', alignItems: 'center' }}>
              <Button
                type={ButtonTypeEnum.Primary}
                title={'Share'}
                onPress={() => {
                  doShare();
                }}
                style={{ marginBottom: 10 }}
              />
              {address && mode === ModeEnum.advanced && (
                <Button
                  type={ButtonTypeEnum.Tertiary}
                  title={address.addressKind === AddressKindEnum.u ? 'New Unified Address' : 'New Transparent Address'}
                  onPress={() => {
                    newAddressShow && newAddressShow();
                  }}
                />
              )}
            </View>
          </>
        ) : (
          <View
            style={{
              display: 'flex',
              flexDirection: 'row',
              justifyContent: 'center',
              marginTop: 50,
              marginBottom: 30,
            }}>
            <RegText>{ufvk ? ufvk : (address ? address.address : '')}</RegText>
          </View>
        )}
      </ScrollView>
    </View>
  );
};

export default SingleAddress;
