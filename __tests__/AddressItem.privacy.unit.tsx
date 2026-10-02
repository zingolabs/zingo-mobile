/**
 * Privacy mode masks the contact label the same way it masks the address:
 * the first two characters and dots, with a tap revealing the full label for 5 s.
 */
import 'react-native';
import React from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react-native';
import {
  ContextAppLoadedProvider,
  defaultAppContextLoaded,
} from '@app/context';

import AddressItem from '@ui/widgets/AddressItem';
import { ScreenEnum } from '@app/AppState';
import { mockTranslate } from '../__mocks__/dataMocks/mockTranslate';
import { mockAddressBook } from '../__mocks__/dataMocks/mockAddressBook';
import { mockTotalBalance } from '../__mocks__/dataMocks/mockTotalBalance';

const privateState = () => {
  const state = { ...defaultAppContextLoaded };
  state.translate = mockTranslate;
  state.addressBook = mockAddressBook;
  state.totalBalance = mockTotalBalance;
  state.privacy = true;
  return state;
};

describe('AddressItem - privacy', () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());

  it('masks the contact label when privacy is on', () => {
    render(
      <ContextAppLoadedProvider value={privateState()}>
        <AddressItem
          address={mockAddressBook[0].address}
          screenName={ScreenEnum.History}
        />
      </ContextAppLoadedProvider>,
    );

    expect(screen.getByText('pe.....')).toBeTruthy();
    expect(screen.queryByText('pepe')).toBeNull();
  });

  it('reveals the contact label on tap and masks it again after 5 s', () => {
    render(
      <ContextAppLoadedProvider value={privateState()}>
        <AddressItem
          address={mockAddressBook[0].address}
          screenName={ScreenEnum.History}
        />
      </ContextAppLoadedProvider>,
    );

    fireEvent.press(screen.getByText('pe.....'));
    expect(screen.getByText('pepe')).toBeTruthy();

    act(() => {
      jest.advanceTimersByTime(5 * 1000);
    });
    expect(screen.getByText('pe.....')).toBeTruthy();
  });

  it('masks the ZNS alias when privacy is on', () => {
    render(
      <ContextAppLoadedProvider value={privateState()}>
        <AddressItem
          address="u1abc123def456abc123def456abc123def456abc123"
          screenName={ScreenEnum.Confirm}
          znsAlias="pepe.zcash"
        />
      </ContextAppLoadedProvider>,
    );

    expect(screen.getByText('ZNS: pe.....')).toBeTruthy();
    fireEvent.press(screen.getByText('ZNS: pe.....'));
    expect(screen.getByText('ZNS: pepe.zcash')).toBeTruthy();
  });
});
