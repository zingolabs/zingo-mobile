import React, { ReactNode } from 'react';
import { useShallowMemo } from './useShallowMemo';

import {
  AppContextLoading,
  ZecPriceType,
  BackgroundType,
  NetInfoType,
  ServerType,
  SecurityType,
  LanguageEnum,
  ModeEnum,
  CurrencyEnum,
  SelectServerEnum,
  BlockExplorerEnum,
} from '../AppState';
import { RPCPerformanceLevelEnum } from '../rpc/enums/RPCPerformanceLevelEnum';

export const defaultAppContextLoading: AppContextLoading = {
  netInfo: {} as NetInfoType,
  server: {} as ServerType,
  currency: CurrencyEnum.USDCurrency,
  language: LanguageEnum.en,
  zecPrice: {
    zecPrice: 0,
    date: 0,
  } as ZecPriceType,
  sendAll: false,
  donation: false,
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
  mode: ModeEnum.advanced,
  addLastSnackbar: () => {},
  security: {} as SecurityType,
  selectServer: SelectServerEnum.auto,
  rescanMenu: false,
  recoveryWalletInfoOnDevice: false,
  zingolibVersion: '',
  performanceLevel: RPCPerformanceLevelEnum.Medium,
  setPrivacyOption: async () => {},
  blockExplorer: BlockExplorerEnum.Zcashexplorer,
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
