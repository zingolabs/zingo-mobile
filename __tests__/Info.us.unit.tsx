/**
 * @format
 */

import 'react-native';
import React from 'react';

import { create } from 'react-test-renderer';
import Info from '../components/Info';
import { ContextLoadedProvider } from '../app/context';

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
jest.useFakeTimers();

// test suite
describe('Component Info - test', () => {
  //unit test
  const state = {
    info: {
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
    },
    translate: () => 'translated text',
    totalBalance: {
      total: 0,
    },
  };
  test('Info - price with us (.) decimal point', () => {
    const text: any = create(
      <ContextLoadedProvider value={state}>
        <Info closeModal={() => {}} />
      </ContextLoadedProvider>,
    ).toJSON();
    expect(text.type).toBe('RCTSafeAreaView');
    expect(text.children[1].children[0].children[0].children[5].children[1].children[0]).toBe('$ 33.33');
  });
});
