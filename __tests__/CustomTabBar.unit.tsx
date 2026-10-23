// The shared mock of bottom-tabs has no height context; the bar reads one.
jest.mock('@react-navigation/bottom-tabs', () => ({
  BottomTabBarHeightCallbackContext: require('react').createContext(undefined),
}));
// The bar only takes TabActions from here; the shared mock leaves it out.
jest.mock('@react-navigation/native', () => ({
  TabActions: jest.requireActual('@react-navigation/native').TabActions,
}));

import 'react-native';
import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import {
  ContextAppLoadedProvider,
  defaultAppContextLoaded,
} from '@app/context';
import { Route } from '@app/AppState';
import { themeTokens } from '@app/theme';
import CustomTabBar from '@app/navigation/CustomTabBar';

const routes = [Route.History, Route.Send, Route.Receive, Route.Swap].map(
  name => ({ key: `${name}-key`, name, params: undefined }),
);

const tabBar = (index: number) => {
  const navigation = {
    emit: jest.fn(() => ({ defaultPrevented: false })),
    dispatch: jest.fn(),
  };
  const props = {
    state: { index, routes },
    navigation,
  } as unknown as BottomTabBarProps;
  const view = render(
    <ContextAppLoadedProvider
      value={{ ...defaultAppContextLoaded, translate: (key: string) => key }}
    >
      <CustomTabBar {...props} />
    </ContextAppLoadedProvider>,
  );
  return { view, navigation };
};

describe('CustomTabBar', () => {
  test('Tests that every tab shows its name under its mark', () => {
    const { view } = tabBar(0);
    ['home', 'send', 'receive', 'swap'].forEach(tab =>
      expect(view.getByText(`loadedapp.tab-${tab}`)).toBeTruthy(),
    );
  });

  test('Tests that only the active tab name is green when a tab is selected', () => {
    const { view } = tabBar(3);
    const { StyleSheet } = require('react-native');
    const color = (key: string) =>
      StyleSheet.flatten(view.getByText(key).props.style).color;
    expect(color('loadedapp.tab-swap')).toBe(themeTokens.fgPriceUp);
    expect(color('loadedapp.tab-home')).toBe(themeTokens.fgDefault);
  });

  test('Tests that tapping another tab jumps to it when it is pressed', () => {
    const { view, navigation } = tabBar(0);
    fireEvent.press(view.getByTestId('tab.send'));
    expect(navigation.dispatch).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'JUMP_TO', payload: { name: 'Send' } }),
    );
  });
});
