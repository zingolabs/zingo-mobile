import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { unmatchedRules } from '../scripts/gitignore_rules.mjs';

const FETCH_WRITES = [
  'android/build/binding-layer',
  'ios/build/binding-layer',
  'ios/binding-layer/ZingoBindings',
  'ios/binding-layer/ZingoBindings.partial',
];

describe('gitignore rules', () => {
  // Tests that a rule is unmatched when no written path lies under it.
  test('a rule nothing writes under is unmatched', () => {
    expect(unmatchedRules(['a/', 'b/'], ['a/x'])).toEqual(['b/']);
  });

  // Tests that every Binding Layer ignore rule names a path the fetch writes.
  test('every binding-layer rule names a written path', () => {
    const rules = readFileSync(join(__dirname, '..', '.gitignore'), 'utf8')
      .split('\n')
      .filter(line => line.includes('binding-layer') && !line.startsWith('#'));
    expect(unmatchedRules(rules, FETCH_WRITES)).toEqual([]);
  });
});
