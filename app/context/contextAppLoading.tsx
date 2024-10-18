import React, { ReactNode } from 'react';
import { StackScreenProps } from '@react-navigation/stack';

import {
  AppContextLoading,
  InfoType,
  WalletType,
  ZecPriceType,
  BackgroundType,
  NetInfoType,
  BackgroundErrorType,
  ServerType,
  SecurityType,
  LanguageEnum,
  ModeEnum,
  CurrencyEnum,
  SelectServerEnum,
  SnackbarType,
} from '../AppState';

export const defaultAppContextLoading: AppContextLoading = {
  navigation: {} as StackScreenProps<any>['navigation'],
  netInfo: {} as NetInfoType,
  wallet: {} as WalletType,
  info: {} as InfoType,
  server: {} as ServerType,
  currency: CurrencyEnum.noCurrency,
  language: LanguageEnum.en,
  zecPrice: {
    zecPrice: 0,
    date: 0,
  } as ZecPriceType,
  sendAll: false,
  donation: false,
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
  mode: ModeEnum.advanced,
  snackbars: [] as SnackbarType[],
  addLastSnackbar: () => {},
  security: {} as SecurityType,
  selectServer: SelectServerEnum.auto,
  rescanMenu: false,
  recoveryWalletInfoOnDevice: false,
};

export const ContextAppLoading = React.createContext(defaultAppContextLoading);

type ContextProviderProps = {
  children: ReactNode;
  value: AppContextLoading;
};

export const ContextAppLoadingProvider = ({ children, value }: ContextProviderProps) => {
  return <ContextAppLoading.Provider value={value}>{children}</ContextAppLoading.Provider>;
};
