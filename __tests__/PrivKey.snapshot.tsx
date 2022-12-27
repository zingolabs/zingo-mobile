/**
 * @format
 */

import 'react-native';
import React from 'react';

import { render } from '@testing-library/react-native';
import PrivKey from '../components/PrivKey';
import { defaultAppStateLoaded, ContextLoadedProvider } from '../app/context';

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

// test suite
describe('Component PrivKey - test', () => {
  //snapshot test
  const state = defaultAppStateLoaded;
  state.translate = () => 'text translated';
  state.info.currencyName = 'ZEC';
  state.totalBalance.total = 1.12345678;
  const onClose = jest.fn();
  test('PrivKey Private - snapshot', () => {
    const privKey = render(
      <ContextLoadedProvider value={state}>
        <PrivKey
          address={'UA-12345678901234567890'}
          keyType={0}
          privKey={'priv-key-12345678901234567890'}
          closeModal={onClose}
        />
      </ContextLoadedProvider>,
    );
    expect(privKey.toJSON()).toMatchSnapshot();
  });
  test('PrivKey View - snapshot', () => {
    const privKey = render(
      <ContextLoadedProvider value={state}>
        <PrivKey
          address={'UA-12345678901234567890'}
          keyType={1}
          privKey={'view-key-12345678901234567890'}
          closeModal={onClose}
        />
      </ContextLoadedProvider>,
    );
    expect(privKey.toJSON()).toMatchSnapshot();
  });
});
