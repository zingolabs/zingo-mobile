import React, { Component, Suspense } from 'react';
import { Modal, View, Text, Alert } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { faList, faUpload, faDownload, faCog, faAddressBook } from '@fortawesome/free-solid-svg-icons';
import { useTheme } from '@react-navigation/native';
import SideMenu from 'react-native-side-menu-updated';
import { isEqual } from 'lodash';
import Toast from 'react-native-simple-toast';
import { TranslateOptions } from 'i18n-js';

import RPC from '../rpc';
import RPCModule from '../../components/RPCModule';
import {
  AppState,
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

const Menu = React.lazy(() => import('./components/Menu'));
const ComputingTxContent = React.lazy(() => import('./components/ComputingTxContent'));

const Tab = createBottomTabNavigator();

type LoadedAppProps = {
  navigation: any;
  route: any;
  translate: (key: string, config?: TranslateOptions) => any;
};

export default function LoadedApp(props: LoadedAppProps) {
  const theme = useTheme() as unknown as ThemeType;

  return <LoadedAppClass {...props} theme={theme} />;
}

type LoadedAppClassProps = {
  navigation: any;
  route: any;
  translate: (key: string, config?: TranslateOptions) => any;
  theme: ThemeType;
};

class LoadedAppClass extends Component<LoadedAppClassProps, AppState> {
  rpc: RPC;

  constructor(props: any) {
    super(props);

    this.state = {
      syncStatusReport: new SyncStatusReport(),
      totalBalance: new TotalBalance(),
      addressPrivateKeys: new Map(),
      addresses: [],
      addressBook: [],
      transactions: null,
      sendPageState: new SendPageState(new ToAddr(0)),
      receivePageState: new ReceivePageState(),
      info: null,
      rescanning: false,
      wallet_settings: new WalletSettings(),
      syncingStatus: null,
      errorModalData: new ErrorModalData(),
      txBuildProgress: new SendProgress(),
      walletSeed: null,
      isMenuDrawerOpen: false,
      selectedMenuDrawerItem: '',
      aboutModalVisible: false,
      computingModalVisible: false,
      settingsModalVisible: false,
      infoModalVisible: false,
      rescanModalVisible: false,
      seedViewModalVisible: false,
      seedChangeModalVisible: false,
      seedBackupModalVisible: false,
      seedServerModalVisible: false,
      syncReportModalVisible: false,
      newServer: null,
      uaAddress: null,
    };

    this.rpc = new RPC(
      this.setSyncStatusReport,
      this.setTotalBalance,
      this.setTransactionList,
      this.setAllAddresses,
      this.setWalletSettings,
      this.setInfo,
      this.setZecPrice,
      this.refreshUpdates,
      this.props.translate,
    );

    // Create the initial ToAddr box
    this.state.sendPageState.toaddr = new ToAddr(Utils.getNextToAddrID());
  }

  componentDidMount = () => {
    this.clearToAddr();

    // Configure the RPC to start doing refreshes
    this.rpc.configure();
  };

  componentWillUnmount = () => {
    this.rpc.clearTimers();
  };

  getFullState = (): AppState => {
    return this.state;
  };

  openErrorModal = (title: string, body: string) => {
    const errorModalData = new ErrorModalData();
    errorModalData.modalIsOpen = true;
    errorModalData.title = title;
    errorModalData.body = body;

    this.setState({ errorModalData });
  };

  closeErrorModal = () => {
    const errorModalData = new ErrorModalData();
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
    if (!isEqual(this.state.addresses, addresses) || uaAddress === null) {
      //console.log('addresses');
      if (uaAddress === null) {
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

  setZecPrice = (price: number | null) => {
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

  setTxBuildProgress = (progress: SendProgress) => {
    this.setState({ txBuildProgress: progress });
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

  sendTransaction = async (setSendProgress: (arg0: SendProgress | null) => void): Promise<String> => {
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
  getPrivKeyAsString = async (address: string): Promise<string | null> => {
    const pk = await RPC.rpc_getPrivKeyAsString(address);
    if (pk) {
      return pk;
    }
    return null;
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

  createNewAddress = async (addressType: 'z' | 't' | 'u') => {
    // Create a new address
    const newaddress = await RPC.rpc_createNewAddress(addressType);
    //console.log(`Created new Address ${newaddress}`);

    // And then fetch the list of addresses again to refresh (totalBalance gets all addresses)
    this.fetchTotalBalance();

    const { receivePageState } = this.state;
    const newRerenderKey = receivePageState.rerenderKey + 1;

    const newReceivePageState = new ReceivePageState();
    if (newaddress) {
      newReceivePageState.newAddress = newaddress;
    }
    newReceivePageState.rerenderKey = newRerenderKey;

    this.setState({ receivePageState: newReceivePageState });
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

  fetchWalletSeed = async () => {
    const walletSeed = await RPC.rpc_fetchSeed();
    this.setState({ walletSeed });
  };

  startRescan = () => {
    this.rpc.rescan();
    this.setRescanning(true);
  };

  onMenuItemSelected = async (item: string) => {
    const { info } = this.state;
    this.setState({
      isMenuDrawerOpen: false,
      selectedMenuDrawerItem: item,
    });

    // Depending on the menu item, open the appropriate modal
    if (item === 'About') {
      this.setState({ aboutModalVisible: true });
    } else if (item === 'Rescan') {
      // Fetch the wallet seed to show the birthday in the UI
      await this.fetchWalletSeed();
      this.setState({ rescanModalVisible: true });
    } else if (item === 'Settings') {
      this.setState({ settingsModalVisible: true });
    } else if (item === 'Info') {
      this.setState({ infoModalVisible: true });
    } else if (item === 'Sync Report') {
      await this.fetchWalletSeed();
      this.setState({ syncReportModalVisible: true });
    } else if (item === 'Wallet Seed') {
      await this.fetchWalletSeed();
      this.setState({ seedViewModalVisible: true });
    } else if (item === 'Change Wallet') {
      await this.fetchWalletSeed();
      this.setState({ seedChangeModalVisible: true });
    } else if (item === 'Restore Wallet Backup') {
      if (info && info.currencyName !== 'ZEC') {
        Toast.show(this.props.translate('loadedapp.restoremainnet-error'), Toast.LONG);
        return;
      }
      await this.fetchWalletSeed();
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
      await SettingsFileImpl.writeSettings(new SettingsFileEntry(value));
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
      await this.fetchWalletSeed();
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
      await SettingsFileImpl.writeSettings(new SettingsFileEntry(this.state.newServer));
    }

    const { info } = this.state;

    const resultStr2 =
      info && info.currencyName !== 'ZEC' ? await this.rpc.changeWalletNoBackup() : await this.rpc.changeWallet();
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
    this.setState({ uaAddress: uaAddress });
  };

  render() {
    const {
      syncStatusReport,
      totalBalance,
      transactions,
      addresses,
      info,
      sendPageState,
      wallet_settings,
      aboutModalVisible,
      infoModalVisible,
      syncReportModalVisible,
      settingsModalVisible,
      computingModalVisible,
      rescanModalVisible,
      seedViewModalVisible,
      seedChangeModalVisible,
      seedBackupModalVisible,
      seedServerModalVisible,
      walletSeed,
      syncingStatus,
      txBuildProgress,
      uaAddress,
    } = this.state;
    const { colors } = this.props.theme;
    const { translate } = this.props;

    const standardProps = {
      openErrorModal: this.openErrorModal,
      closeErrorModal: this.closeErrorModal,
      info,
      toggleMenuDrawer: this.toggleMenuDrawer,
      fetchTotalBalance: this.fetchTotalBalance,
      translate: translate,
    };

    const menu = (
      <Suspense
        fallback={
          <View>
            <Text>Loading...</Text>
          </View>
        }>
        <Menu onItemSelected={this.onMenuItemSelected} translate={this.props.translate} />
      </Suspense>
    );
    const currencyName = info ? info.currencyName : undefined;

    const fnTabBarIcon = (route: any, focused: boolean) => {
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

    //console.log('render LoadedApp');
    //const res = async () => await RPCModule.execute('testbip', '');
    //res().then(r => console.log(r));

    return (
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
                <Text>{this.props.translate('loading')}</Text>
              </View>
            }>
            <About
              closeModal={() => this.setState({ aboutModalVisible: false })}
              totalBalance={totalBalance}
              currencyName={currencyName || undefined}
              translate={translate}
            />
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
                <Text>{this.props.translate('loading')}</Text>
              </View>
            }>
            <Info
              closeModal={() => this.setState({ infoModalVisible: false })}
              info={info}
              totalBalance={totalBalance}
              currencyName={currencyName || undefined}
              translate={translate}
            />
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
                <Text>{this.props.translate('loading')}</Text>
              </View>
            }>
            <SyncReport
              closeModal={() => this.setState({ syncReportModalVisible: false })}
              syncStatusReport={syncStatusReport}
              birthday={walletSeed?.birthday}
              translate={translate}
            />
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
                <Text>{this.props.translate('loading')}</Text>
              </View>
            }>
            <Rescan
              closeModal={() => this.setState({ rescanModalVisible: false })}
              birthday={walletSeed?.birthday}
              startRescan={this.startRescan}
              totalBalance={totalBalance}
              currencyName={currencyName || undefined}
              translate={translate}
            />
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
                <Text>{this.props.translate('loading')}</Text>
              </View>
            }>
            <Settings
              closeModal={() => this.setState({ settingsModalVisible: false })}
              wallet_settings={wallet_settings}
              set_wallet_option={this.set_wallet_option}
              set_server_option={this.set_server_option}
              totalBalance={totalBalance}
              currencyName={currencyName || undefined}
              translate={translate}
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
                <Text>{this.props.translate('loading')}</Text>
              </View>
            }>
            <Seed
              seed={walletSeed?.seed}
              birthday={walletSeed?.birthday}
              onClickOK={() => this.setState({ seedViewModalVisible: false })}
              onClickCancel={() => this.setState({ seedViewModalVisible: false })}
              totalBalance={totalBalance}
              action={'view'}
              currencyName={currencyName || undefined}
              translate={translate}
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
                <Text>{this.props.translate('loading')}</Text>
              </View>
            }>
            <Seed
              seed={walletSeed?.seed}
              birthday={walletSeed?.birthday}
              onClickOK={() => this.onClickOKChangeWallet()}
              onClickCancel={() => this.setState({ seedChangeModalVisible: false })}
              totalBalance={totalBalance}
              action={'change'}
              currencyName={currencyName || undefined}
              translate={translate}
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
                <Text>{this.props.translate('loading')}</Text>
              </View>
            }>
            <Seed
              seed={walletSeed?.seed}
              birthday={walletSeed?.birthday}
              onClickOK={() => this.onClickOKRestoreBackup()}
              onClickCancel={() => this.setState({ seedBackupModalVisible: false })}
              totalBalance={totalBalance}
              action={'backup'}
              currencyName={currencyName || undefined}
              translate={translate}
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
                <Text>{this.props.translate('loading')}</Text>
              </View>
            }>
            <Seed
              seed={walletSeed?.seed}
              birthday={walletSeed?.birthday}
              onClickOK={() => this.onClickOKServerWallet()}
              onClickCancel={() => this.setState({ seedServerModalVisible: false })}
              totalBalance={totalBalance}
              action={'server'}
              currencyName={currencyName || undefined}
              translate={translate}
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
                <Text>{this.props.translate('loading')}</Text>
              </View>
            }>
            <ComputingTxContent progress={txBuildProgress} translate={translate} />
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
            tabBarStyle: { borderRadius: 0 },
            headerShown: false,
          })}>
          <Tab.Screen name={translate('loadedapp.send-menu')}>
            {props => (
              <>
                <Suspense
                  fallback={
                    <View>
                      <Text>{this.props.translate('loading')}</Text>
                    </View>
                  }>
                  <Send
                    {...props}
                    {...standardProps}
                    totalBalance={totalBalance}
                    sendPageState={sendPageState}
                    setSendPageState={this.setSendPageState}
                    sendTransaction={this.sendTransaction}
                    clearToAddr={this.clearToAddr}
                    setComputingModalVisible={this.setComputingModalVisible}
                    setTxBuildProgress={this.setTxBuildProgress}
                    syncingStatus={syncingStatus}
                    syncingStatusMoreInfoOnClick={async () => {
                      await this.fetchWalletSeed();
                      this.setState({ syncReportModalVisible: true });
                    }}
                  />
                </Suspense>
              </>
            )}
          </Tab.Screen>
          <Tab.Screen name={translate('loadedapp.wallet-menu')}>
            {props => (
              <>
                <Suspense
                  fallback={
                    <View>
                      <Text>{this.props.translate('loading')}</Text>
                    </View>
                  }>
                  <Transactions
                    {...props}
                    {...standardProps}
                    transactions={transactions}
                    totalBalance={totalBalance}
                    doRefresh={this.doRefresh}
                    syncingStatus={syncingStatus}
                    setComputingModalVisible={this.setComputingModalVisible}
                    syncingStatusMoreInfoOnClick={async () => {
                      await this.fetchWalletSeed();
                      this.setState({ syncReportModalVisible: true });
                    }}
                  />
                </Suspense>
              </>
            )}
          </Tab.Screen>
          <Tab.Screen name={translate('loadedapp.uas-menu')}>
            {props => (
              <>
                <Suspense
                  fallback={
                    <View>
                      <Text>{this.props.translate('loading')}</Text>
                    </View>
                  }>
                  <Receive
                    {...props}
                    {...standardProps}
                    addresses={addresses}
                    startRescan={this.startRescan}
                    totalBalance={totalBalance}
                    info={info}
                    syncingStatus={syncingStatus}
                    syncingStatusMoreInfoOnClick={async () => {
                      await this.fetchWalletSeed();
                      this.setState({ syncReportModalVisible: true });
                    }}
                    uaAddress={uaAddress}
                    setUaAddress={this.setUaAddress}
                  />
                </Suspense>
              </>
            )}
          </Tab.Screen>
          <Tab.Screen name={translate('loadedapp.legacy-menu')}>
            {props => (
              <>
                <Suspense
                  fallback={
                    <View>
                      <Text>{this.props.translate('loading')}</Text>
                    </View>
                  }>
                  <Legacy
                    {...props}
                    {...standardProps}
                    addresses={addresses}
                    startRescan={this.startRescan}
                    totalBalance={totalBalance}
                    info={info}
                    uaAddress={uaAddress}
                  />
                </Suspense>
              </>
            )}
          </Tab.Screen>
        </Tab.Navigator>
      </SideMenu>
    );
  }
}
