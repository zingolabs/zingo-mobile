#!/usr/bin/env node
// Build the iOS Zingolib XCFramework: contains both the device slice (arm64) and
// the simulator slice (arm64 + x86_64 fat). Xcode auto-selects the right slice
// per build destination, so there is no separate "for device" vs "for simulator"
// build anymore.
//
// Output:
//   <repo>/packages/zingo-ffi/build/ZingoFfi.xcframework/  (the pod's vendored framework)
//   <repo>/packages/zingo-ffi/ios/swift/zingo.swift          (Swift bindings, compiled in the pod)
//   <repo>/packages/zingo-ffi/{src,cpp}/generated             (JSI bindings, from the host library)
//
// macOS only.

import { spawnSync } from 'node:child_process';
import { copyFileSync, mkdirSync, rmSync, existsSync } from 'node:fs';
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
const REPO_DIR = resolve(RUST_DIR, '..');
const REPO_IOS_DIR = join(REPO_DIR, 'ios');
const FFI_PACKAGE_DIR = join(REPO_DIR, 'packages', 'zingo-ffi');

const DEVICE_TARGET = 'aarch64-apple-ios';
const SIM_TARGETS = ['aarch64-apple-ios-sim', 'x86_64-apple-ios'];

const SIM_FAT_DIR = join(TARGET_DIR, 'universal-sim', 'release');
const SIM_FAT_LIB = join(SIM_FAT_DIR, 'libzingo.a');
const DEVICE_LIB = join(TARGET_DIR, DEVICE_TARGET, 'release', 'libzingo.a');
const XCF_HEADERS_DIR = join(TARGET_DIR, 'xcframework-headers');
const XCFRAMEWORK_OUT = join(FFI_PACKAGE_DIR, 'build', 'ZingoFfi.xcframework');
const SWIFT_BINDINGS_DIR = join(FFI_PACKAGE_DIR, 'ios', 'swift');
const HOST_LIB = join(TARGET_DIR, 'release', 'libzingo.dylib');

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
for (const stale of ['libuniffi_zingo.a', 'zingoFFI.h', 'zingoFFI.modulemap', 'zingo.swift']) {
  rmSync(join(REPO_IOS_DIR, stale), { force: true });
}
rmSync(join(REPO_IOS_DIR, 'Zingolib.xcframework'), { recursive: true, force: true });

run('rustup', ['default', 'stable'], { env });

if (!capture('bindgen', ['--version'])) {
  run('cargo', ['install', '--force', '--locked', 'bindgen-cli'], { env });
}

// 1. Generate the uniffi Swift bindings (C header + modulemap included) from
//    the host library, the one build that library mode can read.
process.chdir(LIB_DIR);
run('cargo', ['build', '--release', '-p', 'zingo'], { env: process.env });
run('cargo', [
  'run', '--release', '--bin', 'uniffi-bindgen', '--',
  'generate', '--library', HOST_LIB, '--language', 'swift', '--config', './uniffi.toml',
  '--out-dir', './Generated',
], { env: process.env });

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

// 4. Build the Nym proxy shim (nym-proxy-ffi) libraries + Swift bindings. The shim
//    links nym-sdk, which resolves only in rust/nym-proxy-ffi's own lock, so it
//    builds apart from the wallet library above. Both static libraries link
//    into the same app and share ONE module map (step 5), so there is never a
//    second include/module.modulemap to collide with the wallet's.
console.log('\n=== Building Nym proxy shim (nym-proxy-ffi) ===');
const NYM_DIR = join(RUST_DIR, 'nym-proxy-ffi');
const NYM_TARGET_DIR = join(NYM_DIR, 'target');
const NYM_GENERATED = join(NYM_DIR, 'Generated');
const SHIM_LIB = 'libzingo_nym_proxy_ffi.a';
const NYM_DEVICE_LIB = join(NYM_TARGET_DIR, DEVICE_TARGET, 'release', SHIM_LIB);
const NYM_SIM_FAT_DIR = join(NYM_TARGET_DIR, 'universal-sim', 'release');
const NYM_SIM_FAT_LIB = join(NYM_SIM_FAT_DIR, SHIM_LIB);
const NYM_XCFRAMEWORK_OUT = join(REPO_IOS_DIR, 'ZingoNymProxyFFI.xcframework');

