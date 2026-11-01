/**
 * @format
 */
import 'react-native';
import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import {
  ContextAppLoadedProvider,
  defaultAppContextLoaded,
} from '@app/context';
import { AddressBook } from '@screens/AddressBook';
import { mineEntries } from '@screens/AddressBook/AddressBook';
import {
  AddressBookFileClass,
  AddressKindEnum,
  ChainNameEnum,
} from '@app/AppState';
import { deliver } from '@app/navigation/results';
import { RPCAddressScopeEnum } from '@app/walletBackend/enums/RPCAddressScopeEnum';
import { mockTranslate } from '../__mocks__/dataMocks/mockTranslate';

jest.mock('@app/navigation/results', () => ({
  ...jest.requireActual('@app/navigation/results'),
  deliver: jest.fn(),
}));

const NAMES = { unified: 'Unified', transparent: 'Transparent' };

const unified = (address: string) => ({
  address,
  addressKind: AddressKindEnum.u,
});
const transparent = (address: string, scope: RPCAddressScopeEnum) => ({
  address,
  addressKind: AddressKindEnum.t,
  scope,
});

const tag = (label: string, address: string) =>
  new AddressBookFileClass(
    label,
    address,
    '#000000',
    true,
    ChainNameEnum.mainChainName,
    'ZEC',
  );

describe('mineEntries', () => {
  const addresses = [
    unified('u1first'),
    unified('u1second'),
    transparent('t1outside', RPCAddressScopeEnum.external),
    transparent('t1change', RPCAddressScopeEnum.internal),
  ];

  test('Tests that the own list numbers the unified addresses, marks the newest in use and keeps external transparent ones when the wallet has several.', () => {
    expect(mineEntries(addresses, [], NAMES, '')).toEqual([
      {
        address: 'u1first',
        name: 'Unified 1',
        current: false,
        transparent: false,
      },
      {
        address: 'u1second',
        name: 'Unified 2',
        current: true,
        transparent: false,
      },
      {
        address: 't1outside',
        name: 'Transparent',
        current: false,
        transparent: true,
      },
    ]);
  });

  test('Tests that an own address carries its tag and the search finds it by the tag when one was given.', () => {
    const found = mineEntries(
      addresses,
      [tag('Savings', 'u1first')],
      NAMES,
      'sav',
    );
    expect(found.map(m => m.name)).toEqual(['Unified 1 · Savings']);
  });
});

describe('AddressBook as a picker', () => {
  const contact = new AddressBookFileClass(
    'Lolo',
    'u1lolo',
    '#FFFFFF',
    false,
    ChainNameEnum.mainChainName,
    'ZEC',
  );
  const goBack = jest.fn();

  const picker = () =>
    render(
      <ContextAppLoadedProvider
        value={{
          ...defaultAppContextLoaded,
          translate: mockTranslate,
          addressBook: [contact],
          walletChainName: ChainNameEnum.mainChainName,
          addresses: [
            {
              index: 0,
              address: 'u1mine',
              addressKind: AddressKindEnum.u,
              has_orchard: true,
              has_sapling: true,
              has_transparent: false,
            },
          ],
        }}
      >
        <AddressBook
          navigation={{ goBack } as never}
          route={{
            key: 'Key-1',
            name: 'AddressBook',
            params: { pick: 'send.contact' },
          }}
        />
      </ContextAppLoadedProvider>,
    );

  beforeEach(() => {
    goBack.mockClear();
    jest.mocked(deliver).mockClear();
  });

  test('Tests that tapping a contact hands its address back and leaves when the book is a picker.', () => {
    const screen = picker();
    expect(screen.queryByTestId('addressbook.new')).toBeNull();
    fireEvent.press(screen.getByTestId('addressbook.row.u1lolo.head'));
    expect(deliver).toHaveBeenCalledWith('send.contact', 'u1lolo');
    expect(goBack).toHaveBeenCalledTimes(1);
  });

  test('Tests that the wallet tab hands back one of the own addresses when it is tapped.', () => {
    const screen = picker();
    fireEvent.press(screen.getByTestId('addressbook.tab.wallet'));
    fireEvent.press(screen.getByTestId('addressbook.mine.u1mine.head'));
    expect(deliver).toHaveBeenCalledWith('send.contact', 'u1mine');
    expect(goBack).toHaveBeenCalledTimes(1);
  });
});

describe('AddressBook as a picker for another chain', () => {
  const zcash = new AddressBookFileClass(
    'Lolo',
    'u1lolo',
    '#FFFFFF',
    false,
    ChainNameEnum.mainChainName,
    'ZEC',
  );
  const bitcoin = new AddressBookFileClass(
    'Bob',
    'bc1qbob',
    '#FFFFFF',
    false,
    ChainNameEnum.mainChainName,
    'BTC',
  );
  const goBack = jest.fn();

  const picker = () =>
    render(
      <ContextAppLoadedProvider
        value={{
          ...defaultAppContextLoaded,
          translate: mockTranslate,
          addressBook: [zcash, bitcoin],
          walletChainName: ChainNameEnum.mainChainName,
        }}
      >
        <AddressBook
          navigation={{ goBack } as never}
          route={{
            key: 'Key-1',
            name: 'AddressBook',
            params: { pick: 'swap.contact', chain: 'BTC' },
          }}
        />
      </ContextAppLoadedProvider>,
    );

  beforeEach(() => {
    goBack.mockClear();
    jest.mocked(deliver).mockClear();
  });

  test('Tests that only the contacts of that chain are offered, without the wallet tab, when the swap asks for one.', () => {
    const screen = picker();
    expect(screen.queryByTestId('addressbook.row.u1lolo.head')).toBeNull();
    expect(screen.queryByTestId('addressbook.tabs')).toBeNull();
    fireEvent.press(screen.getByTestId('addressbook.row.bc1qbob.head'));
    expect(deliver).toHaveBeenCalledWith('swap.contact', 'bc1qbob');
    expect(goBack).toHaveBeenCalledTimes(1);
  });
});
