import React, { Component, Suspense, useState, useMemo, useCallback, useEffect } from 'react';
import { Modal, View, Text, Alert, I18nManager, Dimensions, EmitterSubscription, ScaledSize } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { faList, faUpload, faDownload, faCog, faAddressBook } from '@fortawesome/free-solid-svg-icons';
import { useTheme } from '@react-navigation/native';
import SideMenu from 'react-native-side-menu-updated';
import Toast from 'react-native-simple-toast';
import { I18n, TranslateOptions } from 'i18n-js';
import * as RNLocalize from 'react-native-localize';
import { isEqual } from 'lodash';
import { StackScreenProps } from '@react-navigation/stack';

import RPC from '../rpc';
import RPCModule from '../../components/RPCModule';
import {
  AppStateLoaded,
  SyncingStatusReportClass,
  TotalBalanceClass,
  SendPageStateClass,
  ReceivePageStateClass,
  InfoType,
  TransactionType,
  ToAddrClass,
  ErrorModalDataClass,
  SendJsonToTypeType,
  SyncingStatusType,
  SendProgressClass,
  WalletSettingsClass,
  AddressClass,
} from '../AppState';
import Utils from '../utils';
import { ThemeType } from '../types';
import SettingsFileImpl from '../../components/Settings/SettingsFileImpl';
import { ContextLoadedProvider, defaultAppStateLoaded } from '../context';
import platform from '../platform/platform';

const Transactions = React.lazy(() => import('../../components/Transactions'));
const Send = React.lazy(() => import('../../components/Send'));
const Receive = React.lazy(() => import('../../components/Receive'));
const Legacy = React.lazy(() => import('../../components/Legacy'));
const About = React.lazy(() => import('../../components/About'));
const Seed = React.lazy(() => import('../../components/Seed'));
const Info = React.lazy(() => import('../../components/Info'));
const SyncReport = React.lazy(() => import('../../components/SyncReport'));
const Rescan = React.lazy(() => import('../../components/Rescan'));
const Settings = React.lazy(() => import('../../components/Settings'));
const Pools = React.lazy(() => import('../../components/Pools'));

const Menu = React.lazy(() => import('./components/Menu'));
const ComputingTxContent = React.lazy(() => import('./components/ComputingTxContent'));

const en = require('../translations/en.json');
const es = require('../translations/es.json');

const Tab = createBottomTabNavigator();

//const useForceUpdate = () => {
//  const [value, setValue] = useState(0);
//  return () => {
//    const newValue = value + 1;
//    return setValue(newValue);
//  };
//};

type LoadedAppProps = {
  navigation: StackScreenProps<any>['navigation'];
  route: StackScreenProps<any>['route'];
};

