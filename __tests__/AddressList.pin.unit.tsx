jest.mock('@app/services/ReceivePinImpl', () => ({
  readPinnedAddress: jest.fn(() =>
    Promise.resolve('UA-sapling-12345678901234567890'),
  ),
  writePinnedAddress: jest.fn(() => Promise.resolve()),
}));
jest.mock('@app/navigation/results', () => ({
  ...jest.requireActual('@app/navigation/results'),
  deliver: jest.fn(),
}));

import 'react-native';
import React from 'react';
import { act, fireEvent, render, within } from '@testing-library/react-native';
import {
  ContextAppLoadedProvider,
  defaultAppContextLoaded,
} from '@app/context';
import { Route } from '@app/AppState';
import { AddressList } from '@screens/AddressList';
import { deliver } from '@app/navigation/results';
import { writePinnedAddress } from '@app/services/ReceivePinImpl';
import { resetPinnedAddress } from '@app/hooks/usePinnedAddress';
import { mockAddresses } from '../__mocks__/dataMocks/mockAddresses';
import mockNavigation from '../__mocks__/dataMocks/mockNavigation';

const translate = (key: string) => key;

const list = () =>
  render(
    <ContextAppLoadedProvider
      value={{
        ...defaultAppContextLoaded,
        translate,
        addresses: mockAddresses,
        addressBook: [],
      }}
    >
      <AddressList
        navigation={mockNavigation}
        route={{
          key: 'Key-1',
          name: Route.AddressList,
          params: { current: 'UA-orchard-12345678901234567890' },
        }}
      />
    </ContextAppLoadedProvider>,
  );

beforeEach(() => {
  jest.useFakeTimers();
  resetPinnedAddress();
  jest.mocked(deliver).mockClear();
});

afterEach(() => {
  jest.useRealTimers();
});

describe('Your addresses', () => {
  test('Tests that the pinned address goes first in its group when the list opens', async () => {
    const view = list();
    await act(async () => {});
    const rows = within(view.getByTestId('addresslist.shielded')).getAllByRole(
      'radio',
    );
    expect(rows[0].props.testID).toBe(
      'addresslist.row.UA-sapling-12345678901234567890',
    );
  });

  test('Tests that picking a row sends it back to Receive when it is tapped', async () => {
    const view = list();
    await act(async () => {});
    fireEvent.press(
      view.getByTestId('addresslist.row.transparent-1-12345678901234567890'),
    );
    expect(deliver).toHaveBeenCalledWith(
      'receive.pick',
      'transparent-1-12345678901234567890',
    );
  });

  test('Tests that the pin of another row moves the pin there when it is tapped', async () => {
    const view = list();
    await act(async () => {});
    // The transparent group is last, so its last unpinned pin is the second one.
    const pins = view.getAllByLabelText('receive.pin-acc');
    fireEvent.press(pins[pins.length - 1]);
    expect(writePinnedAddress).toHaveBeenCalledWith(
      'transparent-2-12345678901234567890',
    );
  });
});
