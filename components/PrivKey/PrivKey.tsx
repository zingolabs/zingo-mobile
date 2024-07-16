/* eslint-disable react-native/no-inline-styles */
import React, { useContext, useEffect, useState } from 'react';
import { View, ScrollView, SafeAreaView, TouchableOpacity, Text } from 'react-native';
import { useTheme } from '@react-navigation/native';
import Clipboard from '@react-native-community/clipboard';
import QRCode from 'react-native-qrcode-svg';

import FadeText from '../Components/FadeText';
import Button from '../Components/Button';
import Utils from '../../app/utils';
import { ThemeType } from '../../app/types';
import { ContextAppLoaded } from '../../app/context';
import Header from '../Header';
import moment from 'moment';
import 'moment/locale/es';
import 'moment/locale/pt';
import 'moment/locale/ru';
import { ButtonTypeEnum, SnackbarDurationEnum } from '../../app/AppState';

type PrivKeyProps = {
  closeModal: () => void;
  address: string;
  keyType: number;
  privKey: string;
};
const PrivKey: React.FunctionComponent<PrivKeyProps> = ({ address, keyType, privKey, closeModal }) => {
  const context = useContext(ContextAppLoaded);
  const { translate, addLastSnackbar, language } = context;
  const { colors } = useTheme() as unknown as ThemeType;
  moment.locale(language);

  const [expandAddress, setExpandAddress] = useState<boolean>(false);
  const [keyTypeString, setKeyTypeString] = useState<string>('');
  const [keyChunks, setKeyChunks] = useState<string[]>([]);

  useEffect(() => {
    const keyTypeStr = keyType === 0 ? translate('privkey.privkey') : translate('privkey.viewkey');

    // 30 characters per line
    const numLines = privKey.length < 40 ? 2 : privKey.length / 30;
    const keyChu = Utils.splitStringIntoChunks(privKey, Number(numLines.toFixed(0)));

    setKeyTypeString(keyTypeStr as string);
    setKeyChunks(keyChu);
  }, [keyType, privKey, translate]);

  const doCopy = () => {
    //if (address) {
    Clipboard.setString(privKey);
    addLastSnackbar({
      message: translate('privkey.tapcopy-message') as string,
      duration: SnackbarDurationEnum.short,
    });
    //}
  };

  return (
    <SafeAreaView
      style={{
        display: 'flex',
        justifyContent: 'flex-start',
        alignItems: 'stretch',
        height: '100%',
        backgroundColor: colors.background,
      }}>
      <Header
        title={keyTypeString + ' ' + translate('privkey.title')}
        noBalance={true}
        noSyncingStatus={true}
        noDrawMenu={true}
        noPrivacy={true}
      />

      <ScrollView
        style={{ maxHeight: '85%' }}
        contentContainerStyle={{
          flexDirection: 'column',
          alignItems: 'stretch',
          justifyContent: 'flex-start',
        }}>
        <View
          style={{ display: 'flex', flexDirection: 'column', marginTop: 0, alignItems: 'center', marginBottom: 30 }}>
          <View style={{ alignItems: 'center', paddingBottom: 0, paddingTop: 10 }}>
            <FadeText style={{ color: colors.text, textAlign: 'center', marginLeft: 10, marginRight: 10 }}>
              {translate('privkey.address') as string}
            </FadeText>
            <TouchableOpacity
              onPress={() => {
                setExpandAddress(true);
              }}>
              <FadeText style={{ textAlign: 'center', marginLeft: 10, marginRight: 10 }}>
                {expandAddress ? address : Utils.trimToSmall(address, 10)}
              </FadeText>
            </TouchableOpacity>
          </View>

          <View style={{ padding: 10, backgroundColor: colors.border, marginTop: 15, marginBottom: 20 }}>
            <QRCode
              value={privKey}
              size={225}
              ecl="L"
              backgroundColor={colors.border}
              logo={require('../../assets/img/logobig-zingo.png')}
              logoSize={35}
              logoBackgroundColor={colors.border}
              logoBorderRadius={10} /* android not soported */
              logoMargin={5}
            />
          </View>
          <TouchableOpacity onPress={doCopy}>
            <Text style={{ color: colors.text, textDecorationLine: 'underline', marginBottom: 5, minHeight: 48 }}>
              {translate('seed.tapcopy') as string}
            </Text>
          </TouchableOpacity>

          {keyChunks.map(c => (
            <FadeText
              key={c}
              style={{
                flexBasis: '100%',
                textAlign: 'center',
                fontFamily: 'verdana',
                fontSize: 18,
                color: colors.text,
              }}>
              {c}
            </FadeText>
          ))}
        </View>
      </ScrollView>
      <View
        style={{
          flexGrow: 1,
          flexDirection: 'row',
          justifyContent: 'center',
          alignItems: 'center',
          marginVertical: 5,
        }}>
        <Button type={ButtonTypeEnum.Secondary} title={translate('close') as string} onPress={closeModal} />
      </View>
    </SafeAreaView>
  );
};

export default PrivKey;
