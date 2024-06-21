/**
 * @format
 */

import 'react-native';
import React from 'react';

import { render, screen } from '@testing-library/react-native';
import TxDetail from '../components/History/components/TxDetail';
import { defaultAppStateLoaded, ContextAppLoadedProvider } from '../app/context';
import { CurrencyNameEnum, PoolEnum, TransactionType, TransactionTypeEnum } from '../app/AppState';

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
jest.mock('moment', () => {
  // Here we are able to mock chain builder pattern
  const mMoment = {
    format: (p: string) => {
      if (p === 'MMM YYYY') {
        return 'Dec 2022';
      } else if (p === 'YYYY MMM D h:mm a') {
        return '2022 Dec 13 8:00 am';
      } else if (p === 'MMM D, h:mm a') {
        return 'Dec 13, 8:00 am';
      }
    },
  };
  // Here we are able to mock the constructor and to modify instance methods
  const fn = () => {
    return mMoment;
  };
  // Here we are able to mock moment methods that depend on moment not on a moment instance
  fn.locale = jest.fn();
  return fn;
});
jest.mock('moment/locale/es', () => () => ({
  defineLocale: jest.fn(),
}));
jest.mock('moment/locale/pt', () => () => ({
  defineLocale: jest.fn(),
}));

jest.mock('moment/locale/ru', () => () => ({
  defineLocale: jest.fn(),
}));

jest.mock('react-native-gesture-handler', () => {
  const View = require('react-native').View;
  return {
    TouchableOpacity: View,
  };
});
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
describe('Component History TxDetail - test', () => {
  //unit test
  const state = defaultAppStateLoaded;
  state.translate = () => 'translated text';
  const onClose = jest.fn();
  const onSetOption = jest.fn();

  test('History TxDetail - sent transaction with 2 addresses', () => {
    state.info.currencyName = CurrencyNameEnum.ZEC;
    state.totalBalance.total = 1.12345678;
    const tx = {
      type: TransactionTypeEnum.Sent,
      fee: 0.0001,
      confirmations: 22,
      txid: 'sent-txid-1234567890',
      time: Date.now(),
      zec_price: 33.33,
      txDetails: [
        {
          address: 'sent-address-1-12345678901234567890',
          amount: 0.12345678,
          memos: ['hola', '  & ', 'hello'],
        },
        {
          address: 'sent-address-2-09876543210987654321',
          amount: 0.1,
          memos: ['hello', '  & ', 'hola'],
        },
      ],
    } as TransactionType;
    render(
      <ContextAppLoadedProvider value={state}>
        <TxDetail
          tx={tx}
          closeModal={onClose}
          openModal={onClose}
          setPrivacyOption={onSetOption}
          setSendPageState={onClose}
        />
      </ContextAppLoadedProvider>,
    ).toJSON();
    screen.getByText('0.2234');
    screen.getByText('0.1234');
    screen.getByText('0.1000');
    screen.getByText('0.0001');
    screen.getByText('hola & hello');
    screen.getByText('hello & hola');
    const txt = screen.queryByText('hola & hellohello & hola');
    expect(txt).toBe(null);
  });

  test('History TxDetail - self sent transaction', () => {
    state.info.currencyName = CurrencyNameEnum.ZEC;
    state.totalBalance.total = 1.12345678;
    const txSelfSend = {
      type: TransactionTypeEnum.SendToSelf,
      fee: 0.0001,
      confirmations: 12,
      txid: 'sendtoself-txid-1234567890',
      time: Date.now(),
      zec_price: 33.33,
      txDetails: [
        {
          address: '',
          amount: 0,
          memos: ['orchard memo', 'sapling memo'],
        },
      ],
    } as TransactionType;
    render(
      <ContextAppLoadedProvider value={state}>
        <TxDetail
          tx={txSelfSend}
          closeModal={onClose}
          openModal={onClose}
          setPrivacyOption={onSetOption}
          setSendPageState={onClose}
        />
      </ContextAppLoadedProvider>,
    );
    const num = screen.getAllByText('0.0000');
    expect(num.length).toBe(2);
    screen.getByText('0.0001');
    screen.getByText('orchard memosapling memo');
  });

  test('History TxDetail - received transaction with 2 pools', () => {
    state.info.currencyName = CurrencyNameEnum.ZEC;
    state.totalBalance.total = 1.12345678;
    const txSelfSend = {
      type: TransactionTypeEnum.Received,
      confirmations: 133,
      txid: 'receive-txid-1234567890',
      time: Date.now(),
      zec_price: 66.66,
      txDetails: [
        {
          address: '',
          amount: 0.77654321,
          pool_type: PoolEnum.OrchardPool,
          memos: ['hola', '  & ', 'hello'],
        },
        {
          address: '',
          amount: 0.1,
          pool_type: PoolEnum.SaplingPool,
          memos: ['hello', '  & ', 'hola'],
        },
      ],
    } as TransactionType;
    render(
      <ContextAppLoadedProvider value={state}>
        <TxDetail
          tx={txSelfSend}
          closeModal={onClose}
          openModal={onClose}
          setPrivacyOption={onSetOption}
          setSendPageState={onClose}
        />
      </ContextAppLoadedProvider>,
    );
    screen.getByText('0.8765');
    screen.getByText('0.7765');
    screen.getByText('0.1000');
    screen.getByText('hola & hello');
    screen.getByText('hello & hola');
    const txt = screen.queryByText('hola & hellohello & hola');
    expect(txt).toBe(null);
  });
});
