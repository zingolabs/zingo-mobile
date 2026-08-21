#!/usr/bin/env node
// Build the iOS Zingolib XCFramework: contains both the device slice (arm64) and
// the simulator slice (arm64 + x86_64 fat). Xcode auto-selects the right slice
// per build destination, so there is no separate "for device" vs "for simulator"
// build anymore.
//
// Output:
//   <repo>/ios/Zingolib.xcframework/  (the bundle Xcode links against)
//   <repo>/ios/zingo.swift            (Swift bindings, compiled as part of the app)
//
// macOS only.

import { spawnSync } from 'node:child_process';
import { copyFileSync, mkdirSync, rmSync, existsSync, readFileSync, writeFileSync } from 'node:fs';
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

const DEVICE_TARGET = 'aarch64-apple-ios';
const SIM_TARGETS = ['aarch64-apple-ios-sim', 'x86_64-apple-ios'];

const SIM_FAT_DIR = join(TARGET_DIR, 'universal-sim', 'release');
const SIM_FAT_LIB = join(SIM_FAT_DIR, 'libzingo.a');
const DEVICE_LIB = join(TARGET_DIR, DEVICE_TARGET, 'release', 'libzingo.a');
const XCF_HEADERS_DIR = join(TARGET_DIR, 'xcframework-headers');
const XCFRAMEWORK_OUT = join(REPO_IOS_DIR, 'Zingolib.xcframework');

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

const env = { ...process.env, IPHONEOS_DEPLOYMENT_TARGET: '16.0' };

// 0. Clean up legacy artifacts from the pre-xcframework build flow. Idempotent:
//    after the first run on a clean checkout these files are gone forever.
for (const stale of ['libuniffi_zingo.a', 'zingoFFI.h', 'zingoFFI.modulemap']) {
  rmSync(join(REPO_IOS_DIR, stale), { force: true });
}

run('rustup', ['default', 'stable'], { env });

if (!capture('bindgen', ['--version'])) {
  run('cargo', ['install', '--force', '--locked', 'bindgen-cli'], { env });
}

// 1. Generate uniffi Swift bindings (also produces the C header + modulemap)
process.chdir(LIB_DIR);
run('cargo', [
  'run', '--release', '--bin', 'uniffi-bindgen',
  'generate', './src/zingo.udl', '--language', 'swift', '--out-dir', './Generated',
], { env });

// 2. Build cargo for the 3 targets
for (const target of [DEVICE_TARGET, ...SIM_TARGETS]) {
  run('cargo', ['build', '--release', '--target', target], { env });
}

// 3. Lipo the 2 simulator targets into one fat .a
mkdirSync(SIM_FAT_DIR, { recursive: true });
run('lipo', [
  '-create',
  join(TARGET_DIR, 'aarch64-apple-ios-sim', 'release', 'libzingo.a'),
  join(TARGET_DIR, 'x86_64-apple-ios', 'release', 'libzingo.a'),
  '-output', SIM_FAT_LIB,
]);

// 4. Build the mixnet proxy (mixnet-proxy) libraries + Swift bindings. The proxy
//    links nym-sdk, which resolves only in rust/mixnet-proxy's own lock, so it
//    builds apart from the wallet library above. Both static libraries link
//    into the same app and share ONE module map (step 5), so there is never a
//    second include/module.modulemap to collide with the wallet's.
console.log('\n=== Building mixnet proxy (mixnet-proxy) ===');
const PROXY_DIR = join(RUST_DIR, 'mixnet-proxy');
const NYM_TARGET_DIR = join(PROXY_DIR, 'target');
const NYM_GENERATED = join(PROXY_DIR, 'Generated');
const PROXY_LIB = 'libmixnet_proxy.a';
const NYM_DEVICE_LIB = join(NYM_TARGET_DIR, DEVICE_TARGET, 'release', PROXY_LIB);
const NYM_SIM_FAT_DIR = join(NYM_TARGET_DIR, 'universal-sim', 'release');
const NYM_SIM_FAT_LIB = join(NYM_SIM_FAT_DIR, PROXY_LIB);
const PROXY_XCFRAMEWORK_OUT = join(REPO_IOS_DIR, 'MixnetProxy.xcframework');

