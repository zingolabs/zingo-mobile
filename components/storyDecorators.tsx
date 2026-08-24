/* eslint-disable react-native/no-inline-styles */
import React from 'react';
import { View } from 'react-native';
import type { Decorator } from '@storybook/react-native';
import {
  NavigationContext,
  NavigationProp,
  ParamListBase,
} from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import {
  BottomSheetModal,
  BottomSheetModalProvider,
} from '@gorhom/bottom-sheet';

import { I18n } from 'i18n-js';
import {
  ContextAppLoadedProvider,
  defaultAppContextLoaded,
} from '../app/context/contextAppLoaded';
import { AppContextLoaded } from '../app/AppState';
import { AppDrawerParamList } from '../app/types';
import { substituteZingoName } from '../app/utils/ZingoAppData';
import en from '../app/translations/en.json';
import { RpcFixture, setRpcFixtures } from './storyRpc';

// Resolve the real English catalog so stories read like the app, not raw keys.
const i18n = new I18n({ en });
i18n.locale = 'en';
i18n.enableFallback = true;
export const mockTranslate = ((key: string) =>
  substituteZingoName(i18n.t(key))) as AppContextLoaded['translate'];

// Wrap a story in a loaded-app context, with overrides for the fields a component reads.
export const withAppContext =
  (overrides: Partial<AppContextLoaded> = {}): Decorator =>
  Story => (
    <ContextAppLoadedProvider
      value={{
        ...defaultAppContextLoaded,
        translate: mockTranslate,
        ...overrides,
      }}
    >
      <Story />
    </ContextAppLoadedProvider>
  );

// A navigate and goBack sink so useNavigation() resolves off-navigator.
const mockNavigation = {
  navigate: () => {},
  goBack: () => {},
  reset: () => {},
  replace: () => {},
  dispatch: () => {},
  setOptions: () => {},
  addListener: () => () => {},
  removeListener: () => {},
  canGoBack: () => false,
  isFocused: () => true,
} as unknown as NavigationProp<ParamListBase>;

export const withNavigation: Decorator = Story => (
  <NavigationContext.Provider value={mockNavigation}>
    <Story />
  </NavigationContext.Provider>
);

// The navigation and route props a stack screen receives, for stories of
// whole screens. The sink above stands in for the navigator.
export const screenProps = <R extends keyof AppDrawerParamList>(
  name: R,
  params?: AppDrawerParamList[R],
): NativeStackScreenProps<AppDrawerParamList, R> => ({
  navigation: mockNavigation as unknown as NativeStackScreenProps<
    AppDrawerParamList,
    R
  >['navigation'],
  route: {
    key: `${name}-story`,
    name,
    params,
  } as unknown as NativeStackScreenProps<AppDrawerParamList, R>['route'],
});

// Registers the bridge answers a screen's backend calls will get on web.
// Set during render so the screen's mount effects already see them.
export const withRpc =
  (fixtures: Record<string, RpcFixture>): Decorator =>
  Story => {
    React.useState(() => setRpcFixtures(fixtures));
    return <Story />;
  };

// Presents a forwardRef BottomSheetModal on mount so the sheet is the story.
export const SheetHost: React.FunctionComponent<{
  children: (ref: React.RefObject<BottomSheetModal | null>) => React.ReactNode;
}> = ({ children }) => {
  const ref = React.useRef<BottomSheetModal>(null);
  React.useEffect(() => {
    ref.current?.present();
  }, []);
  return <>{children(ref)}</>;
};

export const withBottomSheet: Decorator = Story => (
  <GestureHandlerRootView style={{ flex: 1 }}>
    <BottomSheetModalProvider>
      <View style={{ flex: 1, minHeight: 480 }}>
        <Story />
      </View>
    </BottomSheetModalProvider>
  </GestureHandlerRootView>
);
