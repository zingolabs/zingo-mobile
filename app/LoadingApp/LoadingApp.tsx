/* eslint-disable react-native/no-inline-styles */
import React, { Component, Suspense, useState, useMemo, useEffect } from 'react';
import {
  View,
  Alert,
  SafeAreaView,
  Image,
  Text,
  Modal,
  ScrollView,
  I18nManager,
  EmitterSubscription,
  AppState,
  NativeEventSubscription,
  Platform,
  TextInput,
} from 'react-native';
import { useTheme } from '@react-navigation/native';
import { I18n } from 'i18n-js';
import * as RNLocalize from 'react-native-localize';
import { StackScreenProps } from '@react-navigation/stack';
import NetInfo, { NetInfoStateType, NetInfoSubscription } from '@react-native-community/netinfo';

import OptionsMenu from 'react-native-option-menu';

import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { faEllipsisV } from '@fortawesome/free-solid-svg-icons';

import RPCModule from '../RPCModule';
import { AppStateLoading, BackgroundType, WalletType, TranslateType, NetInfoType, ServerType } from '../AppState';
import { parseServerURI, serverUris } from '../uris';
import SettingsFileImpl from '../../components/Settings/SettingsFileImpl';
import RPC from '../rpc';
import { ThemeType } from '../types';
import { defaultAppStateLoading, ContextAppLoadingProvider } from '../context';
import BackgroundFileImpl from '../../components/Background/BackgroundFileImpl';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createAlert } from '../createAlert';
import { RPCWalletKindType } from '../rpc/types/RPCWalletKindType';
import { isEqual } from 'lodash';
import Snackbars from '../../components/Components/Snackbars';
import SnackbarType from '../AppState/types/SnackbarType';
import { RPCSeedType } from '../rpc/types/RPCSeedType';

const BoldText = React.lazy(() => import('../../components/Components/BoldText'));
const Button = React.lazy(() => import('../../components/Components/Button'));
const Seed = React.lazy(() => import('../../components/Seed'));
const ImportUfvk = React.lazy(() => import('../../components/Ufvk/ImportUfvk'));
const ChainTypeToggle = React.lazy(() => import('../../components/Components/ChainTypeToggle'));

const en = require('../translations/en.json');
const es = require('../translations/es.json');

type LoadingAppProps = {
  navigation: StackScreenProps<any>['navigation'];
  route: StackScreenProps<any>['route'];
};

const SERVER_DEFAULT_0 = serverUris()[0];
const SERVER_DEFAULT_1 = serverUris()[1];

