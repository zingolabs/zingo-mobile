import {
  createNavigationContainerRef,
  NavigatorScreenParams,
} from '@react-navigation/native';
import { RouteEnum } from '@app/AppState';
import type { AppDrawerParamList, RootParamList } from '@app/types';

export const navigationRef = createNavigationContainerRef<RootParamList>();

// Opens a wallet screen from outside the navigator tree, such as the options
// panel dispatch in LoadedApp or a link delivered to Send.
export const navigateWallet = (
  target: NavigatorScreenParams<AppDrawerParamList>,
): void => {
  if (!navigationRef.isReady()) {
    return;
  }
  navigationRef.navigate(RouteEnum.Wallet, target);
};
