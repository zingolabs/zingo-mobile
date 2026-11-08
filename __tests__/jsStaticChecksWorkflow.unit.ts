import { readFileSync } from 'node:fs';
import path from 'node:path';

const workflow = readFileSync(
  path.join(__dirname, '..', '.github', 'workflows', 'js-static-checks.yaml'),
  'utf8',
);

describe('js-static-checks workflow', () => {
  // Tests that every fetch of the PR base sha is shallow when the checkout itself has depth 1. A full fetch downloads the whole dev history on every run.
  test('each fetch of the base sha carries --depth=1', () => {
    const fetches = workflow
      .split('\n')
      .filter(line => /\bgit fetch\b/.test(line));
    expect(fetches.length).toBeGreaterThan(0);
    for (const line of fetches) {
      expect(line).toMatch(/--depth=1/);
    }
  });

  // Tests that the required status context arrives when the job keeps the name the dev branch protection lists.
  test('the job name matches the required status context', () => {
    expect(workflow).toMatch(/^ {4}name: tsc, eslint, prettier$/m);
  });
});
