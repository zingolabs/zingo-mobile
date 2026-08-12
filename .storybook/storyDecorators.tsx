/* eslint-disable react-native/no-inline-styles */
import React from 'react';
import { View } from 'react-native';
import type { Decorator } from '@storybook/react-native';
import {
  NavigationContext,
  NavigationProp,
  ParamListBase,
} from '@react-navigation/native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import {
  BottomSheetModal,
  BottomSheetModalProvider,
} from '@gorhom/bottom-sheet';

import { I18n } from 'i18n-js';
import {
  ContextAppLoadedProvider,
  defaultAppContextLoaded,
} from '@app/context/contextAppLoaded';
import { AppContextLoaded } from '@app/AppState';
import { substituteZingoName } from '@app/utils/ZingoAppData';
import en from '@app/translations/en.json';

// Resolve the real English catalog so stories read like the app, not raw keys.
const i18n = new I18n({ en });
i18n.locale = 'en';
i18n.enableFallback = true;
export const mockTranslate = ((key: string) =>
  substituteZingoName(i18n.t(key))) as AppContextLoaded['translate'];

// Wrap a story in a loaded-app context, with overrides for the fields a component reads.
export const withAppContext =
  (overrides: Partial<AppContextLoaded> = {}): Decorator =>
  Story =>
    (
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
