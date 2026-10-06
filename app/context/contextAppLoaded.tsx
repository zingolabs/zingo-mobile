import React, { ReactNode } from 'react';
import { useShallowMemo } from './useShallowMemo';
import { PERMITTED } from '@app/walletBackend/transforms/sendPermit';
import { ABSENT_MIXNET_VIEW } from '@app/walletBackend/transforms/mixnetView';

import {
  InfoType,
  ZecPriceType,
  BackgroundType,
  SendPageStateClass,
  ToAddrClass,
  NetInfoType,
  remoteServer,
  AddressBookFileClass,
  LanguageEnum,
  SelectServerEnum,
  ChainNameEnum,
  AppContextLoaded,
  BlockExplorerEnum,
} from '@app/AppState';

import { RPCPerformanceLevelEnum } from '@app/walletBackend/enums/RPCPerformanceLevelEnum';

export const defaultAppContextLoaded: AppContextLoaded = {
  netInfo: {} as NetInfoType,
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
  server: remoteServer('', ChainNameEnum.noneChainName),
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
  orchardPool: true,
  saplingPool: true,
  transparentPool: true,
  addLastSnackbar: () => {},
  restartApp: () => {},
  somePending: false,
  addressBook: [] as AddressBookFileClass[],
  launchAddTagModal: () => {},
  biometrics: false,
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
  mixnetView: ABSENT_MIXNET_VIEW,
  reenableMixnet: async () => {},
  sendPermitNow: () => PERMITTED,
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
