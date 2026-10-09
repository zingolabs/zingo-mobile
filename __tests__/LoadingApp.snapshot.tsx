/**
 * @format
 */

import 'react-native';
import React from 'react';

import { render } from '@testing-library/react-native';
import { LoadingApp } from '@app/LoadingApp';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootParamList } from '@app/types';
import { RouteEnum } from '@app/AppState';
import { LoadingSession } from '@app/navigation/session';
import mockNavigation from '../__mocks__/dataMocks/mockNavigation';

jest.mock('react-native-localize', () => ({
  findBestLanguageTag: jest.fn().mockImplementation(supportedLocales => {
    return { languageTag: supportedLocales?.[0] || 'en', isRTL: false };
  }),
}));

jest.mock('i18n-js');

function makeDrawerProps(): NativeStackScreenProps<
  RootParamList,
  RouteEnum.Loading
> & { session: LoadingSession } {
  return {
    navigation: mockNavigation,
    route: {
      key: 'Key-1',
      name: RouteEnum.Loading,
      params: undefined,
    },
    session: { kind: 'boot', startingApp: true, newWallet: false },
  };
}
// test suite
describe('Component LoadingApp - test', () => {
  //snapshot test
  test('LoadingApp - snapshot', () => {
    const props = makeDrawerProps();
    const loadingapp = render(<LoadingApp {...props} />);
    expect(loadingapp.toJSON()).toMatchSnapshot();
  });
});
