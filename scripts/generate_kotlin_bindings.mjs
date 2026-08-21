#!/usr/bin/env node
// Generates the Android Kotlin UniFFI bindings for the wallet (rust/lib) and
// the mixnet proxy (rust/mixnet-proxy) into
// android/app/build/generated/source/uniffi/<variant>/java, the source dir
// the app module compiles. Neither binding is checked in.
//
// The wallet binding comes from the UDL and needs no wallet build. The proxy
// binding comes from library mode, which reads the UniFFI metadata from an
// unstripped proxy library: pass one with --proxy-library, or this script
// builds the proxy for the host.
//
// Usage: node scripts/generate_kotlin_bindings.mjs
//          [--variants release|debug,release,...]  (default: release)
//          [--proxy-library <path to unstripped libmixnet_proxy.*>]

import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const SCRIPTS_DIR = dirname(fileURLToPath(import.meta.url));
const REPO_DIR = resolve(SCRIPTS_DIR, '..');
const RUST_DIR = join(REPO_DIR, 'rust');
const PROXY_DIR = join(RUST_DIR, 'mixnet-proxy');
const UDL = join(RUST_DIR, 'lib', 'src', 'zingo.udl');
const OUT_ROOT = join(REPO_DIR, 'android', 'app', 'build', 'generated', 'source', 'uniffi');

const exe = process.platform === 'win32' ? '.exe' : '';
const WALLET_BINDGEN = join(RUST_DIR, 'target', 'release', `zingo-wallet-uniffi-bindgen${exe}`);
const PROXY_BINDGEN = join(RUST_DIR, 'target', 'release', `zingo-uniffi-bindgen${exe}`);

function parseArgs(argv) {
  let variants = ['release'];
  let proxyLibrary;
  for (let i = 0; i < argv.length; i++) {
    const flag = argv[i];
    if (flag === '--variants') {
      variants = argv[++i].split(',').filter(Boolean);
    } else if (flag.startsWith('--variants=')) {
      variants = flag.slice('--variants='.length).split(',').filter(Boolean);
    } else if (flag === '--proxy-library') {
      proxyLibrary = resolve(argv[++i]);
    } else if (flag.startsWith('--proxy-library=')) {
      proxyLibrary = resolve(flag.slice('--proxy-library='.length));
    } else {
      console.error(`unknown flag: ${flag}`);
      process.exit(2);
    }
  }
  return { variants, proxyLibrary };
}

function run(cmd, args, cwd) {
  const { status } = spawnSync(cmd, args, { cwd, stdio: 'inherit' });
  if (status !== 0) {
    console.error(`${cmd} ${args.join(' ')} failed (${status})`);
    process.exit(status ?? 1);
  }
}

function hostProxyLibrary() {
  const name =
    process.platform === 'win32'
      ? 'mixnet_proxy.dll'
      : process.platform === 'darwin'
        ? 'libmixnet_proxy.dylib'
        : 'libmixnet_proxy.so';
  return join(PROXY_DIR, 'target', 'debug', name);
}

const { variants, proxyLibrary } = parseArgs(process.argv.slice(2));

console.log('=== Building the bindgen binaries ===');
run('cargo', ['build', '--release', '--locked', '--package', 'zingo-uniffi-bindgen'], RUST_DIR);

let proxyLib = proxyLibrary;
if (proxyLib === undefined) {
  console.log('=== Building the mixnet proxy for the host ===');
  run('cargo', ['build', '--locked', '--package', 'mixnet-proxy'], PROXY_DIR);
  proxyLib = hostProxyLibrary();
}
if (!existsSync(proxyLib)) {
  console.error(`proxy library not found: ${proxyLib}`);
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
  // Library mode resolves the crate through `cargo metadata` in the proxy's
  // own workspace. `--metadata-no-deps` keeps that offline.
  run(
    PROXY_BINDGEN,
    [
      'generate',
      '--library',
      proxyLib,
      '--language',
      'kotlin',
      '--no-format',
      '--metadata-no-deps',
      '--out-dir',
      outDir,
    ],
    PROXY_DIR,
  );
}
