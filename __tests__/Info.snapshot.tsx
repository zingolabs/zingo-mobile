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
describe('Component InfoModal - test', () => {
  //snapshot test
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
  test('Matches the snapshot InfoModal', () => {
    const info: any = create(
      <ContextLoadedProvider value={state}>
        <Info closeModal={() => {}} />
      </ContextLoadedProvider>,
    );
    expect(info.toJSON()).toMatchSnapshot();
  });
});
