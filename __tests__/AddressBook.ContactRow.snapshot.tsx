/**
 * @format
 */

import 'react-native';
import React from 'react';
import { render } from '@testing-library/react-native';
import {
  ContextAppLoadedProvider,
  defaultAppContextLoaded,
} from '@app/context';

import ContactRow from '@screens/AddressBook/components/ContactRow';
import { AddressBookFileClass, ChainNameEnum } from '@app/AppState';
import { mockTranslate } from '../__mocks__/dataMocks/mockTranslate';

const alice = new AddressBookFileClass(
  'Alice',
  'u1alice',
  '#e35f36',
  false,
  ChainNameEnum.mainChainName,
  'ZEC',
);
const pedro = new AddressBookFileClass(
  'Pedro',
  't1pedro',
  '#8FB4E6',
  false,
  ChainNameEnum.mainChainName,
  'ZEC',
);

const noop = () => {};

const row = (
  contact: AddressBookFileClass,
  open: boolean,
  sendable: boolean,
) => {
  const state = { ...defaultAppContextLoaded, translate: mockTranslate };
  return render(
    <ContextAppLoadedProvider value={state}>
      <ContactRow
        contact={contact}
        first
        open={open}
        sendable={sendable}
        editable
        flash={false}
        leaving={false}
        onToggle={noop}
        onSwipe={noop}
        onSend={noop}
        onCopy={noop}
        onEdit={noop}
        onDelete={noop}
        onLeft={noop}
      />
    </ContextAppLoadedProvider>,
  );
};

describe('ContactRow', () => {
  test('Tests that an open row offers Send, Copy, Edit and Delete when the wallet can spend.', () => {
    const screen = row(alice, true, true);
    expect(screen.getByTestId('addressbook.row.u1alice.send')).toBeTruthy();
    expect(screen.getByTestId('addressbook.row.u1alice.copy')).toBeTruthy();
    expect(screen.getByTestId('addressbook.row.u1alice.edit')).toBeTruthy();
    expect(screen.getByTestId('addressbook.row.u1alice.delete')).toBeTruthy();
    expect(screen.toJSON()).toMatchSnapshot();
  });

  test('Tests that an open row has no Send when the wallet is view-only.', () => {
    const screen = row(alice, true, false);
    expect(screen.queryByTestId('addressbook.row.u1alice.send')).toBeNull();
    expect(screen.getByTestId('addressbook.row.u1alice.copy')).toBeTruthy();
  });

  test('Tests that the Public tag shows when the contact holds a transparent address.', () => {
    expect(
      row(pedro, false, true).getByTestId('addressbook.row.t1pedro.public'),
    ).toBeTruthy();
    expect(
      row(alice, false, true).queryByTestId('addressbook.row.u1alice.public'),
    ).toBeNull();
  });
});
