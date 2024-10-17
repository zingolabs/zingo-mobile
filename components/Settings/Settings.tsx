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
  ChainNameEnum,
  WalletOptionEnum,
  ButtonTypeEnum,
  GlobalConst,
} from '../../app/AppState';
import { isEqual } from 'lodash';
import ChainTypeToggle from '../Components/ChainTypeToggle';
import CheckBox from '@react-native-community/checkbox';
import RNPickerSelect from 'react-native-picker-select';
import { getStorageRecoveryWalletInfo, hasRecoveryWalletInfo } from '../../app/recoveryWalletInfo';

type SettingsProps = {
  closeModal: () => void;
  setWalletOption: (walletOption: string, value: string) => Promise<void>;
  setServerOption: (value: ServerType, toast: boolean, sameServerChainName: boolean) => Promise<void>;
  setCurrencyOption: (value: CurrencyEnum) => Promise<void>;
  setLanguageOption: (value: LanguageEnum, reset: boolean) => Promise<void>;
  setSendAllOption: (value: boolean) => Promise<void>;
  setDonationOption: (value: boolean) => Promise<void>;
  setPrivacyOption: (value: boolean) => Promise<void>;
  setModeOption: (value: string) => Promise<void>;
  setSecurityOption: (value: SecurityType) => Promise<void>;
  setSelectServerOption: (value: string) => Promise<void>;
  setRescanMenuOption: (value: boolean) => Promise<void>;
  setRecoveryWalletInfoOnDeviceOption: (value: boolean) => Promise<void>;
};

type Options = {
  value: string;
  text: string;
};

