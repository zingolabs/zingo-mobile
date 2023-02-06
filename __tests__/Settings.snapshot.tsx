/**
 * @format
 */

import 'react-native';
import React from 'react';

import { render } from '@testing-library/react-native';
import Settings from '../components/Settings';
import { defaultAppStateLoaded, ContextAppLoadedProvider } from '../app/context';

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
      return [
        {
          value: 'none',
          text: 'text none',
        },
        {
          value: 'wallet',
          text: 'text wallet',
        },
        {
          value: 'all',
          text: 'text all',
        },
      ];
    }
    if (p === 'settings.currencies') {
      return [
        {
          value: '',
          text: 'text no currency',
        },
        {
          value: 'USD',
          text: 'text USD',
        },
      ];
    }
    if (p === 'settings.languages') {
      return [
        {
          value: 'en',
          text: 'text en',
        },
        {
          value: 'es',
          text: 'text es',
        },
      ];
    }
    if (p === 'settings.sendalls') {
      return [
        {
          value: true,
          text: 'text true',
        },
        {
          value: false,
          text: 'text false',
        },
      ];
    }
    return 'text translated';
  };
  state.info.currencyName = 'ZEC';
  state.totalBalance.total = 1.12345678;
  state.server = 'https://zcash.es';
  state.currency = 'USD';
  state.language = 'en';
  state.sendAll = false;
  state.walletSettings.download_memos = 'wallet';
  state.walletSettings.transaction_filter_threshold = '500';
  const onClose = jest.fn();
  const onSetOption = jest.fn();
  test('Settings - snapshot', () => {
    const settings = render(
      <ContextAppLoadedProvider value={state}>
        <Settings
          closeModal={onClose}
          set_wallet_option={onSetOption}
          set_server_option={onSetOption}
          set_currency_option={onSetOption}
          set_language_option={onSetOption}
          set_sendAll_option={onSetOption}
        />
      </ContextAppLoadedProvider>,
    );
    expect(settings.toJSON()).toMatchSnapshot();
  });
});
