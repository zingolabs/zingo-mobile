import {
  declarations,
  grouping,
  importsOf,
  layering,
  merging,
  reexports,
} from '../scripts/module_rules';

const lines = (...text: string[]): string => text.join('\n');

// Tests that importsOf reports the module, the names and the type flag when a source holds a named import.
test('importsOf reads a named import', () => {
  expect(
    importsOf(
      lines(
        "import type { Pool } from '@app/wallet/pool';",
        "import { TotalBalanceClass as Balance } from '@app/wallet/balance';",
      ),
    ),
  ).toEqual([
    { from: '@app/wallet/pool', typeOnly: true, names: ['Pool'] },
    {
      from: '@app/wallet/balance',
      typeOnly: false,
      names: ['TotalBalanceClass'],
    },
  ]);
});

// Tests that layering returns the crossing edge when a file under the directory imports a forbidden module.
test('layering reports an import of a forbidden module', () => {
  expect(
    layering(
      'app/wallet/',
      ['@app/AppState'],
      [
        {
          path: 'app/wallet/transfer.ts',
          text: "import { ChainNameEnum } from '@app/AppState/enums/ChainNameEnum';",
        },
        {
          path: 'app/AppState/index.ts',
          text: "import { Pool } from '@app/wallet/pool';",
        },
      ],
    ),
  ).toEqual({
    kind: 'crossed',
    edges: [
      {
        file: 'app/wallet/transfer.ts',
        from: '@app/AppState/enums/ChainNameEnum',
      },
    ],
  });
});

// Tests that layering returns 'layered' when the directory imports its own modules and outside packages only.
test('layering accepts imports inside the directory', () => {
  expect(
    layering(
      'app/wallet/',
      ['@app/AppState'],
      [
        {
          path: 'app/wallet/transfer.ts',
          text: lines(
            "import { Pool } from './pool';",
            "import { Pool as Same } from '@app/wallet/pool';",
          ),
        },
      ],
    ),
  ).toEqual({ kind: 'layered' });
});

// Tests that merging names the module when two value imports read from it.
test('merging reports a module imported twice', () => {
  expect(
    merging(
      lines(
        "import { ToAddrClass } from '@app/wallet/send';",
        "import { SendPageStateClass } from '@app/wallet/send';",
      ),
    ),
  ).toEqual({ kind: 'repeated', modules: ['@app/wallet/send'] });
});

// Tests that merging returns 'merged' when a module has one value import and one type import.
test('merging accepts a value import beside a type import', () => {
  expect(
    merging(
      lines(
        "import { ToAddrClass } from '@app/wallet/send';",
        "import type { SendJsonToTypeType } from '@app/wallet/send';",
      ),
    ),
  ).toEqual({ kind: 'merged' });
});

// Tests that reexports names each import a barrel takes from a module under the prefix.
test('reexports reports the names a barrel takes from the prefix', () => {
  expect(
    reexports(
      lines(
        "import { Pool } from '@app/wallet/pool';",
        "import { Route } from './enums/Route';",
        'export { Pool, Route };',
      ),
      '@app/wallet/',
    ),
  ).toEqual({ kind: 'double', names: ['Pool'] });
});

// Tests that reexports returns 'single' when the barrel imports nothing under the prefix.
test('reexports accepts a barrel with its own names only', () => {
  expect(
    reexports(
      lines("import { Route } from './enums/Route';", 'export { Route };'),
      '@app/wallet/',
    ),
  ).toEqual({ kind: 'single' });
});

// Tests that declarations reports the enum name and the comment line when a source holds an enum and a comment after code.
test('declarations reports an enum and a trailing comment', () => {
  expect(
    declarations(
      lines(
        'export enum PoolEnum {',
        "  OrchardPool = 'Orchard', // the old pool",
        '}',
      ),
    ),
  ).toEqual({ kind: 'legacy', enums: ['PoolEnum'], trailing: [2] });
});

// Tests that declarations returns 'plain' when a source holds a literal union under a comment on its own line.
test('declarations accepts a literal union under a full-line comment', () => {
  expect(
    declarations(
      lines(
        '// The pools a note sits in.',
        "export type Pool = 'Orchard' | 'Sapling';",
        "export const url = 'https://example.test';",
      ),
    ),
  ).toEqual({ kind: 'plain' });
});

// Tests that grouping names the file when a module is named after a syntactic kind.
test('grouping reports a module named after a syntactic kind', () => {
  expect(grouping(['address.ts', 'types.ts', 'enums.ts'])).toEqual({
    kind: 'syntactic',
    files: ['types.ts', 'enums.ts'],
  });
});

// Tests that grouping returns 'domain' when every module carries a domain name.
test('grouping accepts domain names', () => {
  expect(grouping(['address.ts', 'transfer.ts'])).toEqual({ kind: 'domain' });
});
