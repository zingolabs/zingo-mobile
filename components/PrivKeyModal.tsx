/* eslint-disable react-native/no-inline-styles */
import React, {useState} from 'react';
import {View, ScrollView, SafeAreaView, Image, Text, Platform, TouchableOpacity} from 'react-native';
import Clipboard from '@react-native-community/clipboard';
import {ClickableText, FadeText, RegText, ZecAmount, UsdAmount, zecPrice} from './Components';
import Button from './Button';
import {useTheme} from '@react-navigation/native';
import Utils from '../app/utils';
import Toast from 'react-native-simple-toast';
import QRCode from 'react-native-qrcode-svg';

type PrivKeyModalProps = {
  closeModal: () => void;
  address: string;
  keyType: number;
  privKey: string;
};
const PrivKeyModal: React.FunctionComponent<PrivKeyModalProps> = ({address, keyType, privKey, closeModal, totalBalance}) => {
  const {colors} = useTheme();
  const fixedWidthFont = Platform.OS === 'android' ? 'monospace' : 'Courier';

  const keyTypeString = keyType === 0 ? 'Private' : 'Viewing';

  // 30 characters per line
  const numLines = (privKey.length / 30);
  const keyChunks = Utils.splitStringIntoChunks(privKey, numLines.toFixed(0));

  const [expandAddress, setExpandAddress] = useState(false);

  if (!privKey) {
    privKey = 'No Key';
  }

  const doCopy = () => {
    if (address) {
      Clipboard.setString(privKey);
      Toast.show('Copied key to Clipboard', Toast.LONG);
    }
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
        style={{display: 'flex', alignItems: 'center', paddingBottom: 25, backgroundColor: colors.card, zIndex: -1}}>
        <RegText color={'#ffffff'} style={{marginTop: 5, padding: 5}}>{keyTypeString} Key</RegText>
        <ZecAmount size={36} amtZec={totalBalance.total} style={{opacity: 0.2}} />
      </View>
      <View>
        <View style={{display: 'flex', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginTop: -30}}>
          <Image source={require('../assets/img/logobig-zingo.png')} style={{width: 50, height: 50, resizeMode: 'contain'}} />
          <Text style={{ color: '#777777', fontSize: 40, fontWeight: 'bold' }}> ZingoZcash</Text>
        </View>
      </View>

      <ScrollView
        style={{maxHeight: '85%'}}
        contentContainerStyle={{
          flexDirection: 'column',
          alignItems: 'stretch',
          justifyContent: 'flex-start',
        }}>
        <View style={{display: 'flex', flexDirection: 'column', marginTop: 0, alignItems: 'center'}}>

          <View style={{alignItems: 'center', paddingBottom: 0, paddingTop: 10}}>
            <FadeText style={{color: '#777777', textAlign: 'center', marginLeft: 10, marginRight: 10}}>
              Address
            </FadeText>
            <TouchableOpacity
              onPress={() => {
                setExpandAddress(true);
              }}>
              <FadeText style={{textAlign: 'center', marginLeft: 10, marginRight: 10}}>
                {expandAddress ? address : Utils.trimToSmall(address, 10)}
              </FadeText>
            </TouchableOpacity>
          </View>

          <View style={{padding: 10, backgroundColor: '#777777', marginTop: 15, marginBottom: 20}}>
            <QRCode value={privKey} size={225} ecl="L" backgroundColor='#777777' />
          </View>
          <ClickableText style={{marginBottom: 5}} onPress={doCopy}>
            Tap To Copy
          </ClickableText>

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
      <View style={{flexGrow: 1, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', margin: 10}}>
        <Button type="Secondary" title="Close" onPress={closeModal} />
      </View>
    </SafeAreaView>
  );
};

export default PrivKeyModal;
