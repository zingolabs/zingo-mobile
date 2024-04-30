/* eslint-disable react-native/no-inline-styles */
import React, { useState, useEffect, useContext } from 'react';
import { View, SafeAreaView, ScrollView, TouchableOpacity, Text, TextInput, Keyboard, Alert } from 'react-native';
import { useTheme } from '@react-navigation/native';
import Clipboard from '@react-native-community/clipboard';
import Animated, { Easing, useSharedValue, withTiming } from 'react-native-reanimated';

import RegText from '../Components/RegText';
import FadeText from '../Components/FadeText';
import Button from '../Components/Button';
import { ThemeType } from '../../app/types';
import { ContextAppLoaded, ContextAppLoading } from '../../app/context';
import {
  InfoType,
  LanguageEnum,
  NetInfoType,
  ServerType,
  TranslateType,
  WalletType,
  ModeEnum,
  ChainNameEnum,
  SnackbarDurationEnum,
  SeedActionEnum,
  SettingsNameEnum,
  SnackbarType,
  ButtonTypeEnum,
  GlobalConst,
} from '../../app/AppState';
import RPCModule from '../../app/RPCModule';
import RPC from '../../app/rpc';
import Header from '../Header';
import Utils from '../../app/utils';
import { createAlert } from '../../app/createAlert';
import SettingsFileImpl from '../Settings/SettingsFileImpl';
import moment from 'moment';
import 'moment/locale/es';
import 'moment/locale/pt';
import 'moment/locale/ru';

import { faXmark } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';

type TextsType = {
  new: string[];
  change: string[];
  server: string[];
  view: string[];
  restore: string[];
  backup: string[];
};

