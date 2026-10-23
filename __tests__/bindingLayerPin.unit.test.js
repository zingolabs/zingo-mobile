import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = join(__dirname, '..');

describe('binding-layer pin', () => {
  // Tests that the pin and the submodule gitlink name one commit while both exist in the tree.
  test('names the submodule commit', () => {
    const { commit } = JSON.parse(
      readFileSync(join(ROOT, 'binding-layer.json'), 'utf8'),
    );
    const gitlink = execFileSync('git', ['rev-parse', ':zingolib'], {
      cwd: ROOT,
      encoding: 'utf8',
    }).trim();
    expect(commit).toBe(gitlink);
  });
});
