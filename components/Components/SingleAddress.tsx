/* eslint-disable react-native/no-inline-styles */
import React, { useContext, useState, useEffect } from 'react';
import { View, ScrollView, TouchableOpacity, Text } from 'react-native';
import Clipboard from '@react-native-community/clipboard';
import QRCode from 'react-native-qrcode-svg';
import { useTheme } from '@react-navigation/native';
import { faChevronLeft, faChevronRight } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';

import { ThemeType } from '../../app/types';
import { ContextAppLoaded } from '../../app/context';
import AddressItem from './AddressItem';
import moment from 'moment';
import 'moment/locale/es';
import 'moment/locale/pt';
import 'moment/locale/ru';
import { SnackbarDurationEnum } from '../../app/AppState';
import RegText from './RegText';

type SingleAddressProps = {
  address: string;
  index: number;
  total: number;
  prev: () => void;
  next: () => void;
  ufvk?: boolean;
};

const SingleAddress: React.FunctionComponent<SingleAddressProps> = ({ address, index, total, prev, next, ufvk }) => {
  const context = useContext(ContextAppLoaded);
  const { translate, privacy, addLastSnackbar, language } = context;
  const { colors } = useTheme() as unknown as ThemeType;
  moment.locale(language);

  const [expandQRAddress, setExpandQRAddress] = useState<boolean>(false);
  const [multi, setMulti] = useState<boolean>(false);

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

  return (
    <View style={{ flexDirection: 'column' }}>
      <ScrollView
        contentContainerStyle={[
          {
            alignItems: 'center',
          },
        ]}>
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
                    }, 5000);
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
                  <>
                    {privacy ? (
                      <QRCode value={address} size={200} ecl="L" backgroundColor={colors.text} />
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
                      />
                    )}
                  </>
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
              <View style={{ width: 150, justifyContent: 'center', alignItems: 'center' }}>
                <TouchableOpacity onPress={doCopy}>
                  <Text style={{ color: colors.text, textDecorationLine: 'underline', marginTop: 15, minHeight: 48 }}>
                    {translate('seed.tapcopy') as string}
                  </Text>
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
                <AddressItem address={address} closeModal={() => {}} openModal={() => {}} />
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
            }}>
            <RegText>{address}</RegText>
          </View>
        )}
      </ScrollView>
    </View>
  );
};

export default SingleAddress;
