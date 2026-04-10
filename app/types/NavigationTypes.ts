import { NavigatorScreenParams } from '@react-navigation/native';
import {
  AddressKindEnum,
  LaunchingModeEnum,
  RouteEnum,
  ScheduledActionType,
  SeedActionEnum,
  SelectServerEnum,
  SendPageStateClass,
  ServerType,
  UfvkActionEnum,
  ValueTransferType,
} from '../AppState';
import { RPCParseAddressType } from '../rpc/types/RPCParseAddressType';

export type LoadedAppRouteParams =
  | LoadedAppNavigationState
  | (LoadedAppNavigationState & NavigatorScreenParams<AppDrawerParamList>);

/**
 * Root navigation parameter list for the main stack navigator
 * This defines the structure of parameters passed between main app screens
 */
export type AppStackParamList = {
  // Stack
  [RouteEnum.LoadingApp]: LoadingAppNavigationState | undefined;
  [RouteEnum.LoadedApp]: LoadedAppRouteParams | undefined;
};

/**
 * Navigation state used for internal app navigation within LoadedApp
 * Used for methods like navigateToLoadingApp and onClickOKChangeWallet
 */
export type LoadingAppNavigationState = {
  screen?: number;
  startingApp?: boolean;
  biometricsFailed?: boolean;
  walletSeed?: string;
  walletBirthday?: number;
};
/**
 * Navigation state used for internal app navigation within LoadedApp
 * Used for methods like navigateToLoadedApp
 */
export type LoadedAppNavigationState = {
  readOnly?: boolean;
  orchardPool?: boolean;
  saplingPool?: boolean;
  transparentPool?: boolean;
  firstLaunchingMessage?: LaunchingModeEnum;
};

export type MainTabParamList = {
  [RouteEnum.History]: undefined;
  [RouteEnum.StakingHome]: StakingHomeNavigationState | undefined;
};

/**
 * Root drawer parameter list for the main stack navigator
 * This defines the structure of parameters passed between main app screens
 */
export type AppDrawerParamList = {
  [RouteEnum.MainTabs]: NavigatorScreenParams<MainTabParamList> | undefined;

  // Drawer no params
  [RouteEnum.Send]: undefined;
  [RouteEnum.Receive]: undefined;
  [RouteEnum.Messages]: undefined;
  [RouteEnum.ValueTransferDetailStack]: undefined;
  [RouteEnum.ConfirmStack]: undefined;
  [RouteEnum.InsightStack]: undefined;
  [RouteEnum.Settings]: undefined;
  [RouteEnum.SettingsMenu]: undefined;
  [RouteEnum.SettingsServers]: undefined;
  [RouteEnum.DebugInfo]: undefined;
  [RouteEnum.Faucet]: undefined;
  [RouteEnum.About]: undefined;
  [RouteEnum.Distribution]: undefined;
  [RouteEnum.Rescan]: undefined;
  [RouteEnum.Info]: undefined;
  [RouteEnum.Insight]: undefined;
  [RouteEnum.SyncReport]: undefined;
  [RouteEnum.Pools]: undefined;
  [RouteEnum.ContactList]: undefined;

  // Drawer with params
  [RouteEnum.AddressList]: AddressListNavigationState | undefined;
  [RouteEnum.ScannerAddress]: ScannerAddressNavigationState | undefined;
  [RouteEnum.ValueTransferDetail]:
    | ValueTransferDetailNavigationState
    | undefined;
  [RouteEnum.MessagesAddress]: MessagesAddressNavigationState | undefined;
  [RouteEnum.MessagesAll]: MessagesAllNavigationState | undefined;
  [RouteEnum.Memo]: MemoNavigationState | undefined;
  [RouteEnum.Confirm]: ConfirmNavigationState | undefined;
  [RouteEnum.Ufvk]: UfvkNavigationState | undefined;
  [RouteEnum.Seed]: SeedNavigationState | undefined;
  [RouteEnum.Computing]: ComputingNavigationState | undefined;
  [RouteEnum.ComputingOK]: ComputingOKNavigationState | undefined;
  [RouteEnum.ComputingError]: ComputingErrorNavigationState | undefined;
  [RouteEnum.Finalizers]: FinalizersNavigationState | undefined;
  [RouteEnum.FinalizerDetail]: FinalizerDetailNavigationState | undefined;
  [RouteEnum.Stake]: StakeNavigationState | undefined;
  [RouteEnum.Unstake]: UnstakeNavigationState | undefined;
  [RouteEnum.Redelegate]: RedelegateNavigationState | undefined;
  [RouteEnum.ScheduledActionDetail]:
    | ScheduledActionDetailNavigationState
    | undefined;
};

export type AddressListNavigationState = {
  addressKind: AddressKindEnum;
  setIndex: (n: number) => void;
};

export type ScannerAddressNavigationState = {
  setAddress: (a: string) => void;
  active: boolean;
};

export type ValueTransferDetailNavigationState = {
  vt: ValueTransferType;
  totalLength: number;
};

export type MemoNavigationState = {
  message: string;
  includeUAMessage: boolean;
  setMessage: (m: string) => void;
};

export type FinalizersNavigationState = {
  setFinalizer: (f: string, s: number) => void;
  scope: 'my' | 'network';
  exclude: string;
  goBackRoute: RouteEnum;
};

export type FinalizerDetailNavigationState = {
  finalizer: string;
};

export type StakeNavigationState = {};

export type StakingHomeNavigationState = {
  tab: 'scheduled' | 'active' | 'my';
};

export type UnstakeNavigationState = {
  finalizer: string;
  txid: string;
  staked: number;
  closeSheet: () => void;
};

export type RedelegateNavigationState = {
  finalizer: string;
  txid: string;
  staked: number;
  closeSheet: () => void;
};

export type ScheduledActionDetailNavigationState = {
  item: ScheduledActionType;
};

export type ConfirmNavigationState = {
  calculatedFee: number;
  parseAddressInfoJSON: RPCParseAddressType;
  donationAmount: number;
  confirmSend: (s: SendPageStateClass) => Promise<void>;
  sendAllAmount: boolean;
  calculateFeeWithPropose: (
    amount: string,
    address: string,
    memo: string,
    includeUAMemo: boolean,
  ) => Promise<void>;
  sendPageState: SendPageStateClass;
};

export type MessagesAddressNavigationState = {
  setScrollToBottom: (value: boolean) => void;
  scrollToBottom: boolean;
  address: string;
  sendTransaction: (s: SendPageStateClass) => Promise<String>;
  setServerOption: (
    value: ServerType,
    selectServer: SelectServerEnum,
    toast: boolean,
    sameServerChainName: boolean,
  ) => Promise<void>;
};

export type MessagesAllNavigationState = {
  setScrollToBottom: (value: boolean) => void;
  scrollToBottom: boolean;
};

export type UfvkNavigationState = {
  action: UfvkActionEnum;
};

export type SeedNavigationState = {
  action: SeedActionEnum;
};

export type ComputingNavigationState = {
  sendPageStatePar: SendPageStateClass;
};

export type ComputingOKNavigationState = {
  txid: string;
};

export type ComputingErrorNavigationState = {
  error: string;
};
