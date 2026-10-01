/**
 * The acceptance criteria of the privacy mask and of the timed reveal.
 */
import 'react-native';
import React, { Profiler } from 'react';
import {
  act,
  fireEvent,
  render,
  renderHook,
  screen,
} from '@testing-library/react-native';
import type { ReactTestInstance } from 'react-test-renderer';
import {
  ContextAppLoadedProvider,
  defaultAppContextLoaded,
} from '@app/context';

import AddressItem from '@ui/widgets/AddressItem';
import { AddressBookFileClass, ScreenEnum } from '@app/AppState';
import { useTimedReveal } from '@app/hooks/useTimedReveal';
import {
  Field,
  REVEAL_MS,
  addressLines,
  chunks,
  labelLines,
  mask,
  textView,
  trim,
  viewLines,
} from '@app/utils/reveal';
import { mockTranslate } from '../__mocks__/dataMocks/mockTranslate';
import { mockAddressBook } from '../__mocks__/dataMocks/mockAddressBook';
import { mockTotalBalance } from '../__mocks__/dataMocks/mockTotalBalance';

const SECOND_TAP_MS = 4500;
const UNKNOWN = 'u1abc123def456abc123def456abc123def456abc123';
const ALIAS = 'pepe.zcash';
const LONG = 'a contact label of forty characters long';
const LONE_SURROGATE =
  /[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?<![\uD800-\uDBFF])[\uDC00-\uDFFF]/;

type ItemProps = React.ComponentProps<typeof AddressItem>;
type AppState = typeof defaultAppContextLoaded;

const onCommit = jest.fn();

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

beforeEach(() => {
  jest.useFakeTimers();
  onCommit.mockClear();
});
afterEach(() => jest.useRealTimers());

test('#1531 mask: a field shows as its mask, its trimmed text or its full lines, and the mask hides at least one whole character.', () => {
  const short: Field = {
    text: 'pepe',
    lines: labelLines('pepe'),
    trims: false,
  };
  const long: Field = { text: LONG, lines: labelLines(LONG), trims: true };
  const halves = [LONG.slice(0, 20), LONG.slice(20)];

  expect(['pepe', 'Al', 'A', '', 'J😀 Juan'].map(mask)).toEqual([
    'pe.....',
    'A.....',
    '.....',
    '.....',
    'J😀.....',
  ]);
  expect(mask('😀😀😀')).not.toMatch(LONE_SURROGATE);
  expect(trim('u1abcdefghijklmnop', 3)).toBe('u1a...nop');
  expect([
    chunks('short text', 2),
    chunks(LONG, 2),
    chunks(LONG, 0),
    chunks('', 2),
  ]).toEqual([['short text'], halves, [LONG], ['']]);
  expect(
    ['', 'pepe', LONG]
      .map(labelLines)
      .concat(['', 'u1short', 'u'.repeat(90)].map(addressLines)),
  ).toEqual([0, 1, 2, 0, 2, 3]);

  const views = [
    textView(short, true, false),
    textView(long, false, false),
    textView(short, false, false),
    textView(short, true, true),
    textView(long, false, true),
  ];
  expect(views).toEqual([
    { kind: 'masked', text: 'pe.....' },
    { kind: 'trimmed', text: 'a conta...rs long' },
    { kind: 'full', lines: ['pepe'] },
    { kind: 'full', lines: ['pepe'] },
    { kind: 'full', lines: halves },
  ]);
  expect(views.map(viewLines)).toEqual([
    ['pe.....'],
    ['a conta...rs long'],
    ['pepe'],
    ['pepe'],
    halves,
  ]);
});

test('#1531 reveal: one timer hides a timed reveal again, a second tap restarts it, an unmount clears it, and a change of mode hides the text in the same render.', () => {
  const { result, rerender, unmount } = renderHook(
    (timed: boolean) => useTimedReveal(timed),
    { initialProps: false },
  );
  expect(result.current).toMatchObject({ revealed: false, visible: true });

  act(() => result.current.reveal());
  expect(jest.getTimerCount()).toBe(0);
  advance(REVEAL_MS);
  expect(result.current.revealed).toBe(true);

  rerender(true);
  expect(result.current).toMatchObject({ revealed: false, visible: false });

  act(() => result.current.reveal());
  advance(SECOND_TAP_MS);
  act(() => result.current.reveal());
  expect(jest.getTimerCount()).toBe(1);
  advance(REVEAL_MS - SECOND_TAP_MS);
  expect(result.current).toMatchObject({ revealed: true, visible: true });
  advance(SECOND_TAP_MS);
  expect(result.current).toMatchObject({ revealed: false, visible: false });

  act(() => result.current.reveal());
  unmount();
  expect(jest.getTimerCount()).toBe(0);
});

test('#1531 AddressItem: the contact label and the ZNS alias each mask, reveal and mask again on their own, and the item derives its state in one commit.', () => {
  const label = render(item());
  expect(onCommit).toHaveBeenCalledTimes(1);
  expect(screen.getByText('pe.....')).toBeTruthy();
  expect(screen.queryByText('pepe')).toBeNull();
  fireEvent.press(screen.getByText('pe.....'));
  expect(screen.getByText('pepe')).toBeTruthy();
  advance(REVEAL_MS);
  expect(screen.getByText('pe.....')).toBeTruthy();
  label.unmount();

  const address = mockAddressBook[0].address;
  const alias = render(item({ address, znsAlias: ALIAS }, { addressBook: [] }));
  fireEvent.press(screen.getByText('ZNS: pe.....'));
  expect(screen.getByText(`ZNS: ${ALIAS}`)).toBeTruthy();
  advance(REVEAL_MS);
  fireEvent.press(screen.getByText('ZNS: pe.....'));
  alias.rerender(item({ address, znsAlias: ALIAS }));
  expect(screen.getByText('pe.....')).toBeTruthy();
  expect(screen.queryByText('pepe')).toBeNull();
  alias.unmount();

  const open = render(
    item({ address: UNKNOWN, znsAlias: ALIAS }, { privacy: false }),
  );
  expect(pressable(screen.getByText(`ZNS: ${ALIAS}`))).toBe(false);
  open.unmount();

  const book = bookWith(LONG);
  const toggled = render(item({}, { addressBook: book, privacy: false }));
  fireEvent.press(screen.getByText(/^a conta/));
  onCommit.mockClear();
  toggled.rerender(item({}, { addressBook: book }));
  expect(onCommit).toHaveBeenCalledTimes(1);
  expect(screen.getByText('a .....')).toBeTruthy();
});