export default function LoadingApp(props: LoadingAppProps) {
  const theme = useTheme() as unknown as ThemeType;
  const [language, setLanguage] = useState<'en' | 'es'>('en');
  const [currency, setCurrency] = useState<'USD' | ''>('');
  const [server, setServer] = useState<ServerType>(SERVER_DEFAULT_0);
  const [sendAll, setSendAll] = useState<boolean>(false);
  const [privacy, setPrivacy] = useState<boolean>(false);
  const [mode, setMode] = useState<'basic' | 'advanced'>('advanced'); // by default advanced
  const [background, setBackground] = useState<BackgroundType>({ batches: 0, date: 0 });
  const [loading, setLoading] = useState<boolean>(true);
  const file = useMemo(
    () => ({
      en: en,
      es: es,
    }),
    [],
  );
  const i18n = useMemo(() => new I18n(file), [file]);

  const translate: (key: string) => TranslateType = (key: string) => i18n.t(key);

  useEffect(() => {
    (async () => {
      // fallback if no available language fits
      const fallback = { languageTag: 'en', isRTL: false };

      //console.log(RNLocalize.findBestAvailableLanguage(Object.keys(file)));
      //console.log(RNLocalize.getLocales());

      const { languageTag, isRTL } = RNLocalize.findBestAvailableLanguage(Object.keys(file)) || fallback;

      // update layout direction
      I18nManager.forceRTL(isRTL);

      //I have to check what language is in the settings
      const settings = await SettingsFileImpl.readSettings();
      //console.log(settings);

      // first I need to know if this launch is a fresh install...
      // if firstInstall is true -> 100% is the first time.
      if (settings.firstInstall) {
        // basic mode
        setMode('basic');
        await SettingsFileImpl.writeSettings('mode', 'basic');
      } else {
        if (settings.mode === 'basic' || settings.mode === 'advanced') {
          setMode(settings.mode);
        } else {
          // if it is not a fresh install -> advanced
          await SettingsFileImpl.writeSettings('mode', mode);
        }
      }
      if (settings.language === 'en' || settings.language === 'es') {
        setLanguage(settings.language);
        i18n.locale = settings.language;
        //console.log('apploading settings', settings.language, settings.currency);
      } else {
        const lang =
          languageTag === 'en' || languageTag === 'es'
            ? (languageTag as 'en' | 'es')
            : (fallback.languageTag as 'en' | 'es');
        setLanguage(lang);
        i18n.locale = lang;
        await SettingsFileImpl.writeSettings('language', lang);
        //console.log('apploading NO settings', languageTag);
      }
      if (settings.currency === '' || settings.currency === 'USD') {
        setCurrency(settings.currency);
      } else {
        await SettingsFileImpl.writeSettings('currency', currency);
      }
      if (settings.server) {
        setServer(settings.server);
        //console.log('settings', settings.server);
      } else {
        await SettingsFileImpl.writeSettings('server', server);
        //console.log('NO settings', settings.server);
      }
      if (settings.sendAll === true || settings.sendAll === false) {
        setSendAll(settings.sendAll);
      } else {
        await SettingsFileImpl.writeSettings('sendAll', sendAll);
      }
      if (settings.privacy === true || settings.privacy === false) {
        setPrivacy(settings.privacy);
      } else {
        await SettingsFileImpl.writeSettings('privacy', privacy);
      }

      // reading background task info
      if (Platform.OS === 'ios') {
        // this file only exists in IOS BS.
        const backgroundJson = await BackgroundFileImpl.readBackground();
        if (backgroundJson) {
          setBackground(backgroundJson);
        }
      }
      setLoading(false);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  //console.log('render loadingApp - 2');

  if (loading) {
    return (
      <View
        style={{
          flex: 1,
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
        }}>
        <Text style={{ color: '#888888', fontSize: 40, fontWeight: 'bold' }}>{translate('zingo') as string}</Text>
        <Text style={{ color: '#888888', fontSize: 15 }}>{translate('version') as string}</Text>
      </View>
    );
  } else {
    return (
      <LoadingAppClass
        {...props}
        theme={theme}
        translate={translate}
        language={language}
        currency={currency}
        server={server}
        sendAll={sendAll}
        privacy={privacy}
        mode={mode}
        background={background}
      />
    );
  }
}

type LoadingAppClassProps = {
  navigation: StackScreenProps<any>['navigation'];
  route: StackScreenProps<any>['route'];
  translate: (key: string) => TranslateType;
  theme: ThemeType;
  language: 'en' | 'es';
  currency: 'USD' | '';
  server: ServerType;
  sendAll: boolean;
  privacy: boolean;
  mode: 'basic' | 'advanced';
  background: BackgroundType;
};

export class LoadingAppClass extends Component<LoadingAppClassProps, AppStateLoading> {
  dim: EmitterSubscription;
  appstate: NativeEventSubscription;
  unsubscribeNetInfo: NetInfoSubscription;

  constructor(props: LoadingAppClassProps) {
    super(props);

    let netInfo: NetInfoType = {} as NetInfoType;
    NetInfo.fetch().then(state => {
      //console.log(state);
      netInfo = {
        isConnected: state.isConnected,
        type: state.type,
        isConnectionExpensive: state.details && state.details.isConnectionExpensive,
      };
    });

    this.state = {
      ...defaultAppStateLoading,
      navigation: props.navigation,
      route: props.route,
      screen: !!props.route.params && !!props.route.params.screen ? props.route.params.screen : 0,
      translate: props.translate,
      server: props.server,
      language: props.language,
      currency: props.currency,
      sendAll: props.sendAll,
      privacy: props.privacy,
      mode: props.mode,
      background: props.background,
      appState: AppState.currentState,
      setBackgroundError: this.setBackgroundError,
      netInfo: netInfo,
      actionButtonsDisabled: !netInfo.isConnected ? true : false,
      addLastSnackbar: this.addLastSnackbar,
    };

    this.dim = {} as EmitterSubscription;
    this.appstate = {} as NativeEventSubscription;
    this.unsubscribeNetInfo = {} as NetInfoSubscription;
  }

  componentDidMount = () => {
    (async () => {
      // First, check if a wallet exists. Do it async so the basic screen has time to render
      await AsyncStorage.setItem('@background', 'no');
      const exists = await RPCModule.walletExists();
      //console.log('Wallet Exists result', this.state.screen, exists);

      if (exists && exists !== 'false') {
        this.setState({ walletExists: true });
        const networkState = await NetInfo.fetch();
        if (networkState.isConnected) {
          let result: string = await RPCModule.loadExistingWallet(this.state.server.uri, this.state.server.chain_name);

          //console.log('Load Wallet Exists result', result);
          if (result && !result.toLowerCase().startsWith('error')) {
            // here result can have an `error` field for watch-only which is actually OK.
            const resultJson: RPCSeedType = await JSON.parse(result);
            if (!resultJson.error || (resultJson.error && resultJson.error.startsWith('This wallet is watch-only'))) {
              // Load the wallet and navigate to the transactions screen
              const walletKindStr: string = await RPCModule.execute('wallet_kind', '');
              //console.log(walletKindStr);
              const walletKindJSON: RPCWalletKindType = await JSON.parse(walletKindStr);
              this.setState({
                readOnly: walletKindJSON.kind === 'Seeded' ? false : true,
              });
              this.navigateToLoadedApp();
              //console.log('navigate to LoadedApp');
            } else {
              this.setState({ screen: 1 });
              createAlert(
                this.setBackgroundError,
                this.addLastSnackbar,
                this.props.translate('loadingapp.readingwallet-label') as string,
                result,
              );
            }
          } else {
            this.setState({ screen: 1 });
            createAlert(
              this.setBackgroundError,
              this.addLastSnackbar,
              this.props.translate('loadingapp.readingwallet-label') as string,
              result,
            );
          }
        } else {
          this.setState({ screen: 1 });
          this.addLastSnackbar({
            message: this.props.translate('loadedapp.connection-error') as string,
            type: 'Primary',
          });
        }
      } else {
        //console.log('Loading new wallet', this.state.screen, this.state.walletExists);
        // if no wallet file & basic mode -> create a new wallet & go directly to history screen.
        if (this.state.mode === 'basic') {
          // setting the prop basicFirstViewSeed to false.
          // this means when the user have funds, the seed screen will show up.
          await SettingsFileImpl.writeSettings('basicFirstViewSeed', false);
          this.createNewWallet();
          this.navigateToLoadedApp();
          //console.log('navigate to LoadedApp');
        } else {
          this.setState(state => ({ screen: state.screen === 3 ? 3 : 1, walletExists: false }));
        }
      }
    })();

    this.appstate = AppState.addEventListener('change', async nextAppState => {
      //await AsyncStorage.setItem('@server', this.state.server);
      if (this.state.appState.match(/inactive|background/) && nextAppState === 'active') {
        //console.log('App has come to the foreground!');
        // reading background task info
        if (Platform.OS === 'ios') {
          // this file only exists in IOS BS.
          this.fetchBackgroundSyncing();
        }
        // setting value for background task Android
        await AsyncStorage.setItem('@background', 'no');
        if (this.state.backgroundError && (this.state.backgroundError.title || this.state.backgroundError.error)) {
          Alert.alert(this.state.backgroundError.title, this.state.backgroundError.error);
          this.setBackgroundError('', '');
        }
      }
      if (nextAppState.match(/inactive|background/) && this.state.appState === 'active') {
        //console.log('App is gone to the background!');
        // setting value for background task Android
        await AsyncStorage.setItem('@background', 'yes');
      }
      this.setState({ appState: nextAppState });
    });

    this.unsubscribeNetInfo = NetInfo.addEventListener(state => {
      const { screen } = this.state;
      const { isConnected, type, isConnectionExpensive } = this.state.netInfo;
      if (
        isConnected !== state.isConnected ||
        type !== state.type ||
        isConnectionExpensive !== state.details?.isConnectionExpensive
      ) {
        this.setState({
          netInfo: {
            isConnected: state.isConnected,
            type: state.type,
            isConnectionExpensive: state.details && state.details.isConnectionExpensive,
          },
          screen: screen !== 0 ? 1 : screen,
          actionButtonsDisabled: !state.isConnected ? true : false,
        });
        if (isConnected !== state.isConnected) {
          if (!state.isConnected) {
            //console.log('EVENT Loading: No internet connection.');
            this.addLastSnackbar({
              message: this.props.translate('loadedapp.connection-error') as string,
              type: 'Primary',
            });
          } else {
            //console.log('EVENT Loading: YESSSSS internet connection.');
            if (screen !== 0) {
              this.setState({ screen: screen === 3 ? 3 : 0 });
              // I need some time until the network is fully ready.
              setTimeout(() => this.componentDidMount(), 1000);
            }
          }
        }
      }
    });
  };

  componentWillUnmount = () => {
    this.dim && typeof this.dim.remove === 'function' && this.dim.remove();
    this.appstate && typeof this.appstate.remove === 'function' && this.appstate.remove();
    this.unsubscribeNetInfo && typeof this.unsubscribeNetInfo === 'function' && this.unsubscribeNetInfo();
  };

  fetchBackgroundSyncing = async () => {
    const backgroundJson = await BackgroundFileImpl.readBackground();
    if (backgroundJson) {
      this.setState({
        background: backgroundJson,
      });
    }
  };

  usingDefaultServer_0 = async (mode: 'basic' | 'advanced') => {
    this.setState({ actionButtonsDisabled: true });
    if (SERVER_DEFAULT_0) {
      await SettingsFileImpl.writeSettings('server', SERVER_DEFAULT_0);
      this.setState({ server: SERVER_DEFAULT_0 });
    }
    if (mode === 'basic') {
      this.setState({ actionButtonsDisabled: false }, () => this.componentDidMount());
    } else {
      this.setState({ actionButtonsDisabled: false });
    }
  };

  usingDefaultServer_1 = async (mode: 'basic' | 'advanced') => {
    this.setState({ actionButtonsDisabled: true });
    if (SERVER_DEFAULT_1) {
      await SettingsFileImpl.writeSettings('server', SERVER_DEFAULT_1);
      this.setState({ server: SERVER_DEFAULT_1 });
    }
    if (mode === 'basic') {
      this.setState({ actionButtonsDisabled: false }, () => this.componentDidMount());
    } else {
      this.setState({ actionButtonsDisabled: false });
    }
  };

  usingCustomServer = async () => {
    if (!this.state.customServerUri) {
      return;
    }
    this.setState({ actionButtonsDisabled: true });
    const uri: string = parseServerURI(this.state.customServerUri, this.state.translate);
    const chain_name = this.state.customServerChainName;
    if (uri.toLowerCase().startsWith('error')) {
      this.addLastSnackbar({ message: this.state.translate('settings.isuri') as string, type: 'Primary' });
    } else {
      await SettingsFileImpl.writeSettings('server', { uri, chain_name });
      this.setState({
        server: { uri, chain_name },
        customServerShow: false,
        customServerUri: '',
        customServerChainName: 'main',
      });
    }
    this.setState({ actionButtonsDisabled: false });
  };

  navigateToLoadedApp = () => {
    const { navigation } = this.props;
    navigation.reset({
      index: 0,
      routes: [{ name: 'LoadedApp', params: { readOnly: this.state.readOnly } }],
    });
  };

  createNewWallet = () => {
    this.setState({ actionButtonsDisabled: true });
    setTimeout(async () => {
      const seed: string = await RPCModule.createNewWallet(this.state.server.uri, this.state.server.chain_name);

      if (seed && !seed.toLowerCase().startsWith('error')) {
        let wallet = {} as WalletType;
        try {
          wallet = JSON.parse(seed);
        } catch (e) {
          this.setState({ actionButtonsDisabled: false });
          createAlert(
            this.setBackgroundError,
            this.addLastSnackbar,
            this.props.translate('loadingapp.creatingwallet-label') as string,
            seed,
          );
          return;
        }
        // default values for wallet options
        this.set_wallet_option('download_memos', 'wallet');
        //await this.set_wallet_option('transaction_filter_threshold', '500');
        // basic mode -> same screen.
        this.setState(state => ({
          wallet,
          screen: state.mode === 'basic' ? state.screen : 2,
          actionButtonsDisabled: false,
          walletExists: true,
        }));
      } else {
        this.setState({ actionButtonsDisabled: false });
        createAlert(
          this.setBackgroundError,
          this.addLastSnackbar,
          this.props.translate('loadingapp.creatingwallet-label') as string,
          seed,
        );
      }
    });
  };

  getwalletToRestore = async (type: 'seed' | 'ufvk') => {
    this.setState({ wallet: {} as WalletType, screen: type === 'seed' ? 3 : 4 });
  };

  doRestore = async (seed_ufvk: string, birthday: number, type: 'seed' | 'ufvk') => {
    if (!seed_ufvk) {
      if (type === 'seed') {
        createAlert(
          this.setBackgroundError,
          this.addLastSnackbar,
          this.props.translate('loadingapp.invalidseed-label') as string,
          this.props.translate('loadingapp.invalidseed-error') as string,
        );
      } else {
        createAlert(
          this.setBackgroundError,
          this.addLastSnackbar,
          this.props.translate('loadingapp.invalidufvk-label') as string,
          this.props.translate('loadingapp.invalidufvk-error') as string,
        );
      }
      return;
    }

    this.setState({ actionButtonsDisabled: true });
    setTimeout(async () => {
      let walletBirthday = birthday.toString() || '0';
      if (parseInt(walletBirthday, 10) < 0) {
        walletBirthday = '0';
      }
      if (isNaN(parseInt(walletBirthday, 10))) {
        walletBirthday = '0';
      }

      let result: string;
      if (type === 'seed') {
        result = await RPCModule.restoreWalletFromSeed(
          seed_ufvk.toLowerCase(),
          walletBirthday || '0',
          this.state.server.uri,
          this.state.server.chain_name,
        );
      } else {
        result = await RPCModule.restoreWalletFromUfvk(
          seed_ufvk.toLowerCase(),
          walletBirthday || '0',
          this.state.server.uri,
          this.state.server.chain_name,
        );
      }
      //console.log(seed_ufvk);
      //console.log(result);
      if (result && !result.toLowerCase().startsWith('error')) {
        // here result can have an `error` field for watch-only which is actually OK.
        const resultJson: RPCSeedType = await JSON.parse(result);
        if (!resultJson.error || (resultJson.error && resultJson.error.startsWith('This wallet is watch-only'))) {
          this.setState({ actionButtonsDisabled: false, readOnly: type === 'seed' ? false : true });
          this.navigateToLoadedApp();
        } else {
          this.setState({ actionButtonsDisabled: false });
          // this message work for both.
          createAlert(
            this.setBackgroundError,
            this.addLastSnackbar,
            this.props.translate('loadingapp.readingwallet-label') as string,
            result,
          );
        }
      } else {
        this.setState({ actionButtonsDisabled: false });
        // this message work for both.
        createAlert(
          this.setBackgroundError,
          this.addLastSnackbar,
          this.props.translate('loadingapp.readingwallet-label') as string,
          result,
        );
      }
    });
  };

  set_wallet_option = async (name: string, value: string) => {
    await RPC.rpc_setWalletSettingOption(name, value);
  };

  set_privacy_option = async (name: 'privacy', value: boolean): Promise<void> => {
    await SettingsFileImpl.writeSettings(name, value);
    this.setState({
      privacy: value as boolean,
    });
  };

  setBackgroundError = (title: string, error: string) => {
    this.setState({ backgroundError: { title, error } });
  };

  customServer = () => {
    if (this.state.netInfo.isConnected) {
      this.setState({ customServerShow: true });
    } else {
      this.addLastSnackbar({ message: this.props.translate('loadedapp.connection-error') as string, type: 'Primary' });
    }
  };

  onPressServerChainName = (chain: 'main' | 'test' | 'regtest') => {
    this.setState({ customServerChainName: chain });
  };

  addLastSnackbar = (snackbar: SnackbarType) => {
    const newSnackbars = this.state.snackbars;
    // if the last one is the same don't do anything.
    if (newSnackbars.length > 0 && newSnackbars[newSnackbars.length - 1].message === snackbar.message) {
      return;
    }
    newSnackbars.push(snackbar);
    this.setState({ snackbars: newSnackbars });
  };

  removeFirstSnackbar = () => {
    const newSnackbars = this.state.snackbars;
    newSnackbars.shift();
    this.setState({ snackbars: newSnackbars });
  };

  changeMode = async (mode: 'basic' | 'advanced') => {
    this.setState({ mode, screen: 0 });
    await SettingsFileImpl.writeSettings('mode', mode);
    // if the user selects advanced mode & wants to change to another wallet
    // and then the user wants to go to basic mode in the first screen
    // the result will be the same -> create a new wallet.
    this.componentDidMount();
  };

  render() {
    const {
      screen,
      wallet,
      actionButtonsDisabled,
      walletExists,
      server,
      netInfo,
      customServerShow,
      customServerUri,
      customServerChainName,
      snackbars,
      mode,
    } = this.state;
    const { translate } = this.props;
    const { colors } = this.props.theme;

    //console.log('render loadingAppClass - 3', screen);

    return (
      <ContextAppLoadingProvider value={this.state}>
        <SafeAreaView
          style={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            height: '100%',
            backgroundColor: colors.background,
          }}>
          <Snackbars snackbars={snackbars} removeFirstSnackbar={this.removeFirstSnackbar} translate={translate} />

          {screen === 0 && (
            <View
              style={{
                flex: 1,
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
              }}>
              <Text style={{ color: colors.zingo, fontSize: 40, fontWeight: 'bold' }}>
                {translate('zingo') as string}
              </Text>
              <Text style={{ color: colors.zingo, fontSize: 15 }}>{translate('version') as string}</Text>
            </View>
          )}
          {screen === 1 && (
            <>
              <View
                style={{
                  backgroundColor: colors.card,
                  padding: 10,
                  position: 'absolute',
                  top: 0,
                  right: 0,
                  zIndex: 999,
                }}>
                {netInfo.isConnected && (
                  <>
                    {mode === 'basic' ? (
                      <OptionsMenu
                        testID="options.menu"
                        customButton={<FontAwesomeIcon icon={faEllipsisV} color={'#ffffff'} size={48} />}
                        buttonStyle={{ width: 48, padding: 10, resizeMode: 'contain' }}
                        destructiveIndex={5}
                        options={[translate('loadingapp.advancedmode'), translate('cancel')]}
                        actions={[() => this.changeMode('advanced')]}
                      />
                    ) : (
                      <OptionsMenu
                        customButton={<FontAwesomeIcon icon={faEllipsisV} color={'#ffffff'} size={48} />}
                        buttonStyle={{ width: 48, padding: 10, resizeMode: 'contain' }}
                        destructiveIndex={5}
                        options={[translate('loadingapp.custom'), translate('cancel')]}
                        actions={[this.customServer]}
                      />
                    )}
                  </>
                )}
              </View>
              <ScrollView
                style={{ maxHeight: '100%' }}
                contentContainerStyle={{
                  flexDirection: 'column',
                  alignItems: 'stretch',
                  justifyContent: 'flex-start',
                  padding: 20,
                }}>
                <View
                  style={{
                    flex: 1,
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}>
                  <View style={{ marginBottom: 50, display: 'flex', alignItems: 'center' }}>
                    <Text style={{ color: colors.zingo, fontSize: 40, fontWeight: 'bold' }}>
                      {translate('zingo') as string}
                    </Text>
                    <Text style={{ color: colors.zingo, fontSize: 15 }}>{translate('version') as string}</Text>
                    <Image
                      source={require('../../assets/img/logobig-zingo.png')}
                      style={{ width: 100, height: 100, resizeMode: 'contain', marginTop: 10, borderRadius: 10 }}
                    />
                  </View>

                  {netInfo.isConnected && (
                    <>
                      <BoldText style={{ fontSize: 15, marginBottom: 3 }}>
                        {`${translate('loadingapp.actualserver') as string} [${
                          translate(`settings.value-chain_name-${server.chain_name}`) as string
                        }]`}
                      </BoldText>
                      <BoldText style={{ fontSize: 15, marginBottom: 10 }}>{server.uri}</BoldText>
                    </>
                  )}

                  {customServerShow && (
                    <View
                      style={{
                        borderColor: colors.primaryDisabled,
                        borderWidth: 1,
                        paddingTop: 10,
                        paddingLeft: 10,
                        paddingRight: 10,
                        marginBottom: 5,
                        justifyContent: 'center',
                        alignItems: 'center',
                      }}>
                      <ChainTypeToggle
                        customServerChainName={customServerChainName}
                        onPress={this.onPressServerChainName}
                        translate={translate}
                      />
                      <View
                        style={{
                          borderColor: colors.border,
                          borderWidth: 1,
                          marginBottom: 10,
                          width: '100%',
                          maxWidth: '100%',
                          minWidth: '50%',
                          minHeight: 48,
                          alignItems: 'center',
                        }}>
                        <TextInput
                          placeholder={'https://------.---:---'}
                          placeholderTextColor={colors.placeholder}
                          style={{
                            color: colors.text,
                            fontWeight: '600',
                            fontSize: 18,
                            minWidth: '90%',
                            minHeight: 48,
                            marginLeft: 5,
                            backgroundColor: 'transparent',
                          }}
                          value={customServerUri}
                          onChangeText={(text: string) => this.setState({ customServerUri: text })}
                          editable={true}
                          maxLength={100}
                        />
                      </View>
                      <View style={{ flexDirection: 'row' }}>
                        <Button
                          type="Primary"
                          title={translate('save') as string}
                          disabled={actionButtonsDisabled}
                          onPress={this.usingCustomServer}
                          style={{ marginBottom: 10 }}
                        />
                        <Button
                          type="Secondary"
                          title={translate('cancel') as string}
                          disabled={actionButtonsDisabled}
                          onPress={() => this.setState({ customServerShow: false })}
                          style={{ marginBottom: 10, marginLeft: 10 }}
                        />
                      </View>
                    </View>
                  )}

                  {(!netInfo.isConnected ||
                    netInfo.type === NetInfoStateType.cellular ||
                    netInfo.isConnectionExpensive) && (
                    <>
                      <BoldText style={{ fontSize: 15, marginBottom: 3 }}>
                        {translate('report.networkstatus') as string}
                      </BoldText>
                      <View
                        style={{
                          display: 'flex',
                          flexDirection: 'row',
                          alignItems: 'flex-end',
                          marginHorizontal: 20,
                        }}>
                        <View style={{ display: 'flex', flexDirection: 'column', marginBottom: 10 }}>
                          {!netInfo.isConnected && (
                            <BoldText style={{ fontSize: 15, color: 'red' }}>
                              {' '}
                              {translate('report.nointernet') as string}{' '}
                            </BoldText>
                          )}
                          {netInfo.type === NetInfoStateType.cellular && (
                            <BoldText style={{ fontSize: 15, color: 'yellow' }}>
                              {' '}
                              {translate('report.cellulardata') as string}{' '}
                            </BoldText>
                          )}
                          {netInfo.isConnectionExpensive && (
                            <BoldText style={{ fontSize: 15, color: 'yellow' }}>
                              {' '}
                              {translate('report.connectionexpensive') as string}{' '}
                            </BoldText>
                          )}
                        </View>
                      </View>
                    </>
                  )}

                  {mode === 'basic' && netInfo.isConnected && (
                    <View
                      style={{
                        display: 'flex',
                        flexDirection: 'row',
                        alignItems: 'flex-end',
                        marginHorizontal: 20,
                        marginBottom: 20,
                      }}>
                      <View
                        style={{
                          display: 'flex',
                          flexDirection: 'column',
                          marginTop: 20,
                          borderColor: colors.primary,
                          borderWidth: 1,
                          borderRadius: 5,
                          padding: 5,
                        }}>
                        <BoldText style={{ fontSize: 15, color: colors.primaryDisabled }}>
                          {translate('loadingapp.noopenwallet-message') as string}
                        </BoldText>
                      </View>
                    </View>
                  )}

                  {netInfo.isConnected &&
                    !customServerShow &&
                    isEqual(server, SERVER_DEFAULT_1) &&
                    !!SERVER_DEFAULT_0.uri && (
                      <Button
                        type="Primary"
                        title={
                          (mode === 'basic'
                            ? translate('loadingapp.changeserver-basic')
                            : translate('loadingapp.changeserver')) as string
                        }
                        disabled={actionButtonsDisabled}
                        onPress={() => this.usingDefaultServer_0(mode)}
                        style={{ marginBottom: 10 }}
                      />
                    )}
                  {netInfo.isConnected &&
                    !customServerShow &&
                    isEqual(server, SERVER_DEFAULT_0) &&
                    !!SERVER_DEFAULT_1.uri && (
                      <Button
                        type="Primary"
                        title={
                          (mode === 'basic'
                            ? translate('loadingapp.changeserver-basic')
                            : translate('loadingapp.changeserver')) as string
                        }
                        disabled={actionButtonsDisabled}
                        onPress={() => this.usingDefaultServer_1(mode)}
                        style={{ marginBottom: 10 }}
                      />
                    )}
                  {netInfo.isConnected &&
                    !customServerShow &&
                    !isEqual(server, SERVER_DEFAULT_0) &&
                    !isEqual(server, SERVER_DEFAULT_1) &&
                    !!SERVER_DEFAULT_0.uri && (
                      <Button
                        type="Primary"
                        title={
                          (mode === 'basic'
                            ? translate('loadingapp.changeserver-basic')
                            : translate('loadingapp.changeserver')) as string
                        }
                        disabled={actionButtonsDisabled}
                        onPress={() => this.usingDefaultServer_0(mode)}
                        style={{ marginBottom: 10 }}
                      />
                    )}

                  {mode !== 'basic' && netInfo.isConnected && (
                    <Button
                      testID="loadingapp.createnewwallet"
                      type="Primary"
                      title={translate('loadingapp.createnewwallet') as string}
                      disabled={actionButtonsDisabled}
                      onPress={this.createNewWallet}
                      style={{ marginBottom: 10, marginTop: 10 }}
                    />
                  )}

                  {mode !== 'basic' && netInfo.isConnected && walletExists && (
                    <Button
                      type="Primary"
                      title={translate('loadingapp.opencurrentwallet') as string}
                      disabled={actionButtonsDisabled}
                      onPress={this.componentDidMount}
                      style={{ marginBottom: 10 }}
                    />
                  )}

                  {mode !== 'basic' && netInfo.isConnected && (
                    <View style={{ marginTop: 20, display: 'flex', alignItems: 'center' }}>
                      <Button
                        testID="loadingapp.restorewalletseed"
                        type="Secondary"
                        title={translate('loadingapp.restorewalletseed') as string}
                        disabled={actionButtonsDisabled}
                        onPress={() => this.getwalletToRestore('seed')}
                        style={{ marginBottom: 10 }}
                      />
                    </View>
                  )}

                  {mode !== 'basic' && netInfo.isConnected && (
                    <View style={{ marginTop: 20, display: 'flex', alignItems: 'center' }}>
                      <Button
                        testID="loadingapp.restorewalletufvk"
                        type="Secondary"
                        title={translate('loadingapp.restorewalletufvk') as string}
                        disabled={actionButtonsDisabled}
                        onPress={() => this.getwalletToRestore('ufvk')}
                        style={{ marginBottom: 10 }}
                      />
                    </View>
                  )}

                  {!netInfo.isConnected && (
                    <View
                      style={{
                        display: 'flex',
                        flexDirection: 'row',
                        alignItems: 'flex-end',
                        marginHorizontal: 20,
                      }}>
                      <View
                        style={{
                          display: 'flex',
                          flexDirection: 'column',
                          marginTop: 20,
                          borderColor: colors.primary,
                          borderWidth: 1,
                          borderRadius: 5,
                          padding: 5,
                        }}>
                        <BoldText style={{ fontSize: 15, color: colors.primaryDisabled }}>
                          {translate('loadingapp.nointernet-message') as string}
                        </BoldText>
                      </View>
                    </View>
                  )}
                </View>
              </ScrollView>
            </>
          )}
          {screen === 2 && wallet && (
            <Modal
              animationType="slide"
              transparent={false}
              visible={screen === 2}
              onRequestClose={() => this.navigateToLoadedApp()}>
              <Suspense
                fallback={
                  <View>
                    <Text>{translate('loading') as string}</Text>
                  </View>
                }>
                <Seed
                  onClickOK={() => this.navigateToLoadedApp()}
                  onClickCancel={() => this.navigateToLoadedApp()}
                  action={'new'}
                  set_privacy_option={this.set_privacy_option}
                />
              </Suspense>
            </Modal>
          )}
          {screen === 3 && (
            <Modal
              animationType="slide"
              transparent={false}
              visible={screen === 3}
              onRequestClose={() => this.setState({ screen: 1 })}>
              <Suspense
                fallback={
                  <View>
                    <Text>{translate('loading') as string}</Text>
                  </View>
                }>
                <Seed
                  onClickOK={(s: string, b: number) => this.doRestore(s, b, 'seed')}
                  onClickCancel={() => this.setState({ screen: 1, actionButtonsDisabled: false })}
                  action={'restore'}
                  set_privacy_option={this.set_privacy_option}
                />
              </Suspense>
            </Modal>
          )}
          {screen === 4 && (
            <Modal
              animationType="slide"
              transparent={false}
              visible={screen === 4}
              onRequestClose={() => this.setState({ screen: 1 })}>
              <Suspense
                fallback={
                  <View>
                    <Text>{translate('loading') as string}</Text>
                  </View>
                }>
                <ImportUfvk
                  onClickOK={(s: string, b: number) => this.doRestore(s, b, 'ufvk')}
                  onClickCancel={() => this.setState({ screen: 1 })}
                />
              </Suspense>
            </Modal>
          )}
        </SafeAreaView>
      </ContextAppLoadingProvider>
    );
  }
}
