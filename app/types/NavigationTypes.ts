import { RouteEnums } from '../AppState';

/**
 * Root navigation parameter list for the main stack navigator
 * This defines the structure of parameters passed between main app screens
 */
export type RootStackParamList = {
  [RouteEnums.LoadingApp]: LoadedAppNavigationState | undefined;
  [RouteEnums.LoadedApp]: {
    readOnly: boolean;
    orchardPool: boolean;
    saplingPool: boolean;
    transparentPool: boolean;
  };
};

/**
 * Navigation state used for internal app navigation within LoadedApp
 * Used for methods like navigateToLoadingApp and onClickOKChangeWallet
 */
export type LoadedAppNavigationState = {
  screen?: number;
  startingApp?: boolean;
  biometricsFailed?: boolean;
};
