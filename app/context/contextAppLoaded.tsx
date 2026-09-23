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
  SelectServerEnum,
  ChainNameEnum,
  AppContextLoaded,
  BlockExplorerEnum,
} from '@app/AppState';

import { RPCSyncStatusType } from '@app/walletBackend/types/RPCSyncStatusType';
import { RPCPerformanceLevelEnum } from '@app/walletBackend/enums/RPCPerformanceLevelEnum';

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
  language: LanguageEnum.en,
  zecPrice: {
    zecPrice: 0,
    date: 0,
  } as ZecPriceType,
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
  keyless: false,
  orchardPool: true,
  saplingPool: true,
  transparentPool: true,
  addLastSnackbar: () => {},
  restartApp: () => {},
  somePending: false,
  addressBook: [] as AddressBookFileClass[],
  launchAddTagModal: () => {},
  security: {} as SecurityType,
  selectServer: SelectServerEnum.auto,
  walletChainName: ChainNameEnum.noneChainName,
  shieldingAmount: 0,
  showSwipeableIcons: true,
  doRefresh: () => {},
  setZecPrice: () => {},
  zingolibVersion: '',
  performanceLevel: RPCPerformanceLevelEnum.Medium,
  setPrivacyOption: async () => {},
  blockExplorer: BlockExplorerEnum.Zcashexplorer,
  mixnetView: null,
  reenableMixnet: async () => {},
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
