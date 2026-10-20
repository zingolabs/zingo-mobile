#!/usr/bin/env node
// Prints the descriptor of this zingo-mobile checkout: `zm_<tag>` when a
// release tag points at HEAD, else `zm_<version>_<hash5>`, with `_dirty` for
// a modified tree. The About screen shows it.
//
// Usage: node scripts/zm_descriptor.mjs

import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { basename, dirname, join, resolve } from 'node:path';

const TAG_PREFIX = 'zingo-';

export function descriptor(tag, version, hash5, dirty) {
  const name = tag
    ? `zm_${tag.startsWith(TAG_PREFIX) ? tag.slice(TAG_PREFIX.length) : tag}`
    : hash5
      ? `zm_${version}_${hash5}`
      : `zm_${version}`;
  return dirty ? `${name}_dirty` : name;
}

function git(root, args) {
  return spawnSync('git', ['-C', root, ...args], { encoding: 'utf8' });
}

function gitLine(root, args) {
  const run = git(root, args);
  return run.status === 0 ? run.stdout.split('\n')[0] : '';
}

function main() {
  const root = resolve(dirname(process.argv[1]), '..');
  const { version } = JSON.parse(
    readFileSync(join(root, 'package.json'), 'utf8'),
  );
  const tag = gitLine(root, [
    'tag',
    '--points-at',
    'HEAD',
    '--list',
    `${TAG_PREFIX}*`,
    '--sort=-version:refname',
  ]);
  const hash5 = gitLine(root, ['rev-parse', 'HEAD']).slice(0, 5);
  const dirty = git(root, ['diff-index', '--quiet', 'HEAD', '--']).status === 1;
  process.stdout.write(`${descriptor(tag, version, hash5, dirty)}\n`);
}

if (basename(process.argv[1] ?? '') === 'zm_descriptor.mjs') {
  main();
}
