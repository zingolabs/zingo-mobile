/**
 * @format
 */

import 'react-native';
import React from 'react';

import { render } from '@testing-library/react-native';
import { ContextAppLoadedProvider, defaultAppContextLoaded } from '../app/context';
import { AddressBook } from '../components/AddressBook';
import { mockAddressBook } from '../__mocks__/dataMocks/mockAddressBook';
import { mockTranslate } from '../__mocks__/dataMocks/mockTranslate';
import { mockTheme } from '../__mocks__/dataMocks/mockTheme';

jest.useFakeTimers();
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
jest.mock('react-native/Libraries/Animated/NativeAnimatedHelper');
jest.mock('@react-native-community/netinfo', () => {
  const RN = jest.requireActual('react-native');

  RN.NativeModules.RNCNetInfo = {
    execute: jest.fn(() => '{}'),
  };

  return RN;
});
jest.mock('react-native', () => {
  const RN = jest.requireActual('react-native');

  RN.NativeModules.RPCModule = {
    execute: jest.fn(() => '{}'),
  };

  return RN;
});
jest.mock('@react-navigation/native', () => ({
  useScrollToTop: jest.fn(),
  useTheme: () => mockTheme,
}));

// test suite
describe('Component Address Book - test', () => {
  //snapshot test
  test('Address Book - snapshot', () => {
    const state = defaultAppContextLoaded;
    state.addressBook = mockAddressBook;
    state.translate = mockTranslate;
    const onClose = jest.fn();
    const onSet = jest.fn();
    const ab: any = render(
      <ContextAppLoadedProvider value={state}>
        <AddressBook closeModal={onClose} setAddressBook={onSet} setSendPageState={onSet} />
      </ContextAppLoadedProvider>,
    );
    expect(ab.toJSON()).toMatchSnapshot();
  });
});