export default function LoadedApp(props: LoadedAppProps) {
  const theme = useTheme() as unknown as ThemeType;
  const [language, setLanguage] = useState('en' as 'en' | 'es');
  const [currency, setCurrency] = useState('' as 'USD' | '');
  const [loading, setLoading] = useState(true);
  //const forceUpdate = useForceUpdate();
  const file = useMemo(
    () => ({
      en: en,
      es: es,
    }),
    [],
  );
  const i18n = useMemo(() => new I18n(file), [file]);

  const translate = (key: string, config?: TranslateOptions) => i18n.t(key, config);

  const setI18nConfig = useCallback(async () => {
    // fallback if no available language fits
    const fallback = { languageTag: 'en', isRTL: false };

    //console.log(RNLocalize.findBestAvailableLanguage(Object.keys(file)));
    //console.log(RNLocalize.getLocales());

    const { languageTag, isRTL } = RNLocalize.findBestAvailableLanguage(Object.keys(file)) || fallback;

    // clear translation cache
    //if (translate && translate.cache) {
    //  translate?.cache?.clear?.();
    //}
    // update layout direction
    I18nManager.forceRTL(isRTL);

    //I have to check what language is in the settings
    const settings = await SettingsFileImpl.readSettings();
    if (settings.language) {
      setLanguage(settings.language);
      i18n.locale = settings.language;
      //console.log('apploaded settings', settings.language, settings.currency);
    } else {
      const lang =
        languageTag === 'en' || languageTag === 'es'
          ? (languageTag as 'en' | 'es')
          : (fallback.languageTag as 'en' | 'es');
      setLanguage(lang);
      i18n.locale = lang;
      await SettingsFileImpl.writeSettings('language', lang);
      //console.log('apploaded NO settings', languageTag);
    }
    if (settings.currency) {
      setCurrency(settings.currency);
    } else {
      await SettingsFileImpl.writeSettings('currency', currency);
    }
  }, [currency, file, i18n]);

  useEffect(() => {
    (async () => {
      await setI18nConfig();
      setLoading(false);
    })();
  }, [setI18nConfig]);

  //const handleLocalizationChange = useCallback(() => {
  //  setI18nConfig();
  //  forceUpdate();
  //}, [setI18nConfig, forceUpdate]);

  //useEffect(() => {
  //  RNLocalize.addEventListener('change', handleLocalizationChange);
  //  return () => RNLocalize.removeEventListener('change', handleLocalizationChange);
  //}, [handleLocalizationChange]);

  if (loading) {
    return null;
  } else {
    return <LoadedAppClass {...props} theme={theme} translate={translate} language={language} currency={currency} />;
  }
}

type LoadedAppClassProps = {
  navigation: StackScreenProps<any>['navigation'];
  route: StackScreenProps<any>['route'];
  translate: (key: string, config?: TranslateOptions) => string;
  theme: ThemeType;
  language: 'en' | 'es';
  currency: 'USD' | '';
};

class LoadedAppClass extends Component<LoadedAppClassProps, AppStateLoaded> {
  rpc: RPC;
  dim: EmitterSubscription;

  constructor(props: LoadedAppClassProps) {
    super(props);

    const screen = Dimensions.get('screen');

    this.state = {
      ...defaultAppStateLoaded,
      navigation: props.navigation,
      route: props.route,
      sendPageState: new SendPageStateClass(new ToAddrClass(Utils.getNextToAddrID())),
      translate: props.translate,
      language: props.language,
      currency: props.currency,
      dimensions: {
        width: Number(screen.width.toFixed(0)),
        height: Number(screen.height.toFixed(0)),
        orientation: platform.isPortrait(screen) ? 'portrait' : 'landscape',
        deviceType: platform.isTablet(screen) ? 'tablet' : 'phone',
        scale: Number(screen.scale.toFixed(2)),
      },
    };

    this.rpc = new RPC(
      this.setSyncingStatusReport,
      this.setTotalBalance,
      this.setTransactionList,
      this.setAllAddresses,
      this.setWalletSettings,
      this.setInfo,
      this.setZecPrice,
      this.refreshUpdates,
      props.translate,
      props.currency,
    );

    this.dim = {} as EmitterSubscription;
  }

  componentDidMount = () => {
    this.clearToAddr();

    // Configure the RPC to start doing refreshes
    this.rpc.configure();

    this.dim = Dimensions.addEventListener('change', ({ screen }) => {
      this.setDimensions(screen);
      //console.log('++++++++++++++++++++++++++++++++++ change dims', Dimensions.get('screen'));
    });
  };

  componentWillUnmount = () => {
    this.rpc.clearTimers();
    this.dim?.remove();
  };

  setDimensions = (screen: ScaledSize) => {
    this.setState({
      dimensions: {
        width: Number(screen.width.toFixed(0)),
        height: Number(screen.height.toFixed(0)),
        orientation: platform.isPortrait(screen) ? 'portrait' : 'landscape',
        deviceType: platform.isTablet(screen) ? 'tablet' : 'phone',
        scale: Number(screen.scale.toFixed(2)),
      },
    });
  };

  getFullState = (): AppStateLoaded => {
    return this.state;
  };

  openErrorModal = (title: string, body: string) => {
    const errorModalData = new ErrorModalDataClass(title, body);
    errorModalData.modalIsOpen = true;

    this.setState({ errorModalData });
  };

