/* eslint-disable react-native/no-inline-styles */
import React, { useContext, useEffect, useRef, useState } from 'react';
import { View, ScrollView, SafeAreaView, TouchableOpacity, TextInput, Keyboard } from 'react-native';
import { useTheme } from '@react-navigation/native';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { faDotCircle } from '@fortawesome/free-solid-svg-icons';
import { faCircle as farCircle } from '@fortawesome/free-regular-svg-icons';
import Toast from 'react-native-simple-toast';
import Animated, { EasingNode } from 'react-native-reanimated';

import RegText from '../Components/RegText';
import FadeText from '../Components/FadeText';
import BoldText from '../Components/BoldText';
import { checkServerURI, parseServerURI, serverUris } from '../../app/uris';
import Button from '../Components/Button';
import { ThemeType } from '../../app/types';
import { ContextAppLoaded } from '../../app/context';
import moment from 'moment';
import 'moment/locale/es';
import Header from '../Header';
import { ServerType } from '../../app/AppState';
import { isEqual } from 'lodash';
import ChainTypeToggle from '../Components/ChainTypeToggle';

type SettingsProps = {
  closeModal: () => void;
  set_wallet_option: (name: string, value: string) => Promise<void>;
  set_server_option: (
    name: 'server',
    value: ServerType,
    toast: boolean,
    same_server_chain_name: boolean,
  ) => Promise<void>;
  set_currency_option: (name: 'currency', value: string) => Promise<void>;
  set_language_option: (name: 'language', value: string, reset: boolean) => Promise<void>;
  set_sendAll_option: (name: 'sendAll', value: boolean) => Promise<void>;
  set_privacy_option: (name: 'privacy', value: boolean) => Promise<void>;
  set_mode_option: (name: 'mode', value: string) => Promise<void>;
};

type Options = {
  value: string;
  text: string;
};

