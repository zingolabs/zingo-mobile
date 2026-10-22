#!/usr/bin/env node
// Configures the Android project with node shadowed by a shim that records
// every fetch and forwards every other call. Fails when the configuration
// runs the Binding Layer fetch.
// Runs Gradle without the daemon, which resolves commands from the PATH
// it started with.
//
// Usage: node scripts/binding_layer_fetch_lazy.mjs

import { spawnSync } from 'node:child_process';
import {
  chmodSync,
  existsSync,
  mkdtempSync,
  readFileSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { delimiter, dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const SCRIPTS_DIR = dirname(fileURLToPath(import.meta.url));
const ANDROID_DIR = resolve(SCRIPTS_DIR, '..', 'android');

const shimDir = mkdtempSync(join(tmpdir(), 'node-shim-'));
const calls = join(shimDir, 'calls.log');
const shim = join(shimDir, 'node');
writeFileSync(
  shim,
  [
    '#!/bin/sh',
    'case "$*" in',
    `  *fetch_binding_layer.mjs*) printf '%s\\n' "$*" >> "${calls}"; exit 7 ;;`,
    `  *) exec "${process.execPath}" "$@" ;;`,
    'esac',
    '',
  ].join('\n'),
);
chmodSync(shim, 0o755);

const { status } = spawnSync(
  join(ANDROID_DIR, 'gradlew'),
  ['--no-daemon', '--quiet', ':app:help'],
  {
    cwd: ANDROID_DIR,
    stdio: 'inherit',
    env: { ...process.env, PATH: `${shimDir}${delimiter}${process.env.PATH}` },
  },
);

if (existsSync(calls)) {
  console.error('Gradle configuration ran the fetch:');
  console.error(readFileSync(calls, 'utf8'));
  process.exit(1);
}
if (status !== 0) {
  console.error(`gradlew :app:help failed (${status})`);
  process.exit(status ?? 1);
}
console.log('Gradle configuration ran no fetch.');
