/**
 * The mask and the timed reveal of the contact label, the ZNS alias and the
 * address in AddressItem.
 */
import 'react-native';
import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react-native';
import type { ReactTestInstance } from 'react-test-renderer';
import {
  ContextAppLoadedProvider,
  defaultAppContextLoaded,
} from '@app/context';

import AddressItem from '@ui/widgets/AddressItem';
import { AddressBookFileClass, ScreenEnum } from '@app/AppState';
import { REVEAL_MS } from '@app/utils/reveal';
import { advance } from '../__mocks__/advanceTimers';
import { mockTranslate } from '../__mocks__/dataMocks/mockTranslate';
import { mockAddressBook } from '../__mocks__/dataMocks/mockAddressBook';

const UNKNOWN = 'u1abc123def456abc123def456abc123def456abc123';
const ALIAS = 'pepe.zcash';
const LONG_LABEL = 'a contact label of forty characters long';

type ItemProps = React.ComponentProps<typeof AddressItem>;
type AppState = typeof defaultAppContextLoaded;

const bookWith = (label: string): AddressBookFileClass[] => [
  { ...mockAddressBook[0], label },
];

const item = (
  props: Partial<ItemProps> = {},
  state: Partial<AppState> = {},
): React.ReactElement => (
  <ContextAppLoadedProvider
    value={{
      ...defaultAppContextLoaded,
      translate: mockTranslate,
      addressBook: mockAddressBook,
      privacy: true,
      ...state,
    }}
  >
    <AddressItem
      address={mockAddressBook[0].address}
      screenName={ScreenEnum.History}
      {...props}
    />
  </ContextAppLoadedProvider>
);

const pressable = (text: ReactTestInstance): boolean => {
  let ancestor = text.parent;
  while (ancestor) {
    if (ancestor.props.onPress) {
      return true;
    }
    ancestor = ancestor.parent;
  }
  return false;
};

describe('AddressItem - privacy', () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());

  test('Tests that the contact label shows its mask when privacy is on.', () => {
    render(item());

    expect(screen.getByText('pe.....')).toBeTruthy();
    expect(screen.queryByText('pepe')).toBeNull();
  });

  test('Tests that the contact label shows in full when it is tapped, and shows its mask again when the reveal time ends.', () => {
    render(item());

    fireEvent.press(screen.getByText('pe.....'));
    expect(screen.getByText('pepe')).toBeTruthy();

    advance(REVEAL_MS);
    expect(screen.getByText('pe.....')).toBeTruthy();
  });

  test('Tests that the ZNS alias shows in full when it is tapped, and shows its mask again when the reveal time ends.', () => {
    render(item({ address: UNKNOWN, znsAlias: ALIAS }));

    fireEvent.press(screen.getByText('ZNS: pe.....'));
    expect(screen.getByText(`ZNS: ${ALIAS}`)).toBeTruthy();

    advance(REVEAL_MS);
    expect(screen.getByText('ZNS: pe.....')).toBeTruthy();
  });

  test('Tests that a new contact shows its mask when the ZNS alias of the same item was revealed before the contact was saved.', () => {
    const address = mockAddressBook[0].address;
    const { rerender } = render(
      item({ address, znsAlias: ALIAS }, { addressBook: [] }),
    );

    fireEvent.press(screen.getByText('ZNS: pe.....'));
    rerender(item({ address, znsAlias: ALIAS }));

    expect(screen.getByText('pe.....')).toBeTruthy();
    expect(screen.queryByText('pepe')).toBeNull();
  });

  test('Tests that the ZNS alias takes no press when privacy is off. A press changes nothing there.', () => {
    render(item({ address: UNKNOWN, znsAlias: ALIAS }, { privacy: false }));

    expect(pressable(screen.getByText(`ZNS: ${ALIAS}`))).toBe(false);
  });

  test('Tests that the label shows its mask when privacy turns on while the label is in full.', () => {
    const book = bookWith(LONG_LABEL);
    const { rerender } = render(
      item({}, { addressBook: book, privacy: false }),
    );

    fireEvent.press(screen.getByText(/^a conta/));
    rerender(item({}, { addressBook: book }));

    expect(screen.getByText('a .....')).toBeTruthy();
  });
});
