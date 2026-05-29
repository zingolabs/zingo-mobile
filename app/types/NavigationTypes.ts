import {
  AddressKindEnum,
  LaunchingModeEnum,
  RouteEnum,
  SeedActionEnum,
  SelectServerEnum,
  SendPageStateClass,
  ServerType,
  UfvkActionEnum,
  ValueTransferType,
} from '../AppState';
import { RPCParseAddressType } from '../walletBackend/types/RPCParseAddressType';

/**
 * Root navigation parameter list for the main stack navigator
 * This defines the structure of parameters passed between main app screens
 */
export type AppStackParamList = {
  // Stack
  [RouteEnum.LoadingApp]: LoadingAppNavigationState | undefined;
  [RouteEnum.LoadedApp]: LoadedAppNavigationState | undefined;
  // ScannerAddress is presented as a modal at the root Stack level so it
  // overlays LoadedApp (and any open BottomSheet modals).
  [RouteEnum.ScannerAddress]: ScannerAddressNavigationState | undefined;
};

/**
 * Navigation state used for internal app navigation within LoadedApp
 * Used for methods like navigateToLoadingApp and onClickOKChangeWallet
 */
export type LoadingAppNavigationState = {
  screen?: RouteEnum;
  startingApp?: boolean;
  biometricsFailed?: boolean;
  newWallet?: boolean;
};
/**
 * Navigation state used for internal app navigation within LoadedApp
 * Used for methods like navigateToLoadedApp
 */
export type LoadedAppNavigationState = {
  readOnly: boolean;
  orchardPool: boolean;
  saplingPool: boolean;
  transparentPool: boolean;
  newWallet: boolean;
  firstLaunchingMessage: LaunchingModeEnum;
};

/**
 * Root drawer parameter list for the main stack navigator
 * This defines the structure of parameters passed between main app screens
 */
export type AppDrawerParamList = {
  // Drawer no params
  [RouteEnum.HomeStack]: undefined;
  [RouteEnum.History]: undefined;
  [RouteEnum.Send]: undefined;
  [RouteEnum.Receive]: undefined;
  [RouteEnum.Messages]: undefined;
  [RouteEnum.AddressBookStack]: undefined;
  [RouteEnum.ValueTransferDetailStack]: undefined;
  [RouteEnum.ConfirmStack]: undefined;
  [RouteEnum.InsightStack]: undefined;
  [RouteEnum.Settings]: undefined;
  [RouteEnum.About]: undefined;
  [RouteEnum.Rescan]: undefined;
  [RouteEnum.Info]: undefined;
  [RouteEnum.Insight]: undefined;
  [RouteEnum.Computing]: undefined;
  [RouteEnum.SyncReport]: undefined;
  [RouteEnum.Pools]: undefined;
  [RouteEnum.ContactList]: undefined;

  // Drawer with params
  [RouteEnum.AddressBook]: AddressBookNavigationState | undefined;
  [RouteEnum.AddressList]: AddressListNavigationState | undefined;
  [RouteEnum.ScannerAddress]: ScannerAddressNavigationState | undefined;
  [RouteEnum.ValueTransferDetail]:
    | ValueTransferDetailNavigationState
    | undefined;
  [RouteEnum.MessagesAddress]: MessagesAddressNavigationState | undefined;
  [RouteEnum.MessagesAll]: MessagesAllNavigationState | undefined;
  [RouteEnum.Confirm]: ConfirmNavigationState | undefined;
  [RouteEnum.Ufvk]: UfvkNavigationState | undefined;
  [RouteEnum.Seed]: SeedNavigationState | undefined;
};

export type AddressBookNavigationState = {
  currentAddress: string;
  routeStack: RouteEnum;
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
  index: number;
  vt: ValueTransferType;
  valueTransfersSliced: ValueTransferType[];
  totalLength: number;
  from?: RouteEnum;
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
  nym: boolean;
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
