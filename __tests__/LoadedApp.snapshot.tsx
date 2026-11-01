/**
 * @format
 */

import 'react-native';
import React from 'react';

import { render } from '@testing-library/react-native';
import { LoadedApp } from '@app/LoadedApp';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { LoadedAppNavigationState, RootParamList } from '@app/types';
import { ChainNameEnum, LaunchingModeEnum, Route } from '@app/AppState';
import mockNavigation from '../__mocks__/dataMocks/mockNavigation';

jest.mock('react-native-localize', () => ({
  findBestLanguageTag: jest.fn().mockImplementation(supportedLocales => {
    return { languageTag: supportedLocales?.[0] || 'en', isRTL: false };
  }),
}));

jest.mock('i18n-js');

function makeDrawerProps(): NativeStackScreenProps<RootParamList, 'Wallet'> & {
  wallet: LoadedAppNavigationState;
} {
  return {
    navigation: mockNavigation,
    route: {
      key: 'Key-1',
      name: Route.Wallet,
      params: undefined,
    },
    wallet: {
      readOnly: false,
      orchardPool: true,
      saplingPool: true,
      transparentPool: true,
      newWallet: false,
      firstLaunchingMessage: LaunchingModeEnum.opening,
      walletChainName: ChainNameEnum.mainChainName,
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
