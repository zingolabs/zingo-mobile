/**
 * @format
 */
import 'react-native';
import React from 'react';
import { readFileSync } from 'fs';
import { join } from 'path';
import { render } from '@testing-library/react-native';
import {
  ContextAppLoadedProvider,
  defaultAppContextLoaded,
} from '@app/context';
import { AddressBook } from '@screens/AddressBook';
import { ChainNameEnum } from '@app/AppState';
import { mockTranslate } from '../__mocks__/dataMocks/mockTranslate';

const flow = readFileSync(
  join(__dirname, '..', '.maestro', '04_address_book.yaml'),
  'utf8',
);
const addressBookIds = Array.from(
  flow.matchAll(/id:\s*"(addressbook\.[^"]+)"/g),
  m => m[1],
);

const emptyBook = () =>
  render(
    <ContextAppLoadedProvider
      value={{
        ...defaultAppContextLoaded,
        translate: mockTranslate,
        addressBook: [],
        walletChainName: ChainNameEnum.mainChainName,
      }}
    >
      <AddressBook
        navigation={{ goBack: jest.fn() } as never}
        route={{ key: 'Key-1', name: 'AddressBook', params: undefined }}
      />
    </ContextAppLoadedProvider>,
  );

describe('Maestro flow 04 on the Address Book', () => {
  test('Tests that the flow names at least one Address Book element.', () => {
    expect(addressBookIds.length).toBeGreaterThan(0);
  });

  test.each(addressBookIds)(
    'Tests that a fresh wallet with no contacts renders %s, which the flow asserts.',
    id => {
      const screen = emptyBook();
      expect(screen.getByTestId(id)).toBeTruthy();
    },
  );
});
