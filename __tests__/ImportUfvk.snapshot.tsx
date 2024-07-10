/**
 * @format
 */

import 'react-native';
import React from 'react';

import { render } from '@testing-library/react-native';
import { ImportUfvk } from '../components/Ufvk';
import { ContextAppLoadedProvider, defaultAppContextLoaded } from '../app/context';
import { mockTranslate } from '../__mocks__/dataMocks/mockTranslate';
import { mockInfo } from '../__mocks__/dataMocks/mockInfo';
import { mockTotalBalance } from '../__mocks__/dataMocks/mockTotalBalance';

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
    getLatestBlock: jest.fn(() => '{}'),
  };

  return RN;
});

// test suite
describe('Component ImportUfvk - test', () => {
  //snapshot test
  test('ImportUfvk - snapshot', () => {
    const state = defaultAppContextLoaded;
    state.translate = mockTranslate;
    state.info = mockInfo;
    state.totalBalance = mockTotalBalance;
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
