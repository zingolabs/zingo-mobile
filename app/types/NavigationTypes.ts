import { RouteEnums } from '../AppState';

/**
 * Root navigation parameter list for the main stack navigator
 * This defines the structure of parameters passed between main app screens
 */
export type RootStackParamList = {
  [RouteEnums.LoadingApp]: LoadingAppNavigationState | undefined;
  [RouteEnums.LoadedApp]: LoadedAppNavigationState | undefined;
};

/**
 * Navigation state used for internal app navigation within LoadedApp
 * Used for methods like navigateToLoadingApp and onClickOKChangeWallet
 */
export type LoadingAppNavigationState = {
  screen?: number;
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
};
