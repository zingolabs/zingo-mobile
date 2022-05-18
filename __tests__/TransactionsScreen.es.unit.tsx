/**
 * @format
 */

import 'react-native';
import React from 'react';

import { create } from 'react-test-renderer';
import TransactionsScreen from '../components/TransactionsScreen';

jest.mock('@fortawesome/react-native-fontawesome', () => ({
  FontAwesomeIcon: ''
}))
jest.mock("react-native-iphone-x-helper", () => ({
  getStatusBarHeight: jest.fn(),
  getBottomSpace: jest.fn(),
}))
jest.mock(require('../__mocks__/createNativeStackNavigator'))
jest.mock('react-native-localize', () => ({
  getNumberFormatSettings: () => {
    return {
      decimalSeparator: ',', // es
      groupingSeparator: '.' // es
    };
  },
}));
jest.useFakeTimers()

// test suite
describe("Component TransactionsScreen - test", () => {
  //unit test
  const transaction = {
    type: "type",
    address: "adress",
    amount: 33.33,
    position: "position",
    confirmations: 0,
    txid: "txid",
    time: 0,
    zec_price: 33.33,
    detailedTxns: {
      address: "adress",
      amount: 33.33,
      memo: "memo",
    }
  }
  test("TransactionsScreen - price with es (,) decimal point", () => {
    const text = create(
      <TransactionsScreen
        transactions={[transaction]}
        totalBalance={33.33}
        doRefresh={() => {}}
        syncingStatus={'status'}
        setComputingModalVisible={() => {}}
      />
    ).toJSON();
    console.log(text)
    expect(text.type).toBe('');
    //todo: It's not working at all.
    expect(text.children[0].children[0].children[1].children[5].children[1].children[0]).toBe('$ 33,33');
  });

});
