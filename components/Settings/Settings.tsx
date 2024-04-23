/* eslint-disable react-native/no-inline-styles */
import React, { useContext, useEffect, useState } from 'react';
import { View, ScrollView, SafeAreaView, TouchableOpacity, TextInput, Keyboard, Platform } from 'react-native';
import { useTheme } from '@react-navigation/native';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { IconDefinition, faDotCircle } from '@fortawesome/free-solid-svg-icons';
import { faCircle as farCircle } from '@fortawesome/free-regular-svg-icons';
import Animated, { Easing, useSharedValue, withTiming } from 'react-native-reanimated';

import RegText from '../Components/RegText';
import FadeText from '../Components/FadeText';
import BoldText from '../Components/BoldText';
import { checkServerURI, parseServerURI, serverUris } from '../../app/uris';
import Button from '../Components/Button';
import { ThemeType } from '../../app/types';
import { ContextAppLoaded } from '../../app/context';
import moment from 'moment';
import 'moment/locale/es';
import 'moment/locale/pt';
import 'moment/locale/ru';

import Header from '../Header';
import {
  LanguageEnum,
  SecurityType,
  ServerType,
  ServerUrisType,
  ModeEnum,
  CurrencyEnum,
  SelectServerEnum,
} from '../../app/AppState';
import { isEqual } from 'lodash';
import ChainTypeToggle from '../Components/ChainTypeToggle';
import CheckBox from '@react-native-community/checkbox';
import RNPickerSelect from 'react-native-picker-select';

