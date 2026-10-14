import React from 'react';
import {
  createNavigatorFactory,
  StackRouter,
  useNavigationBuilder,
  type DefaultNavigatorOptions,
  type Descriptor,
  type NavigationProp,
  type NavigatorTypeBagBase,
  type ParamListBase,
  type RouteProp,
  type StackActionHelpers,
  type StackNavigationState,
  type StackRouterOptions,
  type StaticConfig,
  type TypedNavigator,
} from '@react-navigation/native';

import OnboardingStage from '@ui/widgets/OnboardingStage';

// The stage draws every transition itself, so a screen has no options.
export type OnboardingScreenOptions = Record<string, never>;
export type OnboardingEventMap = Record<string, never>;

export type OnboardingNavigationProp<
  ParamList extends ParamListBase,
  RouteName extends keyof ParamList = string,
  NavigatorID extends string | undefined = undefined,
> = NavigationProp<
  ParamList,
  RouteName,
  NavigatorID,
  StackNavigationState<ParamList>,
  OnboardingScreenOptions,
  OnboardingEventMap
> &
  StackActionHelpers<ParamList>;

export type OnboardingScreenProps<
  ParamList extends ParamListBase,
  RouteName extends keyof ParamList = string,
> = {
  navigation: OnboardingNavigationProp<ParamList, RouteName>;
  route: RouteProp<ParamList, RouteName>;
};

export type OnboardingDescriptor = Descriptor<
  OnboardingScreenOptions,
  OnboardingNavigationProp<ParamListBase>,
  RouteProp<ParamListBase>
>;

type OnboardingNavigatorProps = DefaultNavigatorOptions<
  ParamListBase,
  string | undefined,
  StackNavigationState<ParamListBase>,
  OnboardingScreenOptions,
  OnboardingEventMap,
  OnboardingNavigationProp<ParamListBase>
> &
  StackRouterOptions;

// A stack whose view is the onboarding stage: routes move on the designer's
// axis with Reanimated, and the welcome branches live underneath them all.
function OnboardingNavigator({
  id,
  initialRouteName,
  children,
  layout,
  screenListeners,
  screenOptions,
  screenLayout,
  UNSTABLE_router,
}: OnboardingNavigatorProps) {
  const { state, descriptors, NavigationContent } = useNavigationBuilder<
    StackNavigationState<ParamListBase>,
    StackRouterOptions,
    StackActionHelpers<ParamListBase>,
    OnboardingScreenOptions,
    OnboardingEventMap
  >(StackRouter, {
    id,
    initialRouteName,
    children,
    layout,
    screenListeners,
    screenOptions,
    screenLayout,
    UNSTABLE_router,
  });

  return (
    <NavigationContent>
      <OnboardingStage state={state} descriptors={descriptors} />
    </NavigationContent>
  );
}

type OnboardingTypeBag<
  ParamList extends ParamListBase,
  NavigatorID extends string | undefined,
> = {
  ParamList: ParamList;
  NavigatorID: NavigatorID;
  State: StackNavigationState<ParamList>;
  ScreenOptions: OnboardingScreenOptions;
  EventMap: OnboardingEventMap;
  NavigationList: {
    [RouteName in keyof ParamList]: OnboardingNavigationProp<
      ParamList,
      RouteName,
      NavigatorID
    >;
  };
  Navigator: typeof OnboardingNavigator;
};

export function createOnboardingNavigator<
  const ParamList extends ParamListBase,
  const NavigatorID extends string | undefined = string | undefined,
  const TypeBag extends NavigatorTypeBagBase = OnboardingTypeBag<
    ParamList,
    NavigatorID
  >,
  const Config extends StaticConfig<TypeBag> = StaticConfig<TypeBag>,
>(config?: Config): TypedNavigator<TypeBag, Config> {
  return createNavigatorFactory(OnboardingNavigator)(config);
}
