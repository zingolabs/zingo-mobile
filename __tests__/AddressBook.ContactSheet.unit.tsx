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
      /^[ut]/.test(address)
        ? JSON.stringify({
            status: 'success',
            chain_name: 'main',
            address_kind: address.startsWith('t') ? 'transparent' : 'unified',
          })
        : JSON.stringify({ status: 'Invalid address' }),
    checkMyAddressInfo: async (address: string) =>
      JSON.stringify({ is_wallet_address: address === 'u1mine' }),
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

const sheet = (onSave = jest.fn(), translate = mockTranslate) => {
  const state = { ...defaultAppContextLoaded, translate };
  return render(
    <ContextAppLoadedProvider value={state}>
      <ContactSheet
        edit={{ kind: 'new', preset: '', label: '' }}
        book={[alice]}
        walletChain={ChainNameEnum.mainChainName}
        onSave={onSave}
        onCancel={() => {}}
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
    expect(onSave).toHaveBeenCalledWith('Bob', 'u1bob', 'ZEC');
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
  test('Tests that the error names the existing contact when the address is already in the book.', async () => {
    const screen = sheet(jest.fn(), (key: string) =>
      key === 'addressbook.dup-address' ? 'called {name}' : mockTranslate(key),
    );
    fireEvent.changeText(screen.getByTestId('addressbook.name-field'), 'Mike');
    fireEvent.changeText(
      screen.getByTestId('addressbook.address-field'),
      'u1alice',
    );
    await act(async () => {
      jest.advanceTimersByTime(300);
    });
    expect(screen.getByTestId('addressbook.note.err')).toHaveTextContent(
      /called Alice/,
    );
  });
  test('Tests that Save stays disabled and says why when the address belongs to the wallet.', async () => {
    const onSave = jest.fn();
    const screen = sheet(onSave, (key: string) =>
      key === 'addressbook.own-address' ? 'own' : mockTranslate(key),
    );
    fireEvent.changeText(screen.getByTestId('addressbook.name-field'), 'Mike');
    fireEvent.changeText(
      screen.getByTestId('addressbook.address-field'),
      'u1mine',
    );
    await act(async () => {
      jest.advanceTimersByTime(300);
    });
    expect(screen.getByTestId('addressbook.note.err')).toHaveTextContent('own');
    fireEvent.press(screen.getByTestId('addressbook.save'));
    expect(onSave).not.toHaveBeenCalled();
  });
});

describe('ContactSheet chain', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });
  afterEach(() => {
    jest.useRealTimers();
  });

  const BTC_ADDRESS = 'bc1qw508d6qejxtdg4y5r3zarvary0c5xw7kv8f3t4';

  test('Tests that the likely chain is proposed and saved when the address is not a Zcash one', async () => {
    const onSave = jest.fn(async () => {});
    const screen = render(
      <ContextAppLoadedProvider
        value={{ ...defaultAppContextLoaded, translate: mockTranslate }}
      >
        <ContactSheet
          edit={{ kind: 'new', preset: '', label: '' }}
          book={[]}
          walletChain={ChainNameEnum.mainChainName}
          onSave={onSave}
          onCancel={() => {}}
        />
      </ContextAppLoadedProvider>,
    );
    fireEvent.changeText(screen.getByTestId('addressbook.name-field'), 'Bob');
    fireEvent.changeText(
      screen.getByTestId('addressbook.address-field'),
      BTC_ADDRESS,
    );
    await act(async () => {
      jest.advanceTimersByTime(300);
    });
    await act(async () => {
      jest.advanceTimersByTime(300);
    });
    expect(screen.getByTestId('chainselect.ticker')).toHaveTextContent('BTC');
    fireEvent.press(screen.getByTestId('addressbook.save'));
    expect(onSave).toHaveBeenCalledWith('Bob', BTC_ADDRESS, 'BTC');
  });

  test('Tests that the chain stays fixed when the caller knows it', async () => {
    const screen = render(
      <ContextAppLoadedProvider
        value={{ ...defaultAppContextLoaded, translate: mockTranslate }}
      >
        <ContactSheet
          edit={{
            kind: 'new',
            preset: '0x1111111111111111111111111111111111111111',
            label: '',
            chain: 'BASE',
          }}
          book={[]}
          walletChain={ChainNameEnum.mainChainName}
          onSave={jest.fn()}
          onCancel={() => {}}
        />
      </ContextAppLoadedProvider>,
    );
    await act(async () => {
      jest.advanceTimersByTime(600);
    });
    expect(screen.getByTestId('chainselect.ticker')).toHaveTextContent('BASE');
    expect(screen.getByTestId('chainselect.field')).toBeDisabled();
  });
});