  closeErrorModal = () => {
    const errorModalData = new ErrorModalDataClass('', '');
    errorModalData.modalIsOpen = false;

    this.setState({ errorModalData });
  };

  setTotalBalance = (totalBalance: TotalBalanceClass) => {
    if (!isEqual(this.state.totalBalance, totalBalance)) {
      //console.log('total balance');
      this.setState({ totalBalance });
    }
  };

  setSyncingStatusReport = (syncingStatusReport: SyncingStatusReportClass) => {
    this.setState({ syncingStatusReport });
  };

  setTransactionList = (transactions: TransactionType[]) => {
    if (!isEqual(this.state.transactions, transactions)) {
      //console.log('transactions');
      this.setState({ transactions });
    }
  };

  setAllAddresses = (addresses: AddressClass[]) => {
    const { uaAddress } = this.state;
    if (!isEqual(this.state.addresses, addresses) || uaAddress === '') {
      //console.log('addresses');
      if (uaAddress === '') {
        this.setState({ addresses, uaAddress: addresses[0].uaAddress });
      } else {
        this.setState({ addresses });
      }
    }
  };

  setWalletSettings = (walletSettings: WalletSettingsClass) => {
    this.setState({ walletSettings });
  };

  setSendPageState = (sendPageState: SendPageStateClass) => {
    this.setState({ sendPageState });
  };

  refreshUpdates = (inProgress: boolean, progress: number, blocks: string) => {
    const syncingStatus: SyncingStatusType = {
      inProgress,
      progress,
      blocks,
    };
    if (!isEqual(this.state.syncingStatus, syncingStatus)) {
      this.setState({ syncingStatus });
    }
  };

  clearToAddr = () => {
    const newToAddr = new ToAddrClass(Utils.getNextToAddrID());

    // Create the new state object
    const newState = new SendPageStateClass(new ToAddrClass(0));
    newState.toaddr = newToAddr;

    this.setSendPageState(newState);
  };

  setZecPrice = (price: number) => {
    //console.log(`Price = ${price}`);
    const { info } = this.state;

    const newInfo = Object.assign({}, info);
    newInfo.zecPrice = price;

    if (!isEqual(this.state.info, newInfo)) {
      this.setState({ info: newInfo });
    }
  };

  setRescanning = (rescanning: boolean) => {
    this.setState({ rescanning });
  };

  setComputingModalVisible = (visible: boolean) => {
    this.setState({ computingModalVisible: visible });
  };

  setSendProgress = (progress: SendProgressClass) => {
    this.setState({ sendProgress: progress });
  };

  setInfo = (newInfo: InfoType) => {
    // If the price is not set in this object, copy it over from the current object
    const { info } = this.state;
    if (info.zecPrice && !newInfo.zecPrice) {
      newInfo.zecPrice = info.zecPrice;
    }

    if (!isEqual(this.state.info, newInfo)) {
      this.setState({ info: newInfo });
    }
  };

  getSendManyJSON = (): Array<SendJsonToTypeType> => {
    const { sendPageState } = this.state;
    const json: Array<SendJsonToTypeType> = [sendPageState.toaddr].flatMap((to: ToAddrClass) => {
      const memo = to.memo || '';
      const amount = parseInt((Number(to.amount) * 10 ** 8).toFixed(0), 10);

      if (memo === '') {
        return [{ address: to.to, amount } as SendJsonToTypeType];
      } else if (memo.length <= 512) {
        return [{ address: to.to, amount, memo } as SendJsonToTypeType];
      } else {
        // If the memo is more than 512 bytes, then we split it into multiple transactions.
        // Each memo will be `(xx/yy)memo_part`. The prefix "(xx/yy)" is 7 bytes long, so
        // we'll split the memo into 512-7 = 505 bytes length
        const splits = Utils.utf16Split(memo, 505);
        const tos = [];

        // The first one contains all the tx value
        tos.push({ address: to.to, amount, memo: `(1/${splits.length})${splits[0]}` } as SendJsonToTypeType);

        for (let i = 1; i < splits.length; i++) {
          tos.push({
            address: to.to,
            amount: 0,
            memo: `(${i + 1}/${splits.length})${splits[i]}`,
          } as SendJsonToTypeType);
        }

        return tos;
      }
    });

    //console.log('Sending:');
    //console.log(json);

    return json;
  };

