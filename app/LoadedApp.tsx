/* eslint-disable react-native/no-inline-styles */
import React, {Component} from 'react';
import {ScrollView, StyleSheet, Dimensions, Modal, View, SafeAreaView} from 'react-native';
import * as Progress from 'react-native-progress';
import {createBottomTabNavigator} from '@react-navigation/bottom-tabs';
import {FontAwesomeIcon} from '@fortawesome/react-native-fontawesome';
import {faList, faUpload, faDownload, faCog} from '@fortawesome/free-solid-svg-icons';

import SideMenu from 'react-native-side-menu-updated';
import RPC from './rpc';
import RPCModule from '../components/RPCModule'
import AppState, {
  TotalBalance,
  SendPageState,
  ReceivePageState,
  Info,
  AddressBalance,
  Transaction,
  ToAddr,
  ErrorModalData,
  SendJsonToType,
  SyncStatus,
  SendProgress,
  WalletSettings,
} from './AppState';
import {RegText, FadeText} from '../components/Components';
import Utils from './utils';
import TransactionsScreen from '../components/TransactionsScreen';
import SendScreen from '../components/SendScreen';
import ReceiveScreen from '../components/ReceiveScreen';
import AboutModal from '../components/About';
import SeedComponent from '../components/SeedComponent';
import InfoModal from '../components/InfoModal';
import {useTheme} from '@react-navigation/native';
import RescanModal from '../components/RescanModal';
import SettingsModal from '../components/SettingsModal';
import SettingsFileImpl from '../components/SettingsFileImpl';

const window = Dimensions.get('window');

function Menu({onItemSelected}: any) {
  const {colors} = useTheme();
  const item = {
    fontSize: 14,
    fontWeight: '300',
    paddingTop: 15,
    color: colors.text,
  };

  return (
    <ScrollView
      scrollsToTop={false}
      style={{
        flex: 1,
        width: window.width,
        height: window.height,
        backgroundColor: '#010101',
      }}
      contentContainerStyle={{display: 'flex'}}
    >
      <FadeText style={{margin: 20}}>Options</FadeText>
      <View style={{height: 1, backgroundColor: colors.primary}} />

      <View style={{display: 'flex', marginLeft: 20}}>
        <RegText onPress={() => onItemSelected('About')} style={item}>
          About ZingoZcash
        </RegText>

        <RegText onPress={() => onItemSelected('Info')} style={item}>
          Server Info
        </RegText>

        <RegText onPress={() => onItemSelected('Settings')} style={item}>
          Settings
        </RegText>

        <RegText onPress={() => onItemSelected('Wallet Seed')} style={item}>
          Wallet Seed
        </RegText>

        <RegText onPress={() => onItemSelected('Rescan')} style={item}>
          Rescan Wallet
        </RegText>

        <RegText onPress={() => onItemSelected('Change Wallet')} style={item} color={colors.primary}>
          Change to another Wallet
        </RegText>

        <RegText onPress={() => onItemSelected('Restore Wallet Backup')} style={item} color={colors.primary}>
          Restore Last Wallet Backup
        </RegText>
      </View>
    </ScrollView>
  );
}

type ComputingModalProps = {
  progress: SendProgress;
};

const ComputingTxModalContent: React.FunctionComponent<ComputingModalProps> = ({progress}) => {
  const {colors} = useTheme();

  return (
    <SafeAreaView
      style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100%',
        backgroundColor: colors.background,
      }}>
      <RegText>Computing Transaction</RegText>
      {!(progress && progress.sendInProgress) && <RegText>Please wait...</RegText>}
      {progress && progress.sendInProgress && (
        <>
          <RegText>{`Step ${progress.progress} of ${progress.total}`}</RegText>
          <RegText style={{marginBottom: 20}}>{`ETA ${progress.etaSeconds}s`}</RegText>
          <Progress.Circle
            showsText={true}
            progress={progress.progress / progress.total}
            indeterminate={!progress.progress}
            size={100}
          />
        </>
      )}
    </SafeAreaView>
  );
};

