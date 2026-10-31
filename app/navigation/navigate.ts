import {
  CommonActions,
  createNavigationContainerRef,
  NavigationProp,
  NavigationState,
  NavigatorScreenParams,
  ParamListBase,
  StackActions,
} from '@react-navigation/native';
import { Route } from '@app/AppState';
import type {
  AppDrawerParamList,
  OnboardingParamList,
  OnboardingRoute,
  RootParamList,
  ScannerNavigationState,
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
  navigationRef.navigate(Route.Wallet, target);
};

/** Whether `name` is the screen on top: what settles late leaves alone a user who walked away from it. */
export const isOnTop = (name: string): boolean =>
  navigationRef.isReady() && navigationRef.getCurrentRoute()?.name === name;

// Opens the scanner, a root route, from any widget: the ones inside a
// bottom sheet render outside the navigator tree.
export const openScanner = (params: ScannerNavigationState): void => {
  if (navigationRef.isReady()) {
    navigationRef.navigate(Route.Scanner, params);
  }
};

// Opens an onboarding screen from the loading section's provider.
export const navigateOnboarding = (
  target: NavigatorScreenParams<OnboardingParamList>,
): void => {
  if (!navigationRef.isReady()) {
    return;
  }
  navigationRef.navigate(Route.Loading, {
    screen: Route.Onboarding,
    params: target,
  });
};

// Leaves the welcome as the only route on stage, after the wallet file is
// gone and the error it produced with it.
export const restartOnboarding = (): void => {
  if (navigationRef.isReady()) {
    navigationRef.dispatch(
      CommonActions.reset({ index: 0, routes: [{ name: Route.Welcome }] }),
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

// Ends a one-way flow in the wallet: back to the home the stack already
// holds. A reset would mount a new home while the old one and the flow's
// panels unmount with their animations running, which Fabric on Android
// fails ("Cannot remove child at index 0").
export const leaveFlow = (
  navigation: Pick<NavigationProp<ParamListBase>, 'dispatch'>,
): void => {
  navigation.dispatch(StackActions.popTo(Route.Home));
};

// The route names of the stack that holds the focused route, bottom first.
export const focusedStackRouteNames = (): string[] => {
  const root = navigationRef.isReady()
    ? navigationRef.getRootState()
    : undefined;
  if (!root) {
    return [];
  }
  let state: NavigationState = root;
  for (;;) {
    const focused = state.routes[state.index];
    if (!focused.state || focused.state.index === undefined) {
      return state.routes.map(route => route.name);
    }
    state = focused.state as NavigationState;
  }
};

export const currentRoute = (): string | undefined =>
  navigationRef.isReady() ? navigationRef.getCurrentRoute()?.name : undefined;
