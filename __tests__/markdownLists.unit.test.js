import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { orderedListBreaks } from '../scripts/markdown_lists.mjs';

describe('ordered lists', () => {
  // Tests that a break is reported when an item skips a number.
  test('a skipped number is a break', () => {
    expect(orderedListBreaks('1. a\n2. b\n4. c\n')).toEqual([
      { line: 3, found: 4, expected: 3 },
    ]);
  });

  // Tests that a list restarts without a break when a heading separates two lists and when continuation lines sit between items.
  test('headings restart and continuations continue', () => {
    expect(orderedListBreaks('1. a\n   - x\n2. b\n\n## H\n\n1. c\n')).toEqual(
      [],
    );
  });

  // Tests that the release quickstart numbers every list without a break.
  test('the release quickstart counts straight', () => {
    const doc = readFileSync(
      join(__dirname, '..', 'docs', 'release_quickstart.md'),
      'utf8',
    );
    expect(orderedListBreaks(doc)).toEqual([]);
  });
});
