#!/usr/bin/env node
// Runs the Bundle Pin fetch under the Node permission model, with reads
// limited to the pin, the package and the bundle stores, and writes
// limited to the bundle stores. Gradle and the fetch:binding-layer script
// both enter here.
//
// Usage: node scripts/fetch_binding_layer.mjs --platform <android|ios> [--check-tag]

import { spawnSync } from 'node:child_process';
import { mkdirSync } from 'node:fs';
import { basename, dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const PACKAGE = join('node_modules', 'zingolib-bundle-pin');
const PIN = 'binding-layer.json';
export const STORES = [
  join('android', 'build', 'binding-layer'),
  join('ios', 'build', 'binding-layer'),
  join('ios', 'binding-layer'),
];

export function fetchArgv(root, args) {
  const under = path => join(root, path);
  return [
    '--permission',
    ...[PACKAGE, PIN, ...STORES].map(path => `--allow-fs-read=${under(path)}`),
    ...STORES.map(path => `--allow-fs-write=${under(path)}`),
    under(join(PACKAGE, 'bin', 'fetch_binding_layer.mjs')),
    '--root',
    root,
    ...args,
  ];
}

if (
  basename(process.argv[1] ?? '') === basename(fileURLToPath(import.meta.url))
) {
  const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
  for (const store of STORES) {
    mkdirSync(join(root, store), { recursive: true });
  }
  const { status } = spawnSync(
    process.execPath,
    fetchArgv(root, process.argv.slice(2)),
    {
      cwd: root,
      stdio: 'inherit',
    },
  );
  process.exit(status ?? 1);
}
