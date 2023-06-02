/**
 * @format
 */

import 'react-native';
import React from 'react';

import { render } from '@testing-library/react-native';
import Ufvk from '../components/Ufvk';
import { defaultAppStateLoaded, ContextAppLoadedProvider } from '../app/context';

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

// test suite
describe('Component Ufvk - test', () => {
  //snapshot test
  const state = defaultAppStateLoaded;
  state.translate = () => 'text translated';
  state.info.currencyName = 'ZEC';
  state.totalBalance.total = 1.12345678;
  state.wallet.ufvk =
    'uview1234567890123456789012345678901234567890123456789012345678901234567890123456789012345678901234567890123456789012345678901234567890123456789012345678901234567890';
  const onClose = jest.fn();
  const onSet = jest.fn();
  test('PrivKey Private - snapshot', () => {
    const privKey = render(
      <ContextAppLoadedProvider value={state}>
        <Ufvk onClickCancel={onClose} set_privacy_option={onSet} />
      </ContextAppLoadedProvider>,
    );
    expect(privKey.toJSON()).toMatchSnapshot();
  });
});
