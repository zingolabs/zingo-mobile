/**
 * @format
 */

import 'react-native';
import React from 'react';

import { render } from '@testing-library/react-native';
import { defaultAppStateLoaded, ContextAppLoadedProvider } from '../app/context';
import { ThemeType } from '../app/types';
import AbDetail from '../components/AddressBook/components/AbDetail';
import { AddressBookFileClass } from '../app/AppState';
import AddressBook from '../components/AddressBook/AddressBook';

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
jest.mock('react-native-reanimated', () => {
  return class Reanimated {
    public static Value() {
      return jest.fn(() => {});
    }
    public static View() {
      return '';
    }
  };
});
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
const Theme: ThemeType = {
  dark: true,
  colors: {
    background: '#011401', //'#010101',
    card: '#011401', //'#401717',
    border: '#ffffff',
    primary: '#18bd18', //'#df4100',
    primaryDisabled: '#5a8c5a', //'rgba(90, 140, 90, 1)',
    secondaryDisabled: '#233623',
    text: '#c3c3c3',
    zingo: '#888888',
    placeholder: '#888888',
    money: '#ffffff',
    syncing: '#ebff5a',
    notification: '',
  },
};
jest.mock('@react-navigation/native', () => ({
  useScrollToTop: jest.fn(),
  useTheme: () => Theme,
}));

// test suite
describe('Component Address Book Details - test', () => {
  //snapshot test
  const state = defaultAppStateLoaded;
  state.addressBook = [
    {
      label: 'pepe',
      address: 'u1234567890_____________',
    },
    {
      label: 'lolo',
      address: 'u0987654321_____________',
    },
  ];
  state.translate = () => 'translated text';
  const onCancel = jest.fn();
  const onAction = jest.fn();
  test('Address Book Datails - Add - snapshot', () => {
    const ab: any = render(
      <ContextAppLoadedProvider value={state}>
        <AbDetail index={-1} item={{} as AddressBookFileClass} cancel={onCancel} action={'Add'} doAction={onAction} />
      </ContextAppLoadedProvider>,
    );
    expect(ab.toJSON()).toMatchSnapshot();
  });
  test('Address Book Datails - Modify - snapshot', () => {
    const ab: any = render(
      <ContextAppLoadedProvider value={state}>
        <AbDetail index={0} item={state.addressBook[0]} cancel={onCancel} action={'Modify'} doAction={onAction} />
      </ContextAppLoadedProvider>,
    );
    expect(ab.toJSON()).toMatchSnapshot();
  });
  test('Address Book Datails - Delete - snapshot', () => {
    const ab: any = render(
      <ContextAppLoadedProvider value={state}>
        <AbDetail index={1} item={state.addressBook[1]} cancel={onCancel} action={'Delete'} doAction={onAction} />
      </ContextAppLoadedProvider>,
    );
    expect(ab.toJSON()).toMatchSnapshot();
  });
});
