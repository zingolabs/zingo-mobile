/* eslint-disable react-native/no-inline-styles */
import React, { useContext, useEffect, useState } from 'react';
import { View, ScrollView, SafeAreaView, TouchableOpacity, Modal, TextInput, Keyboard } from 'react-native';
import { useTheme } from '@react-navigation/native';
import { faQrcode, faXmark } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import Animated, { Easing, useSharedValue, withTiming } from 'react-native-reanimated';

import FadeText from '../Components/FadeText';
import RegText from '../Components/RegText';
import Button from '../Components/Button';
import ScannerUfvk from './components/ScannerUfvk';
import { ThemeType } from '../../app/types';
import { ContextAppLoading } from '../../app/context';
import Header from '../Header';
import RPCModule from '../../app/RPCModule';
import { RPCParseViewKeyType } from '../../app/rpc/types/RPCParseViewKeyType';
import moment from 'moment';
import 'moment/locale/es';
import 'moment/locale/pt';
import 'moment/locale/ru';
import { ButtonTypeEnum, CommandEnum, GlobalConst } from '../../app/AppState';
import { RPCParseViewKeyStatusEnum } from '../../app/rpc/enums/RPCParseViewKeyStatusEnum';

type ImportUfvkProps = {
  onClickCancel: () => void;
  onClickOK: (keyText: string, birthday: number) => Promise<void>;
};
const ImportUfvk: React.FunctionComponent<ImportUfvkProps> = ({ onClickCancel, onClickOK }) => {
  const context = useContext(ContextAppLoading);
  const { translate, netInfo, info, server, mode, addLastSnackbar, language } = context;
  const { colors } = useTheme() as unknown as ThemeType;
  moment.locale(language);

  const [seedufvkText, setSeedufvkText] = useState<string>('');
  const [birthday, setBirthday] = useState<string>('');
  const [qrcodeModalVisible, setQrcodeModalVisible] = useState<boolean>(false);
  const [titleViewHeight, setTitleViewHeight] = useState<number>(0);
  const [latestBlock, setLatestBlock] = useState<number>(0);

  const slideAnim = useSharedValue(0);

  useEffect(() => {
    const keyboardDidShowListener = Keyboard.addListener('keyboardDidShow', () => {
      slideAnim.value = withTiming(0 - titleViewHeight + 25, { duration: 100, easing: Easing.linear });
    });
    const keyboardDidHideListener = Keyboard.addListener('keyboardDidHide', () => {
      slideAnim.value = withTiming(0, { duration: 100, easing: Easing.linear });
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
        const resp: string = await RPCModule.getLatestBlock(server.uri);
        //console.log(resp);
        if (resp && !resp.toLowerCase().startsWith(GlobalConst.error)) {
          setLatestBlock(Number(resp));
        } else {
          //console.log('error latest block', resp);
        }
      })();
    }
  }, [info.latestBlock, latestBlock, server]);

  useEffect(() => {
    if (seedufvkText) {
      const seedufvkTextArray: string[] = seedufvkText.replaceAll('\n', ' ').trim().replaceAll('  ', ' ').split(' ');
      console.log(seedufvkTextArray);
      // if the seed have 25 -> means it is a copy/paste from the stored seed in the device.
      if (seedufvkTextArray.length === 25) {
        // if the last word is a number -> move it to the birthday field
        const lastWord: string = seedufvkTextArray[seedufvkTextArray.length - 1];
        const possibleBirthday: number | null = isNaN(Number(lastWord)) ? null : Number(lastWord);
        if (possibleBirthday && !birthday) {
          setBirthday(possibleBirthday.toString());
          setSeedufvkText(seedufvkTextArray.slice(0, 24).join(' '));
        }
      }
    }
    // only if seedufvk changed.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [seedufvkText]);

  const okButton = async () => {
    if (!netInfo.isConnected) {
      addLastSnackbar({ message: translate('loadedapp.connection-error') as string });
      return;
    }
    onClickOK(seedufvkText.trimEnd().trimStart(), Number(birthday));
  };

  // zingolib interfase have no way to initialize a `lightclient` with no action associated...
  // the validation of the ufvk will be when we try to `restore from ufvk'...
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const validateKey = async (scannedKey: string): Promise<boolean> => {
    const result: string = await RPCModule.execute(CommandEnum.parseViewkey, scannedKey);
    //console.log(result);
    if (result) {
      if (result.toLowerCase().startsWith(GlobalConst.error)) {
        addLastSnackbar({ message: `${translate('scanner.noviewkey-error')}` });
        return false;
      }
    } else {
      addLastSnackbar({ message: `${translate('scanner.noviewkey-error')}` });
      return false;
    }
    let resultJSON = {} as RPCParseViewKeyType;
    try {
      resultJSON = await JSON.parse(result);
    } catch (e) {
      addLastSnackbar({ message: `${translate('scanner.noviewkey-error')}` });
      return false;
    }

    //console.log('parse ufvk', scannedKey, resultJSON);

    const valid =
      resultJSON.status === RPCParseViewKeyStatusEnum.successViewKeyParse && resultJSON.chain_name === server.chainName;

    if (valid) {
      return true;
    } else {
      addLastSnackbar({ message: `${translate('scanner.noviewkey-error')}` });
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
        <ScannerUfvk setUfvkText={setSeedufvkText} closeModal={() => setQrcodeModalVisible(false)} />
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
            netInfo={netInfo}
            mode={mode}
          />
        </View>
      </Animated.View>

      <ScrollView
        keyboardShouldPersistTaps="handled"
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
            flexDirection: 'row',
            justifyContent: 'space-between',
          }}>
          <View
            accessible={true}
            accessibilityLabel={translate('seed.seed-acc') as string}
            style={{
              marginRight: 5,
              borderWidth: 1,
              borderRadius: 10,
              borderColor: colors.text,
              width: 'auto',
              flex: 1,
              justifyContent: 'center',
            }}>
            <TextInput
              testID="import.seedufvkinput"
              multiline
              style={{
                color: colors.text,
                fontWeight: '600',
                fontSize: 16,
                minHeight: 100,
                marginHorizontal: 5,
                backgroundColor: 'transparent',
                textAlignVertical: 'top',
              }}
              value={seedufvkText}
              onChangeText={setSeedufvkText}
              editable={true}
            />
          </View>
          {seedufvkText && (
            <TouchableOpacity
              onPress={() => {
                setSeedufvkText('');
              }}>
              <FontAwesomeIcon style={{ margin: 0 }} size={25} icon={faXmark} color={colors.primaryDisabled} />
            </TouchableOpacity>
          )}
          <TouchableOpacity
            onPress={() => {
              setQrcodeModalVisible(true);
            }}>
            <FontAwesomeIcon size={35} icon={faQrcode} color={colors.border} />
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
              testID="import.birthdayinput"
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
        <Button
          testID="import.button.ok"
          type={ButtonTypeEnum.Primary}
          title={translate('import.button') as string}
          onPress={() => {
            Keyboard.dismiss();
            okButton();
          }}
        />
        <Button
          testID="import.button.cancel"
          type={ButtonTypeEnum.Secondary}
          title={translate('cancel') as string}
          style={{ marginLeft: 10 }}
          onPress={onClickCancel}
        />
      </View>
    </SafeAreaView>
  );
};

export default ImportUfvk;
