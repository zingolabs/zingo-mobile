/**
 * @format
 */

import 'react-native';
import React from 'react';

import { create } from 'react-test-renderer';
import ImportKeyModal from '../components/ImportKey';
import { ContextLoadedProvider } from '../app/context';

jest.mock('@fortawesome/react-native-fontawesome', () => ({
  FontAwesomeIcon: '',
}));
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
describe('Component ImportKeyModal - test', () => {
  //snapshot test
  test('Matches the snapshot ImportKeyModal', () => {
    const state = {
      translate: () => 'text translated',
      totalBalance: {
        total: 0,
      },
    };
    const importKey = create(
      <ContextLoadedProvider value={state}>
        <ImportKeyModal closeModal={() => {}} doImport={() => {}} />
      </ContextLoadedProvider>,
    );
    expect(importKey.toJSON()).toMatchSnapshot();
  });
});
