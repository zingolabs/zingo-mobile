/**
 * @format
 */

import 'react-native';
import React from 'react';

import { render } from '@testing-library/react-native';
import { ImportUfvk } from '../components/Ufvk';
import { ContextAppLoadedProvider, defaultAppStateLoaded } from '../app/context';

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
describe('Component ImportUfvk - test', () => {
  //snapshot test
  test('ImportUfvk - snapshot', () => {
    const state = defaultAppStateLoaded;
    state.translate = () => 'text translated';
    state.info.currencyName = 'ZEC';
    state.totalBalance.total = 1.12345678;
    const onCancel = jest.fn();
    const onOK = jest.fn();
    const importUfvk = render(
      <ContextAppLoadedProvider value={state}>
        <ImportUfvk onClickCancel={onCancel} onClickOK={onOK} />
      </ContextAppLoadedProvider>,
    );
    expect(importUfvk.toJSON()).toMatchSnapshot();
  });
});
