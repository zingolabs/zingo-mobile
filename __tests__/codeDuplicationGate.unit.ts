import { readFileSync } from 'node:fs';
import path from 'node:path';

const read = (...parts: string[]): string =>
  readFileSync(path.join(__dirname, '..', ...parts), 'utf8');

const scripts: Record<string, string> = JSON.parse(
  read('package.json'),
).scripts;
const config: { minTokens: number; minLines: number; ignore: string[] } =
  JSON.parse(read('.jscpd.json'));

// Tests that the gate exits with a failure when the scan finds one clone the baseline ref lacks.
test('the dupes script allows zero new clones against a baseline ref', () => {
  expect(scripts.dupes).toBe(
    'jscpd --fail-on-new-clones 0 --fail-on-empty --baseline-from-ref',
  );
});

// Tests that a clone counts when it reaches 50 tokens or 5 lines. A higher threshold lets a short copy pass.
test('the clone thresholds are 50 tokens and 5 lines', () => {
  expect(config.minTokens).toBe(50);
  expect(config.minLines).toBe(5);
});

// Tests that the scan covers every hand-written source when the ignore list names generated and vendored paths only.
test('the ignore list names generated and vendored paths only', () => {
  expect(config.ignore).toEqual([
    '**/node_modules/**',
    '**/build/**',
    '**/Pods/**',
    'android/app/src/main/java/uniffi/**',
    '**/__snapshots__/**',
    '**/*.d.ts',
  ]);
});

// Tests that a failure of the gate cancels the PR run when ci.yaml calls the workflow with fail-all.
test('ci.yaml calls the code-duplication workflow with fail-all', () => {
  expect(read('.github', 'workflows', 'ci.yaml')).toMatch(
    /^ {2}code-duplication:\n {4}uses: \.\/\.github\/workflows\/code-duplication\.yaml\n {4}with:\n {6}fail-all: true$/m,
  );
});

// Tests that the workflow passes the baseline ref to the dupes script when the job runs.
test('the workflow runs the dupes script against the baseline ref', () => {
  expect(read('.github', 'workflows', 'code-duplication.yaml')).toMatch(
    /^ {8}run: yarn dupes "\$BASELINE_REF"$/m,
  );
});
