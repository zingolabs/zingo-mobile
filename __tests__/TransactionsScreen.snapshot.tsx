/**
 * @format
 */

import 'react-native';
import React from 'react';

import { create } from 'react-test-renderer';
import TransactionsScreen from '../components/TransactionsScreen';
import createNativeStackNavigator from '../__mocks__/createNativeStackNavigator';

jest.mock('@fortawesome/react-native-fontawesome', () => ({
  FontAwesomeIcon: ''
}))
jest.mock("react-native-iphone-x-helper", () => ({
  getStatusBarHeight: jest.fn(),
  getBottomSpace: jest.fn(),
}))
jest.mock(require('../__mocks__/createNativeStackNavigator'))
jest.useFakeTimers()

// test suite
describe("Component TransactionsScreen - test", () => {
  //snapshot test
  test("TransactionsScreen - snapshot", () => {
    const transactionsScreen = create(
      <TransactionsScreen
        info={null}
        totalBalance={0}
        syncingStatus={null}
        transactions={null}
        toggleMenuDrawer={() => {}}
        doRefresh={() => {}}
        setComputingModalVisible={() => {}}
      />
    );
    expect(transactionsScreen.toJSON()).toMatchSnapshot();
  });

});
