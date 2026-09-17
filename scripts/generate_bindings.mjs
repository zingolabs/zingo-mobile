#!/usr/bin/env node
// Generates every binding of the wallet FFI from one host build of rust/lib:
// the Kotlin bindings into android/app/build/generated/source/uniffi, the
// Swift bindings into packages/zingo-ffi/ios/swift, and the TypeScript and
// C++ bindings into packages/zingo-ffi/{src,cpp}/generated.
//
// Usage: node scripts/generate_bindings.mjs [--check]
//   --check  fails when the committed TypeScript or C++ bindings differ from
//            the freshly generated ones.

import { spawnSync } from 'node:child_process';
import { mkdirSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const SCRIPTS_DIR = dirname(fileURLToPath(import.meta.url));
const REPO_DIR = resolve(SCRIPTS_DIR, '..');
const RUST_DIR = join(REPO_DIR, 'rust');
const LIB_DIR = join(RUST_DIR, 'lib');
const FFI_PACKAGE_DIR = join(REPO_DIR, 'packages', 'zingo-ffi');
const SWIFT_DIR = join(FFI_PACKAGE_DIR, 'ios', 'swift');
const GENERATED = [
  join(FFI_PACKAGE_DIR, 'src', 'generated'),
  join(FFI_PACKAGE_DIR, 'cpp', 'generated'),
];

const check = process.argv.includes('--check');

function run(cmd, args, cwd) {
  console.log(`$ ${cmd} ${args.join(' ')}`);
  const { status } = spawnSync(cmd, args, { cwd, stdio: 'inherit' });
  if (status !== 0) {
    console.error(`${cmd} failed (${status})`);
    process.exit(status ?? 1);
  }
}

function hostLibrary() {
  const name =
    process.platform === 'win32'
      ? 'zingo.dll'
      : process.platform === 'darwin'
        ? 'libzingo.dylib'
        : 'libzingo.so';
  return join(RUST_DIR, 'target', 'release', name);
}

run('cargo', ['build', '--release', '--locked', '--package', 'zingo'], RUST_DIR);

run(process.execPath, [join(SCRIPTS_DIR, 'generate_kotlin_bindings.mjs'), '--variants', 'debug,release'], REPO_DIR);

mkdirSync(SWIFT_DIR, { recursive: true });
run(
  'cargo',
  [
    'run', '--release', '--locked', '--bin', 'uniffi-bindgen', '--',
    'generate', '--library', hostLibrary(), '--language', 'swift',
    '--config', join(LIB_DIR, 'uniffi.toml'), '--out-dir', SWIFT_DIR,
  ],
  LIB_DIR,
);

run('yarn', ['--cwd', FFI_PACKAGE_DIR, 'ubrn:generate'], REPO_DIR);

if (check) {
  run('git', ['diff', '--exit-code', '--', ...GENERATED], REPO_DIR);
}
