/**
 * @format
 */

import 'react-native';
import React from 'react';

import { render } from '@testing-library/react-native';
import { ShowUfvk } from '../components/Ufvk';
import { defaultAppStateLoaded, ContextAppLoadedProvider } from '../app/context';
import { UfvkActionEnum } from '../app/AppState';

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
describe('Component ShowUfvk - test', () => {
  //snapshot test
  const state = defaultAppStateLoaded;
  state.translate = () => 'text translated';
  state.info.currencyName = 'ZEC';
  state.totalBalance.total = 1.12345678;
  state.wallet.ufvk =
    'uview1234567890123456789012345678901234567890123456789012345678901234567890123456789012345678901234567890123456789012345678901234567890123456789012345678901234567890';
  const onClose = jest.fn();
  const onOK = jest.fn();
  test('ShowUfvk - snapshot', () => {
    const ufvk = render(
      <ContextAppLoadedProvider value={state}>
        <ShowUfvk
          onClickCancel={onClose}
          onClickOK={onOK}
          action={UfvkActionEnum.view}
          set_privacy_option={jest.fn()}
        />
      </ContextAppLoadedProvider>,
    );
    expect(ufvk.toJSON()).toMatchSnapshot();
  });
});
