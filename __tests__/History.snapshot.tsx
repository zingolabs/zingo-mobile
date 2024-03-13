/**
 * @format
 */

import 'react-native';
import React from 'react';

import { render } from '@testing-library/react-native';
import History from '../components/History';
import { defaultAppStateLoaded, ContextAppLoadedProvider } from '../app/context';

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
describe('Component History - test', () => {
  //snapshot test
  const state = defaultAppStateLoaded;
  state.transactions = [
    {
      type: 'Sent',
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
          amount: 0,
          memos: ['hello', '  & ', 'hola'],
        },
      ],
    },
    {
      type: 'SendToSelf',
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
    },
    {
      type: 'Received',
      confirmations: 133,
      txid: 'receive-txid-1234567890',
      time: Date.now(),
      zec_price: 66.66,
      txDetails: [
        {
          address: '',
          amount: 0.77654321,
          pool: 'Orchard',
          memos: ['hola', '  & ', 'hello'],
        },
        {
          address: '',
          amount: 0.1,
          pool: 'Sapling',
          memos: ['hello', '  & ', 'hola'],
        },
      ],
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
  state.info.currencyName = 'ZEC';
  state.totalBalance.total = 1.12345678;
  const onFunction = jest.fn();

  test('History no currency, privacy normal & mode basic - snapshot', () => {
    // no currency
    state.currency = '';
    // privacy normal
    state.privacy = false;
    // mode basic
    state.mode = 'basic';
    const history = render(
      <ContextAppLoadedProvider value={state}>
        <History
          doRefresh={onFunction}
          toggleMenuDrawer={onFunction}
          setZecPrice={onFunction}
          setComputingModalVisible={onFunction}
          set_privacy_option={onFunction}
          setPoolsToShieldSelectSapling={onFunction}
          setPoolsToShieldSelectTransparent={onFunction}
          setSendPageState={onFunction}
        />
      </ContextAppLoadedProvider>,
    );
    expect(history.toJSON()).toMatchSnapshot();
  });

  test('History currency USD, privacy high & mode advanced - snapshot', () => {
    // no currency
    state.currency = 'USD';
    // privacy normal
    state.privacy = true;
    // mode basic
    state.mode = 'advanced';
    const history = render(
      <ContextAppLoadedProvider value={state}>
        <History
          doRefresh={onFunction}
          toggleMenuDrawer={onFunction}
          setZecPrice={onFunction}
          setComputingModalVisible={onFunction}
          set_privacy_option={onFunction}
          setPoolsToShieldSelectSapling={onFunction}
          setPoolsToShieldSelectTransparent={onFunction}
          setSendPageState={onFunction}
        />
      </ContextAppLoadedProvider>,
    );
    expect(history.toJSON()).toMatchSnapshot();
  });
});
