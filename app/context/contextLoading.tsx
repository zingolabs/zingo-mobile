import React, { ReactNode } from 'react';
import { StackScreenProps } from '@react-navigation/stack';

import { AppStateLoading, DimensionsType, InfoType, TotalBalanceClass, WalletSeedType } from '../AppState';

export const defaultAppStateLoading: AppStateLoading = {
  navigation: {} as StackScreenProps<any>['navigation'],
  route: {} as StackScreenProps<any>['route'],
  dimensions: {} as DimensionsType,

  screen: 0,
  actionButtonsDisabled: false,
  walletExists: false,
  walletSeed: {} as WalletSeedType,
  server: '' as string,
  currency: '',
  language: 'en',
  totalBalance: new TotalBalanceClass(),
  info: {} as InfoType,

  translate: () => '',
};

export const ContextLoading = React.createContext(defaultAppStateLoading);

type ContextProviderProps = {
  children: ReactNode;
  value: AppStateLoading;
};

export const ContextLoadingProvider = ({ children, value }: ContextProviderProps) => {
  return <ContextLoading.Provider value={value}>{children}</ContextLoading.Provider>;
};