for (const target of [DEVICE_TARGET, ...SIM_TARGETS]) {
  run('cargo', ['build', '--release', '--target', target, '-p', 'mixnet-proxy'], { env, cwd: PROXY_DIR });
}

rmSync(NYM_GENERATED, { recursive: true, force: true });
mkdirSync(NYM_GENERATED, { recursive: true });
run('cargo', [
  'run', '--release', '-p', 'zingo-uniffi-bindgen', '--',
  'generate', '--library', NYM_DEVICE_LIB, '--language', 'swift', '--out-dir', NYM_GENERATED,
], { env, cwd: RUST_DIR });

mkdirSync(NYM_SIM_FAT_DIR, { recursive: true });
run('lipo', [
  '-create',
  join(NYM_TARGET_DIR, 'aarch64-apple-ios-sim', 'release', PROXY_LIB),
  join(NYM_TARGET_DIR, 'x86_64-apple-ios', 'release', PROXY_LIB),
  '-output', NYM_SIM_FAT_LIB,
]);

// 5. Headers for the wallet xcframework: both FFI headers plus ONE module map
//    declaring both modules. Two static-library xcframeworks each shipping
//    Headers/module.modulemap would both copy to $BUILT_PRODUCTS_DIR/include/
//    module.modulemap ("Multiple commands produce"), so the proxy rides here and
//    its own xcframework ships libraries only (step 7).
rmSync(XCF_HEADERS_DIR, { recursive: true, force: true });
mkdirSync(XCF_HEADERS_DIR, { recursive: true });
const generated = join(LIB_DIR, 'Generated');
copyFileSync(join(generated, 'zingoFFI.h'),                   join(XCF_HEADERS_DIR, 'zingoFFI.h'));
copyFileSync(join(NYM_GENERATED, 'mixnet_proxyFFI.h'), join(XCF_HEADERS_DIR, 'mixnet_proxyFFI.h'));
const combinedModulemap =
  readFileSync(join(generated, 'zingoFFI.modulemap'), 'utf8') + '\n' +
  readFileSync(join(NYM_GENERATED, 'mixnet_proxyFFI.modulemap'), 'utf8');
writeFileSync(join(XCF_HEADERS_DIR, 'module.modulemap'), combinedModulemap);

// 6. Wallet xcframework carries both headers + the combined module map.
if (existsSync(XCFRAMEWORK_OUT)) {
  rmSync(XCFRAMEWORK_OUT, { recursive: true, force: true });
}
run('xcodebuild', [
  '-create-xcframework',
  '-library', DEVICE_LIB,  '-headers', XCF_HEADERS_DIR,
  '-library', SIM_FAT_LIB, '-headers', XCF_HEADERS_DIR,
  '-output', XCFRAMEWORK_OUT,
]);

// 7. Proxy xcframework: libraries only. Its headers/module live in the wallet
//    xcframework above, so nothing here writes a second include/module.modulemap.
if (existsSync(PROXY_XCFRAMEWORK_OUT)) {
  rmSync(PROXY_XCFRAMEWORK_OUT, { recursive: true, force: true });
}
run('xcodebuild', [
  '-create-xcframework',
  '-library', NYM_DEVICE_LIB,
  '-library', NYM_SIM_FAT_LIB,
  '-output', PROXY_XCFRAMEWORK_OUT,
]);

// 8. Copy both Swift bindings to the app (compiled as normal Swift sources).
copyFileSync(join(generated, 'zingo.swift'),                   join(REPO_IOS_DIR, 'zingo.swift'));
copyFileSync(join(NYM_GENERATED, 'mixnet_proxy.swift'), join(REPO_IOS_DIR, 'mixnet_proxy.swift'));

console.log(`\nDone. XCFrameworks at ${XCFRAMEWORK_OUT} + ${PROXY_XCFRAMEWORK_OUT}`);
