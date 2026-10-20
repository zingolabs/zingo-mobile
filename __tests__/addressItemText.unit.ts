/**
 * The form in which each field of AddressItem shows.
 */
import 'react-native';
import {
  Field,
  TextView,
  addressLines,
  labelLines,
  textView,
  viewLines,
} from '@ui/widgets/addressItemText';

const LONG = 'a contact label of forty characters long';

const field = (text: string, trims: boolean): Field => ({
  text,
  lines: labelLines(text),
  trims,
});

test.each<[string, Field, boolean, boolean, TextView]>([
  [
    'the mask',
    field('pepe', false),
    true,
    false,
    { kind: 'masked', text: 'pe.....' },
  ],
  [
    'the trimmed text',
    field(LONG, true),
    false,
    false,
    { kind: 'trimmed', text: 'a conta...rs long' },
  ],
  [
    'the whole text',
    field('pepe', false),
    false,
    false,
    { kind: 'full', lines: ['pepe'] },
  ],
  [
    'the full text',
    field('pepe', false),
    true,
    true,
    { kind: 'full', lines: ['pepe'] },
  ],
  [
    'the full text in chunks',
    field(LONG, true),
    false,
    true,
    { kind: 'full', lines: [LONG.slice(0, 20), LONG.slice(20)] },
  ],
])(
  'Tests that a field shows %s when its privacy and its reveal select that form.',
  (
    _form: string,
    shownField: Field,
    privacy: boolean,
    revealed: boolean,
    expected: TextView,
  ) => {
    expect(textView(shownField, privacy, revealed)).toEqual(expected);
  },
);

test('Tests that a view renders one line when it is masked or trimmed, and its own lines when it is full.', () => {
  expect(viewLines({ kind: 'masked', text: 'pe.....' })).toEqual(['pe.....']);
  expect(viewLines({ kind: 'trimmed', text: 'a...b' })).toEqual(['a...b']);
  expect(viewLines({ kind: 'full', lines: ['a', 'b'] })).toEqual(['a', 'b']);
});

test('Tests that the line counts follow the length of the text when the text is empty, short and long.', () => {
  expect([labelLines(''), labelLines('pepe'), labelLines(LONG)]).toEqual([
    0, 1, 2,
  ]);
  expect([
    addressLines(''),
    addressLines('u1short'),
    addressLines('u'.repeat(90)),
  ]).toEqual([0, 2, 3]);
});
