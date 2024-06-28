/**
 * @format
 */

import 'react-native';
import React from 'react';

import { render } from '@testing-library/react-native';
import { ContextAppLoadedProvider, defaultAppContextLoaded } from '../app/context';
import AbDetail from '../components/AddressBook/components/AbDetail';
import { AddressBookActionEnum, AddressBookFileClass } from '../app/AppState';
import { mockTranslate } from '../__mocks__/dataMocks/mockTranslate';
import { mockAddressBook } from '../__mocks__/dataMocks/mockAddressBook';
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
describe('Component Address Book Details - test', () => {
  //snapshot test
  const state = defaultAppContextLoaded;
  state.addressBook = mockAddressBook;
  state.translate = mockTranslate;
  const onCancel = jest.fn();
  const onAction = jest.fn();
  test('Address Book Datails - Add - snapshot', () => {
    const ab: any = render(
      <ContextAppLoadedProvider value={state}>
        <AbDetail
          index={-1}
          item={{} as AddressBookFileClass}
          cancel={onCancel}
          action={AddressBookActionEnum.Add}
          doAction={onAction}
        />
      </ContextAppLoadedProvider>,
    );
    expect(ab.toJSON()).toMatchSnapshot();
  });
  test('Address Book Datails - Modify - snapshot', () => {
    const ab: any = render(
      <ContextAppLoadedProvider value={state}>
        <AbDetail
          index={0}
          item={state.addressBook[0]}
          cancel={onCancel}
          action={AddressBookActionEnum.Modify}
          doAction={onAction}
        />
      </ContextAppLoadedProvider>,
    );
    expect(ab.toJSON()).toMatchSnapshot();
  });
  test('Address Book Datails - Delete - snapshot', () => {
    const ab: any = render(
      <ContextAppLoadedProvider value={state}>
        <AbDetail
          index={1}
          item={state.addressBook[1]}
          cancel={onCancel}
          action={AddressBookActionEnum.Delete}
          doAction={onAction}
        />
      </ContextAppLoadedProvider>,
    );
    expect(ab.toJSON()).toMatchSnapshot();
  });
});
