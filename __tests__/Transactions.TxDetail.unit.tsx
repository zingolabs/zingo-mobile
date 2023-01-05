/**
 * @format
 */

import 'react-native';
import React from 'react';

import { render } from '@testing-library/react-native';
import TxDetail from '../components/Transactions/components/TxDetail';
import { defaultAppStateLoaded, ContextLoadedProvider } from '../app/context';
import { TransactionType, TxDetailType } from '../app/AppState';

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
jest.mock('react-native-gesture-handler', () => {
  const View = require('react-native').View;
  return {
    TouchableOpacity: View,
  };
});

// test suite
describe('Component Transactions TxDetail - test', () => {
  //unit test
  const state = defaultAppStateLoaded;
  state.translate = () => 'translated text';
  const onClose = jest.fn();
  test('Transactions TxDetail - normal sent transaction', () => {
    state.info.currencyName = 'ZEC';
    state.totalBalance.total = 1.12345678;
    const tx = {
      type: 'sent',
      address: 'UA-12345678901234567890',
      amount: -0.000065,
      position: '',
      confirmations: 20,
      txid: 'txid-1234567890',
      time: Date.now(),
      zec_price: 33.33,
      detailedTxns: [
        {
          address: 'other-UA-12345678901234567890',
          amount: 0.000055,
          memo: 'memo-abcdefgh',
        },
      ] as TxDetailType[],
    } as TransactionType;
    const text: any = render(
      <ContextLoadedProvider value={state}>
        <TxDetail tx={tx} closeModal={onClose} />
      </ContextLoadedProvider>,
    ).toJSON();
    expect(text.type).toBe('RCTSafeAreaView');
    expect(text.children[0].children[0].children[2].children[3].children[1].children[0].children[1].children[0]).toBe(
      ' 0.0000',
    );
    expect(text.children[0].children[0].children[2].children[3].children[1].children[0].children[2].children[0]).toBe(
      '1000',
    );
  });

  test('Transactions TxDetail - self sent transaction', () => {
    state.info.currencyName = 'ZEC';
    state.totalBalance.total = 1.12345678;
    const txSelfSend = {
      type: 'sent',
      address: 'UA-12345678901234567890',
      amount: -0.00001,
      position: '',
      confirmations: 20,
      txid: 'txid-1234567890',
      time: Date.now(),
      zec_price: 33.33,
      detailedTxns: [
        {
          address: 'other-UA-12345678901234567890',
          amount: 0.00055,
          memo: 'memo-abcdefgh',
        },
      ] as TxDetailType[],
    } as TransactionType;
    const textSelfSend: any = render(
      <ContextLoadedProvider value={state}>
        <TxDetail tx={txSelfSend} closeModal={onClose} />
      </ContextLoadedProvider>,
    ).toJSON();
    expect(textSelfSend.type).toBe('RCTSafeAreaView');
    expect(
      textSelfSend.children[0].children[0].children[2].children[3].children[1].children[0].children[1].children[0],
    ).toBe(' 0.0000');
    expect(
      textSelfSend.children[0].children[0].children[2].children[3].children[1].children[0].children[2].children[0],
    ).toBe('1000');
  });
});
