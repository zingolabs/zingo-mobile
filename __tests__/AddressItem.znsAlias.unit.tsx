/**
 * The ZNS alias an address was resolved from, carried into the confirmation
 * screen: shown where a contact name would go, and offered as the label when
 * the user saves the address to the book.
 */
import 'react-native';
import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react-native';
import {
  ContextAppLoadedProvider,
  defaultAppContextLoaded,
} from '@app/context';

import AddressItem from '@ui/widgets/AddressItem';
import { ModeEnum, ScreenEnum } from '@app/AppState';
import { mockTranslate } from '../__mocks__/dataMocks/mockTranslate';
import { mockAddressBook } from '../__mocks__/dataMocks/mockAddressBook';
import { mockTotalBalance } from '../__mocks__/dataMocks/mockTotalBalance';

const UNKNOWN = 'u1abc123def456abc123def456abc123def456abc123';

const baseState = () => {
  const state = { ...defaultAppContextLoaded };
  state.translate = mockTranslate;
  state.addressBook = mockAddressBook;
  state.totalBalance = mockTotalBalance;
  state.mode = ModeEnum.advanced;
  return state;
};

describe('AddressItem - znsAlias', () => {
  it('names an address the user reached by name', () => {
    render(
      <ContextAppLoadedProvider value={baseState()}>
        <AddressItem
          address={UNKNOWN}
          screenName={ScreenEnum.Confirm}
          znsAlias="pepe.zcash"
        />
      </ContextAppLoadedProvider>,
    );

    expect(screen.getByText('ZNS: pepe.zcash')).toBeTruthy();
  });

  it('offers the alias as the label when saving the contact', () => {
    const state = baseState();
    state.launchAddTagModal = jest.fn();

    render(
      <ContextAppLoadedProvider value={state}>
        <AddressItem
          address={UNKNOWN}
          screenName={ScreenEnum.Confirm}
          withIcon={true}
          znsAlias="pepe.zcash"
        />
      </ContextAppLoadedProvider>,
    );

    fireEvent.press(screen.getByTestId('addressitem.add-contact'));

    expect(state.launchAddTagModal).toHaveBeenCalledWith(
      UNKNOWN,
      undefined,
      'pepe.zcash',
    );
  });

  it('stays quiet when the address is already a contact', () => {
    render(
      <ContextAppLoadedProvider value={baseState()}>
        <AddressItem
          address={mockAddressBook[0].address}
          screenName={ScreenEnum.Confirm}
          withIcon={true}
          znsAlias="pepe.zcash"
        />
      </ContextAppLoadedProvider>,
    );

    // A name of the user's own wins: the contact label is the one that shows.
    expect(screen.queryByText('ZNS: pepe.zcash')).toBeNull();
    expect(screen.getByText(mockAddressBook[0].label)).toBeTruthy();
  });
});
