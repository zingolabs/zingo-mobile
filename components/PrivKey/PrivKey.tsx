/* eslint-disable react-native/no-inline-styles */
import React, { useContext, useState } from 'react';
import { View, ScrollView, SafeAreaView, Image, Platform, TouchableOpacity, Text } from 'react-native';
import { useTheme } from '@react-navigation/native';
import Clipboard from '@react-native-community/clipboard';
import Toast from 'react-native-simple-toast';
import QRCode from 'react-native-qrcode-svg';

import FadeText from '../Components/FadeText';
import RegText from '../Components/RegText';
import ZecAmount from '../Components/ZecAmount';
import Button from '../Button';
import Utils from '../../app/utils';
import { ThemeType } from '../../app/types';
import { ContextAppLoaded } from '../../app/context';

type PrivKeyProps = {
  closeModal: () => void;
  address: string;
  keyType: number;
  privKey: string;
};
const PrivKey: React.FunctionComponent<PrivKeyProps> = ({ address, keyType, privKey, closeModal }) => {
  const context = useContext(ContextAppLoaded);
  const { totalBalance, info, translate } = context;
  const { colors } = useTheme() as unknown as ThemeType;
  const fixedWidthFont = Platform.OS === 'android' ? 'monospace' : 'Courier';

  const keyTypeString = keyType === 0 ? translate('privkey.privkey') : translate('privkey.viewkey');

  // 30 characters per line
  const numLines = privKey.length / 30;
  const keyChunks = Utils.splitStringIntoChunks(privKey, Number(numLines.toFixed(0)));

  const [expandAddress, setExpandAddress] = useState(false);

  //if (!privKey) {
  //  privKey = translate('privkey.nokey');
  //}

  const doCopy = () => {
    //if (address) {
    Clipboard.setString(privKey);
    Toast.show(translate('privkey.tapcopy-message'), Toast.LONG);
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
      <View
        style={{
          display: 'flex',
          alignItems: 'center',
          paddingBottom: 10,
          backgroundColor: colors.card,
          zIndex: -1,
          paddingTop: 10,
        }}>
        <Image
          source={require('../../assets/img/logobig-zingo.png')}
          style={{ width: 80, height: 80, resizeMode: 'contain' }}
        />
        <ZecAmount
          currencyName={info.currencyName ? info.currencyName : ''}
          size={36}
          amtZec={totalBalance.total}
          style={{ opacity: 0.5 }}
        />
        <RegText color={colors.money} style={{ marginTop: 5, padding: 5 }}>
          {keyTypeString} {translate('privkey.title')}
        </RegText>
        <View style={{ width: '100%', height: 1, backgroundColor: colors.primary }} />
      </View>

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
              {translate('privkey.address')}
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
            <QRCode value={privKey} size={225} ecl="L" backgroundColor={colors.border} />
          </View>
          <TouchableOpacity onPress={doCopy}>
            <Text style={{ color: colors.text, textDecorationLine: 'underline', marginBottom: 5, minHeight: 48 }}>
              {translate('seed.tapcopy')}
            </Text>
          </TouchableOpacity>

          {keyChunks.map(c => (
            <FadeText
              key={c}
              style={{
                flexBasis: '100%',
                textAlign: 'center',
                fontFamily: fixedWidthFont,
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
        <Button type="Secondary" title={translate('close')} onPress={closeModal} />
      </View>
    </SafeAreaView>
  );
};

export default PrivKey;
