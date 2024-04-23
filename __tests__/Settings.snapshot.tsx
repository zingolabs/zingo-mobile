/**
 * @format
 */

import 'react-native';
import React from 'react';

import { render } from '@testing-library/react-native';
import Settings from '../components/Settings';
import { defaultAppStateLoaded, ContextAppLoadedProvider } from '../app/context';
import { LanguageEnum, CurrencyEnum, ChainNameEnum, DownloadMemosEnum } from '../app/AppState';

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
jest.mock('react-native-picker-select', () => 'RNPickerSelect');
jest.useFakeTimers();

// test suite
describe('Component Settings - test', () => {
  //snapshot test
  const state = defaultAppStateLoaded;
  state.translate = (p: string) => {
    if (p === 'settings.memos') {
      return [
        {
          value: DownloadMemosEnum.noneMemos,
          text: 'text none',
        },
        {
          value: DownloadMemosEnum.walletMemos,
          text: 'text wallet',
        },
        {
          value: DownloadMemosEnum.allMemos,
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
          value: CurrencyEnum.USDCurrency,
          text: 'text USD',
        },
      ];
    }
    if (p === 'settings.languages') {
      return [
        {
          value: LanguageEnum.en,
          text: 'text en',
        },
        {
          value: LanguageEnum.es,
          text: 'text es',
        },
        {
          value: LanguageEnum.pt,
          text: 'text pt',
        },
        {
          value: LanguageEnum.ru,
          text: 'text ru',
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
    if (p === 'settings.donations') {
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
  state.server = { uri: 'https://zcash.es', chain_name: ChainNameEnum.mainChainName };
  state.currency = CurrencyEnum.USDCurrency;
  state.language = LanguageEnum.en;
  state.sendAll = false;
  state.donation = false;
  state.walletSettings.download_memos = DownloadMemosEnum.walletMemos;
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
          set_donation_option={onSetOption}
          set_privacy_option={onSetOption}
          set_mode_option={onSetOption}
          set_security_option={onSetOption}
          set_selectServer_option={onSetOption}
        />
      </ContextAppLoadedProvider>,
    );
    expect(settings.toJSON()).toMatchSnapshot();
  });
});
