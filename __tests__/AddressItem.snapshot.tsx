/**
 * @format
 */

import 'react-native';
import React from 'react';
import { render } from '@testing-library/react-native';
import {
  ContextAppLoadedProvider,
  defaultAppContextLoaded,
} from '../app/context';

import AddressItem from '../components/ui/AddressItem';
import { ModeEnum, ScreenEnum } from '../app/AppState';
import { mockTranslate } from '../__mocks__/dataMocks/mockTranslate';
import { mockAddressBook } from '../__mocks__/dataMocks/mockAddressBook';
import { mockTotalBalance } from '../__mocks__/dataMocks/mockTotalBalance';

describe('AddressItem - snapshots', () => {
  const state = { ...defaultAppContextLoaded };
  state.translate = mockTranslate;
  state.addressBook = mockAddressBook;
  state.totalBalance = mockTotalBalance;
  state.mode = ModeEnum.advanced;

  test('AddressItem unknown address, no contact', () => {
    expect(
      render(
        <ContextAppLoadedProvider value={state}>
          <AddressItem
            address="u1abc123def456abc123def456abc123def456abc123"
            screenName={ScreenEnum.History}
          />
        </ContextAppLoadedProvider>,
      ).toJSON(),
    ).toMatchSnapshot();
  });

  test('AddressItem known contact from address book with icons', () => {
    expect(
      render(
        <ContextAppLoadedProvider value={state}>
          <AddressItem
            address={mockAddressBook[0].address}
            screenName={ScreenEnum.History}
            withIcon
            withSendIcon
          />
        </ContextAppLoadedProvider>,
      ).toJSON(),
    ).toMatchSnapshot();
  });

  test('AddressItem oneLine mode', () => {
    expect(
      render(
        <ContextAppLoadedProvider value={state}>
          <AddressItem
            address="u1abc123def456abc123def456abc123def456abc123"
            screenName={ScreenEnum.History}
            oneLine
          />
        </ContextAppLoadedProvider>,
      ).toJSON(),
    ).toMatchSnapshot();
  });

  test('AddressItem privacy mode', () => {
    const privState = { ...state, privacy: true };
    expect(
      render(
        <ContextAppLoadedProvider value={privState}>
          <AddressItem
            address="u1abc123def456abc123def456abc123def456abc123"
            screenName={ScreenEnum.History}
          />
        </ContextAppLoadedProvider>,
      ).toJSON(),
    ).toMatchSnapshot();
  });
});