  sendTransaction = async (setSendProgress: (arg0: SendProgressClass) => void): Promise<String> => {
    try {
      // Construct a sendJson from the sendPage state
      const sendJson = this.getSendManyJSON();
      const txid = await this.rpc.sendTransaction(sendJson, setSendProgress);

      return txid;
    } catch (err) {
      //console.log('route sendtx error', err);
      throw err;
    }
  };

  // Get a single private key for this address, and return it as a string.
  getPrivKeyAsString = async (address: string): Promise<string> => {
    const pk = await RPC.rpc_getPrivKeyAsString(address);
    if (pk) {
      return pk;
    }
    return '';
  };

  // Getter methods, which are called by the components to update the state
  fetchAndSetSinglePrivKey = async (address: string) => {
    const key = await RPC.rpc_getPrivKeyAsString(address);
    const addressPrivateKeys = new Map<string, string>();
    if (key) {
      addressPrivateKeys.set(address, key);
      this.setState({ addressPrivateKeys });
    }
  };

  createNewAddress = async (addressType: 'tzo') => {
    // Create a new address
    const newaddress = await RPC.rpc_createNewAddress(addressType);
    //console.log(`Created new Address ${newaddress}`);

    // And then fetch the list of addresses again to refresh (totalBalance gets all addresses)
    this.fetchTotalBalance();

    const { receivePageState } = this.state;
    const newRerenderKey = receivePageState.rerenderKey + 1;

    if (newaddress) {
      const newReceivePageState = new ReceivePageStateClass(newaddress);
      newReceivePageState.rerenderKey = newRerenderKey;
      this.setState({ receivePageState: newReceivePageState });
    }
  };

  doRefresh = async () => {
    await this.rpc.refresh(false);
  };

  fetchTotalBalance = async () => {
    await this.rpc.fetchTotalBalance();
  };

  clearTimers = () => {
    this.rpc.clearTimers();
  };

  toggleMenuDrawer = () => {
    this.setState({
      isMenuDrawerOpen: !this.state.isMenuDrawerOpen,
    });
  };

  updateMenuState = (isMenuDrawerOpen: boolean) => {
    this.setState({ isMenuDrawerOpen });
  };

  fetchWalletSeedAndBirthday = async () => {
    const walletSeed = await RPC.rpc_fetchSeedAndBirthday();
    if (walletSeed) {
      this.setState({ walletSeed });
    }
  };

  startRescan = () => {
    this.setRescanning(true);
    this.rpc.rescan();
  };

  onMenuItemSelected = async (item: string) => {
    const { info } = this.state;
    this.setState({
      isMenuDrawerOpen: false,
      selectedMenuDrawerItem: item,
    });

    await this.fetchWalletSeedAndBirthday();

    // Depending on the menu item, open the appropriate modal
    if (item === 'About') {
      this.setState({ aboutModalVisible: true });
    } else if (item === 'Rescan') {
      this.setState({ rescanModalVisible: true });
    } else if (item === 'Settings') {
      this.setState({ settingsModalVisible: true });
    } else if (item === 'Info') {
      this.setState({ infoModalVisible: true });
    } else if (item === 'Sync Report') {
      this.setState({ syncReportModalVisible: true });
    } else if (item === 'Fund Pools') {
      this.setState({ poolsModalVisible: true });
    } else if (item === 'Wallet Seed') {
      this.setState({ seedViewModalVisible: true });
    } else if (item === 'Change Wallet') {
      this.setState({ seedChangeModalVisible: true });
    } else if (item === 'Restore Wallet Backup') {
      if (info.currencyName && info.currencyName !== 'ZEC') {
        Toast.show(this.props.translate('loadedapp.restoremainnet-error'), Toast.LONG);
        return;
      }
      if (info.currencyName) {
        this.setState({ seedBackupModalVisible: true });
      }
    }
  };

