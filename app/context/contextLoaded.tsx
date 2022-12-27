import React, { ReactNode } from 'react';
import { StackScreenProps } from '@react-navigation/stack';

import {
  AppStateLoaded,
  SyncingStatusReportClass,
  TotalBalanceClass,
  SendPageStateClass,
  ReceivePageStateClass,
  ToAddrClass,
  ErrorModalDataClass,
  SendProgressClass,
  WalletSettingsClass,
  TransactionType,
  InfoType,
  SyncingStatusType,
  WalletSeedType,
  DimensionsType,
  AddressClass,
  AddressBookClass,
} from '../AppState';

export const defaultAppStateLoaded: AppStateLoaded = {
  navigation: {} as StackScreenProps<any>['navigation'],
  route: {} as StackScreenProps<any>['route'],
  dimensions: {} as DimensionsType,

  syncStatusReport: new SyncingStatusReportClass(),
  totalBalance: new TotalBalanceClass(),
  addressPrivateKeys: new Map(),
  addresses: [] as AddressClass[],
  addressBook: [] as AddressBookClass[],
  transactions: [] as TransactionType[],
  sendPageState: new SendPageStateClass(new ToAddrClass(0)),
  receivePageState: new ReceivePageStateClass(''),
  info: {} as InfoType,
  rescanning: false,
  wallet_settings: new WalletSettingsClass(),
  syncingStatus: {} as SyncingStatusType,
  errorModalData: new ErrorModalDataClass('', ''),
  sendProgress: new SendProgressClass(0, 0, 0),
  walletSeed: {} as WalletSeedType,
  isMenuDrawerOpen: false,
  selectedMenuDrawerItem: '' as string,
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
  poolsModalVisible: false,
  newServer: '' as string,
  uaAddress: '' as string,

  translate: () => '',
};

export const ContextLoaded = React.createContext(defaultAppStateLoaded);

type ContextProviderProps = {
  children: ReactNode;
  value: AppStateLoaded;
};

export const ContextLoadedProvider = ({ children, value }: ContextProviderProps) => {
  return <ContextLoaded.Provider value={value}>{children}</ContextLoaded.Provider>;
};
