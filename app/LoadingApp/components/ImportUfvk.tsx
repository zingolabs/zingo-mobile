/* eslint-disable react-native/no-inline-styles */
import React, { useContext, useEffect, useState } from 'react';
import {
  View,
  ScrollView,
  TouchableOpacity,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Modal,
  Keyboard,
} from 'react-native';

import { useTheme } from '@react-navigation/native';
import { faQrcode, faXmark } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import FadeText from '../../../components/Components/FadeText';
import RegText from '../../../components/Components/RegText';
import Button from '../../../components/Components/Button';
import ScannerUfvk from './ScannerUfvk';
import { ThemeType } from '../../types';
import { ContextAppLoading } from '../../context';
import Header from '../../../components/Header';
import RPCModule from '../../RPCModule';
import moment from 'moment';
import 'moment/locale/es';
import 'moment/locale/pt';
import 'moment/locale/ru';
import 'moment/locale/tr';
import { ButtonTypeEnum, GlobalConst, ScreenEnum, SelectServerEnum } from '../../AppState';
import Snackbars from '../../../components/Components/Snackbars';
import { ToastProvider } from 'react-native-toastier';
// @ts-ignore
//import BarcodeZxingScan from 'react-native-barcode-zxing-scan';

type ImportUfvkProps = {
  onClickCancel: () => void;
  onClickOK: (keyText: string, birthday: number) => void;
};
const ImportUfvk: React.FunctionComponent<ImportUfvkProps> = ({ onClickCancel, onClickOK }) => {
  const context = useContext(ContextAppLoading);
  const { translate, netInfo, server, mode, addLastSnackbar, language, selectServer, snackbars, removeFirstSnackbar } = context;
  const { colors } = useTheme()  as ThemeType;
  moment.locale(language);
  const screenName = ScreenEnum.ImportUfvk;

  const [seedufvkText, setSeedufvkText] = useState<string>('');
  const [birthday, setBirthday] = useState<string>('');
  const [qrcodeModalVisible, setQrcodeModalVisible] = useState<boolean>(false);
  const [latestBlock, setLatestBlock] = useState<number>(0);

  useEffect(() => {
    if (!netInfo.isConnected || selectServer !== SelectServerEnum.offline) {
      (async () => {
        const resp: string = await RPCModule.getLatestBlockServerInfo(server.uri);
        //console.log(resp);
        if (resp && !resp.toLowerCase().startsWith(GlobalConst.error)) {
          setLatestBlock(Number(resp));
        } else {
          //console.log('error latest block', resp);
        }
      })();
    }
  }, [server, selectServer, netInfo.isConnected]);

  useEffect(() => {
    if (seedufvkText) {
      if (
        seedufvkText.toLowerCase().startsWith(GlobalConst.uview) ||
        seedufvkText.toLowerCase().startsWith(GlobalConst.utestview)
      ) {
        // if it is a ufvk
        const seedufvkTextArray: string[] = seedufvkText.replaceAll('\n', ' ').trim().replaceAll('  ', ' ').split(' ');
        //console.log(seedufvkTextArray);
        // if the ufvk have 2 -> means it is a copy/paste from the stored ufvk in the device.
        if (seedufvkTextArray.length === 2) {
          // if the last word is a number -> move it to the birthday field
          const lastWord: string = seedufvkTextArray[seedufvkTextArray.length - 1];
          const possibleBirthday: number | null = isNaN(Number(lastWord)) ? null : Number(lastWord);
          if (possibleBirthday && !birthday) {
            setBirthday(possibleBirthday.toString());
            setSeedufvkText(seedufvkTextArray.slice(0, 1).join(' '));
          }
        }
      } else {
        // if it is a seed
        const seedufvkTextArray: string[] = seedufvkText.replaceAll('\n', ' ').trim().replaceAll('  ', ' ').split(' ');
        //console.log(seedufvkTextArray);
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
    }
    // only if seedufvk changed.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [seedufvkText]);

  const okButton = async () => {
    if (!netInfo.isConnected || selectServer === SelectServerEnum.offline) {
      addLastSnackbar({ message: translate('loadedapp.connection-error') as string, screenName: [screenName] });
      return;
    }
    onClickOK(seedufvkText.trimEnd().trimStart(), Number(birthday));
    Keyboard.dismiss();
  };

  const showQrcodeModalVisible = () => {
    //if (Platform.OS === GlobalConst.platformOSandroid) {
    //  BarcodeZxingScan.showQrReader(async (a: string) => {
    //    setSeedufvkText(a);
    //  });
    //} else {
      setQrcodeModalVisible(true);
    //}
  };

  return (
    <ToastProvider>
      <Snackbars
        snackbars={snackbars}
        removeFirstSnackbar={removeFirstSnackbar}
        screenName={screenName}
      />

      <KeyboardAvoidingView
        behavior={Platform.OS === GlobalConst.platformOSios ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === GlobalConst.platformOSios ? 10 : 0}
        style={{
          flex: 1,
          backgroundColor: colors.background,
        }}
      >
        <View
          style={{
            flex: 1,
            backgroundColor: colors.background,
          }}>
          <Modal
            animationType="slide"
            transparent={false}
            visible={qrcodeModalVisible}
            onRequestClose={() => setQrcodeModalVisible(false)}>
            <ScannerUfvk setUfvkText={setSeedufvkText} closeModal={() => setQrcodeModalVisible(false)} />
          </Modal>
          <Header
            title={translate('import.title') as string}
            screenName={screenName}
            noBalance={true}
            noSyncingStatus={true}
            noDrawMenu={true}
            noPrivacy={true}
            noUfvkIcon={true}
            translate={translate}
            netInfo={netInfo}
            mode={mode}
            closeScreen={onClickCancel}
          />
          <ScrollView
            keyboardShouldPersistTaps="handled"
            style={{ height: '80%', maxHeight: '80%' }}
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
                  showQrcodeModalVisible();
                }}>
                <FontAwesomeIcon size={35} icon={faQrcode} color={colors.border} />
              </TouchableOpacity>
            </View>

            <View style={{ marginTop: 10, alignItems: 'center' }}>
              <FadeText>{translate('import.birthday') as string}</FadeText>
              {selectServer !== SelectServerEnum.offline && (
                <FadeText style={{ textAlign: 'center' }}>
                  {translate('seed.birthday-no-readonly') + ' (1, ' + (latestBlock ? latestBlock.toString() : '--') + ')'}
                </FadeText>
              )}
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
                    } else if (
                      Number(text) <= 0 ||
                      (Number(text) > latestBlock && selectServer !== SelectServerEnum.offline)
                    ) {
                      setBirthday('');
                    } else {
                      setBirthday(Number(text.replace('.', '').replace(',', '')).toFixed(0));
                    }
                  }}
                  editable={latestBlock ? true : selectServer !== SelectServerEnum.offline ? false : true}
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
                okButton();
              }}
            />
          </View>
        </View>
      </KeyboardAvoidingView>
    </ToastProvider>
  );
};

export default ImportUfvk;
