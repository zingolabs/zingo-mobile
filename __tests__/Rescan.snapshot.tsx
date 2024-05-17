/**
 * @format
 */

import 'react-native';
import React from 'react';

import { render } from '@testing-library/react-native';
import Rescan from '../components/Rescan';
import { defaultAppStateLoaded, ContextAppLoadedProvider } from '../app/context';
import { CurrencyNameEnum } from '../app/AppState';

jest.useFakeTimers();
jest.mock('@fortawesome/react-native-fontawesome', () => ({
  FontAwesomeIcon: '',
}));
jest.mock('react-native-localize', () => ({
  getNumberFormatSettings: () => {
    return {
      decimalSeparator: '.',
      groupingSeparator: ',',
    };
  },
}));
jest.mock('react-native/Libraries/Animated/NativeAnimatedHelper');
jest.mock('@react-native-community/netinfo', () => {
  const RN = jest.requireActual('react-native');

  RN.NativeModules.RNCNetInfo = {
    execute: jest.fn(() => '{}'),
  };

  return RN;
});
jest.mock('react-native', () => {
  const RN = jest.requireActual('react-native');

  RN.NativeModules.RPCModule = {
    execute: jest.fn(() => '{}'),
  };

  return RN;
});

// test suite
describe('Component Rescan - test', () => {
  //snapshot test
  const state = defaultAppStateLoaded;
  state.translate = () => 'text translated';
  state.info.currencyName = CurrencyNameEnum.ZEC;
  state.totalBalance.total = 1.12345678;
  state.wallet.birthday = 1900100;
  const onClose = jest.fn();
  const onRescan = jest.fn();
  test('Rescan - snapshot', () => {
    const rescan = render(
      <ContextAppLoadedProvider value={state}>
        <Rescan closeModal={onClose} doRescan={onRescan} />
      </ContextAppLoadedProvider>,
    );
    expect(rescan.toJSON()).toMatchSnapshot();
  });
});
