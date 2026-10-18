import React, { ReactNode } from 'react';
import { useShallowMemo } from './useShallowMemo';

import {
  AppContextLoading,
  ZecPriceType,
  BackgroundType,
  NetInfoType,
  ChainNameEnum,
  remoteServer,
  LanguageEnum,
  SelectServerEnum,
  BlockExplorerEnum,
} from '@app/AppState';
import { RPCPerformanceLevelEnum } from '@app/walletBackend/enums/RPCPerformanceLevelEnum';

export const defaultAppContextLoading: AppContextLoading = {
  netInfo: {} as NetInfoType,
  server: remoteServer('', ChainNameEnum.noneChainName),
  language: LanguageEnum.en,
  zecPrice: {
    zecPrice: 0,
    date: 0,
  } as ZecPriceType,
  backgroundSyncInfo: {
    batches: 0,
    message: '',
    date: 0,
    dateEnd: 0,
  } as BackgroundType,
  translate: () => '',
  backgroundError: { title: '', error: '' },
  setBackgroundError: () => {},
  privacy: false,
  readOnly: false,
  orchardPool: true,
  saplingPool: true,
  transparentPool: true,
  addLastSnackbar: () => {},
  biometrics: false,
  selectServer: SelectServerEnum.auto,
  zingolibVersion: '',
  performanceLevel: RPCPerformanceLevelEnum.Medium,
  setPrivacyOption: async () => {},
  blockExplorer: BlockExplorerEnum.Zcashexplorer,
  biometricGate: { kind: 'passed' },
  retryGate: () => {},
  updating: false,
  busy: false,
  walletExists: false,
  recoveryWallet: null,
  freshInstall: false,
  walletError: null,
  errorResolved: false,
  retrying: false,
  errorShake: 0,
  serverStatus: 'ok',
  serverBlockHeight: '',
  serverLatencies: {},
  serverLists: {},
  serverBackGuard: { current: null },
  importRecoveryWallet: () => {},
  viewRecoveryWallet: () => {},
  openServer: () => {},
  closeServer: () => {},
  openCurrentWallet: () => {},
  createNewWallet: () => {},
  getwalletToRestore: () => {},
  retryOpenWallet: () => {},
  deleteThenImport: () => {},
  deleteThenCreate: () => {},
  switchToWalletChain: () => {},
  chooseAutomatic: async () => {},
  pickServer: async () => {},
  saveCustomServer: async () => true,
  setOffline: async () => {},
  probeServers: async () => {},
  serverUnreachable: () => {},
  serversFor: () => [],
  doRestore: async () => {},
};

export const ContextAppLoading = React.createContext(defaultAppContextLoading);

type ContextProviderProps = {
  children: ReactNode;
  value: AppContextLoading;
};

export const ContextAppLoadingProvider = ({
  children,
  value,
}: ContextProviderProps) => {
  const stableValue = useShallowMemo(value);
  return (
    <ContextAppLoading.Provider value={stableValue}>
      {children}
    </ContextAppLoading.Provider>
  );
};
