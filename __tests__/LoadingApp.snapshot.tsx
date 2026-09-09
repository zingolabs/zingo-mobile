/**
 * @format
 */

import 'react-native';
import React from 'react';

import { render } from '@testing-library/react-native';
import { LoadingApp } from '@app/LoadingApp';
import { StackScreenProps } from '@react-navigation/stack';
import { AppStackParamList } from '@app/types';
import { RouteEnum } from '@app/AppState';
import mockNavigation from '../__mocks__/dataMocks/mockNavigation';

jest.mock('react-native-localize', () => ({
  findBestLanguageTag: jest.fn().mockImplementation(supportedLocales => {
    return { languageTag: supportedLocales?.[0] || 'en', isRTL: false };
  }),
}));

jest.mock('i18n-js');

function makeDrawerProps(): StackScreenProps<
  AppStackParamList,
  RouteEnum.LoadingApp
> {
  return {
    navigation: mockNavigation,
    route: {
      key: 'Key-1',
      name: RouteEnum.LoadingApp,
      params: undefined,
    },
  };
}
// test suite
describe('Component LoadingApp - test', () => {
  //snapshot test
  test('LoadingApp - snapshot', () => {
    const toggleTheme = jest.fn();
    const props = makeDrawerProps();
    const loadingapp = render(
      <LoadingApp {...props} toggleTheme={toggleTheme} />,
    );
    expect(loadingapp.toJSON()).toMatchSnapshot();
  });
});