  set_wallet_option = async (name: string, value: string) => {
    await RPC.rpc_setWalletSettingOption(name, value);

    // Refetch the settings to update
    this.rpc.fetchWalletSettings();
  };

  set_server_option = async (name: 'server' | 'currency' | 'language', value: string) => {
    const resultStrServer: string = await RPCModule.execute('changeserver', value);
    if (resultStrServer.toLowerCase().startsWith('error')) {
      //console.log(`Error change server ${value} - ${resultStrServer}`);
      Toast.show(`${this.props.translate('loadedapp.changeservernew-error')} ${value}`, Toast.LONG);
      return;
    } else {
      //console.log(`change server ok ${value}`);
    }

    await this.rpc.setInRefresh(false);
    const error = await RPCModule.loadExistingWallet(value);
    if (!error.toLowerCase().startsWith('error')) {
      // Load the wallet and navigate to the transactions screen
      //console.log(`wallet loaded ok ${value}`);
      await SettingsFileImpl.writeSettings(name, value);
      // Refetch the settings to update
      this.rpc.fetchWalletSettings();
      return;
    } else {
      //console.log(`Error Reading Wallet ${value} - ${error}`);
      Toast.show(`${this.props.translate('loadedapp.readingwallet-error')} ${value}`, Toast.LONG);

      const old_settings = await SettingsFileImpl.readSettings();
      const resultStr: string = await RPCModule.execute('changeserver', old_settings.server);
      if (resultStr.toLowerCase().startsWith('error')) {
        //console.log(`Error change server ${old_settings.server} - ${resultStr}`);
        Toast.show(`${this.props.translate('loadedapp.changeserverold-error')} ${value}`, Toast.LONG);
        //return;
      } else {
        //console.log(`change server ok ${old_settings.server} - ${resultStr}`);
      }

      // go to the seed screen for changing the wallet for another in the new server
      await this.fetchWalletSeedAndBirthday();
      this.setState({
        seedServerModalVisible: true,
        newServer: value,
      });
    }
  };

  set_currency_option = async (name: 'server' | 'currency' | 'language', value: string) => {
    await SettingsFileImpl.writeSettings(name, value);

    // Refetch the settings to update
    this.rpc.fetchWalletSettings();
    this.navigateToLoading();
  };

  set_language_option = async (name: 'server' | 'currency' | 'language', value: string) => {
    await SettingsFileImpl.writeSettings(name, value);

    // Refetch the settings to update
    this.rpc.fetchWalletSettings();
    this.navigateToLoading();
  };

  navigateToLoading = () => {
    const { navigation } = this.props;

    this.rpc.clearTimers();
    navigation.reset({
      index: 0,
      routes: [{ name: 'LoadingApp' }],
    });
  };

  onClickOKChangeWallet = async () => {
    const { info } = this.state;
    const resultStr =
      info.currencyName && info.currencyName !== 'ZEC'
        ? await this.rpc.changeWalletNoBackup()
        : await this.rpc.changeWallet();

    //console.log("jc change", resultStr);
    if (resultStr.toLowerCase().startsWith('error')) {
      //console.log(`Error change wallet. ${resultStr}`);
      Alert.alert(this.props.translate('loadedapp.changingwallet-label'), resultStr);
      return;
    }

    await this.rpc.setInRefresh(false);
    this.setState({ seedChangeModalVisible: false });
    this.navigateToLoading();
  };

  onClickOKRestoreBackup = async () => {
    const resultStr = await this.rpc.restoreBackup();

    //console.log("jc restore", resultStr);
    if (resultStr.toLowerCase().startsWith('error')) {
      //console.log(`Error restore backup wallet. ${resultStr}`);
      Alert.alert(this.props.translate('loadedapp.restoringwallet-label'), resultStr);
      return;
    }

    await this.rpc.setInRefresh(false);
    this.setState({ seedBackupModalVisible: false });
    this.navigateToLoading();
  };

