/**
 * @format
 */

import 'react-native';
import React from 'react';
import { act, fireEvent, render } from '@testing-library/react-native';
import {
  ContextAppLoadedProvider,
  defaultAppContextLoaded,
} from '@app/context';

import ContactSheet from '@ui/widgets/ContactSheet';
import { AddressBookFileClass, ChainNameEnum } from '@app/AppState';
import { mockTranslate } from '../__mocks__/dataMocks/mockTranslate';

jest.mock('@app/RPCModule', () => ({
  __esModule: true,
  default: {
    parseAddressInfo: async (address: string) =>
      JSON.stringify({
        status: 'success',
        chain_name: 'main',
        address_kind: address.startsWith('t') ? 'transparent' : 'unified',
      }),
  },
}));

const alice = new AddressBookFileClass(
  'Alice',
  'u1alice',
  '#e35f36',
  false,
  ChainNameEnum.mainChainName,
  'ZEC',
);

const navigation = { navigate: jest.fn() } as never;

const sheet = (onSave = jest.fn()) => {
  const state = { ...defaultAppContextLoaded, translate: mockTranslate };
  return render(
    <ContextAppLoadedProvider value={state}>
      <ContactSheet
        edit={{ kind: 'new', preset: '', label: '' }}
        book={[alice]}
        walletChain={ChainNameEnum.mainChainName}
        onSave={onSave}
        onCancel={() => {}}
        navigation={navigation}
      />
    </ContextAppLoadedProvider>,
  );
};

describe('ContactSheet', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });
  afterEach(() => {
    jest.useRealTimers();
  });

  test('Tests that Save stays disabled when the name is already in the book.', async () => {
    const onSave = jest.fn();
    const screen = sheet(onSave);
    fireEvent.changeText(screen.getByTestId('addressbook.name-field'), 'alice');
    fireEvent.changeText(
      screen.getByTestId('addressbook.address-field'),
      'u1new',
    );
    await act(async () => {
      jest.advanceTimersByTime(300);
    });
    fireEvent.press(screen.getByTestId('addressbook.save'));
    expect(onSave).not.toHaveBeenCalled();
  });

  test('Tests that Save runs with the trimmed name and address when both are new and the address parses.', async () => {
    const onSave = jest.fn(async () => {});
    const screen = sheet(onSave);
    fireEvent.changeText(screen.getByTestId('addressbook.name-field'), ' Bob ');
    fireEvent.changeText(
      screen.getByTestId('addressbook.address-field'),
      'u1bob',
    );
    await act(async () => {
      jest.advanceTimersByTime(300);
    });
    expect(screen.getByTestId('addressbook.note.ok')).toBeTruthy();
    fireEvent.press(screen.getByTestId('addressbook.save'));
    expect(onSave).toHaveBeenCalledWith('Bob', 'u1bob');
  });

  test('Tests that the kind line marks the address public when it is transparent.', async () => {
    const screen = sheet();
    fireEvent.changeText(
      screen.getByTestId('addressbook.address-field'),
      't1pedro',
    );
    await act(async () => {
      jest.advanceTimersByTime(300);
    });
    expect(screen.getByTestId('addressbook.note.warn')).toBeTruthy();
  });
});
