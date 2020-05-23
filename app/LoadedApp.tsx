import React, {Component} from 'react';

import {createBottomTabNavigator} from '@react-navigation/bottom-tabs';
import {FontAwesomeIcon} from '@fortawesome/react-native-fontawesome';
import {faList, faUpload, faDownload, faCog} from '@fortawesome/free-solid-svg-icons';

import RPC from './rpc';
import AppState, {
  TotalBalance,
  SendPageState,
  ReceivePageState,
  Info,
  AddressBalance,
  Transaction,
  ToAddr,
  ErrorModalData,
} from './AppState';
import Utils from './utils';
import TransactionsScreen from '../components/TransactionsScreen';
import SendScreen from '../components/SendScreen';
import ReceiveScreen from '../components/ReceiveScreen';

const Tab = createBottomTabNavigator();

type LoadedAppProps = {};
export default class LoadedApp extends Component<LoadedAppProps, AppState> {
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
    };

    this.rpc = new RPC(
      this.setTotalBalance,
      this.setAddressesWithBalances,
      this.setTransactionList,
      this.setAllAddresses,
      this.setInfo,
      this.setZecPrice,
    );

    // Create the initial ToAddr box
    this.state.sendPageState.toaddrs = [new ToAddr(Utils.getNextToAddrID())];
  }

  componentDidMount = () => {
    this.clearToAddrs();

    // Configure the RPC to start doing refreshes
    this.rpc.configure();
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
        .filter((ab) => Utils.isSapling(ab.address))
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

  setSendPageState = (sendPageState: SendPageState) => {
    this.setState({sendPageState});
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

  setSendTo = (address: string, amount: string | null, memo: string | null) => {
    // Clear the existing send page state and set up the new one
    const {sendPageState} = this.state;

    const newSendPageState = new SendPageState();
    newSendPageState.fromaddr = sendPageState.fromaddr;

    const to = new ToAddr(Utils.getNextToAddrID());
    if (address) {
      to.to = address;
    }
    if (amount) {
      to.amount = amount;
    }
    if (memo) {
      to.memo = memo;
    }
    newSendPageState.toaddrs = [to];

    this.setState({sendPageState: newSendPageState});
  };

  setZecPrice = (price: number | null) => {
    console.log(`Price = ${price}`);
    const {info} = this.state;

    const newInfo = Object.assign({}, info);
    newInfo.zecPrice = price;

    this.setState({info: newInfo});
  };

  setRescanning = (rescanning: boolean) => {
    this.setState({rescanning});
  };

  setInfo = (newInfo: Info) => {
    // If the price is not set in this object, copy it over from the current object
    const {info} = this.state;
    if (info && !newInfo.zecPrice) {
      newInfo.zecPrice = info.zecPrice;
    }

    this.setState({info: newInfo});
  };

  sendTransaction = async (sendJson: []): Promise<string> => {
    try {
      const txid = await this.rpc.sendTransaction(sendJson);
      return txid;
    } catch (err) {
      console.log('route sendtx error', err);
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

  createNewAddress = async (zaddress: boolean) => {
    // Create a new address
    const newaddress = await RPC.createNewAddress(zaddress);
    console.log(`Created new Address ${newaddress}`);

    // And then fetch the list of addresses again to refresh (totalBalance gets all addresses)
    this.rpc.fetchTotalBalance();

    const {receivePageState} = this.state;
    const newRerenderKey = receivePageState.rerenderKey + 1;

    const newReceivePageState = new ReceivePageState();
    newReceivePageState.newAddress = newaddress;
    newReceivePageState.rerenderKey = newRerenderKey;

    this.setState({receivePageState: newReceivePageState});
  };

  doRefresh = () => {
    this.rpc.refresh(false);
  };

  clearTimers = () => {
    this.rpc.clearTimers();
  };

  render() {
    const {totalBalance, transactions, addresses, info, sendPageState} = this.state;

    const standardProps = {
      openErrorModal: this.openErrorModal,
      closeErrorModal: this.closeErrorModal,
      setSendTo: this.setSendTo,
      info,
    };

    return (
      <Tab.Navigator
        initialRouteName="Transactions"
        screenOptions={({route}) => ({
          tabBarIcon: ({focused}) => {
            var iconName;

            if (route.name === 'Transactions') {
              iconName = focused ? faList : faList;
            } else if (route.name === 'Send') {
              iconName = focused ? faUpload : faUpload;
            } else if (route.name === 'Receive') {
              iconName = focused ? faDownload : faDownload;
            } else {
              iconName = focused ? faCog : faCog;
            }

            // You can return any component that you like here!
            return <FontAwesomeIcon icon={iconName} color="rgb( 220, 220, 220)" />;
          },
        })}
        tabBarOptions={{
          activeTintColor: '#BB86FC',
          inactiveTintColor: '#777777',
          labelStyle: {fontSize: 14},
        }}>
        <Tab.Screen name="Send">
          {(props) => (
            <SendScreen
              {...props}
              {...standardProps}
              sendPageState={sendPageState}
              setSendPageState={this.setSendPageState}
            />
          )}
        </Tab.Screen>
        <Tab.Screen name="Transactions">
          {(props) => (
            <TransactionsScreen {...props} {...standardProps} transactions={transactions} totalBalance={totalBalance} />
          )}
        </Tab.Screen>
        <Tab.Screen name="Receive">
          {(props) => <ReceiveScreen {...props} {...standardProps} addresses={addresses} />}
        </Tab.Screen>
      </Tab.Navigator>
    );
  }
}
