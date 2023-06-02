/* eslint-disable react-native/no-inline-styles */
import React, { useContext, useEffect, useRef, useState } from 'react';
import { View, ScrollView, SafeAreaView, TouchableOpacity, Modal, TextInput, Keyboard } from 'react-native';
import { useTheme } from '@react-navigation/native';
import { faQrcode } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import Toast from 'react-native-simple-toast';
import Animated, { EasingNode } from 'react-native-reanimated';

import FadeText from '../Components/FadeText';
import RegText from '../Components/RegText';
import Button from '../Components/Button';
import ScannerKey from './components/ScannerKey';
import { ThemeType } from '../../app/types';
import { ContextAppLoading } from '../../app/context';
import Header from '../Header';
import RPCModule from '../../app/RPCModule';
import { RPCParseViewKeyType } from '../../app/rpc/types/RPCParseViewKeyType';

type ImportKeyProps = {
  onClickCancel: () => void;
  onClickOK: (keyText: string, birthday: number) => Promise<void>;
};
const ImportKey: React.FunctionComponent<ImportKeyProps> = ({ onClickCancel, onClickOK }) => {
  const context = useContext(ContextAppLoading);
  const { translate, netInfo, dimensions, info, server } = context;
  const { colors } = useTheme() as unknown as ThemeType;

  const [privKeyText, setPrivKeyText] = useState('');
  const [birthday, setBirthday] = useState('');
  const [qrcodeModalVisible, setQrcodeModalVisible] = useState(false);
  const [titleViewHeight, setTitleViewHeight] = useState(0);
  const [latestBlock, setLatestBlock] = useState(0);
  const [currencyName, setCurrencyName] = useState('');

  const slideAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const keyboardDidShowListener = Keyboard.addListener('keyboardDidShow', () => {
      Animated.timing(slideAnim, {
        toValue: 0 - titleViewHeight + 25,
        duration: 100,
        easing: EasingNode.linear,
        //useNativeDriver: true,
      }).start();
    });
    const keyboardDidHideListener = Keyboard.addListener('keyboardDidHide', () => {
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 100,
        easing: EasingNode.linear,
        //useNativeDriver: true,
      }).start();
    });

    return () => {
      !!keyboardDidShowListener && keyboardDidShowListener.remove();
      !!keyboardDidHideListener && keyboardDidHideListener.remove();
    };
  }, [slideAnim, titleViewHeight]);

  useEffect(() => {
    if (info.latestBlock) {
      setLatestBlock(info.latestBlock);
    } else {
      (async () => {
        const resp: string = await RPCModule.getLatestBlock(server);
        //console.log(resp);
        if (resp && !resp.toLowerCase().startsWith('error')) {
          setLatestBlock(Number(resp));
        } else {
          //console.log('error latest block', resp);
        }
      })();
    }
  }, [info.latestBlock, latestBlock, server]);

  useEffect(() => {
    // TODO: Here I assume this value is undefined because the App
    // doesn't connect to the server yet. We need to change that in some
    // future. It's not an easy task right now.
    if (info.currencyName) {
      setCurrencyName(info.currencyName);
    } else {
      setCurrencyName('ZEC');
    }
  }, [info.currencyName, currencyName]);

  const okButton = async () => {
    if (!netInfo.isConnected) {
      Toast.show(translate('loadedapp.connection-error') as string, Toast.LONG);
      return;
    }
    const valid = await validateKey(privKeyText);
    if (!valid) {
      return;
    }
    onClickOK(privKeyText, Number(birthday));
  };

  const validateKey = async (scannedKey: string): Promise<boolean> => {
    const result: string = await RPCModule.execute('parse_viewkey', scannedKey);
    if (result) {
      if (result.toLowerCase().startsWith('error')) {
        Toast.show(`${translate('scanner.noviewkey-error')}`, Toast.LONG);
        return false;
      }
    } else {
      Toast.show(`${translate('scanner.noviewkey-error')}`, Toast.LONG);
      return false;
    }
    // TODO verify that JSON don't fail.
    const resultJSON: RPCParseViewKeyType = await JSON.parse(result);

    console.log('parse ufvk', scannedKey, resultJSON, currencyName);

    const valid =
      resultJSON.status === 'success' &&
      ((!!currencyName &&
        currencyName === 'ZEC' &&
        !!resultJSON.chain_name &&
        (resultJSON.chain_name.toLowerCase() === 'main' || resultJSON.chain_name.toLowerCase() === 'mainnet')) ||
        (!!currencyName &&
          currencyName !== 'ZEC' &&
          !!resultJSON.chain_name &&
          (resultJSON.chain_name.toLowerCase() === 'test' ||
            resultJSON.chain_name.toLowerCase() === 'testnet' ||
            resultJSON.chain_name.toLowerCase() === 'regtest')));

    if (valid) {
      return true;
    } else {
      Toast.show(`${translate('scanner.noviewkey-error')}`, Toast.LONG);
      return false;
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
      <Modal
        animationType="slide"
        transparent={false}
        visible={qrcodeModalVisible}
        onRequestClose={() => setQrcodeModalVisible(false)}>
        <ScannerKey setPrivKeyText={setPrivKeyText} closeModal={() => setQrcodeModalVisible(false)} />
      </Modal>

      <Animated.View style={{ marginTop: slideAnim }}>
        <View
          onLayout={e => {
            const { height } = e.nativeEvent.layout;
            setTitleViewHeight(height);
          }}>
          <Header
            title={translate('import.title') as string}
            noBalance={true}
            noSyncingStatus={true}
            noDrawMenu={true}
            noPrivacy={true}
            translate={translate}
            dimensions={dimensions}
            netInfo={netInfo}
          />
        </View>
      </Animated.View>

      <ScrollView
        style={{ maxHeight: '85%' }}
        contentContainerStyle={{
          flexDirection: 'column',
          alignItems: 'stretch',
          justifyContent: 'flex-start',
        }}>
        <FadeText style={{ marginTop: 0, padding: 20, textAlign: 'center' }}>
          {translate('import.key-label') as string}
        </FadeText>
        <View
          style={{
            margin: 10,
            padding: 10,
            borderWidth: 1,
            borderRadius: 10,
            borderColor: colors.text,
            maxHeight: '40%',
          }}>
          <View
            accessible={true}
            accessibilityLabel={translate('seed.seed-acc') as string}
            style={{
              margin: 0,
              borderWidth: 1,
              borderRadius: 10,
              borderColor: colors.text,
              maxWidth: '100%',
              maxHeight: '70%',
              minWidth: '95%',
              minHeight: 100,
            }}>
            <TextInput
              multiline
              style={{
                color: colors.text,
                fontWeight: '600',
                fontSize: 16,
                minWidth: '95%',
                minHeight: 100,
                marginLeft: 5,
                backgroundColor: 'transparent',
              }}
              value={privKeyText}
              onChangeText={setPrivKeyText}
              editable={true}
            />
          </View>
          <TouchableOpacity
            style={{ alignItems: 'center' }}
            onPress={() => {
              setQrcodeModalVisible(true);
            }}>
            <FontAwesomeIcon style={{ margin: 5 }} size={50} icon={faQrcode} color={colors.border} />
          </TouchableOpacity>
        </View>

        <View style={{ marginTop: 10, alignItems: 'center' }}>
          <FadeText>{translate('import.birthday') as string}</FadeText>
          <FadeText style={{ textAlign: 'center' }}>
            {translate('seed.birthday-no-readonly') + ' (1, ' + (latestBlock ? latestBlock.toString() : '--') + ')'}
          </FadeText>

          <View
            accessible={true}
            accessibilityLabel={translate('import.birthday-acc') as string}
            style={{
              margin: 10,
              borderWidth: 1,
              borderRadius: 10,
              borderColor: colors.text,
              width: '30%',
              maxWidth: '40%',
              maxHeight: 48,
              minWidth: '20%',
              minHeight: 48,
            }}>
            <TextInput
              placeholder={'#'}
              placeholderTextColor={colors.placeholder}
              style={{
                color: colors.text,
                fontWeight: '600',
                fontSize: 18,
                minWidth: '20%',
                minHeight: 48,
                marginLeft: 5,
                backgroundColor: 'transparent',
              }}
              value={birthday}
              onChangeText={(text: string) => {
                if (isNaN(Number(text))) {
                  setBirthday('');
                } else if (Number(text) <= 0 || Number(text) > latestBlock) {
                  setBirthday('');
                } else {
                  setBirthday(Number(text.replace('.', '').replace(',', '')).toFixed(0));
                }
              }}
              editable={latestBlock ? true : false}
              keyboardType="numeric"
            />
          </View>

          <RegText style={{ margin: 20, marginBottom: 30 }}>{translate('import.text') as string}</RegText>
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
        <Button type="Primary" title={translate('import.button') as string} onPress={okButton} />
        <Button
          type="Secondary"
          title={translate('cancel') as string}
          style={{ marginLeft: 10 }}
          onPress={onClickCancel}
        />
      </View>
    </SafeAreaView>
  );
};

export default ImportKey;
