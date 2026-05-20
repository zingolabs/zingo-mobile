#!/usr/bin/env node
// Build iOS universal static lib (device aarch64 + x86_64).
// Output: <repo>/ios/libuniffi_zingo.a + Swift bindings.
// macOS only.

import { spawnSync } from 'node:child_process';
import { copyFileSync, mkdirSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

if (process.platform !== 'darwin') {
  console.error('ERROR: iOS builds require macOS with Xcode installed.');
  process.exit(1);
}

const IOS_DIR = dirname(fileURLToPath(import.meta.url));
const RUST_DIR = resolve(IOS_DIR, '..');
const LIB_DIR = join(RUST_DIR, 'lib');
const TARGET_DIR = join(RUST_DIR, 'target');
const REPO_IOS_DIR = resolve(RUST_DIR, '..', 'ios');

const IOS_TARGETS = ['aarch64-apple-ios', 'x86_64-apple-ios'];

function run(cmd, args, opts = {}) {
  console.log(`$ ${cmd} ${args.join(' ')}`);
  const r = spawnSync(cmd, args, { stdio: 'inherit', ...opts });
  if (r.status !== 0) {
    console.error(`ERROR: ${cmd} failed (exit ${r.status})`);
    process.exit(r.status ?? 1);
  }
}

function capture(cmd, args) {
  const r = spawnSync(cmd, args, { encoding: 'utf8' });
  return r.status === 0 ? r.stdout.trim() : null;
}

// Match Rust's default iOS deployment target so cc-rs and Xcode agree.
const env = { ...process.env, IPHONEOS_DEPLOYMENT_TARGET: '16.0' };

run('rustup', ['default', 'stable'], { env });

if (!capture('bindgen', ['--version'])) {
  run('cargo', ['install', '--force', '--locked', 'bindgen-cli'], { env });
}

process.chdir(LIB_DIR);
run('cargo', [
  'run', '--release', '--bin', 'uniffi-bindgen',
  'generate', './src/zingo.udl', '--language', 'swift', '--out-dir', './Generated',
], { env });

for (const target of IOS_TARGETS) {
  run('cargo', ['build', '--release', '--target', target], { env });
}

mkdirSync(join(TARGET_DIR, 'universal', 'release'), { recursive: true });
run('lipo', [
  '-create',
  join(TARGET_DIR, 'aarch64-apple-ios', 'release', 'libzingo.a'),
  join(TARGET_DIR, 'x86_64-apple-ios', 'release', 'libzingo.a'),
  '-output',
  join(TARGET_DIR, 'universal', 'release', 'libzingo.a'),
]);

const generated = join(LIB_DIR, 'Generated');
copyFileSync(join(generated, 'zingo.swift'),         join(REPO_IOS_DIR, 'zingo.swift'));
copyFileSync(join(generated, 'zingoFFI.h'),          join(REPO_IOS_DIR, 'zingoFFI.h'));
copyFileSync(join(generated, 'zingoFFI.modulemap'),  join(REPO_IOS_DIR, 'zingoFFI.modulemap'));
copyFileSync(
  join(TARGET_DIR, 'universal', 'release', 'libzingo.a'),
  join(REPO_IOS_DIR, 'libuniffi_zingo.a'),
);

console.log('\nDone. iOS universal lib built.');