const Settings: React.FunctionComponent<SettingsProps> = ({
  set_wallet_option,
  set_server_option,
  set_currency_option,
  set_language_option,
  set_sendAll_option,
  set_privacy_option,
  set_mode_option,
  closeModal,
}) => {
  const context = useContext(ContextAppLoaded);
  const {
    walletSettings,
    translate,
    server: serverContext,
    currency: currencyContext,
    language: languageContext,
    sendAll: sendAllContext,
    privacy: privacyContext,
    mode: modeContext,
    netInfo,
  } = context;

  const memosArray = translate('settings.memos');
  //console.log(memosArray, typeof memosArray);
  let MEMOS: Options[] = [];
  if (typeof memosArray === 'object') {
    MEMOS = memosArray as Options[];
  }

  const currenciesArray = translate('settings.currencies');
  let CURRENCIES: Options[] = [];
  if (typeof currenciesArray === 'object') {
    CURRENCIES = currenciesArray as Options[];
  }

  const languagesArray = translate('settings.languages');
  let LANGUAGES: Options[] = [];
  if (typeof languagesArray === 'object') {
    LANGUAGES = languagesArray as Options[];
  }

  const sendAllsArray = translate('settings.sendalls');
  let SENDALLS: Options[] = [];
  if (typeof sendAllsArray === 'object') {
    SENDALLS = sendAllsArray as Options[];
  }

  const privacysArray = translate('settings.privacys');
  let PRIVACYS: Options[] = [];
  if (typeof privacysArray === 'object') {
    PRIVACYS = privacysArray as Options[];
  }

  const modesArray = translate('settings.modes');
  let MODES: Options[] = [];
  if (typeof modesArray === 'object') {
    MODES = modesArray as Options[];
  }

  const { colors } = useTheme() as unknown as ThemeType;

  const [memos, setMemos] = useState(walletSettings.download_memos);
  const [filter, setFilter] = useState(walletSettings.transaction_filter_threshold);
  const [customServerUri, setCustomServerUri] = useState(serverContext.uri);
  const [customServerChainName, setCustomServerChainName] = useState(serverContext.chain_name);
  const [currency, setCurrency] = useState(currencyContext);
  const [language, setLanguage] = useState(languageContext);
  const [sendAll, setSendAll] = useState(sendAllContext);
  const [privacy, setPrivacy] = useState(privacyContext);
  const [mode, setMode] = useState(modeContext);
  const [customIcon, setCustomIcon] = useState(farCircle);
  const [disabled, setDisabled] = useState<boolean>();
  const [titleViewHeight, setTitleViewHeight] = useState(0);

  const slideAnim = useRef(new Animated.Value(0)).current;

  moment.locale(language);

  useEffect(() => {
    setCustomIcon(
      serverUris().find((s: ServerType) => isEqual(s, { uri: customServerUri, chain_name: customServerChainName }))
        ? farCircle
        : faDotCircle,
    );
  }, [customServerChainName, customServerUri]);

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

  const saveSettings = async () => {
    let serverUriParsed = customServerUri;
    let same_server_chain_name = true;
    const chain_name = serverContext.chain_name;
    if (
      walletSettings.download_memos === memos &&
      walletSettings.transaction_filter_threshold === filter &&
      serverContext.uri === customServerUri &&
      serverContext.chain_name === customServerChainName &&
      currencyContext === currency &&
      languageContext === language &&
      sendAllContext === sendAll &&
      privacyContext === privacy &&
      modeContext === mode
    ) {
      Toast.show(translate('settings.nochanges') as string, Toast.LONG);
      return;
    }
    if (!memos) {
      Toast.show(translate('settings.ismemo') as string, Toast.LONG);
      return;
    }
    if (!filter) {
      Toast.show(translate('settings.isthreshold') as string, Toast.LONG);
      return;
    }
    if (!serverUriParsed) {
      Toast.show(translate('settings.isserver') as string, Toast.LONG);
      return;
    }
    if (!language) {
      Toast.show(translate('settings.islanguage') as string, Toast.LONG);
      return;
    }

    if (serverContext.uri !== customServerUri) {
      const resultUri = parseServerURI(serverUriParsed, translate);
      if (resultUri.toLowerCase().startsWith('error')) {
        Toast.show(translate('settings.isuri') as string, Toast.LONG);
        return;
      } else {
        // url-parse sometimes is too wise, and if you put:
        // server: `http:/zec-server.com:9067` the parser understand this. Good.
        // but this value will be store in the settings and the value is wrong.
        // so, this function if everything is OK return the URI well formmatted.
        // and I save it in the state ASAP.
        if (serverUriParsed !== resultUri) {
          serverUriParsed = resultUri;
          setCustomServerUri(resultUri);
        }
      }
    }

    if (!netInfo.isConnected) {
      Toast.show(translate('loadedapp.connection-error') as string, Toast.LONG);
      return;
    }

    if (serverContext.uri !== serverUriParsed || serverContext.chain_name !== customServerChainName) {
      setDisabled(true);
      Toast.show(translate('loadedapp.tryingnewserver') as string, Toast.SHORT);
      const { result, timeout, new_chain_name } = await checkServerURI(serverUriParsed, serverContext.uri);
      if (!result) {
        // if the server checking takes more then 30 seconds.
        if (timeout === true) {
          Toast.show(translate('loadedapp.tryingnewserver-error') as string, Toast.LONG);
        } else {
          Toast.show((translate('loadedapp.changeservernew-error') as string) + serverUriParsed, Toast.LONG);
        }
        // in this point the sync process is blocked, who knows why.
        // if I save the actual server before the customization... is going to work.
        set_server_option('server', serverContext, false, same_server_chain_name);
        setDisabled(false);
        return;
      } else {
        //console.log('new', new_chain_name, 'old', chain_name);
        if (new_chain_name && new_chain_name !== chain_name) {
          same_server_chain_name = false;
          Toast.show(translate('loadedapp.differentchain-error') as string, Toast.LONG);
        }
      }
    }

    if (walletSettings.download_memos !== memos) {
      await set_wallet_option('download_memos', memos);
    }
    if (walletSettings.transaction_filter_threshold !== filter) {
      await set_wallet_option('transaction_filter_threshold', filter);
    }
    if (currencyContext !== currency) {
      await set_currency_option('currency', currency);
    }
    if (sendAllContext !== sendAll) {
      await set_sendAll_option('sendAll', sendAll);
    }
    if (privacyContext !== privacy) {
      await set_privacy_option('privacy', privacy);
    }
    if (modeContext !== mode) {
      await set_mode_option('mode', mode);
    }

    // I need a little time in this modal because maybe the wallet cannot be open with the new server
    let ms = 100;
    if (serverContext.uri !== serverUriParsed || serverContext.chain_name !== customServerChainName) {
      if (languageContext !== language) {
        await set_language_option('language', language, false);
      }
      set_server_option(
        'server',
        { uri: serverUriParsed, chain_name: customServerChainName } as ServerType,
        true,
        same_server_chain_name,
      );
      ms = 1500;
    } else {
      if (languageContext !== language) {
        await set_language_option('language', language, true);
      }
    }

    setTimeout(() => {
      closeModal();
    }, ms);
  };

  const optionsRadio = (
    DATA: Options[],
    setOption: React.Dispatch<React.SetStateAction<string | boolean>>,
    typeOption: StringConstructor | BooleanConstructor,
    valueOption: string | boolean,
    label: string,
  ) => {
    return DATA.map(item => (
      <View key={'view-' + item.value}>
        <TouchableOpacity
          disabled={disabled}
          style={{ marginRight: 10, marginBottom: 5, maxHeight: 50, minHeight: 48 }}
          onPress={() => setOption(typeOption(item.value))}>
          <View style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', marginTop: 10 }}>
            <FontAwesomeIcon
              icon={typeOption(item.value) === valueOption ? faDotCircle : farCircle}
              size={20}
              color={colors.border}
            />
            <RegText key={'text-' + item.value} style={{ marginLeft: 10 }}>
              {translate(`settings.value-${label}-${item.value}`) as string}
            </RegText>
          </View>
        </TouchableOpacity>
        <FadeText key={'fade-' + item.value}>{item.text}</FadeText>
      </View>
    ));
  };

  const onPressServerChainName = (chain: 'main' | 'test' | 'regtest') => {
    setCustomServerChainName(chain);
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
      <Animated.View style={{ marginTop: slideAnim }}>
        <View
          onLayout={e => {
            const { height } = e.nativeEvent.layout;
            setTitleViewHeight(height);
          }}>
          <Header
            title={translate('settings.title') as string}
            noBalance={true}
            noSyncingStatus={true}
            noDrawMenu={true}
            noPrivacy={true}
          />
        </View>
      </Animated.View>

      <ScrollView
        testID="settings.scrollView"
        style={{ maxHeight: '85%' }}
        contentContainerStyle={{
          flexDirection: 'column',
          alignItems: 'stretch',
          justifyContent: 'flex-start',
        }}>
        <View style={{ display: 'flex', margin: 10 }}>
          <BoldText>{translate('settings.mode-title') as string}</BoldText>
        </View>

        <View style={{ display: 'flex', marginLeft: 25 }}>
          {optionsRadio(MODES, setMode as React.Dispatch<React.SetStateAction<string | boolean>>, String, mode, 'mode')}
        </View>

        <View style={{ display: 'flex', margin: 10 }}>
          <BoldText>{translate('settings.privacy-title') as string}</BoldText>
        </View>

        <View style={{ display: 'flex', marginLeft: 25 }}>
          {optionsRadio(
            PRIVACYS,
            setPrivacy as React.Dispatch<React.SetStateAction<string | boolean>>,
            Boolean,
            privacy,
            'privacy',
          )}
        </View>

        <View style={{ display: 'flex', margin: 10 }}>
          <BoldText>{translate('settings.currency-title') as string}</BoldText>
        </View>

        <View style={{ display: 'flex', marginLeft: 25 }}>
          {optionsRadio(
            CURRENCIES,
            setCurrency as React.Dispatch<React.SetStateAction<string | boolean>>,
            String,
            currency,
            'currency',
          )}
        </View>

        <View style={{ display: 'flex', margin: 10 }}>
          <BoldText>{translate('settings.language-title') as string}</BoldText>
        </View>

        <View style={{ display: 'flex', marginLeft: 25 }}>
          {optionsRadio(
            LANGUAGES,
            setLanguage as React.Dispatch<React.SetStateAction<string | boolean>>,
            String,
            language,
            'language',
          )}
        </View>

        {modeContext !== 'basic' && (
          <>
            <View style={{ display: 'flex', margin: 10 }}>
              <BoldText>{translate('settings.sendall-title') as string}</BoldText>
            </View>

            <View style={{ display: 'flex', marginLeft: 25 }}>
              {optionsRadio(
                SENDALLS,
                setSendAll as React.Dispatch<React.SetStateAction<string | boolean>>,
                Boolean,
                sendAll,
                'sendall',
              )}
            </View>

            <View style={{ display: 'flex', margin: 10 }}>
              <BoldText>{translate('settings.server-title') as string}</BoldText>
            </View>

            <View style={{ display: 'flex', marginLeft: 25 }}>
              {serverUris().map((s: ServerType, i: number) =>
                s.uri ? (
                  <TouchableOpacity
                    testID={
                      i === 0
                        ? 'settings.firstServer'
                        : i === 1
                        ? 'settings.secondServer'
                        : 'settings.' + i.toString + '-Server'
                    }
                    disabled={disabled}
                    key={'touch-' + s.uri}
                    style={{ marginRight: 10, marginBottom: 5, maxHeight: 50, minHeight: 48 }}
                    onPress={() => {
                      setCustomServerUri(s.uri);
                      setCustomServerChainName(s.chain_name);
                    }}>
                    <View style={{ display: 'flex', flexDirection: 'row', marginTop: 10 }}>
                      <FontAwesomeIcon
                        icon={customServerUri === s.uri ? faDotCircle : farCircle}
                        size={20}
                        color={colors.border}
                      />
                      <RegText key={'tex-' + s.uri} style={{ marginLeft: 10 }}>
                        {s.uri}
                      </RegText>
                    </View>
                  </TouchableOpacity>
                ) : null,
              )}

              <View>
                <TouchableOpacity
                  testID="settings.customServer"
                  disabled={disabled}
                  style={{ marginRight: 10, marginBottom: 5, maxHeight: 50, minHeight: 48 }}
                  onPress={() => setCustomServerUri('')}>
                  <View style={{ display: 'flex', flexDirection: 'row', marginTop: 10 }}>
                    {customIcon && <FontAwesomeIcon icon={customIcon} size={20} color={colors.border} />}
                    <RegText style={{ marginLeft: 10 }}>{translate('settings.custom') as string}</RegText>
                  </View>
                </TouchableOpacity>

                {customIcon === faDotCircle && (
                  <View>
                    <View
                      accessible={true}
                      accessibilityLabel={translate('settings.server-acc') as string}
                      style={{
                        borderColor: colors.border,
                        borderWidth: 1,
                        marginLeft: 5,
                        width: 'auto',
                        maxWidth: '90%',
                        minWidth: '50%',
                        minHeight: 48,
                      }}>
                      <TextInput
                        testID="settings.customServerField"
                        placeholder={'https://------.---:---'}
                        placeholderTextColor={colors.placeholder}
                        style={{
                          color: colors.text,
                          fontWeight: '600',
                          fontSize: 18,
                          minWidth: '50%',
                          maxWidth: '90%',
                          minHeight: 48,
                          marginLeft: 5,
                          backgroundColor: 'transparent',
                        }}
                        value={customServerUri}
                        onChangeText={(text: string) => setCustomServerUri(text)}
                        editable={!disabled}
                        maxLength={100}
                      />
                    </View>
                    <View
                      accessible={true}
                      accessibilityLabel={translate('settings.server-acc') as string}
                      style={{
                        marginLeft: 5,
                        width: 'auto',
                        maxWidth: '90%',
                        minWidth: '50%',
                        minHeight: 48,
                      }}>
                      <View
                        style={{
                          paddingTop: 10,
                          paddingLeft: 10,
                          paddingRight: 10,
                          marginBottom: 5,
                          justifyContent: 'center',
                          alignItems: 'center',
                        }}>
                        <ChainTypeToggle
                          customServerChainName={customServerChainName}
                          onPress={onPressServerChainName}
                          translate={translate}
                        />
                      </View>
                    </View>
                  </View>
                )}
              </View>
            </View>

            <View style={{ display: 'flex', margin: 10 }}>
              <BoldText>{translate('settings.threshold-title') as string}</BoldText>
            </View>

            <View style={{ display: 'flex', marginLeft: 25 }}>
              <View
                accessible={true}
                accessibilityLabel={translate('settings.threshold-acc') as string}
                style={{
                  borderColor: colors.border,
                  borderWidth: 1,
                  marginLeft: 5,
                  width: 'auto',
                  maxWidth: '60%',
                  maxHeight: 48,
                  minWidth: '30%',
                  minHeight: 48,
                }}>
                <TextInput
                  placeholder={translate('settings.number') as string}
                  placeholderTextColor={colors.placeholder}
                  keyboardType="numeric"
                  style={{
                    color: colors.text,
                    fontWeight: '600',
                    fontSize: 18,
                    minWidth: '30%',
                    minHeight: 48,
                    marginLeft: 5,
                    backgroundColor: 'transparent',
                  }}
                  value={filter}
                  onChangeText={(text: string) => setFilter(text)}
                  editable={!disabled}
                  maxLength={6}
                />
              </View>
            </View>

            <View style={{ display: 'flex', margin: 10 }}>
              <BoldText>{translate('settings.memo-title') as string}</BoldText>
            </View>

            <View style={{ display: 'flex', marginLeft: 25, marginBottom: 30 }}>
              {optionsRadio(
                MEMOS,
                setMemos as React.Dispatch<React.SetStateAction<string | boolean>>,
                String,
                memos,
                'memo',
              )}
            </View>
          </>
        )}
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
          testID="settings.button.save"
          disabled={disabled}
          type="Primary"
          title={translate('settings.save') as string}
          onPress={() => {
            // waiting while closing the keyboard, just in case.
            setTimeout(async () => {
              await saveSettings();
            }, 100);
          }}
        />
        <Button
          disabled={disabled}
          type="Secondary"
          title={translate('cancel') as string}
          style={{ marginLeft: 10 }}
          onPress={closeModal}
        />
      </View>
    </SafeAreaView>
  );
};

export default Settings;
