/**
 * @format
 */

import 'react-native';
import React from 'react';

import { render } from '@testing-library/react-native';
import ImportKeyModal from '../components/ImportKey';
import { ContextAppLoadedProvider, defaultAppStateLoaded } from '../app/context';

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
jest.mock('@react-native-community/netinfo', () => {
  const RN = jest.requireActual('react-native');

  RN.NativeModules.RNCNetInfo = {
    execute: jest.fn(() => '{}'),
  };

  return RN;
});

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
      <ContextAppLoadedProvider value={state}>
        <ImportKeyModal closeModal={onClose} doImport={onImport} />
      </ContextAppLoadedProvider>,
    );
    expect(importKey.toJSON()).toMatchSnapshot();
  });
});
