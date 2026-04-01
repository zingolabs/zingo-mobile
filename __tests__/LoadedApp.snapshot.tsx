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

jest.mock('@noble/hashes/sha2.js', () => ({
  sha256: jest.fn(() => new Uint8Array([1, 2, 3])),
}));

jest.mock('@noble/hashes/utils.js', () => ({
  utf8ToBytes: jest.fn(_s => new Uint8Array([1, 2, 3])),
}));

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
        firstLaunchingMessage: LaunchingModeEnum.opening,
      },
    },
  };
}
// test suite
describe('Component LoadedApp - test', () => {
  //snapshot test
  test('LoadedApp - snapshot', () => {
    const props = makeDrawerProps();
    const loadedapp = render(<LoadedApp {...props} />);
    expect(loadedapp.toJSON()).toMatchSnapshot();
  });
});