type SeedProps = {
  onClickOK: (seedPhrase: string, birthdayNumber: number) => void;
  onClickCancel: () => void;
  action: SeedActionEnum;
  set_privacy_option: (name: SettingsNameEnum.privacy, value: boolean) => Promise<void>;
};
const Seed: React.FunctionComponent<SeedProps> = ({ onClickOK, onClickCancel, action, set_privacy_option }) => {
  const contextLoaded = useContext(ContextAppLoaded);
  const contextLoading = useContext(ContextAppLoading);
  let wallet: WalletType,
    translate: (key: string) => TranslateType,
    info: InfoType,
    server: ServerType,
    netInfo: NetInfoType,
    privacy: boolean,
    mode: ModeEnum.basic | ModeEnum.advanced,
    setBackgroundError: (title: string, error: string) => void,
    addLastSnackbar: (snackbar: SnackbarType) => void,
    language: LanguageEnum;
  if (action === SeedActionEnum.new || action === SeedActionEnum.restore) {
    wallet = contextLoading.wallet;
    translate = contextLoading.translate;
    info = contextLoading.info;
    server = contextLoading.server;
    netInfo = contextLoading.netInfo;
    privacy = contextLoading.privacy;
    mode = contextLoading.mode;
    setBackgroundError = contextLoading.setBackgroundError;
    addLastSnackbar = contextLoading.addLastSnackbar;
    language = contextLoading.language;
  } else {
    wallet = contextLoaded.wallet;
    translate = contextLoaded.translate;
    info = contextLoaded.info;
    server = contextLoaded.server;
    netInfo = contextLoaded.netInfo;
    privacy = contextLoaded.privacy;
    mode = contextLoaded.mode;
    setBackgroundError = contextLoaded.setBackgroundError;
    addLastSnackbar = contextLoaded.addLastSnackbar;
    language = contextLoaded.language;
  }

  const { colors } = useTheme() as unknown as ThemeType;
  moment.locale(language);

  const [seedPhrase, setSeedPhrase] = useState<string>('');
  const [birthdayNumber, setBirthdayNumber] = useState<string>('');
  const [times, setTimes] = useState<number>(0);
  const [texts, setTexts] = useState<TextsType>({} as TextsType);
  const [readOnly, setReadOnly] = useState<boolean>(true);
  const [titleViewHeight, setTitleViewHeight] = useState<number>(0);
  const [latestBlock, setLatestBlock] = useState<number>(0);
  const [expandSeed, setExpandSeed] = useState<boolean>(false);
  const [expandBirthday, setExpandBithday] = useState<boolean>(false);
  const [basicFirstViewSeed, setBasicFirstViewSeed] = useState<boolean>(true);

  const slideAnim = useSharedValue(0);

  useEffect(() => {
    (async () => {
      setBasicFirstViewSeed((await SettingsFileImpl.readSettings()).basicFirstViewSeed);
    })();
  }, []);

  useEffect(() => {
    if (privacy) {
      setExpandSeed(false);
      setExpandBithday(false);
    } else {
      setExpandSeed(true);
      setExpandBithday(true);
    }
  }, [privacy]);

  useEffect(() => {
    if (!expandSeed && !privacy) {
      setExpandSeed(true);
    }
  }, [expandSeed, privacy]);

  useEffect(() => {
    if (!expandBirthday && !privacy) {
      setExpandBithday(true);
    }
  }, [expandBirthday, privacy]);

  useEffect(() => {
    const buttonTextsArray = translate('seed.buttontexts');
    let buttonTexts = {} as TextsType;
    if (typeof buttonTextsArray === 'object') {
      buttonTexts = buttonTextsArray as TextsType;
      setTexts(buttonTexts);
    }
    setReadOnly(
      action === SeedActionEnum.new ||
        action === SeedActionEnum.view ||
        action === SeedActionEnum.change ||
        action === SeedActionEnum.backup ||
        action === SeedActionEnum.server,
    );
    setTimes(
      action === SeedActionEnum.change || action === SeedActionEnum.backup || action === SeedActionEnum.server ? 1 : 0,
    );
    setSeedPhrase(wallet.seed || '');
    setBirthdayNumber((wallet.birthday && wallet.birthday.toString()) || '');
  }, [action, wallet.seed, wallet.birthday, wallet, translate]);

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
    if (action === SeedActionEnum.restore) {
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
            if (setBackgroundError && addLastSnackbar) {
              createAlert(
                setBackgroundError,
                addLastSnackbar,
                translate('loadingapp.creatingwallet-label') as string,
                resp,
              );
            }
            onClickCancel();
          }
        })();
      }
    }
  }, [
    action,
    addLastSnackbar,
    info.latestBlock,
    latestBlock,
    onClickCancel,
    server.uri,
    setBackgroundError,
    translate,
  ]);

  // because this screen is fired from more places than the menu.
  useEffect(() => {
    if (action !== SeedActionEnum.new && action !== SeedActionEnum.restore) {
      (async () => await RPC.rpc_setInterruptSyncAfterBatch(GlobalConst.false))();
    }
  }, [action]);

  const onPressOK = () => {
    Alert.alert(
      !!texts && !!texts[action] ? texts[action][3] : '',
      (action === SeedActionEnum.change
        ? (translate('seed.change-warning') as string)
        : action === SeedActionEnum.backup
        ? (translate('seed.backup-warning') as string)
        : action === SeedActionEnum.server
        ? (translate('seed.server-warning') as string)
        : '') +
        (server.chain_name !== ChainNameEnum.mainChainName &&
        (action === SeedActionEnum.change || action === SeedActionEnum.server)
          ? '\n' + (translate('seed.mainnet-warning') as string)
          : ''),
      [
        {
          text: translate('confirm') as string,
          onPress: () => {
            if (action === SeedActionEnum.restore) {
              // waiting while closing the keyboard, just in case.
              setTimeout(async () => {
                onClickOK(seedPhrase, Number(birthdayNumber));
              }, 100);
            } else {
              onClickOK(seedPhrase, Number(birthdayNumber));
            }
          },
        },
        { text: translate('cancel') as string, onPress: () => onClickCancel(), style: 'cancel' },
      ],
      { cancelable: false, userInterfaceStyle: 'light' },
    );
  };

  //console.log('=================================');
  //console.log(wallet.seed, wallet.birthday);
  //console.log(seedPhrase, birthdayNumber);
  //console.log(latestBlock);

  return (
    <SafeAreaView
      style={{
        display: 'flex',
        justifyContent: 'flex-start',
        alignItems: 'stretch',
        height: '100%',
        backgroundColor: colors.background,
      }}>
      <Animated.View style={{ marginTop: slideAnim }}>
        <View
          onLayout={e => {
            const { height } = e.nativeEvent.layout;
            setTitleViewHeight(height);
          }}>
          <Header
            title={translate('seed.title') + ' (' + translate(`seed.${action}`) + ')'}
            noBalance={true}
            noSyncingStatus={true}
            noDrawMenu={true}
            set_privacy_option={set_privacy_option}
            translate={translate}
            netInfo={netInfo}
            mode={mode}
            addLastSnackbar={addLastSnackbar}
            receivedLegend={action === SeedActionEnum.view ? !basicFirstViewSeed : false}
          />
        </View>
      </Animated.View>

      <View style={{ width: '100%', height: 1, backgroundColor: colors.primary }} />

      <ScrollView
        keyboardShouldPersistTaps="handled"
        style={{ maxHeight: '85%' }}
        contentContainerStyle={{
          flexDirection: 'column',
          alignItems: 'stretch',
          justifyContent: 'flex-start',
        }}>
        <RegText style={{ marginTop: 0, padding: 20, textAlign: 'center', fontWeight: '900' }}>
          {readOnly
            ? action === SeedActionEnum.backup || action === SeedActionEnum.change || action === SeedActionEnum.server
              ? (translate(`seed.text-readonly-${action}`) as string)
              : (translate('seed.text-readonly') as string)
            : (translate('seed.text-no-readonly') as string)}
        </RegText>
        <View
          style={{
            margin: 10,
            padding: 10,
            borderWidth: 1,
            borderRadius: 10,
            borderColor: colors.text,
            maxHeight: '45%',
          }}>
          {readOnly ? (
            <TouchableOpacity
              onPress={() => {
                if (seedPhrase) {
                  Clipboard.setString(seedPhrase);
                  if (addLastSnackbar) {
                    addLastSnackbar({
                      message: translate('seed.tapcopy-seed-message') as string,
                      duration: SnackbarDurationEnum.short,
                    });
                  }
                  setExpandSeed(true);
                  if (privacy) {
                    setTimeout(() => {
                      setExpandSeed(false);
                    }, 5000);
                  }
                }
              }}>
              <RegText
                color={colors.text}
                style={{
                  textAlign: 'center',
                }}>
                {!expandSeed ? Utils.trimToSmall(seedPhrase, 5) : seedPhrase}
              </RegText>
            </TouchableOpacity>
          ) : (
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <View
                accessible={true}
                accessibilityLabel={translate('seed.seed-acc') as string}
                style={{
                  margin: 0,
                  borderWidth: 1,
                  borderRadius: 10,
                  borderColor: colors.text,
                  width: 'auto',
                  flex: 1,
                  minHeight: 100,
                }}>
                <TextInput
                  testID="seed.seedinput"
                  placeholder={translate('seed.seedplaceholder') as string}
                  placeholderTextColor={colors.placeholder}
                  multiline
                  style={{
                    color: colors.text,
                    fontWeight: '600',
                    fontSize: 16,
                    minHeight: 100,
                    marginLeft: 5,
                    backgroundColor: 'transparent',
                    textAlignVertical: 'top',
                  }}
                  value={seedPhrase}
                  onChangeText={(text: string) => setSeedPhrase(text)}
                  editable={true}
                />
              </View>
              {seedPhrase && (
                <TouchableOpacity
                  onPress={() => {
                    setSeedPhrase('');
                  }}>
                  <FontAwesomeIcon style={{ marginLeft: 5 }} size={25} icon={faXmark} color={colors.primaryDisabled} />
                </TouchableOpacity>
              )}
            </View>
          )}
          {action !== SeedActionEnum.restore && (
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <View />
              <TouchableOpacity
                onPress={() => {
                  if (seedPhrase) {
                    Clipboard.setString(seedPhrase);
                    if (addLastSnackbar) {
                      addLastSnackbar({
                        message: translate('seed.tapcopy-seed-message') as string,
                        duration: SnackbarDurationEnum.short,
                      });
                    }
                  }
                }}>
                <Text
                  style={{
                    color: colors.text,
                    textDecorationLine: 'underline',
                    padding: 10,
                    marginTop: 0,
                    textAlign: 'center',
                    minHeight: 48,
                  }}>
                  {translate('seed.tapcopy') as string}
                </Text>
              </TouchableOpacity>
              <View />
            </View>
          )}
        </View>

        <View style={{ marginTop: 10, alignItems: 'center' }}>
          <FadeText style={{ textAlign: 'center' }}>{translate('seed.birthday-readonly') as string}</FadeText>
          {readOnly ? (
            <TouchableOpacity
              onPress={() => {
                if (birthdayNumber) {
                  Clipboard.setString(birthdayNumber);
                  if (addLastSnackbar) {
                    addLastSnackbar({
                      message: translate('seed.tapcopy-birthday-message') as string,
                      duration: SnackbarDurationEnum.short,
                    });
                  }
                  setExpandBithday(true);
                  if (privacy) {
                    setTimeout(() => {
                      setExpandBithday(false);
                    }, 5000);
                  }
                }
              }}>
              <RegText color={colors.text} style={{ textAlign: 'center' }}>
                {!expandBirthday ? Utils.trimToSmall(birthdayNumber, 1) : birthdayNumber}
              </RegText>
            </TouchableOpacity>
          ) : (
            <>
              <FadeText style={{ textAlign: 'center' }}>
                {translate('seed.birthday-no-readonly') + ' (1, ' + (latestBlock ? latestBlock.toString() : '--') + ')'}
              </FadeText>
              <View
                accessible={true}
                accessibilityLabel={translate('seed.birthday-acc') as string}
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
                  testID="seed.birthdayinput"
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
                  value={birthdayNumber}
                  onChangeText={(text: string) => {
                    if (isNaN(Number(text))) {
                      setBirthdayNumber('');
                    } else if (Number(text) <= 0 || Number(text) > latestBlock) {
                      setBirthdayNumber('');
                    } else {
                      setBirthdayNumber(Number(text.replace('.', '').replace(',', '')).toFixed(0));
                    }
                  }}
                  editable={latestBlock ? true : false}
                  keyboardType="numeric"
                />
              </View>
            </>
          )}
        </View>
        <View style={{ marginBottom: 30 }} />
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
          testID="seed.button.OK"
          type={mode === ModeEnum.basic ? ButtonTypeEnum.Secondary : ButtonTypeEnum.Primary}
          style={{
            backgroundColor: mode === ModeEnum.basic ? colors.background : colors.primary,
          }}
          title={
            mode === ModeEnum.basic
              ? !basicFirstViewSeed
                ? (translate('seed.showtransactions') as string)
                : (translate('close') as string)
              : !!texts && !!texts[action]
              ? texts[action][times]
              : ''
          }
          onPress={async () => {
            if (!seedPhrase) {
              return;
            }
            if (!netInfo.isConnected && (times > 0 || action === SeedActionEnum.restore)) {
              if (addLastSnackbar) {
                addLastSnackbar({ message: translate('loadedapp.connection-error') as string });
              }
              return;
            }
            // the user just see the seed for the first time.
            if (mode === ModeEnum.basic && !basicFirstViewSeed) {
              await SettingsFileImpl.writeSettings(SettingsNameEnum.basicFirstViewSeed, true);
            }
            if (times === 0) {
              Keyboard.dismiss();
              onClickOK(seedPhrase, Number(birthdayNumber));
            } else if (times === 1) {
              onPressOK();
            }
          }}
        />
        {(times > 0 || action === SeedActionEnum.restore) && (
          <Button
            type={ButtonTypeEnum.Secondary}
            title={translate('cancel') as string}
            style={{ marginLeft: 10 }}
            onPress={onClickCancel}
          />
        )}
      </View>
    </SafeAreaView>
  );
};

export default Seed;
