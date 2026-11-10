import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';

import {
  declarations,
  grouping,
  layering,
  merging,
  reexports,
  type Source,
} from '../scripts/module_rules';

const root = path.join(__dirname, '..');

const under = (dir: string): string[] =>
  readdirSync(path.join(root, dir), { withFileTypes: true }).flatMap(entry => {
    const file = `${dir}/${entry.name}`;
    if (entry.isDirectory()) {
      return under(file);
    }
    return /\.tsx?$/.test(entry.name) ? [file] : [];
  });

const read = (file: string): Source => ({
  path: file,
  text: readFileSync(path.join(root, file), 'utf8'),
});

const sources = ['app', 'screens', 'ui', '__tests__', '__mocks__', '.storybook']
  .flatMap(under)
  .map(read);

const wallet = sources.filter(source => source.path.startsWith('app/wallet/'));

// Tests that app/wallet imports neither app/AppState nor app/walletBackend when both import app/wallet.
test('app/wallet sits below AppState and walletBackend', () => {
  expect(
    layering('app/wallet/', ['@app/AppState', '@app/walletBackend'], sources),
  ).toEqual({ kind: 'layered' });
});

// Tests that a file holds one value import and one type import per wallet module when it reads several names from that module.
test('each file imports a wallet module once', () => {
  const repeated = sources.flatMap(source => {
    const outcome = merging(source.text);
    const modules =
      outcome.kind === 'repeated'
        ? outcome.modules.filter(name => name.startsWith('@app/wallet/'))
        : [];
    return modules.map(name => `${source.path}: ${name}`);
  });
  expect(repeated).toEqual([]);
});

// Tests that a wallet name has one import path when the AppState barrel exports its own names only.
test('the AppState barrel re-exports no wallet name', () => {
  expect(reexports(read('app/AppState/index.ts').text, '@app/wallet/')).toEqual(
    { kind: 'single' },
  );
});

// Tests that every wallet module declares literal unions and full-line comments when it is new code.
test('the wallet modules hold no enum and no trailing comment', () => {
  expect(
    wallet
      .map(source => ({ file: source.path, ...declarations(source.text) }))
      .filter(found => found.kind === 'legacy'),
  ).toEqual([]);
});

// Tests that each wallet module carries a domain name when app/wallet groups by domain.
test('app/wallet names no module after a syntactic kind', () => {
  expect(grouping(wallet.map(source => path.basename(source.path)))).toEqual({
    kind: 'domain',
  });
});
