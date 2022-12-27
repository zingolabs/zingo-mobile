/**
 * @format
 */

import 'react-native';
import React from 'react';

import { render } from '@testing-library/react-native';
import Settings from '../components/Settings';
import { defaultAppStateLoaded, ContextLoadedProvider } from '../app/context';

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
jest.useFakeTimers();

// test suite
describe('Component Settings - test', () => {
  //snapshot test
  const state = defaultAppStateLoaded;
  state.translate = (p: string) => {
    if (p === 'settings.memos') {
      return `[
        {
          "value": "none",
          "text": "text none"
        },
        {
          "value": "wallet",
          "text": "text wallet"
        },
        {
          "value": "all",
          "text": "text all"
        }
      ]`;
    } else {
      return 'text translated';
    }
  };
  state.info.currencyName = 'ZEC';
  state.totalBalance.total = 1.12345678;
  state.walletSettings.server = 'https://zcash.es';
  const onClose = jest.fn();
  const onSetOption = jest.fn();
  test('Settings - snapshot', () => {
    const settings = render(
      <ContextLoadedProvider value={state}>
        <Settings closeModal={onClose} set_wallet_option={onSetOption} set_server_option={onSetOption} />
      </ContextLoadedProvider>,
    );
    expect(settings.toJSON()).toMatchSnapshot();
  });
});
