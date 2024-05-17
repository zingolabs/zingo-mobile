/**
 * @format
 */

import 'react-native';
import React from 'react';

import { render } from '@testing-library/react-native';
import PrivKey from '../components/PrivKey';
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
describe('Component PrivKey - test', () => {
  //snapshot test
  const state = defaultAppStateLoaded;
  state.translate = () => 'text translated';
  state.info.currencyName = CurrencyNameEnum.ZEC;
  state.totalBalance.total = 1.12345678;
  const onClose = jest.fn();
  test('PrivKey Private - snapshot', () => {
    const privKey = render(
      <ContextAppLoadedProvider value={state}>
        <PrivKey
          address={'UA-12345678901234567890'}
          keyType={0}
          privKey={'priv-key-12345678901234567890'}
          closeModal={onClose}
        />
      </ContextAppLoadedProvider>,
    );
    expect(privKey.toJSON()).toMatchSnapshot();
  });
  test('PrivKey View - snapshot', () => {
    const privKey = render(
      <ContextAppLoadedProvider value={state}>
        <PrivKey
          address={'UA-12345678901234567890'}
          keyType={1}
          privKey={'view-key-12345678901234567890'}
          closeModal={onClose}
        />
      </ContextAppLoadedProvider>,
    );
    expect(privKey.toJSON()).toMatchSnapshot();
  });
});