type SettingsProps = {
  closeModal: () => void;
  set_wallet_option: (name: string, value: string) => Promise<void>;
  set_server_option: (
    name: 'server',
    value: ServerType,
    toast: boolean,
    same_server_chain_name: boolean,
  ) => Promise<void>;
  set_currency_option: (name: 'currency', value: CurrencyEnum) => Promise<void>;
  set_language_option: (name: 'language', value: LanguageEnum, reset: boolean) => Promise<void>;
  set_sendAll_option: (name: 'sendAll', value: boolean) => Promise<void>;
  set_donation_option: (name: 'donation', value: boolean) => Promise<void>;
  set_privacy_option: (name: 'privacy', value: boolean) => Promise<void>;
  set_mode_option: (name: 'mode', value: string) => Promise<void>;
  set_security_option: (name: 'security', value: SecurityType) => Promise<void>;
  set_selectServer_option: (name: 'selectServer', value: string) => Promise<void>;
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
  set_donation_option,
  set_privacy_option,
  set_mode_option,
  set_security_option,
  set_selectServer_option,
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
    donation: donationContext,
    privacy: privacyContext,
    mode: modeContext,
    netInfo,
    addLastSnackbar,
    security: securityContext,
    selectServer: selectServerContext,
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

  const donationsArray = translate('settings.donations');
  let DONATIONS: Options[] = [];
  if (typeof donationsArray === 'object') {
    DONATIONS = donationsArray as Options[];
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
  moment.locale(languageContext);

  const [memos, setMemos] = useState<string>(walletSettings.download_memos);
  const [filter, setFilter] = useState<string>(walletSettings.transaction_filter_threshold);
  const [autoServerUri, setAutoServerUri] = useState<string>('');
  const [autoServerChainName, setAutoServerChainName] = useState<string>('');
  const [listServerUri, setListServerUri] = useState<string>('');
  const [listServerChainName, setListServerChainName] = useState<string>('');
  const [itemsPicker, setItemsPicker] = useState<{ label: string; value: string }[]>([]);
  const [customServerUri, setCustomServerUri] = useState<string>('');
  const [customServerChainName, setCustomServerChainName] = useState<string>('');
  const [currency, setCurrency] = useState<CurrencyEnum>(currencyContext);
  const [language, setLanguage] = useState<LanguageEnum>(languageContext);
  const [sendAll, setSendAll] = useState<boolean>(sendAllContext);
  const [donation, setDonation] = useState<boolean>(donationContext);
  const [privacy, setPrivacy] = useState<boolean>(privacyContext);
  const [mode, setMode] = useState<string>(modeContext);
  // security checks box.
  const [startApp, setStartApp] = useState<boolean>(securityContext.startApp);
  const [foregroundApp, setForegroundApp] = useState<boolean>(securityContext.foregroundApp);
  const [sendConfirm, setSendConfirm] = useState<boolean>(securityContext.sendConfirm);
  const [seedScreen, setSeedScreen] = useState<boolean>(securityContext.seedScreen);
  const [ufvkScreen, setUfvkScreen] = useState<boolean>(securityContext.ufvkScreen);
  const [rescanScreen, setRescanScreen] = useState<boolean>(securityContext.rescanScreen);
  const [settingsScreen, setSettingsScreen] = useState<boolean>(securityContext.settingsScreen);
  const [changeWalletScreen, setChangeWalletScreen] = useState<boolean>(securityContext.changeWalletScreen);
  const [restoreWalletBackupScreen, setRestoreWalletBackupScreen] = useState<boolean>(
    securityContext.restoreWalletBackupScreen,
  );
  const [selectServer, setSelectServer] = useState<SelectServerEnum>(selectServerContext);

  const [customIcon, setCustomIcon] = useState<IconDefinition>(farCircle);
  const [autoIcon, setAutoIcon] = useState<IconDefinition>(farCircle);
  const [listIcon, setListIcon] = useState<IconDefinition>(farCircle);
  const [disabled, setDisabled] = useState<boolean>();
  const [titleViewHeight, setTitleViewHeight] = useState<number>(0);

  const slideAnim = useSharedValue(0);

  useEffect(() => {
    if (selectServerContext === SelectServerEnum.auto) {
      setAutoIcon(faDotCircle);
      setAutoServerUri(serverContext.uri);
      setAutoServerChainName(serverContext.chain_name);
    } else if (selectServerContext === SelectServerEnum.list) {
      setListIcon(faDotCircle);
      setListServerUri(serverContext.uri);
      setListServerChainName(serverContext.chain_name);
      // I have to update them in auto as well
      // with the same server
      setAutoServerUri(serverContext.uri);
      setAutoServerChainName(serverContext.chain_name);
    } else if (selectServerContext === SelectServerEnum.custom) {
      setCustomIcon(faDotCircle);
      setCustomServerUri(serverContext.uri);
      setCustomServerChainName(serverContext.chain_name);
      // I have to update them in auto as well
      // with the first of the list
      setAutoServerUri(serverUris(translate)[0].uri);
      setAutoServerChainName(serverUris(translate)[0].chain_name);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // only the first time

  useEffect(() => {
    const items = serverUris(translate).map((item: ServerUrisType) => ({
      label: (item.region ? item.region + ' ' : '') + item.uri,
      value: item.uri,
    }));
    setItemsPicker(items);
  }, [translate]);

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

  const securityObject: () => SecurityType = () => {
    return {
      startApp,
      foregroundApp,
      sendConfirm,
      seedScreen,
      ufvkScreen,
      rescanScreen,
      settingsScreen,
      changeWalletScreen,
      restoreWalletBackupScreen,
    };
  };

  const saveSettings = async () => {
    let serverUriParsed = '';
    let chain_nameParsed = '';
    if (selectServer === SelectServerEnum.auto) {
      serverUriParsed = autoServerUri;
      chain_nameParsed = autoServerChainName;
    } else if (selectServer === SelectServerEnum.list) {
      serverUriParsed = listServerUri;
      chain_nameParsed = listServerChainName;
    } else if (selectServer === SelectServerEnum.custom) {
      serverUriParsed = customServerUri;
      chain_nameParsed = customServerChainName;
    }
    let same_server_chain_name = true;
    const chain_name = serverContext.chain_name;
    if (
      walletSettings.download_memos === memos &&
      walletSettings.transaction_filter_threshold === filter &&
      serverContext.uri === serverUriParsed &&
      serverContext.chain_name === chain_nameParsed &&
      currencyContext === currency &&
      languageContext === language &&
      sendAllContext === sendAll &&
      donationContext === donation &&
      privacyContext === privacy &&
      modeContext === mode &&
      isEqual(securityContext, securityObject()) &&
      selectServerContext === selectServer
    ) {
      addLastSnackbar({ message: translate('settings.nochanges') as string, type: 'Primary' });
      return;
    }
    if (!memos) {
      addLastSnackbar({ message: translate('settings.ismemo') as string, type: 'Primary' });
      return;
    }
    if (!filter) {
      addLastSnackbar({ message: translate('settings.isthreshold') as string, type: 'Primary' });
      return;
    }
    if (!serverUriParsed || !chain_nameParsed) {
      addLastSnackbar({ message: translate('settings.isserver') as string, type: 'Primary' });
      return;
    }
    if (!language) {
      addLastSnackbar({ message: translate('settings.islanguage') as string, type: 'Primary' });
      return;
    }

    if (serverContext.uri !== serverUriParsed) {
      const resultUri = parseServerURI(serverUriParsed, translate);
      if (resultUri.toLowerCase().startsWith('error')) {
        addLastSnackbar({ message: translate('settings.isuri') as string, type: 'Primary' });
        return;
      } else {
        // url-parse sometimes is too wise, and if you put:
        // server: `http:/zec-server.com:9067` the parser understand this. Good.
        // but this value will be store in the settings and the value is wrong.
        // so, this function if everything is OK return the URI well formatted.
        // and I save it in the state ASAP.
        if (serverUriParsed !== resultUri) {
          serverUriParsed = resultUri;
          if (selectServer === SelectServerEnum.auto) {
            setAutoServerUri(serverUriParsed);
          } else if (selectServer === SelectServerEnum.list) {
            setListServerUri(serverUriParsed);
          } else if (selectServer === SelectServerEnum.custom) {
            setCustomServerUri(serverUriParsed);
          }
        }
      }
    }

    if (!netInfo.isConnected) {
      addLastSnackbar({ message: translate('loadedapp.connection-error') as string, type: 'Primary' });
      return;
    }

    if (serverContext.uri !== serverUriParsed || serverContext.chain_name !== chain_nameParsed) {
      setDisabled(true);
      addLastSnackbar({ message: translate('loadedapp.tryingnewserver') as string, type: 'Primary' });
      const { result, timeout, new_chain_name } = await checkServerURI(serverUriParsed, serverContext.uri);
      if (!result) {
        // if the server checking takes more then 30 seconds.
        if (timeout === true) {
          addLastSnackbar({ message: translate('loadedapp.tryingnewserver-error') as string, type: 'Primary' });
        } else {
          addLastSnackbar({
            message: (translate('loadedapp.changeservernew-error') as string) + serverUriParsed,
            type: 'Primary',
          });
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
          addLastSnackbar({ message: translate('loadedapp.differentchain-error') as string, type: 'Primary' });
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
    if (donationContext !== donation) {
      await set_donation_option('donation', donation);
    }
    if (privacyContext !== privacy) {
      await set_privacy_option('privacy', privacy);
    }
    if (modeContext !== mode) {
      await set_mode_option('mode', mode);
    }
    if (!isEqual(securityContext, securityObject())) {
      await set_security_option('security', securityObject());
    }
    if (selectServerContext !== selectServer) {
      await set_selectServer_option('selectServer', selectServer);
    }

    // I need a little time in this modal because maybe the wallet cannot be open with the new server
    let ms = 100;
    if (serverContext.uri !== serverUriParsed || serverContext.chain_name !== chain_nameParsed) {
      if (languageContext !== language) {
        await set_language_option('language', language, false);
      }
      set_server_option(
        'server',
        { uri: serverUriParsed, chain_name: chain_nameParsed } as ServerType,
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
          testID={`settings.${label}-${item.value}`}
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

  const securityCheckBox = (
    value: boolean,
    setValue: React.Dispatch<React.SetStateAction<string | boolean>>,
    label: string,
  ) => {
    return (
      <View
        style={{
          flexDirection: 'row',
          marginLeft: 20,
          marginRight: 10,
          marginBottom: 5,
          maxHeight: 50,
          minHeight: 48,
        }}>
        <CheckBox
          disabled={false}
          value={value}
          onValueChange={(v: boolean) => setValue(v)}
          tintColors={{ true: colors.primary, false: colors.text }}
          tintColor={colors.text}
          onCheckColor={colors.card}
          onFillColor={colors.primary}
          onTintColor={colors.primary}
          boxType="square"
          animationDuration={0.1}
          style={{ marginRight: 10, transform: Platform.OS === 'ios' ? [{ scaleX: 0.7 }, { scaleY: 0.7 }] : [] }}
        />
        <RegText style={{ marginTop: Platform.OS === 'ios' ? 5 : 3 }}>{label}</RegText>
      </View>
    );
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
        keyboardShouldPersistTaps="handled"
        testID="settings.scroll-view"
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

        {modeContext !== ModeEnum.basic && (
          <>
            <View style={{ display: 'flex', margin: 10 }}>
              <BoldText>{translate('settings.donation-title') as string}</BoldText>
            </View>

            <View style={{ display: 'flex', marginLeft: 25 }}>
              {optionsRadio(
                DONATIONS,
                setDonation as React.Dispatch<React.SetStateAction<string | boolean>>,
                Boolean,
                donation,
                'donation',
              )}
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
              <View>
                <TouchableOpacity
                  testID="settings.auto-server"
                  disabled={disabled}
                  style={{ marginRight: 10, marginBottom: 0, maxHeight: 50, minHeight: 48 }}
                  onPress={() => {
                    setAutoIcon(faDotCircle);
                    setListIcon(farCircle);
                    setCustomIcon(farCircle);
                    setSelectServer(SelectServerEnum.auto);
                  }}>
                  <View style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', marginTop: 10 }}>
                    {autoIcon && <FontAwesomeIcon icon={autoIcon} size={20} color={colors.border} />}
                    <RegText style={{ marginLeft: 10 }}>{translate('settings.server-auto') as string}</RegText>
                    {autoIcon === faDotCircle && <FadeText style={{ marginLeft: 10 }}>{autoServerUri}</FadeText>}
                  </View>
                </TouchableOpacity>
              </View>
              <View style={{ display: 'flex' }}>
                <FadeText>{translate('settings.server-auto-text') as string}</FadeText>
              </View>

              <View>
                {!disabled && itemsPicker.length > 0 ? (
                  <RNPickerSelect
                    fixAndroidTouchableBug={true}
                    value={listServerUri}
                    items={itemsPicker}
                    placeholder={{
                      label: translate('settings.select-placeholder') as string,
                      value: listServerUri,
                      color: colors.primary,
                    }}
                    useNativeAndroidPickerStyle={false}
                    onValueChange={(item: string) => {
                      //console.log(JSON.stringify(item));
                      if (item) {
                        setAutoIcon(farCircle);
                        setListIcon(faDotCircle);
                        setCustomIcon(farCircle);
                        setSelectServer(SelectServerEnum.list);
                        setListServerUri(item);
                        const cnItem = serverUris(translate).find((s: ServerUrisType) => s.uri === item);
                        if (cnItem) {
                          setListServerChainName(cnItem.chain_name);
                        } else {
                          console.log('chain name not found');
                        }
                      }
                    }}>
                    <View
                      style={{
                        marginRight: 10,
                        marginBottom: 5,
                        maxHeight: 50,
                        minHeight: 48,
                        display: 'flex',
                        flexDirection: 'row',
                        alignItems: 'center',
                      }}>
                      {listIcon && <FontAwesomeIcon icon={listIcon} size={20} color={colors.border} />}
                      <RegText style={{ marginLeft: 10 }}>{translate('settings.server-list') as string}</RegText>
                      {listIcon === faDotCircle && <FadeText style={{ marginLeft: 10 }}>{listServerUri}</FadeText>}
                    </View>
                  </RNPickerSelect>
                ) : (
                  <View
                    style={{
                      marginRight: 10,
                      marginBottom: 5,
                      maxHeight: 50,
                      minHeight: 48,
                      display: 'flex',
                      flexDirection: 'row',
                      alignItems: 'center',
                    }}>
                    {listIcon && <FontAwesomeIcon icon={listIcon} size={20} color={colors.border} />}
                    <RegText style={{ marginLeft: 10 }}>{translate('settings.server-list') as string}</RegText>
                    {listIcon === faDotCircle && <FadeText style={{ marginLeft: 10 }}>{listServerUri}</FadeText>}
                  </View>
                )}
              </View>
              <View style={{ display: 'flex' }}>
                <FadeText>{translate('settings.server-list-text') as string}</FadeText>
              </View>

              <View>
                <TouchableOpacity
                  testID="settings.custom-server"
                  disabled={disabled}
                  style={{ marginRight: 10, marginBottom: 5, maxHeight: 50, minHeight: 48 }}
                  onPress={() => {
                    setAutoIcon(farCircle);
                    setListIcon(farCircle);
                    setCustomIcon(faDotCircle);
                    setSelectServer(SelectServerEnum.custom);
                  }}>
                  <View
                    style={{
                      display: 'flex',
                      flexDirection: 'row',
                      alignItems: 'center',
                      marginTop: 10,
                    }}>
                    {customIcon && <FontAwesomeIcon icon={customIcon} size={20} color={colors.border} />}
                    <RegText style={{ marginLeft: 10 }}>{translate('settings.server-custom') as string}</RegText>
                  </View>
                </TouchableOpacity>
                {customIcon === farCircle && (
                  <View style={{ display: 'flex' }}>
                    <FadeText>{translate('settings.server-custom-text') as string}</FadeText>
                  </View>
                )}

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
                        testID="settings.custom-server-field"
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
              <BoldText>{translate('settings.security-title') as string}</BoldText>
            </View>

            {securityCheckBox(
              startApp,
              setStartApp as React.Dispatch<React.SetStateAction<string | boolean>>,
              translate('settings.security-startapp') as string,
            )}
            {securityCheckBox(
              foregroundApp,
              setForegroundApp as React.Dispatch<React.SetStateAction<string | boolean>>,
              translate('settings.security-foregroundapp') as string,
            )}
            {securityCheckBox(
              sendConfirm,
              setSendConfirm as React.Dispatch<React.SetStateAction<string | boolean>>,
              translate('settings.security-sendconfirm') as string,
            )}
            {securityCheckBox(
              seedScreen,
              setSeedScreen as React.Dispatch<React.SetStateAction<string | boolean>>,
              translate('settings.security-seedscreen') as string,
            )}
            {securityCheckBox(
              ufvkScreen,
              setUfvkScreen as React.Dispatch<React.SetStateAction<string | boolean>>,
              translate('settings.security-ufvkscreen') as string,
            )}
            {securityCheckBox(
              rescanScreen,
              setRescanScreen as React.Dispatch<React.SetStateAction<string | boolean>>,
              translate('settings.security-rescanscreen') as string,
            )}
            {securityCheckBox(
              settingsScreen,
              setSettingsScreen as React.Dispatch<React.SetStateAction<string | boolean>>,
              translate('settings.security-settingsscreen') as string,
            )}
            {securityCheckBox(
              changeWalletScreen,
              setChangeWalletScreen as React.Dispatch<React.SetStateAction<string | boolean>>,
              translate('settings.security-changewalletscreen') as string,
            )}
            {securityCheckBox(
              restoreWalletBackupScreen,
              setRestoreWalletBackupScreen as React.Dispatch<React.SetStateAction<string | boolean>>,
              translate('settings.security-restorewalletbackupscreen') as string,
            )}

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
