/**
 * @format
 */

import 'react-native';
import React from 'react';

import { create } from 'react-test-renderer';
import InfoModal from '../components/InfoModal';

jest.mock('react-native-localize', () => ({
  getNumberFormatSettings: () => {
    return {
      decimalSeparator: '.', // us
      groupingSeparator: ',', // us
    };
  },
}));
jest.useFakeTimers();

// test suite
describe('Component InfoModal - test', () => {
  //unit test
  const info = {
    testnet: false,
    serverUri: 'serverUri',
    latestBlock: 0,
    connections: 0,
    version: '0',
    verificationProgress: 0,
    currencyName: 'ZEC',
    solps: 0,
    zecPrice: 33.33,
    defaultFee: 0,
    encrypted: false,
    locked: false,
  };
  test('InfoModal - price with us (.) decimal point', () => {
    const text = create(<InfoModal info={info} closeModal={() => {}} />).toJSON();
    expect(text.type).toBe('RCTSafeAreaView');
    expect(text.children[0].children[0].children[1].children[5].children[1].children[0]).toBe('$ 33.33');
  });
});
