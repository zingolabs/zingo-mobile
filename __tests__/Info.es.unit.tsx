/**
 * @format
 */

import 'react-native';
import React from 'react';

import { render, screen } from '@testing-library/react-native';
import Info from '../components/Info';
import { ContextAppLoadedProvider, defaultAppStateLoaded } from '../app/context';

jest.useFakeTimers();
jest.mock('@fortawesome/react-native-fontawesome', () => ({
  FontAwesomeIcon: '',
}));
jest.mock('react-native-localize', () => ({
  getNumberFormatSettings: () => {
    return {
      decimalSeparator: ',', // es
      groupingSeparator: '.', // es
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
describe('Component Info - test', () => {
  //unit test
  test('Info - price with es (,) decimal point', () => {
    const state = defaultAppStateLoaded;
    state.info = {
      serverUri: 'https://zcash.es',
      latestBlock: 2000100,
      connections: 0,
      version: '3.3.3.0',
      verificationProgress: 0,
      currencyName: 'ZEC',
      solps: 0,
      defaultFee: 10000,
      chain_name: 'main',
      zingolib: 'mob-release...',
    };
    state.zecPrice.zecPrice = 33.33;
    state.currency = 'USD';
    const onClose = jest.fn();
    const onSet = jest.fn();
    render(
      <ContextAppLoadedProvider value={state}>
        <Info closeModal={onClose} setZecPrice={onSet} />
      </ContextAppLoadedProvider>,
    );
    screen.getByText('33,33');
  });
});
