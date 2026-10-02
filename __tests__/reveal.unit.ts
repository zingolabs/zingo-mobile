/**
 * The pure rules of the privacy mask and of the text helpers that every
 * reveal shares.
 */
import { Reveal, chunks, mask, trim, visible } from '@app/utils/reveal';

const LONE_SURROGATE =
  /[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?<![\uD800-\uDBFF])[\uDC00-\uDFFF]/;
const LONG = 'a contact label of forty characters long';
const HIDDEN: Reveal = { kind: 'hidden' };
const SHOWN: Reveal = { kind: 'shown' };

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
  [HIDDEN, false, true],
  [HIDDEN, true, false],
  [SHOWN, true, true],
  [SHOWN, false, true],
])(
  'Tests that a text that hides only in the timed mode shows for reveal %j when the timing mode is %j.',
  (reveal: Reveal, timed: boolean, expected: boolean) => {
    expect(visible(reveal, timed)).toBe(expected);
  },
);

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
