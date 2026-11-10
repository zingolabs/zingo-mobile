import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

import { filesUnder } from '../scripts/source_files';

// Tests that filesUnder returns each matching file when the directory nests them, and leaves out the files the pattern rejects.
test('filesUnder walks nested directories', () => {
  const dir = mkdtempSync(path.join(tmpdir(), 'source-files-'));
  mkdirSync(path.join(dir, 'inner'));
  writeFileSync(path.join(dir, 'top.ts'), '');
  writeFileSync(path.join(dir, 'notes.md'), '');
  writeFileSync(path.join(dir, 'inner', 'view.tsx'), '');

  expect(filesUnder(dir, /\.tsx?$/).sort()).toEqual([
    path.join(dir, 'inner', 'view.tsx'),
    path.join(dir, 'top.ts'),
  ]);
});
