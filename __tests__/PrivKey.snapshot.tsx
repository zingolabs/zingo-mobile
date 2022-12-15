/**
 * @format
 */

import 'react-native';
import React from 'react';

import { create } from 'react-test-renderer';
import PrivKey from '../components/PrivKey';
import { ContextLoadedProvider } from '../app/context';

jest.mock('react-native-localize', () => ({
  getNumberFormatSettings: () => {
    return {
      decimalSeparator: '.',
      groupingSeparator: ',',
    };
  },
}));
jest.useFakeTimers();

// test suite
describe('Component PrivKeyModal - test', () => {
  //snapshot test
  const state = {
    translate: () => 'text translated',
    totalBalance: {
      total: 0,
    },
  };
  test('PrivKey - snapshot', () => {
    const privKey = create(
      <ContextLoadedProvider value={state}>
        <PrivKey address={''} keyType={0} privKey={''} closeModal={() => {}} />  
      </ContextLoadedProvider>,
    );
    expect(privKey.toJSON()).toMatchSnapshot();
  });
});
