/**
 * @format
 */

import 'react-native';
import React from 'react';

import { render } from '@testing-library/react-native';
import Info from '../components/Info';
import { defaultAppStateLoaded, ContextAppLoadedProvider } from '../app/context';
import { ChainNameEnum, CurrencyNameEnum } from '../app/AppState';

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
  //snapshot test
  test('Info - snapshot', () => {
    const state = defaultAppStateLoaded;
    state.info = {
      serverUri: 'https://zcash.es',
      latestBlock: 2000100,
      connections: 0,
      version: '3.3.3.0',
      verificationProgress: 0,
      currencyName: CurrencyNameEnum.ZEC,
      solps: 0,
      chain_name: ChainNameEnum.mainChainName,
      zingolib: 'mob-release...',
    };
    state.zecPrice.zecPrice = 33.33;
    state.translate = () => 'translated text';
    state.totalBalance.total = 1.12345678;
    const onClose = jest.fn();
    const onSet = jest.fn();
    const info: any = render(
      <ContextAppLoadedProvider value={state}>
        <Info closeModal={onClose} setZecPrice={onSet} />
      </ContextAppLoadedProvider>,
    );
    expect(info.toJSON()).toMatchSnapshot();
  });
});