const Tab = createBottomTabNavigator();

export default function LoadedApp(props) {
  const theme = useTheme();

  return <LoadedAppClass {...props} theme={theme} />;
}

type LoadedAppClassProps = {
  navigation: any;
};

class LoadedAppClass extends Component<LoadedAppClassProps, AppState> {
  rpc: RPC;

  constructor(props: any) {
    super(props);

    this.state = {
      totalBalance: new TotalBalance(),
      addressesWithBalance: [],
      addressPrivateKeys: new Map(),
      addresses: [],
      addressBook: [],
      transactions: null,
      sendPageState: new SendPageState(),
      receivePageState: new ReceivePageState(),
      info: null,
      rescanning: false,
      errorModalData: new ErrorModalData(),
      txBuildProgress: new SendProgress(),
      walletSeed: null,
      wallet_settings: new WalletSettings(),
      isMenuDrawerOpen: false,
      selectedMenuDrawerItem: '',
      aboutModalVisible: false,
      rescanModalVisible: false,
      computingModalVisible: false,
      infoModalVisible: false,
      settingsModalVisible: false,
      seedViewModalVisible: false,
      seedChangeModalVisible: false,
      seedBackupModalVisible: false,
      syncingStatus: null,
      error: null,
    };

    this.rpc = new RPC(
      this.setTotalBalance,
      this.setAddressesWithBalances,
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

    this.setState({errorModalData});
  };

  closeErrorModal = () => {
    const errorModalData = new ErrorModalData();
    errorModalData.modalIsOpen = false;

    this.setState({errorModalData});
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
    this.setState({totalBalance});
  };

  setAddressesWithBalances = (addressesWithBalance: AddressBalance[]) => {
    this.setState({addressesWithBalance});

    const {sendPageState} = this.state;

    // If there is no 'from' address, we'll set a default one
    if (!sendPageState.fromaddr) {
      // Find a z-address with the highest balance
      const defaultAB = addressesWithBalance
        .filter(ab => Utils.isSapling(ab.address))
        .reduce((prev: AddressBalance | null, ab: AddressBalance) => {
          // We'll start with a sapling address
          if (prev == null) {
            return ab;
          }
          // Find the sapling address with the highest balance
          if (prev.balance < ab.balance) {
            return ab;
          }

          return prev;
        }, null);

      if (defaultAB) {
        const newSendPageState = new SendPageState();
        newSendPageState.fromaddr = defaultAB.address;
        newSendPageState.toaddrs = sendPageState.toaddrs;

        this.setState({sendPageState: newSendPageState});
      }
    }
  };

  setTransactionList = (transactions: Transaction[]) => {
    this.setState({transactions});
  };

  setAllAddresses = (addresses: string[]) => {
    this.setState({addresses});
  };

  setWalletSettings = (wallet_settings: WalletSettings) => {
    this.setState({wallet_settings});
  };

  setSendPageState = (sendPageState: SendPageState) => {
    this.setState({sendPageState});
  };

  refreshUpdates = (inProgress: boolean, progress: number) => {
    const syncingStatus: SyncStatus = {
      inProgress,
      progress,
    };
    this.setState({syncingStatus});
  };

  clearToAddrs = () => {
    const {sendPageState} = this.state;
    const newToAddrs = [new ToAddr(Utils.getNextToAddrID())];

    // Create the new state object
    const newState = new SendPageState();
    newState.fromaddr = sendPageState.fromaddr;
    newState.toaddrs = newToAddrs;

    this.setSendPageState(newState);
  };

  setZecPrice = (price: number | null) => {
    //console.log(`Price = ${price}`);
    const {info} = this.state;

    const newInfo = Object.assign({}, info);
    newInfo.zecPrice = price;

    this.setState({info: newInfo});
  };

  setRescanning = (rescanning: boolean) => {
    this.setState({rescanning});
  };

  setComputingModalVisible = (visible: boolean) => {
    this.setState({computingModalVisible: visible});
  };

  setTxBuildProgress = (progress: SendProgress) => {
    this.setState({txBuildProgress: progress});
  };

  setInfo = (newInfo: Info) => {
    // If the price is not set in this object, copy it over from the current object
    const {info} = this.state;
    if (info && !newInfo.zecPrice) {
      newInfo.zecPrice = info.zecPrice;
    }

    this.setState({info: newInfo});
  };

  getSendManyJSON = (): Array<SendJsonToType> => {
    const {sendPageState} = this.state;
    const json = sendPageState.toaddrs.flatMap(to => {
      const memo = to.memo || '';
      const amount = parseInt((Utils.parseLocaleFloat(to.amount) * 10 ** 8).toFixed(0), 10);

      if (memo === '') {
        return {address: to.to, amount};
      } else if (memo.length <= 512) {
        return {address: to.to, amount, memo};
      } else {
        // If the memo is more than 512 bytes, then we split it into multiple transactions.
        // Each memo will be `(xx/yy)memo_part`. The prefix "(xx/yy)" is 7 bytes long, so
        // we'll split the memo into 512-7 = 505 bytes length
        const splits = Utils.utf16Split(memo, 505);
        const tos = [];

        // The first one contains all the tx value
        tos.push({address: to.to, amount, memo: `(1/${splits.length})${splits[0]}`});

        for (let i = 1; i < splits.length; i++) {
          tos.push({address: to.to, amount: 0, memo: `(${i + 1}/${splits.length})${splits[i]}`});
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
  getPrivKeyAsString = async (address: string): Promise<string> => {
    const pk = await RPC.getPrivKeyAsString(address);
    return pk;
  };

  // Getter methods, which are called by the components to update the state
  fetchAndSetSinglePrivKey = async (address: string) => {
    const key = await RPC.getPrivKeyAsString(address);
    const addressPrivateKeys = new Map<string, string>();
    addressPrivateKeys.set(address, key);

    this.setState({addressPrivateKeys});
  };

  createNewAddress = async (addressType: 'z' | 't' | 'o') => {
    // Create a new address
    const newaddress = await RPC.createNewAddress(addressType);
    // console.log(`Created new Address ${newaddress}`);

    // And then fetch the list of addresses again to refresh (totalBalance gets all addresses)
    this.rpc.fetchTotalBalance();

    const {receivePageState} = this.state;
    const newRerenderKey = receivePageState.rerenderKey + 1;

    const newReceivePageState = new ReceivePageState();
    newReceivePageState.newAddress = newaddress;
    newReceivePageState.rerenderKey = newRerenderKey;

    this.setState({receivePageState: newReceivePageState});
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
    this.setState({isMenuDrawerOpen});
  };

  fetchWalletSeed = async () => {
    const walletSeed = await RPC.fetchSeed();
    this.setState({walletSeed});
  };

  startRescan = () => {
    this.rpc.rescan();
    this.setRescanning(true);
  };

  onMenuItemSelected = async (item: string) => {
    this.setState({
      isMenuDrawerOpen: false,
      selectedMenuDrawerItem: item,
    });

    // Depending on the menu item, open the appropriate modal
    if (item === 'About') {
      this.setState({aboutModalVisible: true});
    } else if (item === 'Rescan') {
      // Fetch the wallet seed to show the birthday in the UI
      await this.fetchWalletSeed();
      this.setState({rescanModalVisible: true});
    } else if (item === 'Settings') {
      this.setState({settingsModalVisible: true});
    } else if (item === 'Info') {
      this.setState({infoModalVisible: true});
    } else if (item === 'Wallet Seed') {
      await this.fetchWalletSeed();
      this.setState({seedViewModalVisible: true});
    } else if (item === 'Change Wallet') {
      await this.fetchWalletSeed();
      this.setState({seedChangeModalVisible: true});
    } else if (item === 'Restore Wallet Backup') {
      await this.fetchWalletSeed();
      this.setState({seedBackupModalVisible: true});
    }
  };

  set_wallet_option = async (name: string, value: string) => {
    await RPC.setWalletSettingOption(name, value);

    // Refetch the settings to update
    this.rpc.fetchWalletSettings();
  };

  set_server_option = async (value: string) => {
    const resultStr: string = await RPCModule.execute('changeserver', value);
    if (resultStr.toLowerCase().startsWith('error')) {
      // console.log(`Error change server ${value} - ${resultStr}`);
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

    const error = await RPCModule.loadExistingWallet(value);
    if (!error.toLowerCase().startsWith('error')) {
      // Load the wallet and navigate to the transactions screen
      // console.log(`wallet loaded ok ${value}`);
      const settings = { server: value };
      await SettingsFileImpl.writeSettings(settings);
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
        return;
      } else {
        // console.log(`change server ok ${old_settings.server} - ${resultStr}`);
      }
    }

    // Refetch the settings to update
    this.rpc.fetchWalletSettings();
  };

  navigateToLoading = () => {
    const { navigation } = this.props;

    navigation.reset({
      index: 0,
      routes: [{ name: 'LoadingApp' }],
    });
  };

  onClickOKChangeWallet = async () => {
    const resultStr = await this.rpc.changeWallet();

    console.log("jc change", resultStr);
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

    this.setState({seedChangeModalVisible: false});
    this.navigateToLoading();
  };

  onClickOKRestoreBackup = async () => {
    const resultStr = await this.rpc.restoreBackup();

    console.log("jc restore", resultStr);
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

    this.setState({seedBackupModalVisible: false});
    this.navigateToLoading();
  };

  render() {
    const {
      totalBalance,
      transactions,
      addresses,
      info,
      sendPageState,
      wallet_settings,
      aboutModalVisible,
      infoModalVisible,
      settingsModalVisible,
      computingModalVisible,
      rescanModalVisible,
      seedViewModalVisible,
      seedChangeModalVisible,
      seedBackupModalVisible,
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

    return (
      <SideMenu menu={menu} isOpen={this.state.isMenuDrawerOpen} onChange={isOpen => this.updateMenuState(isOpen)}>
        <Modal
          animationType="slide"
          transparent={false}
          visible={aboutModalVisible}
          onRequestClose={() => this.setState({aboutModalVisible: false})}>
          <AboutModal
            closeModal={() => this.setState({aboutModalVisible: false})}
            totalBalance={totalBalance}
          />
        </Modal>

        <Modal
          animationType="slide"
          transparent={false}
          visible={infoModalVisible}
          onRequestClose={() => this.setState({infoModalVisible: false})}>
          <InfoModal
            closeModal={() => this.setState({infoModalVisible: false})} info={info}
            totalBalance={totalBalance}
          />
        </Modal>

        <Modal
          animationType="slide"
          transparent={false}
          visible={rescanModalVisible}
          onRequestClose={() => this.setState({rescanModalVisible: false})}>
          <RescanModal
            closeModal={() => this.setState({rescanModalVisible: false})}
            birthday={walletSeed?.birthday}
            startRescan={this.startRescan}
            totalBalance={totalBalance}
          />
        </Modal>

        <Modal
          animationType="slide"
          transparent={false}
          visible={settingsModalVisible}
          onRequestClose={() => this.setState({settingsModalVisible: false})}>
          <SettingsModal
            closeModal={() => this.setState({settingsModalVisible: false})}
            wallet_settings={wallet_settings}
            set_wallet_option={this.set_wallet_option}
            set_server_option={this.set_server_option}
            totalBalance={totalBalance}
          />
        </Modal>

        <Modal
          animationType="slide"
          transparent={false}
          visible={seedViewModalVisible}
          onRequestClose={() => this.setState({seedViewModalVisible: false})}>
          <SeedComponent
            seed={walletSeed?.seed}
            birthday={walletSeed?.birthday}
            onClickOK={() => this.setState({seedViewModalVisible: false})}
            totalBalance={totalBalance}
            action={"view"}
            error={error}
          />
        </Modal>

        <Modal
          animationType="slide"
          transparent={false}
          visible={seedChangeModalVisible}
          onRequestClose={() => this.setState({seedChangeModalVisible: false})}>
          <SeedComponent
            seed={walletSeed?.seed}
            birthday={walletSeed?.birthday}
            onClickOK={this.onClickOKChangeWallet}
            onClickCancel={() => this.setState({seedChangeModalVisible: false})}
            totalBalance={totalBalance}
            action={"change"}
            error={error}
          />
        </Modal>

        <Modal
          animationType="slide"
          transparent={false}
          visible={seedBackupModalVisible}
          onRequestClose={() => this.setState({seedBackupModalVisible: false})}>
          <SeedComponent
            seed={walletSeed?.seed}
            birthday={walletSeed?.birthday}
            onClickOK={this.onClickOKRestoreBackup}
            onClickCancel={() => this.setState({seedBackupModalVisible: false})}
            totalBalance={totalBalance}
            action={"backup"}
            error={error}
          />
        </Modal>

        <Modal
          animationType="slide"
          transparent={false}
          visible={computingModalVisible}
          onRequestClose={() => this.setState({computingModalVisible: false})}>
          <ComputingTxModalContent progress={txBuildProgress} />
        </Modal>

        <Tab.Navigator
          initialRouteName="WALLET"
          screenOptions={({route}) => ({
            tabBarIcon: ({focused}) => {
              var iconName;

              if (route.name === 'WALLET') {
                iconName = faList;
              } else if (route.name === 'SEND') {
                iconName = faUpload;
              } else if (route.name === 'RECEIVE') {
                iconName = faDownload;
              } else {
                iconName = faCog;
              }

              const iconColor = focused ? colors.background : colors.money;
              return <FontAwesomeIcon icon={iconName} color={iconColor} />;
            },
          })}
          tabBarOptions={{
            activeTintColor: colors.background,
            activeBackgroundColor: colors.primary,
            inactiveTintColor: colors.money,
            labelStyle: {fontSize: 14},
            tabStyle: {borderRadius: 0},
          }}>
          <Tab.Screen name="SEND">
            {props => (
              <>
                <SendScreen
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
                />
                {error && (
                  <FadeText style={{ color: colors.primary, textAlign: 'center', width:'100%' }}>{error}</FadeText>
                )}
              </>
            )}
          </Tab.Screen>
          <Tab.Screen name="WALLET">
            {props => (
              <>
                <TransactionsScreen
                  {...props}
                  {...standardProps}
                  transactions={transactions}
                  totalBalance={totalBalance}
                  doRefresh={this.doRefresh}
                  syncingStatus={syncingStatus}
                  setComputingModalVisible={this.setComputingModalVisible}
                />
                {error && (
                  <FadeText style={{ color: colors.primary, textAlign: 'center', width:'100%' }}>{error}</FadeText>
                )}
              </>
            )}
          </Tab.Screen>
          <Tab.Screen name="RECEIVE">
            {props => (
              <>
                <ReceiveScreen
                  {...props}
                  {...standardProps}
                  addresses={addresses}
                  startRescan={this.startRescan}
                  totalBalance={totalBalance}
                  info={info}
                  syncingStatus={syncingStatus}
                />
                {error && (
                  <FadeText style={{ color: colors.primary, textAlign: 'center', width:'100%' }}>{error}</FadeText>
                )}
              </>
            )}
          </Tab.Screen>
        </Tab.Navigator>
      </SideMenu>
    );
  }
}
