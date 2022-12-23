/**
 * @format
 */

import 'react-native';
import React from 'react';

import { render } from '@testing-library/react-native';
import Transactions from '../components/Transactions';
import { defaultAppStateLoaded, ContextLoadedProvider } from '../app/context';

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
jest.mock('moment', () => () => ({
  format: (p: string) => {
    if (p === 'MMM YYYY') {
      return 'Dec 2022';
    } else if (p === 'YYYY MMM D h:mm a') {
      return '2022 Dec 13 8:00 am';
    } else if (p === 'MMM D, h:mm a') {
      return 'Dec 13, 8:00 am';
    }
  },
}));

// test suite
describe('Component Transactions - test', () => {
  //snapshot test
  test('Transactions Portrait - snapshot', () => {
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
    state.dimensions = {
      width: 200,
      height: 400,
      orientation: 'portrait',
      deviceType: 'tablet',
      scale: 1.5,
    };
    state.info.currencyName = 'ZEC';
    state.totalBalance.total = 1.12345678;
    const onFunction = jest.fn();
    const transactions = render(
      <ContextLoadedProvider value={state}>
        <Transactions
          doRefresh={onFunction}
          toggleMenuDrawer={onFunction}
          setComputingModalVisible={onFunction}
          poolsMoreInfoOnClick={onFunction}
          syncingStatusMoreInfoOnClick={onFunction}
        />
      </ContextLoadedProvider>,
    );
    expect(transactions.toJSON()).toMatchSnapshot();
  });
});