for (const target of [DEVICE_TARGET, ...SIM_TARGETS]) {
  run('cargo', ['build', '--release', '--target', target, '-p', 'zingo-nym-proxy-ffi'], { env, cwd: NYM_DIR });
}

rmSync(NYM_GENERATED, { recursive: true, force: true });
mkdirSync(NYM_GENERATED, { recursive: true });
run('cargo', [
  'run', '--release', '-p', 'zingo-uniffi-bindgen', '--bin', 'zingo-uniffi-bindgen', '--',
  'generate', '--library', NYM_DEVICE_LIB, '--language', 'swift', '--out-dir', NYM_GENERATED,
], { env, cwd: RUST_DIR });

mkdirSync(NYM_SIM_FAT_DIR, { recursive: true });
run('lipo', [
  '-create',
  join(NYM_TARGET_DIR, 'aarch64-apple-ios-sim', 'release', SHIM_LIB),
  join(NYM_TARGET_DIR, 'x86_64-apple-ios', 'release', SHIM_LIB),
  '-output', NYM_SIM_FAT_LIB,
]);

// 5. Headers for the shim xcframework, the one the app links directly: its
//    FFI header and its module map. The wallet's header rides in the ZingoFfi
//    pod instead (step 8), so no second include/module.modulemap collides.
rmSync(XCF_HEADERS_DIR, { recursive: true, force: true });
mkdirSync(XCF_HEADERS_DIR, { recursive: true });
const generated = join(LIB_DIR, 'Generated');
copyFileSync(join(NYM_GENERATED, 'zingo_nym_proxy_ffiFFI.h'), join(XCF_HEADERS_DIR, 'zingo_nym_proxy_ffiFFI.h'));
copyFileSync(join(NYM_GENERATED, 'zingo_nym_proxy_ffiFFI.modulemap'), join(XCF_HEADERS_DIR, 'module.modulemap'));

// 6. Wallet xcframework: libraries only, vendored by the ZingoFfi pod.
if (existsSync(XCFRAMEWORK_OUT)) {
  rmSync(XCFRAMEWORK_OUT, { recursive: true, force: true });
}
mkdirSync(dirname(XCFRAMEWORK_OUT), { recursive: true });
run('xcodebuild', [
  '-create-xcframework',
  '-library', DEVICE_LIB,
  '-library', SIM_FAT_LIB,
  '-output', XCFRAMEWORK_OUT,
]);

// 7. Shim xcframework with its headers and module map.
if (existsSync(NYM_XCFRAMEWORK_OUT)) {
  rmSync(NYM_XCFRAMEWORK_OUT, { recursive: true, force: true });
}
run('xcodebuild', [
  '-create-xcframework',
  '-library', NYM_DEVICE_LIB,  '-headers', XCF_HEADERS_DIR,
  '-library', NYM_SIM_FAT_LIB, '-headers', XCF_HEADERS_DIR,
  '-output', NYM_XCFRAMEWORK_OUT,
]);

// 8. The wallet's Swift bindings compile inside the ZingoFfi pod; the shim's
//    stay in the app.
mkdirSync(SWIFT_BINDINGS_DIR, { recursive: true });
copyFileSync(join(generated, 'zingo.swift'),                   join(SWIFT_BINDINGS_DIR, 'zingo.swift'));
copyFileSync(join(generated, 'zingoFFI.h'),                    join(SWIFT_BINDINGS_DIR, 'zingoFFI.h'));
copyFileSync(join(NYM_GENERATED, 'zingo_nym_proxy_ffi.swift'), join(REPO_IOS_DIR, 'zingo_nym_proxy_ffi.swift'));

// 9. The JSI bindings and the turbo-module glue, from the host library.
run('yarn', ['--cwd', FFI_PACKAGE_DIR, 'ubrn:generate'], { env });

console.log(`\nDone. XCFrameworks at ${XCFRAMEWORK_OUT} + ${NYM_XCFRAMEWORK_OUT}`);
