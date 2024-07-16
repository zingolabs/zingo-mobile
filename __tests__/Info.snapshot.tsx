/**
 * @format
 */

import 'react-native';
import React from 'react';

import { render } from '@testing-library/react-native';
import Info from '../components/Info';
import { defaultAppContextLoaded, ContextAppLoadedProvider } from '../app/context';
import { mockInfo } from '../__mocks__/dataMocks/mockInfo';
import { mockTranslate } from '../__mocks__/dataMocks/mockTranslate';
import { mockTotalBalance } from '../__mocks__/dataMocks/mockTotalBalance';
import { mockZecPrice } from '../__mocks__/dataMocks/mockZecPrice';

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
    const state = defaultAppContextLoaded;
    state.info = mockInfo;
    state.zecPrice = mockZecPrice;
    state.translate = mockTranslate;
    state.totalBalance = mockTotalBalance;
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
