import React, { ReactNode } from 'react';

import {
  InfoType,
  WalletType,
  ZecPriceType,
  BackgroundType,
  SendPageStateClass,
  ToAddrClass,
  NetInfoType,
  BackgroundErrorType,
  ServerType,
  SecurityType,
  LanguageEnum,
  CurrencyEnum,
  SelectServerEnum,
  SnackbarType,
  AppContextLoaded,
} from '../AppState';

import { RPCSyncStatusType } from '../rpc/types/RPCSyncStatusType';
import { RPCPerformanceLevelEnum } from '../rpc/enums/RPCPerformanceLevelEnum';

export const defaultAppContextLoaded: AppContextLoaded = {
  netInfo: {} as NetInfoType,
  syncingStatus: {} as RPCSyncStatusType,
  totalBalance: null,
  staked: [],
  globalStaked: [],
  walletBonds: [],
  addresses: null,
  valueTransfers: null,
  valueTransfersTotal: null,
  messages: null,
  messagesTotal: null,
  sendPageState: new SendPageStateClass(new ToAddrClass(0)),
  setSendPageState: () => {},
  info: {} as InfoType,
  wallet: {} as WalletType,
  defaultUnifiedAddress: '',
  indexerServer: {} as ServerType,
  selectIndexerServer: SelectServerEnum.custom,
  currency: CurrencyEnum.USDCurrency,
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
  lastError: '',
  orchardPool: true,
  saplingPool: true,
  transparentPool: true,
  snackbars: [] as SnackbarType[],
  addLastSnackbar: () => {},
  removeFirstSnackbar: () => {},
  somePending: false,
  security: {} as SecurityType,
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
  requestFaucetFunds: async () => '',
  stakingDay: false,
  timeToStakingDay: 0,
  timeLeftStakingDay: 0,
  scheduledActions: [],
  setScheduledActions: () => {},
 
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
