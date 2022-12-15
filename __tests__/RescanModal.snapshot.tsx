/**
 * @format
 */

import 'react-native';
import React from 'react';

import { create } from 'react-test-renderer';
import Rescan from '../components/Rescan';
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
describe('Component Rescan - test', () => {
  //snapshot test
  const state = {
    translate: () => 'text translated',
    totalBalance: {
      total: 0,
    },
  };
  test('Rescan - snapshot', () => {
    const rescan = create(
      <ContextLoadedProvider value={state}>
        <Rescan closeModal={() => {}} startRescan={() => {}} />
      </ContextLoadedProvider>,
    );
    expect(rescan.toJSON()).toMatchSnapshot();
  });
});
