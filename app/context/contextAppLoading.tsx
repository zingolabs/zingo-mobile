import React, { ReactNode } from 'react';
import { StackScreenProps } from '@react-navigation/stack';

import {
  AppStateLoading,
  InfoType,
  TotalBalanceClass,
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
  ChainNameEnum,
  SnackbarType,
  AppStateStatusEnum,
} from '../AppState';

export const defaultAppStateLoading: AppStateLoading = {
  navigation: {} as StackScreenProps<any>['navigation'],
  route: {} as StackScreenProps<any>['route'],
  appState: AppStateStatusEnum.unknown,
  netInfo: {} as NetInfoType,

  screen: 0,
  actionButtonsDisabled: false,
  walletExists: false,
  wallet: {} as WalletType,
  totalBalance: new TotalBalanceClass(),
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
  customServerShow: false,
  customServerUri: '',
  customServerChainName: ChainNameEnum.mainChainName,
  mode: ModeEnum.advanced,
  snackbars: [] as SnackbarType[],
  addLastSnackbar: () => {},
  firstLaunchingMessage: false,
  biometricsFailed: false,
  startingApp: true,
  security: {} as SecurityType,
  selectServer: SelectServerEnum.auto,
  serverErrorTries: 0,
  donationAlert: false,
};

export const ContextAppLoading = React.createContext(defaultAppStateLoading);

type ContextProviderProps = {
  children: ReactNode;
  value: AppStateLoading;
};

export const ContextAppLoadingProvider = ({ children, value }: ContextProviderProps) => {
  return <ContextAppLoading.Provider value={value}>{children}</ContextAppLoading.Provider>;
};
