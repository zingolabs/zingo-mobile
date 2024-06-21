/**
 * @format
 */

import 'react-native';
import React from 'react';

import { render } from '@testing-library/react-native';
import Pools from '../components/Pools';
import { defaultAppStateLoaded, ContextAppLoadedProvider } from '../app/context';
import { CurrencyNameEnum } from '../app/AppState';

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
describe('Component Pools - test', () => {
  //snapshot test
  const state = defaultAppStateLoaded;
  state.translate = () => 'translated text';
  state.info.currencyName = CurrencyNameEnum.ZEC;
  state.totalBalance.total = 1.12345678;
  state.totalBalance.orchardBal = 0.6;
  state.totalBalance.spendableOrchard = 0.3;
  state.totalBalance.privateBal = 0.4;
  state.totalBalance.spendablePrivate = 0.2;
  state.totalBalance.transparentBal = 0.12345678;
  const onClose = jest.fn();
  test('Pools - snapshot', () => {
    const pools = render(
      <ContextAppLoadedProvider value={state}>
        <Pools closeModal={onClose} setPrivacyOption={onClose} />
      </ContextAppLoadedProvider>,
    );
    expect(pools.toJSON()).toMatchSnapshot();
  });
});
