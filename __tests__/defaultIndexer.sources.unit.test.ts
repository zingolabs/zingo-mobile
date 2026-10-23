import { readdirSync, readFileSync, statSync } from 'fs';
import { join, relative } from 'path';

const ROOT = join(__dirname, '..');
const SOURCE_DIRS = ['app', 'screens', 'ui'];
const DEFAULT_INDEXER_HOST = 'zainod.zingolabs.dev';

const sourceFiles = (dir: string): string[] =>
  readdirSync(dir).flatMap(name => {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) {
      return name === 'node_modules' ? [] : sourceFiles(path);
    }
    return /\.(ts|tsx|js|jsx|json)$/.test(name) ? [path] : [];
  });

test('Tests that no source file defines the Default Indexer host, which zingolib alone defines.', () => {
  const offenders = SOURCE_DIRS.flatMap(dir => sourceFiles(join(ROOT, dir)))
    .filter(path => readFileSync(path, 'utf8').includes(DEFAULT_INDEXER_HOST))
    .map(path => relative(ROOT, path));
  expect(offenders).toEqual([]);
});
