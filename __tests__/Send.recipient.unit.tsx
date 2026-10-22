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
import { AddressBookFileClass, ChainNameEnum } from '@app/AppState';
import RecipientField from '@screens/Send/components/RecipientField';
import type { NameLookup } from '@screens/Send/components/RecipientField';

const irene = new AddressBookFileClass(
  'Irene',
  'u1irene0000000000000000000000000000000000',
  '#e35f36',
  false,
  ChainNameEnum.mainChainName,
  'ZEC',
);

const field = (props: Partial<React.ComponentProps<typeof RecipientField>>) => {
  const handlers = {
    onPickContact: jest.fn(),
    onPickName: jest.fn(),
    onSaveContact: jest.fn(),
  };
  const view = render(
    <ContextAppLoadedProvider
      value={{
        ...defaultAppContextLoaded,
        translate: (key: string) => key,
        addressBook: [irene],
      }}
    >
      <RecipientField
        text=""
        onChangeText={jest.fn()}
        onClear={jest.fn()}
        valid={0}
        focused={false}
        onFocus={jest.fn()}
        onBlur={jest.fn()}
        contact={undefined}
        pickedName=""
        matches={[]}
        lookup={{ kind: 'none' }}
        onOpenBook={jest.fn()}
        onScan={jest.fn()}
        scanRef={React.createRef()}
        busy={false}
        {...handlers}
        {...props}
      />
    </ContextAppLoadedProvider>,
  );
  return { view, handlers };
};

describe('RecipientField', () => {
  test('Tests that typing a name lists the matching contacts and the name being looked up', () => {
    const lookup: NameLookup = { kind: 'loading', name: 'ire.zec' };
    const { view, handlers } = field({ text: 'ire', matches: [irene], lookup });
    expect(view.getByTestId('send.results')).toHaveTextContent(
      /send\.name-looking/,
    );
    fireEvent.press(view.getByTestId('send.result.contact.Irene'));
    expect(handlers.onPickContact).toHaveBeenCalledWith(irene);
  });

  test('Tests that a name nobody owns says so instead of an error', () => {
    const { view } = field({
      text: 'nobody',
      lookup: { kind: 'missing', name: 'nobody.zec' },
    });
    expect(view.getByTestId('send.results')).toHaveTextContent(
      /send\.name-nobody/,
    );
    expect(view.queryByTestId('send.address.error')).toBeNull();
  });

  test('Tests that a found name not in the book is picked with its address', () => {
    const { view, handlers } = field({
      text: 'maria',
      lookup: { kind: 'found', name: 'maria.zec', address: 'u1maria' },
    });
    fireEvent.press(view.getByTestId('send.result.name'));
    expect(handlers.onPickName).toHaveBeenCalledWith('maria.zec', 'u1maria');
  });

  test('Tests that a contact becomes a token with its name when the address is theirs', () => {
    const { view } = field({ text: irene.address, valid: 1, contact: irene });
    expect(view.getByTestId('send.token')).toHaveTextContent(/Irene/);
    expect(view.queryByTestId('send.addressplaceholder')).toBeNull();
  });

  test('Tests that a pasted transparent address warns that the payment is public', () => {
    const { view } = field({
      text: 't1abcdefghijklmnopqrstuvwxyz1234567',
      valid: 1,
    });
    expect(view.getByText('send.to-transparent')).toBeTruthy();
  });

  test('Tests that text that is no address, contact or name says what is wrong', () => {
    const { view } = field({ text: '!!', valid: -1 });
    expect(view.getByTestId('send.address.error')).toHaveTextContent(
      'send.to-invalid',
    );
  });
});
