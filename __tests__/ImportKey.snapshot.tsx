/**
 * @format
 */

import 'react-native';
import React from 'react';

import { render } from '@testing-library/react-native';
import ImportKeyModal from '../components/ImportKey';
import { ContextLoadedProvider, defaultAppStateLoaded } from '../app/context';

jest.useFakeTimers();
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
jest.mock('react-native/Libraries/Animated/NativeAnimatedHelper');

// test suite
describe('Component ImportKey - test', () => {
  //snapshot test
  test('Matches the snapshot ImportKey', () => {
    const state = defaultAppStateLoaded;
    state.translate = () => 'text translated';
    state.info.currencyName = 'ZEC';
    state.totalBalance.total = 1.12345678;
    const onClose = jest.fn();
    const onImport = jest.fn();
    const importKey = render(
      <ContextLoadedProvider value={state}>
        <ImportKeyModal closeModal={onClose} doImport={onImport} />
      </ContextLoadedProvider>,
    );
    expect(importKey.toJSON()).toMatchSnapshot();
  });
});
