import React, { ReactNode } from 'react';

import {
  InfoType,
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
  BlockExplorerEnum,
} from '../AppState';

import { RPCSyncStatusType } from '../rpc/types/RPCSyncStatusType';
import { RPCPerformanceLevelEnum } from '../rpc/enums/RPCPerformanceLevelEnum';

export const defaultAppContextLoaded: AppContextLoaded = {
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
  birthday: 0,
  defaultUnifiedAddress: '',
  server: {} as ServerType,
  currency: CurrencyEnum.USDCurrency,
  language: LanguageEnum.en,
  zecPrice: {
    zecPrice: 0,
    date: 0,
  } as ZecPriceType,
  sendAll: false,
  donation: false,
  privacy: false,
  readOnly: false,
  translate: () => '',
  backgroundSyncInfo: {
    batches: 0,
    message: '',
    date: 0,
    dateEnd: 0,
  } as BackgroundType,
  setBackgroundSyncErrorInfo: () => {},
  backgroundError: {} as BackgroundErrorType,
  setBackgroundError: () => {},
  lastError: '',
  setLastError: () => {},
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
  launchAddressBook: () => {},
  security: {} as SecurityType,
  selectServer: SelectServerEnum.auto,
  rescanMenu: false,
  recoveryWalletInfoOnDevice: false,
  shieldingAmount: 0,
  showSwipeableIcons: true,
  doRefresh: () => {},
  setZecPrice: () => {},
  zenniesDonationAddress: '',
  zingolibVersion: '',
  performanceLevel: RPCPerformanceLevelEnum.Medium,
  setPrivacyOption: async () => {},
  blockExplorer: BlockExplorerEnum.Zcashexplorer,
};

export const ContextAppLoaded = React.createContext(defaultAppContextLoaded);

type ContextProviderProps = {
  children: ReactNode;
  value: AppContextLoaded;
};

export const ContextAppLoadedProvider = ({
  children,
  value,
}: ContextProviderProps) => {
  return (
    <ContextAppLoaded.Provider value={value}>
      {children}
    </ContextAppLoaded.Provider>
  );
};
