/* eslint-disable react-native/no-inline-styles */
import React, { useContext, useState, useEffect, useRef } from 'react';
import { View, ScrollView, TouchableOpacity, Text } from 'react-native';
import Clipboard from '@react-native-clipboard/clipboard';
import QRCode from 'react-native-qrcode-svg';
import { useTheme } from '@react-navigation/native';
import { faChevronLeft, faChevronRight, faCopy, faShare } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import Share from 'react-native-share';
import RNFS from 'react-native-fs';

import { ThemeType } from '../../app/types';
import { ContextAppLoaded } from '../../app/context';
import AddressItem from './AddressItem';
import moment from 'moment';
import 'moment/locale/es';
import 'moment/locale/pt';
import 'moment/locale/ru';
import { SecurityType, SnackbarDurationEnum } from '../../app/AppState';
import RegText from './RegText';

type QRCodeRef = {
  toDataURL: (callback: (data: string) => void) => void;
};

type SingleAddressProps = {
  address: string;
  index: number;
  total: number;
  prev: () => void;
  next: () => void;
  ufvk?: boolean;
  setSecurityOption: (s: SecurityType) => Promise<void>;
};

const SingleAddress: React.FunctionComponent<SingleAddressProps> = ({ address, index, total, prev, next, ufvk, setSecurityOption }) => {
  const context = useContext(ContextAppLoaded);
  const { translate, privacy, addLastSnackbar, language, security } = context;
  const { colors } = useTheme()  as ThemeType;
  moment.locale(language);

  const [expandQRAddress, setExpandQRAddress] = useState<boolean>(true);
  const [multi, setMulti] = useState<boolean>(false);

  const qrCodeRef = useRef<QRCodeRef | null>(null);

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

  useEffect(() => {
    const mult = total > 1;
    setMulti(mult);
  }, [total]);

  const doCopy = () => {
    Clipboard.setString(address);
    addLastSnackbar({
      message: translate('history.addresscopied') as string,
      duration: SnackbarDurationEnum.short,
    });
  };

  const doShare = () => {
    if (qrCodeRef.current) {
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
      qrCodeRef.current.toDataURL(async (data) => {
        const filePath = `${RNFS.CachesDirectoryPath}/qrcode.png`;
        try {
          await RNFS.writeFile(filePath, data, 'base64');
          const shareOptions = {
            title: 'QR',
            url: `file://${filePath}`,
            type: 'image/png',
            failOnCancel: false,
          };
          await Share.open(shareOptions);
        } catch (err) {
          console.error('Error sharing QR image:', err);
        } finally {
          RNFS.exists(filePath).then((exists) => {
            if (exists) {
              RNFS.unlink(filePath).catch((e) => console.log('Error removing temp QR image:', e));
            }
          });
        }
      });
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
    <View style={{ flexDirection: 'column' }}>
      <ScrollView
        contentContainerStyle={{
          alignItems: 'center',
        }}>
        {!!address && address !== (translate('receive.noaddress') as string) ? (
          <>
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
                      <QRCode
                        value={address}
                        size={200}
                        ecl="L"
                        backgroundColor={colors.text}
                        logo={require('../../assets/img/logobig-zingo.png')}
                        logoSize={30}
                        logoBackgroundColor={colors.text}
                        logoBorderRadius={5} /* android not soported */
                        logoMargin={3}
                        getRef={(c) => (qrCodeRef.current = c)}
                      />
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
                  <QRCode
                    value={address}
                    size={200}
                    ecl="L"
                    backgroundColor={colors.text}
                    logo={require('../../assets/img/logobig-zingo.png')}
                    logoSize={30}
                    logoBackgroundColor={colors.text}
                    logoBorderRadius={5} /* android not soported */
                    logoMargin={3}
                    getRef={(c) => (qrCodeRef.current = c)}
                  />
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
              {multi && (
                <View
                  style={{
                    width: 58,
                    borderColor: colors.primary,
                    borderWidth: 2,
                    borderRadius: 10,
                  }}>
                  <TouchableOpacity
                    accessible={true}
                    accessibilityLabel={translate('send.scan-acc') as string}
                    onPress={prev}>
                    <FontAwesomeIcon style={{ margin: 5 }} size={48} icon={faChevronLeft} color={colors.primary} />
                  </TouchableOpacity>
                </View>
              )}
              <View style={{ width: 150, flexDirection: 'row', justifyContent: 'center', alignItems: 'center' }}>
                <TouchableOpacity onPress={doCopy}>
                  <FontAwesomeIcon style={{ margin: 10, marginTop: 20, marginHorizontal: 20, opacity: 0.9 }} size={35} icon={faCopy} color={colors.money} />
                </TouchableOpacity>
                <TouchableOpacity onPress={doShare}>
                  <FontAwesomeIcon style={{ margin: 10, marginTop: 20, marginHorizontal: 20, opacity: 0.9 }} size={35} icon={faShare} color={colors.money} />
                </TouchableOpacity>
                {multi && (
                  <Text style={{ color: colors.primary, marginTop: -25 }}>
                    {index + 1}
                    {translate('receive.of') as string}
                    {total}
                  </Text>
                )}
              </View>
              {multi && (
                <View
                  style={{
                    width: 58,
                    borderColor: colors.primary,
                    borderWidth: 2,
                    borderRadius: 10,
                  }}>
                  <TouchableOpacity
                    accessible={true}
                    accessibilityLabel={translate('send.scan-acc') as string}
                    onPress={next}>
                    <FontAwesomeIcon style={{ margin: 5 }} size={48} icon={faChevronRight} color={colors.primary} />
                  </TouchableOpacity>
                </View>
              )}
            </View>
            <TouchableOpacity
              onPress={() => {
                doCopy();
              }}>
              <View
                style={{
                  display: 'flex',
                  flexDirection: 'row',
                  justifyContent: 'center',
                  marginBottom: 30,
                }}>
                <AddressItem address={address} />
              </View>
            </TouchableOpacity>
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
            <RegText>{address}</RegText>
          </View>
        )}
      </ScrollView>
    </View>
  );
};

export default SingleAddress;
