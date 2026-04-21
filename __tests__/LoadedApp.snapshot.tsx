/**
 * @format
 */

import 'react-native';
import React from 'react';

import { render } from '@testing-library/react-native';
import { LoadedApp } from '../app/LoadedApp';
import { StackScreenProps } from '@react-navigation/stack';
import { AppStackParamList } from '../app/types';
import { LaunchingModeEnum, RouteEnum } from '../app/AppState';
import mockNavigation from '../__mocks__/dataMocks/mockNavigation';

jest.mock('react-native-localize', () => ({
  findBestLanguageTag: jest.fn().mockImplementation(supportedLocales => {
    return { languageTag: supportedLocales?.[0] || 'en', isRTL: false };
  }),
}));

jest.mock('i18n-js');

function makeDrawerProps(): StackScreenProps<
  AppStackParamList,
  RouteEnum.LoadedApp
> {
  return {
    navigation: mockNavigation,
    route: {
      key: 'Key-1',
      name: RouteEnum.LoadedApp,
      params: {
        readOnly: false,
        orchardPool: true,
        saplingPool: true,
        transparentPool: true,
        newWallet: false,
        firstLaunchingMessage: LaunchingModeEnum.opening,
      },
    },
  };
}
// test suite
describe('Component LoadedApp - test', () => {
  //snapshot test
  test('LoadedApp - snapshot', () => {
    const toggleTheme = jest.fn();
    const props = makeDrawerProps();
    const loadedapp = render(
      <LoadedApp {...props} toggleTheme={toggleTheme} />,
    );
    expect(loadedapp.toJSON()).toMatchSnapshot();
  });
});
