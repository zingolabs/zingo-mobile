/**
 * The mask and the timed reveal of the contact label, the ZNS alias and the
 * address in AddressItem.
 */
import 'react-native';
import React, { Profiler } from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react-native';
import type { ReactTestInstance } from 'react-test-renderer';
import {
  ContextAppLoadedProvider,
  defaultAppContextLoaded,
} from '@app/context';

import AddressItem from '@ui/widgets/AddressItem';
import { AddressBookFileClass, ScreenEnum } from '@app/AppState';
import { mockTranslate } from '../__mocks__/dataMocks/mockTranslate';
import { mockAddressBook } from '../__mocks__/dataMocks/mockAddressBook';
import { mockTotalBalance } from '../__mocks__/dataMocks/mockTotalBalance';

const REVEAL_MS = 5 * 1000;
const SECOND_TAP_MS = 4500;
const PRIVACY_OFF_MS = 2000;
const UNKNOWN = 'u1abc123def456abc123def456abc123def456abc123';
const ALIAS = 'pepe.zcash';
const LONG_LABEL = 'a contact label of forty characters long';
const LONE_SURROGATE =
  /[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?<![\uD800-\uDBFF])[\uDC00-\uDFFF]/;

type ItemProps = React.ComponentProps<typeof AddressItem>;
type AppState = typeof defaultAppContextLoaded;

const bookWith = (label: string): AddressBookFileClass[] => [
  { ...mockAddressBook[0], label },
];

const onCommit = jest.fn();

const item = (
  props: Partial<ItemProps> = {},
  state: Partial<AppState> = {},
): React.ReactElement => (
  <ContextAppLoadedProvider
    value={{
      ...defaultAppContextLoaded,
      translate: mockTranslate,
      addressBook: mockAddressBook,
      totalBalance: mockTotalBalance,
      privacy: true,
      ...state,
    }}
  >
    <Profiler id="item" onRender={onCommit}>
      <AddressItem
        address={mockAddressBook[0].address}
        screenName={ScreenEnum.History}
        {...props}
      />
    </Profiler>
  </ContextAppLoadedProvider>
);

const advance = (ms: number): void => {
  act(() => {
    jest.advanceTimersByTime(ms);
  });
};

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
  beforeEach(() => {
    jest.useFakeTimers();
    onCommit.mockClear();
  });
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

  test('Tests that the label stays in full for the whole reveal time when it is tapped a second time. The timer of the first tap must not end the second reveal.', () => {
    render(item());

    fireEvent.press(screen.getByText('pe.....'));
    advance(SECOND_TAP_MS);
    fireEvent.press(screen.getByText('pepe'));
    advance(REVEAL_MS - SECOND_TAP_MS);

    expect(screen.getByText('pepe')).toBeTruthy();
  });

  test('Tests that the reveal timer is cleared when the item unmounts during a reveal.', () => {
    const set = jest.spyOn(global, 'setTimeout');
    const clear = jest.spyOn(global, 'clearTimeout');
    const { unmount } = render(item());

    fireEvent.press(screen.getByText('pe.....'));
    const reveals = set.mock.results.filter(
      (_, call) => set.mock.calls[call][1] === REVEAL_MS,
    );
    unmount();

    expect(reveals).toHaveLength(1);
    expect(clear).toHaveBeenCalledWith(reveals[0].value);
  });

  test('Tests that the label does not change at the end of the reveal time when privacy was turned off during the reveal.', () => {
    const book = bookWith(LONG_LABEL);
    const { rerender, toJSON } = render(item({}, { addressBook: book }));

    fireEvent.press(screen.getByText('a .....'));
    advance(PRIVACY_OFF_MS);
    rerender(item({}, { addressBook: book, privacy: false }));
    const afterToggle = JSON.stringify(toJSON());
    advance(REVEAL_MS - PRIVACY_OFF_MS);

    expect(JSON.stringify(toJSON())).toBe(afterToggle);
  });

  test('Tests that the mask hides a part of the label when the label has two characters.', () => {
    render(item({}, { addressBook: bookWith('Al') }));

    expect(screen.queryByText('Al.....')).toBeNull();
    expect(screen.getByText('A.....')).toBeTruthy();
  });

  test('Tests that the mask keeps a whole character when the second character of the label is an emoji.', () => {
    render(item({ onlyContact: true }, { addressBook: bookWith('J😀 Juan') }));

    const masked = screen.getByText(/\.\.\.\.\.$/);

    expect(String(masked.props.children)).not.toMatch(LONE_SURROGATE);
    expect(screen.getByText('J😀.....')).toBeTruthy();
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

  test('Tests that the item renders in one commit when it mounts. The contact and the line counts are derived during the render.', () => {
    render(item());

    expect(onCommit).toHaveBeenCalledTimes(1);
  });

  test('Tests that the label shows its mask in the same commit when privacy turns on while the label is in full.', () => {
    const book = bookWith(LONG_LABEL);
    const { rerender } = render(
      item({}, { addressBook: book, privacy: false }),
    );

    fireEvent.press(screen.getByText(/^a conta/));
    onCommit.mockClear();
    rerender(item({}, { addressBook: book }));

    expect(onCommit).toHaveBeenCalledTimes(1);
    expect(screen.getByText('a .....')).toBeTruthy();
  });
});
