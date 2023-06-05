import React, { ReactNode } from 'react';
import { StackScreenProps } from '@react-navigation/stack';

import {
  AppStateLoading,
  DimensionsType,
  InfoType,
  TotalBalanceClass,
  WalletSeedType,
  zecPriceType,
  BackgroundType,
  NetInfoType,
  BackgroundErrorType,
  ServerType,
} from '../AppState';

export const defaultAppStateLoading: AppStateLoading = {
  navigation: {} as StackScreenProps<any>['navigation'],
  route: {} as StackScreenProps<any>['route'],
  dimensions: {} as DimensionsType,
  appState: '',
  netInfo: {} as NetInfoType,

  screen: 0,
  actionButtonsDisabled: false,
  walletExists: false,
  walletSeed: {} as WalletSeedType,
  totalBalance: new TotalBalanceClass(),
  info: {} as InfoType,

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
  customServerShow: false,
  customServer: { uri: '', chain_name: 'main' } as ServerType,
};

export const ContextAppLoading = React.createContext(defaultAppStateLoading);

type ContextProviderProps = {
  children: ReactNode;
  value: AppStateLoading;
};

export const ContextAppLoadingProvider = ({ children, value }: ContextProviderProps) => {
  return <ContextAppLoading.Provider value={value}>{children}</ContextAppLoading.Provider>;
};
