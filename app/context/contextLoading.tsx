import React, { ReactNode } from 'react';

import { AppStateLoading, TotalBalance } from '../AppState';

const defaultAppState: AppStateLoading = {
  navigation: null,
  route: null,
  dimensions: {} as {
    width: number;
    height: number;
    orientation: 'portrait' | 'landscape';
    deviceType: 'tablet' | 'phone';
  },

  screen: 0,
  actionButtonsDisabled: false,
  walletExists: false,
  walletSeed: null,
  birthday: null,
  server: null,
  totalBalance: new TotalBalance(),
  info: null,
  translate: () => {},
};

export const ContextLoading = React.createContext(defaultAppState);

type ContextProviderProps = {
  children: ReactNode;
  value: AppStateLoading;
};

export const ContextLoadingProvider = ({ children, value }: ContextProviderProps) => {
  return <ContextLoading.Provider value={value}>{children}</ContextLoading.Provider>;
};
