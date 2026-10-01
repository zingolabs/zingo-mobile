/**
 * The pure rules of the privacy mask and of the form in which a field shows.
 */
import {
  Field,
  Reveal,
  TextView,
  addressLines,
  chunks,
  labelLines,
  mask,
  shown,
  textView,
  trim,
  viewLines,
  visible,
} from '@app/utils/reveal';

const LONE_SURROGATE =
  /[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?<![\uD800-\uDBFF])[\uDC00-\uDFFF]/;
const LONG = 'a contact label of forty characters long';
const HIDDEN: Reveal = { kind: 'hidden' };
const TIMED: Reveal = { kind: 'shown', timed: true };
const UNTIMED: Reveal = { kind: 'shown', timed: false };

const field = (text: string, trims: boolean): Field => ({
  text,
  lines: labelLines(text),
  trims,
});

test('Tests that the mask keeps two characters when the text has more than two.', () => {
  expect(mask('pepe')).toBe('pe.....');
});

test.each<[string, string]>([
  ['Al', 'A.....'],
  ['A', '.....'],
  ['', '.....'],
])(
  'Tests that the mask hides at least one character when the text is %j.',
  (text: string, masked: string) => {
    expect(mask(text)).toBe(masked);
  },
);

test('Tests that the mask keeps whole characters when a kept character is an emoji.', () => {
  expect(mask('J😀 Juan')).toBe('J😀.....');
  expect(mask('😀😀😀')).not.toMatch(LONE_SURROGATE);
});

test.each<[Reveal, boolean, boolean]>([
  [HIDDEN, true, false],
  [HIDDEN, false, false],
  [TIMED, true, true],
  [TIMED, false, false],
  [UNTIMED, false, true],
  [UNTIMED, true, false],
])(
  'Tests that a reveal %j shows its text only when the timing mode %j is the mode of its tap.',
  (reveal: Reveal, timed: boolean, expected: boolean) => {
    expect(shown(reveal, timed)).toBe(expected);
  },
);

test.each<[Reveal, boolean, boolean]>([
  [HIDDEN, false, true],
  [HIDDEN, true, false],
  [TIMED, true, true],
  [UNTIMED, true, false],
])(
  'Tests that a text that hides only in the timed mode shows for reveal %j when the timing mode is %j.',
  (reveal: Reveal, timed: boolean, expected: boolean) => {
    expect(visible(reveal, timed)).toBe(expected);
  },
);

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

test('Tests that a trimmed text keeps the same number of characters at each end.', () => {
  expect(trim('u1abcdefghijklmnop', 3)).toBe('u1a...nop');
});

test.each<[string, number, string[]]>([
  ['short text', 2, ['short text']],
  [LONG, 2, [LONG.slice(0, 20), LONG.slice(20)]],
  [LONG, 3, [LONG.slice(0, 13), LONG.slice(13, 26), LONG.slice(26)]],
  [LONG, 0, [LONG]],
  ['', 2, ['']],
])(
  'Tests that the text %j cut into %j chunks keeps every character in order.',
  (text: string, count: number, expected: string[]) => {
    expect(chunks(text, count)).toEqual(expected);
    expect(chunks(text, count).join('')).toBe(text);
  },
);
