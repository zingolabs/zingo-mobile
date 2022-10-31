/* eslint-disable react-native/no-inline-styles */
import React, { Component } from 'react';
import { Modal } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { faList, faUpload, faDownload, faCog, faAddressBook } from '@fortawesome/free-solid-svg-icons';
import { useTheme } from '@react-navigation/native';
import SideMenu from 'react-native-side-menu-updated';

import RPC from '../rpc';
import RPCModule from '../../components/RPCModule';
import AppState, {
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
import FadeText from '../../components/Components/FadeText';
import Utils from '../utils';
import Transactions from '../../components/Transactions';
import Send from '../../components/Send';
import Receive from '../../components/Receive';
import Legacy from '../../components/Legacy';
import About from '../../components/About';
import Seed from '../../components/Seed';
import Info from '../../components/Info';
import SyncReport from '../../components/SyncReport';
import Rescan from '../../components/Rescan';
import Settings from '../../components/Settings';
import SettingsFileImpl from '../../components/Settings/SettingsFileImpl';
import Menu from './components/Menu';
import ComputingTxContent from './components/ComputingTxContent';
import { ThemeType } from '../types';

const Tab = createBottomTabNavigator();

type LoadedAppProps = {
  navigation: any;
};

export default function LoadedApp(props: LoadedAppProps) {
  const theme = useTheme() as unknown as ThemeType;

  return <LoadedAppClass {...props} theme={theme} />;
}

type LoadedAppClassProps = {
  navigation: any;
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
      sendPageState: new SendPageState(),
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
      error: null,
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
    );

    // Create the initial ToAddr box
    this.state.sendPageState.toaddrs = [new ToAddr(Utils.getNextToAddrID())];
  }

  componentDidMount = () => {
    this.clearToAddrs();

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

  unlockWallet = async (password: string): Promise<boolean> => {
    const success = await this.rpc.unlockWallet(password);
    return success;
  };

  lockWallet = async (): Promise<boolean> => {
    const success = await this.rpc.lockWallet();
    return success;
  };

  encryptWallet = async (password: string): Promise<boolean> => {
    const success = await this.rpc.encryptWallet(password);
    return success;
  };

  decryptWallet = async (password: string): Promise<boolean> => {
    const success = await this.rpc.decryptWallet(password);
    return success;
  };

  setTotalBalance = (totalBalance: TotalBalance) => {
    this.setState({ totalBalance });
  };

  setSyncStatusReport = (syncStatusReport: SyncStatusReport) => {
    this.setState({ syncStatusReport });
  };

  setTransactionList = (transactions: Transaction[]) => {
    this.setState({ transactions });
  };

  setAllAddresses = (addresses: Address[]) => {
    this.setState({ addresses });
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
    this.setState({ syncingStatus });
  };

  clearToAddrs = () => {
    const newToAddrs = [new ToAddr(Utils.getNextToAddrID())];

    // Create the new state object
    const newState = new SendPageState();
    newState.toaddrs = newToAddrs;

    this.setSendPageState(newState);
  };

  setZecPrice = (price: number | null) => {
    //console.log(`Price = ${price}`);
    const { info } = this.state;

    const newInfo = Object.assign({}, info);
    newInfo.zecPrice = price;

    this.setState({ info: newInfo });
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

    this.setState({ info: newInfo });
  };

  getSendManyJSON = (): Array<SendJsonToType> => {
    const { sendPageState } = this.state;
    const json = sendPageState.toaddrs.flatMap(to => {
      const memo = to.memo || '';
      const amount = parseInt((Utils.parseLocaleFloat(to.amount) * 10 ** 8).toFixed(0), 10);

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

    // console.log('Sending:');
    // console.log(json);

    return json;
  };

  sendTransaction = async (setSendProgress: (arg0: SendProgress | null) => void): Promise<String> => {
    try {
      // Construct a sendJson from the sendPage state
      const sendJson = this.getSendManyJSON();
      const txid = await this.rpc.sendTransaction(sendJson, setSendProgress);

      return txid;
    } catch (err) {
      // console.log('route sendtx error', err);
      throw err;
    }
  };

  // Get a single private key for this address, and return it as a string.
  // Wallet needs to be unlocked
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
    // console.log(`Created new Address ${newaddress}`);

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
        this.setState({
          error: 'This option is only available for Mainnet servers.',
        });
        setTimeout(() => {
          this.setState({
            error: null,
          });
        }, 5000);
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
      // console.log(`Error change server ${value} - ${resultStrServer}`);
      this.setState({
        error: `Error trying to change the server to the new one: ${value}`,
      });
      setTimeout(() => {
        this.setState({
          error: null,
        });
      }, 5000);
      return;
    } else {
      // console.log(`change server ok ${value}`);
    }

    await this.rpc.setInRefresh(false);
    const error = await RPCModule.loadExistingWallet(value);
    if (!error.toLowerCase().startsWith('error')) {
      // Load the wallet and navigate to the transactions screen
      // console.log(`wallet loaded ok ${value}`);
      await SettingsFileImpl.writeSettings(new SettingsFileEntry(value));
      // Refetch the settings to update
      this.rpc.fetchWalletSettings();
      return;
    } else {
      // console.log(`Error Reading Wallet ${value} - ${error}`);
      this.setState({
        error: `Error trying to read the wallet with the new server: ${value}`,
      });
      setTimeout(() => {
        this.setState({
          error: null,
        });
      }, 5000);

      const old_settings = await SettingsFileImpl.readSettings();
      const resultStr: string = await RPCModule.execute('changeserver', old_settings.server);
      if (resultStr.toLowerCase().startsWith('error')) {
        // console.log(`Error change server ${old_settings.server} - ${resultStr}`);
        this.setState({
          error: `Error trying to change the server to the old one: ${old_settings.server}`,
        });
        setTimeout(() => {
          this.setState({
            error: null,
          });
        }, 5000);
        //return;
      } else {
        // console.log(`change server ok ${old_settings.server} - ${resultStr}`);
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
      // console.log(`Error change wallet. ${resultStr}`);
      this.setState({
        error: `${resultStr}`,
      });
      setTimeout(() => {
        this.setState({
          error: null,
        });
      }, 5000);
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
      // console.log(`Error restore backup wallet. ${resultStr}`);
      this.setState({
        error: `${resultStr}`,
      });
      setTimeout(() => {
        this.setState({
          error: null,
        });
      }, 5000);
      return;
    }

    await this.rpc.setInRefresh(false);
    this.setState({ seedBackupModalVisible: false });
    this.navigateToLoading();
  };

  onClickOKServerWallet = async () => {
    const resultStr: string = await RPCModule.execute('changeserver', this.state.newServer);
    if (resultStr.toLowerCase().startsWith('error')) {
      // console.log(`Error change server ${value} - ${resultStr}`);
      this.setState({
        error: `Error trying to change the server to the new one: ${this.state.newServer}`,
      });
      setTimeout(() => {
        this.setState({
          error: null,
        });
      }, 5000);
      return;
    } else {
      // console.log(`change server ok ${value}`);
    }

    if (this.state.newServer) {
      await SettingsFileImpl.writeSettings(new SettingsFileEntry(this.state.newServer));
    }

    const { info } = this.state;

    const resultStr2 =
      info && info.currencyName !== 'ZEC' ? await this.rpc.changeWalletNoBackup() : await this.rpc.changeWallet();
    //console.log("jc change", resultStr);
    if (resultStr2.toLowerCase().startsWith('error')) {
      // console.log(`Error change wallet. ${resultStr}`);
      this.setState({
        error: `${resultStr2}`,
      });
      setTimeout(() => {
        this.setState({
          error: null,
        });
      }, 5000);
      //return;
    }

    await this.rpc.setInRefresh(false);
    this.setState({ seedServerModalVisible: false });
    this.navigateToLoading();
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
      error,
    } = this.state;
    const { colors } = this.props.theme;

    const standardProps = {
      openErrorModal: this.openErrorModal,
      closeErrorModal: this.closeErrorModal,
      info,
      toggleMenuDrawer: this.toggleMenuDrawer,
      fetchTotalBalance: this.fetchTotalBalance,
    };

    const menu = <Menu onItemSelected={this.onMenuItemSelected} />;
    const currencyName = info ? info.currencyName : undefined;

    const fnTabBarIcon = (route: any, focused: boolean) => {
      var iconName;

      if (route.name === 'WALLET') {
        iconName = faList;
      } else if (route.name === 'SEND') {
        iconName = faUpload;
      } else if (route.name === "UA's") {
        iconName = faDownload;
      } else if (route.name === 'LEGACY') {
        iconName = faAddressBook;
      } else {
        iconName = faCog;
      }

      const iconColor = focused ? colors.background : colors.money;
      return <FontAwesomeIcon icon={iconName} color={iconColor} />;
    };

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
          <About
            closeModal={() => this.setState({ aboutModalVisible: false })}
            totalBalance={totalBalance}
            currencyName={currencyName || undefined}
          />
        </Modal>

        <Modal
          animationType="slide"
          transparent={false}
          visible={infoModalVisible}
          onRequestClose={() => this.setState({ infoModalVisible: false })}>
          <Info
            closeModal={() => this.setState({ infoModalVisible: false })}
            info={info}
            totalBalance={totalBalance}
            currencyName={currencyName || undefined}
          />
        </Modal>

        <Modal
          animationType="slide"
          transparent={false}
          visible={syncReportModalVisible}
          onRequestClose={() => this.setState({ syncReportModalVisible: false })}>
          <SyncReport
            closeModal={() => this.setState({ syncReportModalVisible: false })}
            syncStatusReport={syncStatusReport}
            birthday={walletSeed?.birthday}
          />
        </Modal>

        <Modal
          animationType="slide"
          transparent={false}
          visible={rescanModalVisible}
          onRequestClose={() => this.setState({ rescanModalVisible: false })}>
          <Rescan
            closeModal={() => this.setState({ rescanModalVisible: false })}
            birthday={walletSeed?.birthday}
            startRescan={this.startRescan}
            totalBalance={totalBalance}
            currencyName={currencyName || undefined}
          />
        </Modal>

        <Modal
          animationType="slide"
          transparent={false}
          visible={settingsModalVisible}
          onRequestClose={() => this.setState({ settingsModalVisible: false })}>
          <Settings
            closeModal={() => this.setState({ settingsModalVisible: false })}
            wallet_settings={wallet_settings}
            set_wallet_option={this.set_wallet_option}
            set_server_option={this.set_server_option}
            totalBalance={totalBalance}
            currencyName={currencyName || undefined}
          />
        </Modal>

        <Modal
          animationType="slide"
          transparent={false}
          visible={seedViewModalVisible}
          onRequestClose={() => this.setState({ seedViewModalVisible: false })}>
          <Seed
            seed={walletSeed?.seed}
            birthday={walletSeed?.birthday}
            onClickOK={() => this.setState({ seedViewModalVisible: false })}
            onClickCancel={() => this.setState({ seedViewModalVisible: false })}
            totalBalance={totalBalance}
            action={'view'}
            error={error || undefined}
            currencyName={currencyName || undefined}
          />
        </Modal>

        <Modal
          animationType="slide"
          transparent={false}
          visible={seedChangeModalVisible}
          onRequestClose={() => this.setState({ seedChangeModalVisible: false })}>
          <Seed
            seed={walletSeed?.seed}
            birthday={walletSeed?.birthday}
            onClickOK={() => this.onClickOKChangeWallet()}
            onClickCancel={() => this.setState({ seedChangeModalVisible: false })}
            totalBalance={totalBalance}
            action={'change'}
            error={error || undefined}
            currencyName={currencyName || undefined}
          />
        </Modal>

        <Modal
          animationType="slide"
          transparent={false}
          visible={seedBackupModalVisible}
          onRequestClose={() => this.setState({ seedBackupModalVisible: false })}>
          <Seed
            seed={walletSeed?.seed}
            birthday={walletSeed?.birthday}
            onClickOK={() => this.onClickOKRestoreBackup()}
            onClickCancel={() => this.setState({ seedBackupModalVisible: false })}
            totalBalance={totalBalance}
            action={'backup'}
            error={error || undefined}
            currencyName={currencyName || undefined}
          />
        </Modal>

        <Modal
          animationType="slide"
          transparent={false}
          visible={seedServerModalVisible}
          onRequestClose={() => this.setState({ seedServerModalVisible: false })}>
          <Seed
            seed={walletSeed?.seed}
            birthday={walletSeed?.birthday}
            onClickOK={() => this.onClickOKServerWallet()}
            onClickCancel={() => this.setState({ seedServerModalVisible: false })}
            totalBalance={totalBalance}
            action={'server'}
            error={error || undefined}
            currencyName={currencyName || undefined}
          />
        </Modal>

        <Modal
          animationType="slide"
          transparent={false}
          visible={computingModalVisible}
          onRequestClose={() => this.setState({ computingModalVisible: false })}>
          <ComputingTxContent progress={txBuildProgress} />
        </Modal>

        <Tab.Navigator
          initialRouteName="WALLET"
          screenOptions={({ route }) => ({
            tabBarIcon: ({ focused }) => fnTabBarIcon(route, focused),
            tabBarActiveTintColor: colors.background,
            tabBarActiveBackgroundColor: colors.primary,
            tabBarInactiveTintColor: colors.money,
            tabBarLabelStyle: { fontSize: 14 },
            tabBarStyle: { borderRadius: 0 },
            headerShown: false,
          })}>
          <Tab.Screen name="SEND">
            {props => (
              <>
                <Send
                  {...props}
                  {...standardProps}
                  totalBalance={totalBalance}
                  sendPageState={sendPageState}
                  setSendPageState={this.setSendPageState}
                  sendTransaction={this.sendTransaction}
                  clearToAddrs={this.clearToAddrs}
                  setComputingModalVisible={this.setComputingModalVisible}
                  setTxBuildProgress={this.setTxBuildProgress}
                  syncingStatus={syncingStatus}
                  syncingStatusMoreInfoOnClick={async () => {
                    await this.fetchWalletSeed();
                    this.setState({ syncReportModalVisible: true });
                  }}
                />
                {error && (
                  <FadeText style={{ color: colors.primary, textAlign: 'center', width: '100%', marginBottom: 5 }}>
                    {error}
                  </FadeText>
                )}
              </>
            )}
          </Tab.Screen>
          <Tab.Screen name="WALLET">
            {props => (
              <>
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
                {error && (
                  <FadeText style={{ color: colors.primary, textAlign: 'center', width: '100%', marginBottom: 5 }}>
                    {error}
                  </FadeText>
                )}
              </>
            )}
          </Tab.Screen>
          <Tab.Screen name="UA's">
            {props => (
              <>
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
                />
                {error && (
                  <FadeText style={{ color: colors.primary, textAlign: 'center', width: '100%', marginBottom: 5 }}>
                    {error}
                  </FadeText>
                )}
              </>
            )}
          </Tab.Screen>
          <Tab.Screen name="LEGACY">
            {props => (
              <>
                <Legacy
                  {...props}
                  {...standardProps}
                  addresses={addresses}
                  startRescan={this.startRescan}
                  totalBalance={totalBalance}
                  info={info}
                />
                {error && (
                  <FadeText style={{ color: colors.primary, textAlign: 'center', width: '100%', marginBottom: 5 }}>
                    {error}
                  </FadeText>
                )}
              </>
            )}
          </Tab.Screen>
        </Tab.Navigator>
      </SideMenu>
    );
  }
}