  onClickOKServerWallet = async () => {
    const resultStr: string = await RPCModule.execute('changeserver', this.state.newServer);
    if (resultStr.toLowerCase().startsWith('error')) {
      //console.log(`Error change server ${value} - ${resultStr}`);
      Toast.show(`${this.props.translate('loadedapp.changeservernew-error')} ${resultStr}`, Toast.LONG);
      return;
    } else {
      //console.log(`change server ok ${value}`);
    }

    if (this.state.newServer) {
      await SettingsFileImpl.writeSettings('server', this.state.newServer);
    }

    const { info } = this.state;

    const resultStr2 =
      info.currencyName && info.currencyName !== 'ZEC'
        ? await this.rpc.changeWalletNoBackup()
        : await this.rpc.changeWallet();
    //console.log("jc change", resultStr);
    if (resultStr2.toLowerCase().startsWith('error')) {
      //console.log(`Error change wallet. ${resultStr}`);
      Alert.alert(this.props.translate('loadedapp.changingwallet-label'), resultStr2);
      //return;
    }

    await this.rpc.setInRefresh(false);
    this.setState({ seedServerModalVisible: false });
    this.navigateToLoading();
  };

  setUaAddress = (uaAddress: string) => {
    this.setState({ uaAddress });
  };

  syncingStatusMoreInfoOnClick = async () => {
    await this.fetchWalletSeedAndBirthday();
    this.setState({ syncReportModalVisible: true });
  };

  poolsMoreInfoOnClick = async () => {
    this.setState({ poolsModalVisible: true });
  };

