/**
 * @format
 */

import 'react-native';
import React from 'react';

import { render } from '@testing-library/react-native';
import Send from '../components/Send';
import { defaultAppStateLoaded, ContextAppLoadedProvider } from '../app/context';
import { ThemeType } from '../app/types';

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
jest.mock('react-native-reanimated', () => {
  return class Reanimated {
    public static Value() {
      return jest.fn(() => {});
    }
    public static View() {
      return '';
    }
  };
});
jest.mock('react-native', () => {
  const RN = jest.requireActual('react-native');

  RN.NativeModules.RPCModule = {
    execute: jest.fn(() => '{}'),
  };

  return RN;
});
const Theme: ThemeType = {
  dark: true,
  colors: {
    background: '#011401', //'#010101',
    card: '#011401', //'#401717',
    border: '#ffffff',
    primary: '#18bd18', //'#df4100',
    primaryDisabled: 'rgba(90, 140, 90, 1)',
    text: '#c3c3c3',
    zingo: '#888888',
    placeholder: '#888888',
    money: '#ffffff',
    notification: '',
  },
};
jest.mock('@react-navigation/native', () => ({
  useIsFocused: jest.fn(),
  useTheme: () => Theme,
}));

// test suite
describe('Component Send - test', () => {
  //snapshot test
  test('Send - snapshot', () => {
    const state = defaultAppStateLoaded;
    state.transactions = [
      {
        type: 'sent',
        address: 'sent-address-12345678901234567890',
        amount: 0.12345678,
        position: '',
        confirmations: 22,
        txid: 'sent-txid-1234567890',
        time: Date.now(),
        zec_price: 33.33,
        detailedTxns: [],
      },
      {
        type: 'receive',
        address: 'receive-address-12345678901234567890',
        amount: 0.87654321,
        position: '',
        confirmations: 133,
        txid: 'receive-txid-1234567890',
        time: Date.now(),
        zec_price: 66.66,
        detailedTxns: [],
      },
    ];
    state.uaAddress = 'UA-12345678901234567890';
    state.addresses = [
      {
        uaAddress: 'UA-12345678901234567890',
        address: 'UA-12345678901234567890',
        addressKind: 'u',
        containsPending: false,
        receivers: 'ozt',
      },
      {
        uaAddress: 'UA-12345678901234567890',
        address: 'sapling-12345678901234567890',
        addressKind: 'z',
        containsPending: false,
        receivers: 'z',
      },
      {
        uaAddress: 'UA-12345678901234567890',
        address: 'transparent-12345678901234567890',
        addressKind: 't',
        containsPending: false,
        receivers: 't',
      },
    ];
    state.translate = () => 'text translated';
    state.currency = 'USD';
    state.info.currencyName = 'ZEC';
    state.zecPrice.zecPrice = 33.33;
    state.info.defaultFee = 1000;
    state.totalBalance.total = 1.12345678;
    state.totalBalance.orchardBal = 0.6;
    state.totalBalance.spendableOrchard = 0.3;
    state.totalBalance.privateBal = 0.4;
    state.totalBalance.spendablePrivate = 0.2;
    state.totalBalance.transparentBal = 0.12345678;
    state.sendPageState.toaddr.id = 1234567890;
    state.sendPageState.toaddr.to = 'UA-12345678901234567890';
    state.sendPageState.toaddr.amount = '1.12345678';
    state.sendPageState.toaddr.amountCurrency = '50.22';
    state.sendPageState.toaddr.memo = 'memo';
    const onFunction = jest.fn();
    const send = render(
      <ContextAppLoadedProvider value={state}>
        <Send
          setSendPageState={onFunction}
          sendTransaction={onFunction}
          clearToAddr={onFunction}
          setSendProgress={onFunction}
          toggleMenuDrawer={onFunction}
          setComputingModalVisible={onFunction}
          poolsMoreInfoOnClick={onFunction}
          syncingStatusMoreInfoOnClick={onFunction}
          setZecPrice={onFunction}
        />
      </ContextAppLoadedProvider>,
    );
    expect(send.toJSON()).toMatchSnapshot();
  });
});
