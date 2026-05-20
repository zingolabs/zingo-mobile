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

// 4. Prepare the Headers directory for xcodebuild -create-xcframework.
//    The modulemap inside an xcframework slice must be named `module.modulemap`
//    so Clang discovers it as the slice's module map.
rmSync(XCF_HEADERS_DIR, { recursive: true, force: true });
mkdirSync(XCF_HEADERS_DIR, { recursive: true });
const generated = join(LIB_DIR, 'Generated');
copyFileSync(join(generated, 'zingoFFI.h'),         join(XCF_HEADERS_DIR, 'zingoFFI.h'));
copyFileSync(join(generated, 'zingoFFI.modulemap'), join(XCF_HEADERS_DIR, 'module.modulemap'));

// 5. Bundle into an XCFramework. xcodebuild refuses to overwrite an existing one.
if (existsSync(XCFRAMEWORK_OUT)) {
  rmSync(XCFRAMEWORK_OUT, { recursive: true, force: true });
}
run('xcodebuild', [
  '-create-xcframework',
  '-library', DEVICE_LIB,  '-headers', XCF_HEADERS_DIR,
  '-library', SIM_FAT_LIB, '-headers', XCF_HEADERS_DIR,
  '-output', XCFRAMEWORK_OUT,
]);

// 6. Copy the Swift bindings to the app (compiled as a normal Swift source).
copyFileSync(join(generated, 'zingo.swift'), join(REPO_IOS_DIR, 'zingo.swift'));

console.log(`\nDone. XCFramework at ${XCFRAMEWORK_OUT}`);
