import React, { ReactNode } from 'react';
import { StackScreenProps } from '@react-navigation/stack';

import {
  AppStateLoaded,
  SyncStatusReport,
  TotalBalance,
  SendPageState,
  ReceivePageState,
  ToAddr,
  ErrorModalData,
  SendProgress,
  WalletSettings,
  Transaction,
  InfoType,
  SyncStatus,
  WalletSeed,
  DimensionsType,
  Address,
  AddressBookEntry,
} from '../AppState';

export const defaultAppStateLoaded: AppStateLoaded = {
  navigation: {} as StackScreenProps<any>['navigation'],
  route: {} as StackScreenProps<any>['route'],
  dimensions: {} as DimensionsType,

  syncStatusReport: new SyncStatusReport(),
  totalBalance: new TotalBalance(),
  addressPrivateKeys: new Map(),
  addresses: [] as Address[],
  addressBook: [] as AddressBookEntry[],
  transactions: [] as Transaction[],
  sendPageState: new SendPageState(new ToAddr(0)),
  receivePageState: new ReceivePageState(''),
  info: {} as InfoType,
  rescanning: false,
  wallet_settings: new WalletSettings(),
  syncingStatus: {} as SyncStatus,
  errorModalData: new ErrorModalData('', ''),
  sendProgress: new SendProgress(0, 0, 0),
  walletSeed: {} as WalletSeed,
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
