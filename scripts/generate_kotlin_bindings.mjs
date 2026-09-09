#!/usr/bin/env node
// Generates the Android Kotlin UniFFI bindings for the wallet (rust/lib) and
// the Nym proxy shim (rust/nym-proxy-ffi) into
// android/app/build/generated/source/uniffi/<variant>/java, the source dir
// the app module compiles. Neither binding is checked in.
//
// The wallet binding comes from the UDL and needs no wallet build. The shim
// binding comes from library mode, which reads the UniFFI metadata from an
// unstripped shim library: pass one with --shim-library, or this script
// builds the shim for the host.
//
// Usage: node scripts/generate_kotlin_bindings.mjs
//          [--variants release|debug,release,...]  (default: release)
//          [--shim-library <path to unstripped libzingo_nym_proxy_ffi.*>]

import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const SCRIPTS_DIR = dirname(fileURLToPath(import.meta.url));
const REPO_DIR = resolve(SCRIPTS_DIR, '..');
const RUST_DIR = join(REPO_DIR, 'rust');
const SHIM_DIR = join(RUST_DIR, 'nym-proxy-ffi');
const UDL = join(RUST_DIR, 'lib', 'src', 'zingo.udl');
const OUT_ROOT = join(REPO_DIR, 'android', 'app', 'build', 'generated', 'source', 'uniffi');

const exe = process.platform === 'win32' ? '.exe' : '';
const WALLET_BINDGEN = join(RUST_DIR, 'target', 'release', `zingo-wallet-uniffi-bindgen${exe}`);
const SHIM_BINDGEN = join(RUST_DIR, 'target', 'release', `zingo-uniffi-bindgen${exe}`);

function parseArgs(argv) {
  let variants = ['release'];
  let shimLibrary;
  for (let i = 0; i < argv.length; i++) {
    const flag = argv[i];
    if (flag === '--variants') {
      variants = argv[++i].split(',').filter(Boolean);
    } else if (flag.startsWith('--variants=')) {
      variants = flag.slice('--variants='.length).split(',').filter(Boolean);
    } else if (flag === '--shim-library') {
      shimLibrary = resolve(argv[++i]);
    } else if (flag.startsWith('--shim-library=')) {
      shimLibrary = resolve(flag.slice('--shim-library='.length));
    } else {
      console.error(`unknown flag: ${flag}`);
      process.exit(2);
    }
  }
  return { variants, shimLibrary };
}

function run(cmd, args, cwd) {
  const { status } = spawnSync(cmd, args, { cwd, stdio: 'inherit' });
  if (status !== 0) {
    console.error(`${cmd} ${args.join(' ')} failed (${status})`);
    process.exit(status ?? 1);
  }
}

function hostShimLibrary() {
  const name =
    process.platform === 'win32'
      ? 'zingo_nym_proxy_ffi.dll'
      : process.platform === 'darwin'
        ? 'libzingo_nym_proxy_ffi.dylib'
        : 'libzingo_nym_proxy_ffi.so';
  return join(SHIM_DIR, 'target', 'debug', name);
}

const { variants, shimLibrary } = parseArgs(process.argv.slice(2));

console.log('=== Building the bindgen binaries ===');
run('cargo', ['build', '--release', '--locked', '--package', 'zingo-uniffi-bindgen'], RUST_DIR);

let shimLib = shimLibrary;
if (shimLib === undefined) {
  console.log('=== Building the Nym proxy shim for the host ===');
  run('cargo', ['build', '--locked', '--package', 'zingo-nym-proxy-ffi'], SHIM_DIR);
  shimLib = hostShimLibrary();
}
if (!existsSync(shimLib)) {
  console.error(`shim library not found: ${shimLib}`);
  process.exit(1);
}

for (const variant of variants) {
  const outDir = join(OUT_ROOT, variant, 'java');
  mkdirSync(outDir, { recursive: true });
  console.log(`=== Kotlin bindings (${variant}) ===`);
  run(
    WALLET_BINDGEN,
    ['generate', UDL, '--language', 'kotlin', '--no-format', '--out-dir', outDir],
    RUST_DIR,
  );
  // Library mode resolves the crate through `cargo metadata` in the shim's
  // own workspace. `--metadata-no-deps` keeps that offline.
  run(
    SHIM_BINDGEN,
    [
      'generate',
      '--library',
      shimLib,
      '--language',
      'kotlin',
      '--no-format',
      '--metadata-no-deps',
      '--out-dir',
      outDir,
    ],
    SHIM_DIR,
  );
}
