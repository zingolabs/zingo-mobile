import {
  AddressKindEnum,
  LaunchingModeEnum,
  RouteEnum,
  SeedActionEnum,
  SendPageStateClass,
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
  // ScannerAddress / ScannerUfvk are presented as transparent modals at the
  // root Stack so they overlay everything (LoadedApp, LoadingApp, and any
  // open BottomSheet portals).
  [RouteEnum.ScannerAddress]: ScannerAddressNavigationState | undefined;
  [RouteEnum.ScannerUfvk]: ScannerUfvkNavigationState | undefined;
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
  [RouteEnum.Swap]: undefined;
  [RouteEnum.Messages]: undefined;
  [RouteEnum.Settings]: undefined;
  [RouteEnum.About]: undefined;
  [RouteEnum.Rescan]: undefined;
  [RouteEnum.Insight]: undefined;
  [RouteEnum.Computing]:
    | { phase?: 'created' | 'failed'; errorMessage?: string }
    | undefined;
  [RouteEnum.SyncReport]: undefined;
  [RouteEnum.Pools]: undefined;

  // Drawer with params
  [RouteEnum.AddressBook]: AddressBookNavigationState | undefined;
  [RouteEnum.AddressList]: AddressListNavigationState | undefined;
  [RouteEnum.ValueTransferDetail]:
    | ValueTransferDetailNavigationState
    | undefined;
  [RouteEnum.SwapDetail]: SwapDetailNavigationState | undefined;
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

export type ScannerUfvkNavigationState = {
  setUfvkText: (k: string) => void;
  active: boolean;
};

export type ValueTransferDetailNavigationState = {
  index: number;
  vt: ValueTransferType;
  valueTransfersSliced: ValueTransferType[];
  totalLength: number;
};

/**
 * Params for the SwapDetail screen. Mirrors `ValueTransferDetailNavigationState`
 * structure (index + slice + total) so the up/down chevron navigation feels
 * identical, but the slice is a list of `recordId`s rather than full
 * `SwapRecord` snapshots. The screen looks up the current record live from
 * `context.swapRecords` on every render so background mutations by the
 * poller surface without the params going stale.
 */
export type SwapDetailNavigationState = {
  index: number;
  recordIds: string[];
  totalLength: number;
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

export type UfvkNavigationState = {
  action: UfvkActionEnum;
};

export type SeedNavigationState = {
  action: SeedActionEnum;
};
