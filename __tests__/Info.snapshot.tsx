/**
 * @format
 */

import 'react-native';
import React from 'react';

import { render } from '@testing-library/react-native';
import Info from '../components/Info';
import { defaultAppStateLoaded, ContextLoadedProvider } from '../app/context';

jest.useFakeTimers();
jest.mock('@fortawesome/react-native-fontawesome', () => ({
  FontAwesomeIcon: '',
}));
jest.mock('react-native-localize', () => ({
  getNumberFormatSettings: () => {
    return {
      decimalSeparator: '.', // us
      groupingSeparator: ',', // us
    };
  },
}));
jest.mock('react-native/Libraries/Animated/NativeAnimatedHelper');

// test suite
describe('Component Info - test', () => {
  //snapshot test
  test('Matches the snapshot Info', () => {
    const state = defaultAppStateLoaded;
    state.info = {
      serverUri: 'https://zcash.es',
      latestBlock: 2000100,
      connections: 0,
      version: '3.3.3.0',
      verificationProgress: 0,
      currencyName: 'ZEC',
      solps: 0,
      defaultFee: 1000,
      chain_name: 'mainnet',
    };
    state.zecPrice.zecPrice = 33.33;
    state.translate = () => 'translated text';
    state.totalBalance.total = 1.12345678;
    const onClose = jest.fn();
    const onSet = jest.fn();
    const info: any = render(
      <ContextLoadedProvider value={state}>
        <Info closeModal={onClose} setZecPrice={onSet} />
      </ContextLoadedProvider>,
    );
    expect(info.toJSON()).toMatchSnapshot();
  });
});