  render() {
    const {
      aboutModalVisible,
      infoModalVisible,
      syncReportModalVisible,
      poolsModalVisible,
      settingsModalVisible,
      computingModalVisible,
      rescanModalVisible,
      seedViewModalVisible,
      seedChangeModalVisible,
      seedBackupModalVisible,
      seedServerModalVisible,
    } = this.state;
    const { translate } = this.props;
    const { colors } = this.props.theme;

    const menu = (
      <Suspense
        fallback={
          <View>
            <Text>Loading...</Text>
          </View>
        }>
        <Menu onItemSelected={this.onMenuItemSelected} />
      </Suspense>
    );

    const fnTabBarIcon = (route: StackScreenProps<any>['route'], focused: boolean) => {
      var iconName;

      if (route.name === translate('loadedapp.wallet-menu')) {
        iconName = faList;
      } else if (route.name === translate('loadedapp.send-menu')) {
        iconName = faUpload;
      } else if (route.name === translate('loadedapp.uas-menu')) {
        iconName = faDownload;
      } else if (route.name === translate('loadedapp.legacy-menu')) {
        iconName = faAddressBook;
      } else {
        iconName = faCog;
      }

      const iconColor = focused ? colors.background : colors.money;
      return <FontAwesomeIcon icon={iconName} color={iconColor} />;
    };

    //console.log('++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++');
    //console.log('render LoadedApp', this.state.info);
    //const res = async () => await RPCModule.execute('testbip', '');
    //res().then(r => console.log(r));

    return (
      <ContextLoadedProvider value={this.state}>
        <SideMenu
          menu={menu}
          isOpen={this.state.isMenuDrawerOpen}
          onChange={(isOpen: boolean) => this.updateMenuState(isOpen)}>
          <Modal
            animationType="slide"
            transparent={false}
            visible={aboutModalVisible}
            onRequestClose={() => this.setState({ aboutModalVisible: false })}>
            <Suspense
              fallback={
                <View>
                  <Text>{translate('loading')}</Text>
                </View>
              }>
              <About closeModal={() => this.setState({ aboutModalVisible: false })} />
            </Suspense>
          </Modal>

          <Modal
            animationType="slide"
            transparent={false}
            visible={infoModalVisible}
            onRequestClose={() => this.setState({ infoModalVisible: false })}>
            <Suspense
              fallback={
                <View>
                  <Text>{translate('loading')}</Text>
                </View>
              }>
              <Info closeModal={() => this.setState({ infoModalVisible: false })} />
            </Suspense>
          </Modal>

          <Modal
            animationType="slide"
            transparent={false}
            visible={syncReportModalVisible}
            onRequestClose={() => this.setState({ syncReportModalVisible: false })}>
            <Suspense
              fallback={
                <View>
                  <Text>{translate('loading')}</Text>
                </View>
              }>
              <SyncReport closeModal={() => this.setState({ syncReportModalVisible: false })} />
            </Suspense>
          </Modal>

          <Modal
            animationType="slide"
            transparent={false}
            visible={poolsModalVisible}
            onRequestClose={() => this.setState({ poolsModalVisible: false })}>
            <Suspense
              fallback={
                <View>
                  <Text>{translate('loading')}</Text>
                </View>
              }>
              <Pools closeModal={() => this.setState({ poolsModalVisible: false })} />
            </Suspense>
          </Modal>

          <Modal
            animationType="slide"
            transparent={false}
            visible={rescanModalVisible}
            onRequestClose={() => this.setState({ rescanModalVisible: false })}>
            <Suspense
              fallback={
                <View>
                  <Text>{translate('loading')}</Text>
                </View>
              }>
              <Rescan closeModal={() => this.setState({ rescanModalVisible: false })} startRescan={this.startRescan} />
            </Suspense>
          </Modal>

          <Modal
            animationType="slide"
            transparent={false}
            visible={settingsModalVisible}
            onRequestClose={() => this.setState({ settingsModalVisible: false })}>
            <Suspense
              fallback={
                <View>
                  <Text>{translate('loading')}</Text>
                </View>
              }>
              <Settings
                closeModal={() => this.setState({ settingsModalVisible: false })}
                set_wallet_option={this.set_wallet_option}
                set_server_option={this.set_server_option}
                set_currency_option={this.set_currency_option}
                set_language_option={this.set_language_option}
              />
            </Suspense>
          </Modal>

          <Modal
            animationType="slide"
            transparent={false}
            visible={seedViewModalVisible}
            onRequestClose={() => this.setState({ seedViewModalVisible: false })}>
            <Suspense
              fallback={
                <View>
                  <Text>{translate('loading')}</Text>
                </View>
              }>
              <Seed
                onClickOK={() => this.setState({ seedViewModalVisible: false })}
                onClickCancel={() => this.setState({ seedViewModalVisible: false })}
                action={'view'}
              />
            </Suspense>
          </Modal>

          <Modal
            animationType="slide"
            transparent={false}
            visible={seedChangeModalVisible}
            onRequestClose={() => this.setState({ seedChangeModalVisible: false })}>
            <Suspense
              fallback={
                <View>
                  <Text>{translate('loading')}</Text>
                </View>
              }>
              <Seed
                onClickOK={() => this.onClickOKChangeWallet()}
                onClickCancel={() => this.setState({ seedChangeModalVisible: false })}
                action={'change'}
              />
            </Suspense>
          </Modal>

          <Modal
            animationType="slide"
            transparent={false}
            visible={seedBackupModalVisible}
            onRequestClose={() => this.setState({ seedBackupModalVisible: false })}>
            <Suspense
              fallback={
                <View>
                  <Text>{translate('loading')}</Text>
                </View>
              }>
              <Seed
                onClickOK={() => this.onClickOKRestoreBackup()}
                onClickCancel={() => this.setState({ seedBackupModalVisible: false })}
                action={'backup'}
              />
            </Suspense>
          </Modal>

          <Modal
            animationType="slide"
            transparent={false}
            visible={seedServerModalVisible}
            onRequestClose={() => this.setState({ seedServerModalVisible: false })}>
            <Suspense
              fallback={
                <View>
                  <Text>{translate('loading')}</Text>
                </View>
              }>
              <Seed
                onClickOK={() => this.onClickOKServerWallet()}
                onClickCancel={() => this.setState({ seedServerModalVisible: false })}
                action={'server'}
              />
            </Suspense>
          </Modal>

          <Modal
            animationType="slide"
            transparent={false}
            visible={computingModalVisible}
            onRequestClose={() => this.setState({ computingModalVisible: false })}>
            <Suspense
              fallback={
                <View>
                  <Text>{translate('loading')}</Text>
                </View>
              }>
              <ComputingTxContent />
            </Suspense>
          </Modal>

          <Tab.Navigator
            initialRouteName={translate('loadedapp.wallet-menu')}
            screenOptions={({ route }) => ({
              tabBarIcon: ({ focused }) => fnTabBarIcon(route, focused),
              tabBarActiveTintColor: colors.background,
              tabBarActiveBackgroundColor: colors.primary,
              tabBarInactiveTintColor: colors.money,
              tabBarLabelStyle: { fontSize: 14 },
              tabBarStyle: {
                borderRadius: 0,
                borderTopColor: colors.primary,
                borderTopWidth: 1,
              },
              headerShown: false,
            })}>
            <Tab.Screen name={translate('loadedapp.wallet-menu')}>
              {() => (
                <>
                  <Suspense
                    fallback={
                      <View>
                        <Text>{translate('loading')}</Text>
                      </View>
                    }>
                    <Transactions
                      doRefresh={this.doRefresh}
                      toggleMenuDrawer={this.toggleMenuDrawer}
                      setComputingModalVisible={this.setComputingModalVisible}
                      syncingStatusMoreInfoOnClick={this.syncingStatusMoreInfoOnClick}
                      poolsMoreInfoOnClick={this.poolsMoreInfoOnClick}
                    />
                  </Suspense>
                </>
              )}
            </Tab.Screen>
            <Tab.Screen name={translate('loadedapp.send-menu')}>
              {() => (
                <>
                  <Suspense
                    fallback={
                      <View>
                        <Text>{translate('loading')}</Text>
                      </View>
                    }>
                    <Send
                      setSendPageState={this.setSendPageState}
                      sendTransaction={this.sendTransaction}
                      clearToAddr={this.clearToAddr}
                      setSendProgress={this.setSendProgress}
                      toggleMenuDrawer={this.toggleMenuDrawer}
                      setComputingModalVisible={this.setComputingModalVisible}
                      syncingStatusMoreInfoOnClick={this.syncingStatusMoreInfoOnClick}
                      poolsMoreInfoOnClick={this.poolsMoreInfoOnClick}
                    />
                  </Suspense>
                </>
              )}
            </Tab.Screen>
            <Tab.Screen name={translate('loadedapp.uas-menu')}>
              {() => (
                <>
                  <Suspense
                    fallback={
                      <View>
                        <Text>{translate('loading')}</Text>
                      </View>
                    }>
                    <Receive
                      fetchTotalBalance={this.fetchTotalBalance}
                      setUaAddress={this.setUaAddress}
                      toggleMenuDrawer={this.toggleMenuDrawer}
                      syncingStatusMoreInfoOnClick={this.syncingStatusMoreInfoOnClick}
                      poolsMoreInfoOnClick={this.poolsMoreInfoOnClick}
                      startRescan={this.startRescan}
                    />
                  </Suspense>
                </>
              )}
            </Tab.Screen>
            <Tab.Screen name={translate('loadedapp.legacy-menu')}>
              {() => (
                <>
                  <Suspense
                    fallback={
                      <View>
                        <Text>{translate('loading')}</Text>
                      </View>
                    }>
                    <Legacy
                      fetchTotalBalance={this.fetchTotalBalance}
                      toggleMenuDrawer={this.toggleMenuDrawer}
                      startRescan={this.startRescan}
                    />
                  </Suspense>
                </>
              )}
            </Tab.Screen>
          </Tab.Navigator>
        </SideMenu>
      </ContextLoadedProvider>
    );
  }
}
