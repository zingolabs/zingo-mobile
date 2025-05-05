import React, { ReactNode } from 'react';

import {
  WalletSettingsClass,
  InfoType,
  WalletType,
  ZecPriceType,
  BackgroundType,
  SendPageStateClass,
  ToAddrClass,
  NetInfoType,
  BackgroundErrorType,
  ServerType,
  AddressBookFileClass,
  SecurityType,
  LanguageEnum,
  ModeEnum,
  CurrencyEnum,
  SelectServerEnum,
  SnackbarType,
  AppContextLoaded,
} from '../AppState';

import { RPCSyncStatusType } from '../rpc/types/RPCSyncStatusType';

export const defaultAppContextLoaded: AppContextLoaded = {
  navigationHome: null,
  netInfo: {} as NetInfoType,
  syncingStatus: {} as RPCSyncStatusType,
  totalBalance: null,
  addresses: null,
  valueTransfers: null,
  valueTransfersTotal: null,
  messages: null,
  messagesTotal: null,
  sendPageState: new SendPageStateClass(new ToAddrClass(0)),
  setSendPageState: () => {},
  info: {} as InfoType,
  walletSettings: new WalletSettingsClass(),
  wallet: {} as WalletType,
  uOrchardAddress: '',
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
  orchardPool: true,
  saplingPool: true,
  transparentPool: true,
  mode: ModeEnum.advanced,
  snackbars: [] as SnackbarType[],
  addLastSnackbar: () => {},
  removeFirstSnackbar: () => {},
  restartApp: () => {},
  somePending: false,
  addressBook: [] as AddressBookFileClass[],
  launchAddressBook: () => new Promise(resolve => resolve),
  addressBookCurrentAddress: '',
  security: {} as SecurityType,
  selectServer: SelectServerEnum.auto,
  rescanMenu: false,
  recoveryWalletInfoOnDevice: false,
  shieldingAmount: 0,
  showSwipeableIcons: true,
  doRefresh: () => {},
  setZecPrice: () => {},
  zenniesDonationAddress: '',
  setComputingModalShow: () => new Promise(resolve => resolve),
  closeAllModals: () => {},
  setUfvkViewModalShow: () => new Promise(resolve => resolve),
  setSyncReportModalShow: () => new Promise(resolve => resolve),
  setPoolsModalShow: () => new Promise(resolve => resolve),
};

export const ContextAppLoaded = React.createContext(defaultAppContextLoaded);

type ContextProviderProps = {
  children: ReactNode;
  value: AppContextLoaded;
};

export const ContextAppLoadedProvider = ({ children, value }: ContextProviderProps) => {
  return <ContextAppLoaded.Provider value={value}>{children}</ContextAppLoaded.Provider>;
};
