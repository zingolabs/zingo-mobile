/**
 * @format
 */

import 'react-native';
import React from 'react';

import { render, screen } from '@testing-library/react-native';
import TxDetail from '../components/History/components/TxDetail';
import { defaultAppContextLoaded, ContextAppLoadedProvider } from '../app/context';
import { TransactionType } from '../app/AppState';
import { mockTranslate } from '../__mocks__/dataMocks/mockTranslate';
import { mockInfo } from '../__mocks__/dataMocks/mockInfo';
import { mockTotalBalance } from '../__mocks__/dataMocks/mockTotalBalance';
import { mockTransactions } from '../__mocks__/dataMocks/mockTransactions';

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
  const state = defaultAppContextLoaded;
  state.translate = mockTranslate;
  const onClose = jest.fn();
  const onSetOption = jest.fn();

  test('History TxDetail - sent transaction with 2 addresses', () => {
    state.info = mockInfo;
    state.totalBalance = mockTotalBalance;
    const tx = mockTransactions[0] as TransactionType;
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
    state.info = mockInfo;
    state.totalBalance = mockTotalBalance;
    const txSelfSend = mockTransactions[1] as TransactionType;
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
    state.info = mockInfo;
    state.totalBalance = mockTotalBalance;
    const txSelfSend = mockTransactions[2] as TransactionType;
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
