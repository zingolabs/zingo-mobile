import React, { ReactNode } from 'react';
import { useShallowMemo } from './useShallowMemo';

import {
  InfoType,
  ZecPriceType,
  BackgroundType,
  SendPageStateClass,
  ToAddrClass,
  NetInfoType,
  ServerType,
  AddressBookFileClass,
  SecurityType,
  LanguageEnum,
  ModeEnum,
  CurrencyEnum,
  SelectServerEnum,
  ChainNameEnum,
  AppContextLoaded,
  BlockExplorerEnum,
} from '../AppState';

import { RPCSyncStatusType } from '../walletBackend/types/RPCSyncStatusType';
import { RPCPerformanceLevelEnum } from '../walletBackend/enums/RPCPerformanceLevelEnum';

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
  backgroundError: { title: '', error: '' },
  setBackgroundError: () => {},
  lastError: '',
  setLastError: () => {},
  orchardPool: true,
  saplingPool: true,
  transparentPool: true,
  mode: ModeEnum.advanced,
  addLastSnackbar: () => {},
  restartApp: () => {},
  somePending: false,
  addressBook: [] as AddressBookFileClass[],
  launchAddTagModal: () => {},
  security: {} as SecurityType,
  selectServer: SelectServerEnum.auto,
  walletChainName: ChainNameEnum.noneChainName,
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
  nym: false,
  setNymOption: async () => {},
  setModeOption: async () => {},
  setCurrencyOption: async () => {},
  foregroundEpoch: 0,
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
  const stableValue = useShallowMemo(value);
  return (
    <ContextAppLoaded.Provider value={stableValue}>
      {children}
    </ContextAppLoaded.Provider>
  );
};
