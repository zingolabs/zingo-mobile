import React, { ReactNode } from 'react';
import { StackScreenProps } from '@react-navigation/stack';

import {
  AppStateLoaded,
  SyncingStatusReportClass,
  TotalBalanceClass,
  ReceivePageStateClass,
  ErrorModalDataClass,
  SendProgressClass,
  WalletSettingsClass,
  TransactionType,
  InfoType,
  SyncingStatusType,
  WalletType,
  DimensionsType,
  AddressClass,
  AddressBookClass,
  zecPriceType,
  BackgroundType,
  SendPageStateClass,
  ToAddrClass,
  NetInfoType,
  BackgroundErrorType,
  ServerType,
} from '../AppState';

export const defaultAppStateLoaded: AppStateLoaded = {
  navigation: {} as StackScreenProps<any>['navigation'],
  route: {} as StackScreenProps<any>['route'],
  dimensions: {} as DimensionsType,
  appState: '',
  netInfo: {} as NetInfoType,

  syncingStatusReport: new SyncingStatusReportClass(),
  totalBalance: new TotalBalanceClass(),
  addressPrivateKeys: new Map(),
  addresses: [] as AddressClass[],
  addressBook: [] as AddressBookClass[],
  transactions: [] as TransactionType[],
  sendPageState: new SendPageStateClass(new ToAddrClass(0)),
  receivePageState: new ReceivePageStateClass(''),
  info: {} as InfoType,
  walletSettings: new WalletSettingsClass(),
  syncingStatus: {} as SyncingStatusType,
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
  ufvkViewModalVisible: false,
  seedChangeModalVisible: false,
  seedBackupModalVisible: false,
  seedServerModalVisible: false,
  syncReportModalVisible: false,
  poolsModalVisible: false,
  insightModalVisible: false,
  newServer: {} as ServerType,
  uaAddress: '',

  server: {} as ServerType,
  currency: '',
  language: 'en',

  zecPrice: {
    zecPrice: 0,
    date: 0,
  } as zecPriceType,
  sendAll: false,
  background: {
    batches: 0,
    date: 0,
  } as BackgroundType,

  translate: () => '',
  backgroundError: {} as BackgroundErrorType,
  privacy: false,
  readOnly: false,
  poolsToShieldSelectSapling: true,
  poolsToShieldSelectTransparent: true,
};

export const ContextAppLoaded = React.createContext(defaultAppStateLoaded);

type ContextProviderProps = {
  children: ReactNode;
  value: AppStateLoaded;
};

export const ContextAppLoadedProvider = ({ children, value }: ContextProviderProps) => {
  return <ContextAppLoaded.Provider value={value}>{children}</ContextAppLoaded.Provider>;
};
