import {
  CommonActions,
  createNavigationContainerRef,
  NavigatorScreenParams,
  StackActions,
} from '@react-navigation/native';
import { RouteEnum } from '@app/AppState';
import type {
  AppDrawerParamList,
  OnboardingParamList,
  OnboardingRoute,
  RootParamList,
} from '@app/types';

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

// Opens an onboarding screen from the loading section's provider.
export const navigateOnboarding = (
  target: NavigatorScreenParams<OnboardingParamList>,
): void => {
  if (!navigationRef.isReady()) {
    return;
  }
  navigationRef.navigate(RouteEnum.Loading, {
    screen: RouteEnum.Onboarding,
    params: target,
  });
};

// Leaves the welcome as the only route on stage, after the wallet file is
// gone and the error it produced with it.
export const restartOnboarding = (): void => {
  if (navigationRef.isReady()) {
    navigationRef.dispatch(
      CommonActions.reset({ index: 0, routes: [{ name: RouteEnum.Welcome }] }),
    );
  }
};

// Pops the focused stack back to a route it already holds.
export const returnTo = (route: OnboardingRoute): void => {
  if (navigationRef.isReady() && currentRoute() !== route) {
    navigationRef.dispatch(StackActions.popTo(route));
  }
};

export const goBack = (): void => {
  if (navigationRef.isReady() && navigationRef.canGoBack()) {
    navigationRef.goBack();
  }
};

export const currentRoute = (): string | undefined =>
  navigationRef.isReady() ? navigationRef.getCurrentRoute()?.name : undefined;
