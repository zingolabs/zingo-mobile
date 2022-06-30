/* eslint-disable react-native/no-inline-styles */
import React, {useState} from 'react';
import {View, ScrollView, SafeAreaView, Image, Text, Platform, TouchableOpacity} from 'react-native';
import Clipboard from '@react-native-community/clipboard';
import {ClickableText, FadeText} from './Components';
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
const PrivKeyModal: React.FunctionComponent<PrivKeyModalProps> = ({address, keyType, privKey, closeModal}) => {
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
      <View>
        <View style={{alignItems: 'center', backgroundColor: colors.card, paddingBottom: 25, paddingTop: 25}}>
          <Text style={{marginTop: 5, padding: 5, color: colors.text, fontSize: 28}}>{keyTypeString} Key</Text>
          <TouchableOpacity
            onPress={() => {
              setExpandAddress(true);
            }}>
            <FadeText style={{textAlign: 'center', marginLeft: 10, marginRight: 10}}>
              {expandAddress ? address : Utils.trimToSmall(address, 10)}
            </FadeText>
          </TouchableOpacity>
        </View>
        <View style={{display: 'flex', alignItems: 'center', marginTop: -25}}>
          <Image source={require('../assets/img/logobig-zingo.png')} style={{width: 50, height: 50, resizeMode: 'contain'}} />
        </View>
      </View>

      <ScrollView
        style={{maxHeight: '85%'}}
        contentContainerStyle={{
          flexDirection: 'column',
          alignItems: 'stretch',
          justifyContent: 'flex-start',
        }}>
        <View style={{display: 'flex', flexDirection: 'column', marginTop: 10, alignItems: 'center'}}>
          <View style={{padding: 10, backgroundColor: 'rgb(255, 255, 255)', marginTop: 15, marginBottom: 20}}>
            <QRCode value={privKey} size={225} ecl="L" />
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
