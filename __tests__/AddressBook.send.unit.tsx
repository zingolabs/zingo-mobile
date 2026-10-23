/**
 * @format
 */
import 'react-native';
import React from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react-native';
import {
  ContextAppLoadedProvider,
  defaultAppContextLoaded,
} from '@app/context';
import {
  OptionsPanelProvider,
  useOptionsPanel,
} from '@app/context/optionsPanel';
import { AddressBook } from '@screens/AddressBook';
import { AddressBookFileClass, ChainNameEnum, Route } from '@app/AppState';
import { remoteServer } from '@app/AppState/types/ServerType';
import { mockTranslate } from '../__mocks__/dataMocks/mockTranslate';
import mockNavigation from '../__mocks__/dataMocks/mockNavigation';

// The shared react-native shim leaves named imports empty in __tests__.
const { Pressable, Text } =
  jest.requireActual<typeof import('react-native')>('react-native');

// Drives the panel the way the header and the grid do when they open the
// book: open, then sink under the pushed screen.
const Probe = () => {
  const { kind, open, sink } = useOptionsPanel();
  return (
    <>
      <Text testID="probe.kind">{kind}</Text>
      <Pressable testID="probe.open" onPress={open} />
      <Pressable testID="probe.sink" onPress={sink} />
    </>
  );
};

const contact = new AddressBookFileClass(
  'Lolo',
  'u1lolo',
  '#FFFFFF',
  false,
  ChainNameEnum.mainChainName,
  'ZEC',
);

const renderBook = () =>
  render(
    <ContextAppLoadedProvider
      value={{
        ...defaultAppContextLoaded,
        translate: mockTranslate,
        addressBook: [contact],
        walletChainName: ChainNameEnum.mainChainName,
        server: remoteServer(
          'https://example.test:443',
          ChainNameEnum.mainChainName,
        ),
      }}
    >
      <OptionsPanelProvider>
        <Probe />
        <AddressBook
          navigation={mockNavigation}
          route={{ key: 'Key-1', name: 'AddressBook', params: undefined }}
        />
      </OptionsPanelProvider>
    </ContextAppLoadedProvider>,
  );

const kind = () => screen.getByTestId('probe.kind').props.children;

describe('AddressBook send', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    mockNavigation.navigate.mockClear();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  test('Tests that sending to a contact closes the panel the book was opened from, so it is not over the Send tab.', () => {
    renderBook();
    fireEvent.press(screen.getByTestId('probe.open'));
    fireEvent.press(screen.getByTestId('probe.sink'));
    expect(kind()).toBe('under');

    fireEvent.press(screen.getByTestId('addressbook.row.u1lolo.send'));
    act(() => {
      jest.runOnlyPendingTimers();
    });

    expect(mockNavigation.navigate).toHaveBeenCalledWith(Route.Home, {
      screen: Route.Send,
    });
    expect(kind()).toBe('closed');
  });
});
