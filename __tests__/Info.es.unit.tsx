/**
 * @format
 */

import 'react-native';
import React from 'react';

import { render, screen } from '@testing-library/react-native';
import Info from '../components/Info';
import { ContextAppLoadedProvider, defaultAppContextLoaded } from '../app/context';
import { CurrencyEnum } from '../app/AppState';
import { mockInfo } from '../__mocks__/dataMocks/mockInfo';
import { mockZecPrice } from '../__mocks__/dataMocks/mockZecPrice';

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
    const state = defaultAppContextLoaded;
    state.info = mockInfo;
    state.zecPrice = mockZecPrice;
    state.currency = CurrencyEnum.USDCurrency;
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
