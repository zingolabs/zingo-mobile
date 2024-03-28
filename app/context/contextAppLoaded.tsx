import React, { ReactNode } from 'react';
import { StackScreenProps } from '@react-navigation/stack';

import {
  AppStateLoaded,
  SyncingStatusClass,
  TotalBalanceClass,
  ReceivePageStateClass,
  ErrorModalDataClass,
  SendProgressClass,
  WalletSettingsClass,
  TransactionType,
  InfoType,
  WalletType,
  AddressClass,
  ZecPriceType,
  BackgroundType,
  SendPageStateClass,
  ToAddrClass,
  NetInfoType,
  BackgroundErrorType,
  ServerType,
  AddressBookFileClass,
  SecurityType,
} from '../AppState';
import SnackbarType from '../AppState/types/SnackbarType';

export const defaultAppStateLoaded: AppStateLoaded = {
  navigation: {} as StackScreenProps<any>['navigation'],
  route: {} as StackScreenProps<any>['route'],
  appState: '',
  netInfo: {} as NetInfoType,

  syncingStatus: new SyncingStatusClass(),
  totalBalance: new TotalBalanceClass(),
  addressPrivateKeys: new Map(),
  addresses: [] as AddressClass[],
  transactions: [] as TransactionType[],
  sendPageState: new SendPageStateClass(new ToAddrClass(0)),
  receivePageState: new ReceivePageStateClass(''),
  info: {} as InfoType,
  walletSettings: new WalletSettingsClass(),
  errorModalData: new ErrorModalDataClass('', ''),
  sendProgress: new SendProgressClass(0, 0, 0),
  wallet: {} as WalletType,
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
  ufvkViewModalVisible: false,
  ufvkChangeModalVisible: false,
  ufvkBackupModalVisible: false,
  ufvkServerModalVisible: false,
  syncReportModalVisible: false,
  poolsModalVisible: false,
  insightModalVisible: false,
  addressBookModalVisible: false,
  newServer: {} as ServerType,
  uaAddress: '',

  server: {} as ServerType,
  currency: '',
  language: 'en',

  zecPrice: {
    zecPrice: 0,
    date: 0,
  } as ZecPriceType,
  sendAll: false,
  background: {
    batches: 0,
    message: '',
    date: 0,
    dateEnd: 0,
  } as BackgroundType,

  translate: () => '',
  backgroundError: {} as BackgroundErrorType,
  setBackgroundError: () => {},
  privacy: false,
  readOnly: false,
  poolsToShieldSelectSapling: true,
  poolsToShieldSelectTransparent: true,
  mode: 'advanced',
  snackbars: [] as SnackbarType[],
  addLastSnackbar: () => {},
  restartApp: () => {},
  someUnconfirmed: false,
  addressBook: [] as AddressBookFileClass[],
  launchAddressBook: () => {},
  addressBookCurrentAddress: '',
  addressBookOpenPriorModal: () => {},
  security: {} as SecurityType,
  selectServer: 'auto',
};

export const ContextAppLoaded = React.createContext(defaultAppStateLoaded);

type ContextProviderProps = {
  children: ReactNode;
  value: AppStateLoaded;
};

export const ContextAppLoadedProvider = ({ children, value }: ContextProviderProps) => {
  return <ContextAppLoaded.Provider value={value}>{children}</ContextAppLoaded.Provider>;
};
