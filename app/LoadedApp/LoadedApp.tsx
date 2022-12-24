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
import { memoize, isEqual } from 'lodash';
import { StackScreenProps } from '@react-navigation/stack';

import RPC from '../rpc';
import RPCModule from '../../components/RPCModule';
import {
  AppStateLoaded,
  SyncStatusReport,
  TotalBalance,
  SendPageState,
  ReceivePageState,
  InfoType,
  Transaction,
  ToAddr,
  ErrorModalData,
  SendJsonToType,
  SyncStatus,
  SendProgress,
  WalletSettings,
  SettingsFileEntry,
  Address,
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

const useForceUpdate = () => {
  const [value, setValue] = useState(0);
  return () => {
    const newValue = value + 1;
    return setValue(newValue);
  };
};

type LoadedAppProps = {
  navigation: StackScreenProps<any>['navigation'];
  route: StackScreenProps<any>['route'];
};

export default function LoadedApp(props: LoadedAppProps) {
  const theme = useTheme() as unknown as ThemeType;
  const forceUpdate = useForceUpdate();
  const file = useMemo(
    () => ({
      en: en,
      es: es,
    }),
    [],
  );
  const i18n = useMemo(() => new I18n(file), [file]);

  const translate = memoize(
    (key: string, config?: TranslateOptions) => i18n.t(key, config),
    (key: string, config?: TranslateOptions) => (config ? key + JSON.stringify(config) : key),
  );

  const setI18nConfig = useCallback(() => {
    // fallback if no available language fits
    const fallback = { languageTag: 'en', isRTL: false };

    //console.log(RNLocalize.findBestAvailableLanguage(Object.keys(file)));
    //console.log(RNLocalize.getLocales());

    const { languageTag, isRTL } = RNLocalize.findBestAvailableLanguage(Object.keys(file)) || fallback;

    // clear translation cache
    if (translate && translate.cache) {
      translate?.cache?.clear?.();
    }
    // update layout direction
    I18nManager.forceRTL(isRTL);

    i18n.locale = languageTag;
  }, [file, i18n, translate]);

  useEffect(() => {
    setI18nConfig();
  }, [setI18nConfig]);

  const handleLocalizationChange = useCallback(() => {
    setI18nConfig();
    forceUpdate();
  }, [setI18nConfig, forceUpdate]);

  useEffect(() => {
    RNLocalize.addEventListener('change', handleLocalizationChange);
    return () => RNLocalize.removeEventListener('change', handleLocalizationChange);
  }, [handleLocalizationChange]);

  return <LoadedAppClass {...props} theme={theme} translate={translate} />;
}

type LoadedAppClassProps = {
  navigation: StackScreenProps<any>['navigation'];
  route: StackScreenProps<any>['route'];
  translate: (key: string, config?: TranslateOptions) => any;
  theme: ThemeType;
};

class LoadedAppClass extends Component<LoadedAppClassProps, AppStateLoaded> {
  rpc: RPC;
  dim: EmitterSubscription;

  constructor(props: LoadedAppClassProps) {
    super(props);

    this.state = defaultAppStateLoaded;

    this.rpc = new RPC(
      this.setSyncStatusReport,
      this.setTotalBalance,
      this.setTransactionList,
      this.setAllAddresses,
      this.setWalletSettings,
      this.setInfo,
      this.setZecPrice,
      this.refreshUpdates,
      props.translate,
    );

    this.dim = {} as EmitterSubscription;
  }

  componentDidMount = () => {
    this.setDimensions(Dimensions.get('screen'));
    this.setState({
      navigation: this.props.navigation,
      route: this.props.route,
      sendPageState: new SendPageState(new ToAddr(Utils.getNextToAddrID())),
      translate: this.props.translate,
    });
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
    const errorModalData = new ErrorModalData(title, body);
    errorModalData.modalIsOpen = true;

    this.setState({ errorModalData });
  };

  closeErrorModal = () => {
    const errorModalData = new ErrorModalData('', '');
    errorModalData.modalIsOpen = false;

    this.setState({ errorModalData });
  };

  setTotalBalance = (totalBalance: TotalBalance) => {
    if (!isEqual(this.state.totalBalance, totalBalance)) {
      //console.log('total balance');
      this.setState({ totalBalance });
    }
  };

  setSyncStatusReport = (syncStatusReport: SyncStatusReport) => {
    this.setState({ syncStatusReport });
  };

  setTransactionList = (transactions: Transaction[]) => {
    if (!isEqual(this.state.transactions, transactions)) {
      //console.log('transactions');
      this.setState({ transactions });
    }
  };

  setAllAddresses = (addresses: Address[]) => {
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

  setWalletSettings = (wallet_settings: WalletSettings) => {
    this.setState({ wallet_settings });
  };

  setSendPageState = (sendPageState: SendPageState) => {
    this.setState({ sendPageState });
  };

  refreshUpdates = (inProgress: boolean, progress: number, blocks: string) => {
    const syncingStatus: SyncStatus = {
      inProgress,
      progress,
      blocks,
    };
    if (!isEqual(this.state.syncingStatus, syncingStatus)) {
      this.setState({ syncingStatus });
    }
  };

  clearToAddr = () => {
    const newToAddr = new ToAddr(Utils.getNextToAddrID());

    // Create the new state object
    const newState = new SendPageState(new ToAddr(0));
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

  setSendProgress = (progress: SendProgress) => {
    this.setState({ sendProgress: progress });
  };

  setInfo = (newInfo: InfoType) => {
    // If the price is not set in this object, copy it over from the current object
    const { info } = this.state;
    if (!!info && !!info.zecPrice && !newInfo.zecPrice) {
      newInfo.zecPrice = info.zecPrice;
    }

    if (!isEqual(this.state.info, newInfo)) {
      this.setState({ info: newInfo });
    }
  };

  getSendManyJSON = (): Array<SendJsonToType> => {
    const { sendPageState } = this.state;
    const json = [sendPageState.toaddr].flatMap((to: ToAddr) => {
      const memo = to.memo || '';
      const amount = parseInt((Number(to.amount) * 10 ** 8).toFixed(0), 10);

      if (memo === '') {
        return { address: to.to, amount };
      } else if (memo.length <= 512) {
        return { address: to.to, amount, memo };
      } else {
        // If the memo is more than 512 bytes, then we split it into multiple transactions.
        // Each memo will be `(xx/yy)memo_part`. The prefix "(xx/yy)" is 7 bytes long, so
        // we'll split the memo into 512-7 = 505 bytes length
        const splits = Utils.utf16Split(memo, 505);
        const tos = [];

        // The first one contains all the tx value
        tos.push({ address: to.to, amount, memo: `(1/${splits.length})${splits[0]}` });

        for (let i = 1; i < splits.length; i++) {
          tos.push({ address: to.to, amount: 0, memo: `(${i + 1}/${splits.length})${splits[i]}` });
        }

        return tos;
      }
    });

    //console.log('Sending:');
    //console.log(json);

    return json;
  };

  sendTransaction = async (setSendProgress: (arg0: SendProgress) => void): Promise<String> => {
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

    let newReceivePageState;
    if (newaddress) {
      newReceivePageState = new ReceivePageState(newaddress);
    }
    if (newReceivePageState) {
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

  clearTimers = async () => {
    await this.rpc.clearTimers();
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
      if (info && info.currencyName !== 'ZEC') {
        Toast.show(this.state.translate('loadedapp.restoremainnet-error'), Toast.LONG);
        return;
      }
      this.setState({ seedBackupModalVisible: true });
    }
  };

  set_wallet_option = async (name: string, value: string) => {
    await RPC.rpc_setWalletSettingOption(name, value);

    // Refetch the settings to update
    this.rpc.fetchWalletSettings();
  };

  set_server_option = async (value: string) => {
    const resultStrServer: string = await RPCModule.execute('changeserver', value);
    if (resultStrServer.toLowerCase().startsWith('error')) {
      //console.log(`Error change server ${value} - ${resultStrServer}`);
      Toast.show(`${this.state.translate('loadedapp.changeservernew-error')} ${value}`, Toast.LONG);
      return;
    } else {
      //console.log(`change server ok ${value}`);
    }

    await this.rpc.setInRefresh(false);
    const error = await RPCModule.loadExistingWallet(value);
    if (!error.toLowerCase().startsWith('error')) {
      // Load the wallet and navigate to the transactions screen
      //console.log(`wallet loaded ok ${value}`);
      const language = '';
      await SettingsFileImpl.writeSettings(new SettingsFileEntry(value, language));
      // Refetch the settings to update
      this.rpc.fetchWalletSettings();
      return;
    } else {
      //console.log(`Error Reading Wallet ${value} - ${error}`);
      Toast.show(`${this.state.translate('loadedapp.readingwallet-error')} ${value}`, Toast.LONG);

      const old_settings = await SettingsFileImpl.readSettings();
      const resultStr: string = await RPCModule.execute('changeserver', old_settings.server);
      if (resultStr.toLowerCase().startsWith('error')) {
        //console.log(`Error change server ${old_settings.server} - ${resultStr}`);
        Toast.show(`${this.state.translate('loadedapp.changeserverold-error')} ${value}`, Toast.LONG);
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

  navigateToLoading = async () => {
    const { navigation } = this.props;

    await this.rpc.clearTimers();
    navigation.reset({
      index: 0,
      routes: [{ name: 'LoadingApp' }],
    });
  };

  onClickOKChangeWallet = async () => {
    const { info } = this.state;
    const resultStr =
      info && info.currencyName !== 'ZEC' ? await this.rpc.changeWalletNoBackup() : await this.rpc.changeWallet();

    //console.log("jc change", resultStr);
    if (resultStr.toLowerCase().startsWith('error')) {
      //console.log(`Error change wallet. ${resultStr}`);
      Alert.alert(this.state.translate('loadedapp.changingwallet-label'), resultStr);
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
      Alert.alert(this.state.translate('loadedapp.restoringwallet-label'), resultStr);
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
      Toast.show(`${this.state.translate('loadedapp.changeservernew-error')} ${resultStr}`, Toast.LONG);
      return;
    } else {
      //console.log(`change server ok ${value}`);
    }

    if (this.state.newServer) {
      const language = '';
      await SettingsFileImpl.writeSettings(new SettingsFileEntry(this.state.newServer, language));
    }

    const { info } = this.state;

    const resultStr2 =
      info && info.currencyName !== 'ZEC' ? await this.rpc.changeWalletNoBackup() : await this.rpc.changeWallet();
    //console.log("jc change", resultStr);
    if (resultStr2.toLowerCase().startsWith('error')) {
      //console.log(`Error change wallet. ${resultStr}`);
      Alert.alert(this.state.translate('loadedapp.changingwallet-label'), resultStr2);
      //return;
    }

    await this.rpc.setInRefresh(false);
    this.setState({ seedServerModalVisible: false });
    this.navigateToLoading();
  };

  setUaAddress = (uaAddress: string) => {
    this.setState({ uaAddress: uaAddress });
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
      translate,
    } = this.state;
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