const Settings: React.FunctionComponent<SettingsProps> = ({
  setWalletOption,
  setServerOption,
  setCurrencyOption,
  setLanguageOption,
  setSendAllOption,
  setDonationOption,
  setPrivacyOption,
  setModeOption,
  setSecurityOption,
  setSelectServerOption,
  setRescanMenuOption,
  setRecoveryWalletInfoOnDeviceOption,
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
    rescanMenu: rescanMenuContext,
    recoveryWalletInfoOnDevice: recoveryWalletInfoOnDeviceContext,
    readOnly,
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

  const rescanMenusArray = translate('settings.rescanmenus');
  let RESCANMENU: Options[] = [];
  if (typeof rescanMenusArray === 'object') {
    RESCANMENU = rescanMenusArray as Options[];
  }

  const recoveryWalletInfoOnDevicesArray = translate('settings.recoverywalletinfoondevices');
  let RECOVERYWALLETINFOONDEVICE: Options[] = [];
  if (typeof recoveryWalletInfoOnDevicesArray === 'object') {
    RECOVERYWALLETINFOONDEVICE = recoveryWalletInfoOnDevicesArray as Options[];
  }

  const { colors } = useTheme() as unknown as ThemeType;
  moment.locale(languageContext);

  const [memos, setMemos] = useState<string>(walletSettings.downloadMemos);
  const [filter, setFilter] = useState<string>(walletSettings.transactionFilterThreshold);
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
  const [seedUfvkScreen, setSeedUfvkScreen] = useState<boolean>(securityContext.seedUfvkScreen);
  const [rescanScreen, setRescanScreen] = useState<boolean>(securityContext.rescanScreen);
  const [settingsScreen, setSettingsScreen] = useState<boolean>(securityContext.settingsScreen);
  const [changeWalletScreen, setChangeWalletScreen] = useState<boolean>(securityContext.changeWalletScreen);
  const [restoreWalletBackupScreen, setRestoreWalletBackupScreen] = useState<boolean>(
    securityContext.restoreWalletBackupScreen,
  );
  const [selectServer, setSelectServer] = useState<SelectServerEnum>(selectServerContext);
  const [rescanMenu, setRescanMenu] = useState<boolean>(rescanMenuContext);
  const [recoveryWalletInfoOnDevice, setRecoveryWalletInfoOnDevice] = useState<boolean>(
    recoveryWalletInfoOnDeviceContext,
  );

  const [customIcon, setCustomIcon] = useState<IconDefinition>(farCircle);
  const [autoIcon, setAutoIcon] = useState<IconDefinition>(farCircle);
  const [listIcon, setListIcon] = useState<IconDefinition>(farCircle);
  const [disabled, setDisabled] = useState<boolean>();
  const [titleViewHeight, setTitleViewHeight] = useState<number>(0);
  const [hasRecoveryWalletInfoSaved, setHasRecoveryWalletInfoSaved] = useState<boolean>(false);
  const [storageRecoveryWalletInfo, setStorageRecoveryWalletInfo] = useState<string>('');

  const slideAnim = useSharedValue(0);

  useEffect(() => {
    (async () => {
      if (await hasRecoveryWalletInfo()) {
        setHasRecoveryWalletInfoSaved(true);
        setStorageRecoveryWalletInfo(await getStorageRecoveryWalletInfo());
      }
    })();
  }, [translate]);

  useEffect(() => {
    if (selectServerContext === SelectServerEnum.auto) {
      setAutoIcon(faDotCircle);
      setAutoServerUri(serverContext.uri);
      setAutoServerChainName(serverContext.chainName);
    } else if (selectServerContext === SelectServerEnum.list) {
      setListIcon(faDotCircle);
      setListServerUri(serverContext.uri);
      setListServerChainName(serverContext.chainName);
      // I have to update them in auto as well
      // with the same server
      setAutoServerUri(serverContext.uri);
      setAutoServerChainName(serverContext.chainName);
    } else if (selectServerContext === SelectServerEnum.custom) {
      setCustomIcon(faDotCircle);
      setCustomServerUri(serverContext.uri);
      setCustomServerChainName(serverContext.chainName);
      // I have to update them in auto as well
      // with the first of the list
      setAutoServerUri(serverUris(translate)[0].uri);
      setAutoServerChainName(serverUris(translate)[0].chainName);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // only the first time

  useEffect(() => {
    // avoiding obsolete ones
    const items = serverUris(translate)
      .filter((s: ServerUrisType) => !s.obsolete)
      .map((item: ServerUrisType) => ({
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
      seedUfvkScreen,
      rescanScreen,
      settingsScreen,
      changeWalletScreen,
      restoreWalletBackupScreen,
    };
  };

  const saveSettings = async () => {
    let serverUriParsed = '';
    let chainNameParsed = '';
    if (selectServer === SelectServerEnum.auto) {
      serverUriParsed = autoServerUri;
      chainNameParsed = autoServerChainName;
    } else if (selectServer === SelectServerEnum.list) {
      serverUriParsed = listServerUri;
      chainNameParsed = listServerChainName;
    } else if (selectServer === SelectServerEnum.custom) {
      serverUriParsed = customServerUri;
      chainNameParsed = customServerChainName;
    }
    let sameServerChainName = true;
    const chainName = serverContext.chainName;
    if (
      walletSettings.downloadMemos === memos &&
      walletSettings.transactionFilterThreshold === filter &&
      serverContext.uri === serverUriParsed &&
      serverContext.chainName === chainNameParsed &&
      currencyContext === currency &&
      languageContext === language &&
      sendAllContext === sendAll &&
      donationContext === donation &&
      privacyContext === privacy &&
      modeContext === mode &&
      isEqual(securityContext, securityObject()) &&
      selectServerContext === selectServer &&
      rescanMenuContext === rescanMenu &&
      recoveryWalletInfoOnDeviceContext === recoveryWalletInfoOnDevice
    ) {
      addLastSnackbar({ message: translate('settings.nochanges') as string });
      return;
    }
    if (!memos) {
      addLastSnackbar({ message: translate('settings.ismemo') as string });
      return;
    }
    if (!filter) {
      addLastSnackbar({ message: translate('settings.isthreshold') as string });
      return;
    }
    if (!serverUriParsed || !chainNameParsed) {
      addLastSnackbar({ message: translate('settings.isserver') as string });
      return;
    }
    if (!language) {
      addLastSnackbar({ message: translate('settings.islanguage') as string });
      return;
    }

    if (serverContext.uri !== serverUriParsed) {
      const resultUri = parseServerURI(serverUriParsed, translate);
      if (resultUri.toLowerCase().startsWith(GlobalConst.error)) {
        addLastSnackbar({ message: translate('settings.isuri') as string });
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
      addLastSnackbar({ message: translate('loadedapp.connection-error') as string });
      return;
    }

    if (serverContext.uri !== serverUriParsed || serverContext.chainName !== chainNameParsed) {
      setDisabled(true);
      addLastSnackbar({ message: translate('loadedapp.tryingnewserver') as string });
      const { result, timeout, newChainName } = await checkServerURI(serverUriParsed, serverContext.uri);
      if (!result) {
        // if the server checking takes more then 30 seconds.
        if (timeout === true) {
          addLastSnackbar({ message: translate('loadedapp.tryingnewserver-error') as string });
        } else {
          addLastSnackbar({
            message: (translate('loadedapp.changeservernew-error') as string) + serverUriParsed,
          });
        }
        // in this point the sync process is blocked, who knows why.
        // if I save the actual server before the customization... is going to work.
        setServerOption(serverContext, false, sameServerChainName);
        setDisabled(false);
        return;
      } else {
        if (newChainName && newChainName !== chainName) {
          sameServerChainName = false;
          addLastSnackbar({ message: translate('loadedapp.differentchain-error') as string });
        }
      }
    }

    if (walletSettings.downloadMemos !== memos) {
      await setWalletOption(WalletOptionEnum.downloadMemos, memos);
    }
    if (walletSettings.transactionFilterThreshold !== filter) {
      await setWalletOption(WalletOptionEnum.transactionFilterThreshold, filter);
    }
    if (currencyContext !== currency) {
      await setCurrencyOption(currency);
    }
    if (sendAllContext !== sendAll) {
      await setSendAllOption(sendAll);
    }
    if (donationContext !== donation) {
      await setDonationOption(donation);
    }
    if (privacyContext !== privacy) {
      await setPrivacyOption(privacy);
    }
    if (modeContext !== mode) {
      await setModeOption(mode);
    }
    if (!isEqual(securityContext, securityObject())) {
      await setSecurityOption(securityObject());
    }
    if (selectServerContext !== selectServer) {
      await setSelectServerOption(selectServer);
    }
    if (rescanMenuContext !== rescanMenu) {
      await setRescanMenuOption(rescanMenu);
    }
    if (recoveryWalletInfoOnDeviceContext !== recoveryWalletInfoOnDevice) {
      await setRecoveryWalletInfoOnDeviceOption(recoveryWalletInfoOnDevice);
    }

    // I need a little time in this modal because maybe the wallet cannot be open with the new server
    let ms = 100;
    if (serverContext.uri !== serverUriParsed || serverContext.chainName !== chainNameParsed) {
      if (languageContext !== language) {
        await setLanguageOption(language, false);
      }
      setServerOption({ uri: serverUriParsed, chainName: chainNameParsed } as ServerType, true, sameServerChainName);
      ms = 1500;
    } else {
      if (languageContext !== language) {
        await setLanguageOption(language, true);
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
    label: string, // in lowercase to match with the translation json files.
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

  const onPressServerChainName = (chain: ChainNameEnum) => {
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
          style={{
            marginRight: 10,
            transform: Platform.OS === GlobalConst.platformOSios ? [{ scaleX: 0.7 }, { scaleY: 0.7 }] : [],
          }}
        />
        <RegText style={{ marginTop: Platform.OS === GlobalConst.platformOSios ? 5 : 3 }}>{label}</RegText>
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
            {!readOnly && (
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
              </>
            )}

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

            {!readOnly && (
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
              </>
            )}

            <View style={{ display: 'flex', margin: 10 }}>
              <BoldText>{translate('settings.rescanmenu-title') as string}</BoldText>
            </View>

            <View style={{ display: 'flex', marginLeft: 25 }}>
              {optionsRadio(
                RESCANMENU,
                setRescanMenu as React.Dispatch<React.SetStateAction<string | boolean>>,
                Boolean,
                rescanMenu,
                'rescanmenu',
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
                    onValueChange={(itemValue: string) => {
                      //console.log(JSON.stringify(item));
                      if (itemValue) {
                        setAutoIcon(farCircle);
                        setListIcon(faDotCircle);
                        setCustomIcon(farCircle);
                        setSelectServer(SelectServerEnum.list);
                        setListServerUri(itemValue);
                        // avoiding obsolete ones
                        const cnItem = serverUris(translate).find(
                          (s: ServerUrisType) => s.uri === itemValue && !s.obsolete,
                        );
                        if (cnItem) {
                          setListServerChainName(cnItem.chainName);
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
                      <RegText testID="settings.list-server" style={{ marginLeft: 10 }}>
                        {translate('settings.server-list') as string}
                      </RegText>
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
                        placeholder={GlobalConst.serverPlaceHolder}
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
              <BoldText testID="settings.securitytitle">{translate('settings.security-title') as string}</BoldText>
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
              seedUfvkScreen,
              setSeedUfvkScreen as React.Dispatch<React.SetStateAction<string | boolean>>,
              readOnly
                ? (translate('settings.security-ufvkscreen') as string)
                : (translate('settings.security-seedscreen') as string),
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

            <View style={{ display: 'flex', marginLeft: 25 }}>
              {optionsRadio(
                MEMOS,
                setMemos as React.Dispatch<React.SetStateAction<string | boolean>>,
                String,
                memos,
                'memo',
              )}
            </View>

            <View style={{ display: 'flex', margin: 10 }}>
              <BoldText>{translate('settings.recoverywalletinfoondevice-title') as string}</BoldText>
            </View>

            <View style={{ display: 'flex', marginLeft: 25 }}>
              {optionsRadio(
                RECOVERYWALLETINFOONDEVICE,
                setRecoveryWalletInfoOnDevice as React.Dispatch<React.SetStateAction<string | boolean>>,
                Boolean,
                recoveryWalletInfoOnDevice,
                'recoverywalletinfoondevice',
              )}
            </View>

            {hasRecoveryWalletInfoSaved && (
              <View style={{ display: 'flex' }}>
                <FadeText style={{ color: colors.primary, textAlign: 'center', marginTop: 10, padding: 5 }}>
                  {(translate('settings.walletkeyssaved') as string) +
                    (storageRecoveryWalletInfo ? ' [' + storageRecoveryWalletInfo + ']' : '')}
                </FadeText>
              </View>
            )}

            <View style={{ display: 'flex', margin: 10 }}>
              <FadeText
                style={{
                  color: colors.primary,
                  textAlign: 'center',
                  marginVertical: 10,
                  padding: 5,
                  borderColor: 'red',
                  borderWidth: 1,
                }}>
                {translate('settings.walletkeyswarning') as string}
              </FadeText>
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
          type={ButtonTypeEnum.Primary}
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
          type={ButtonTypeEnum.Secondary}
          title={translate('cancel') as string}
          style={{ marginLeft: 10 }}
          onPress={closeModal}
        />
      </View>
    </SafeAreaView>
  );
};

export default Settings;
