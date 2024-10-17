import React, { ReactNode } from 'react';
import { StackScreenProps } from '@react-navigation/stack';

import {
  SyncingStatusClass,
  ReceivePageStateClass,
  SendProgressClass,
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

export const defaultAppContextLoaded: AppContextLoaded = {
  navigation: {} as StackScreenProps<any>['navigation'],
  netInfo: {} as NetInfoType,
  syncingStatus: new SyncingStatusClass(),
  totalBalance: null,
  addresses: null,
  valueTransfers: null,
  sendPageState: new SendPageStateClass(new ToAddrClass(0)),
  receivePageState: new ReceivePageStateClass(''),
  info: {} as InfoType,
  walletSettings: new WalletSettingsClass(),
  sendProgress: new SendProgressClass(0, 0, 0),
  wallet: {} as WalletType,
  uaAddress: '',
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
  restartApp: () => {},
  somePending: false,
  addressBook: [] as AddressBookFileClass[],
  launchAddressBook: () => {},
  addressBookCurrentAddress: '',
  addressBookOpenPriorModal: () => {},
  security: {} as SecurityType,
  selectServer: SelectServerEnum.auto,
  rescanMenu: false,
  recoveryWalletInfoOnDevice: false,
  shieldingAmount: 0,
  showSwipeableIcons: true,
};

export const ContextAppLoaded = React.createContext(defaultAppContextLoaded);

type ContextProviderProps = {
  children: ReactNode;
  value: AppContextLoaded;
};

export const ContextAppLoadedProvider = ({ children, value }: ContextProviderProps) => {
  return <ContextAppLoaded.Provider value={value}>{children}</ContextAppLoaded.Provider>;
};
