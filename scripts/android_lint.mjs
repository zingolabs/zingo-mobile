#!/usr/bin/env node
// Android Lint on the app module. Static analysis only: no emulator, no
// device, no NDK. Catches NewApi (a call above minSdk behind a
// too-low SDK_INT guard), which otherwise only shows up as a crash on a
// user's older device.
// Cross-platform: Linux, macOS, Windows.
//
// Usage: node scripts/android_lint.mjs [variant]   # default prodRelease

import { spawnSync } from 'node:child_process';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const SCRIPTS_DIR = dirname(fileURLToPath(import.meta.url));
const REPO_DIR = resolve(SCRIPTS_DIR, '..');
const ANDROID_DIR = join(REPO_DIR, 'android');

const isWindows = process.platform === 'win32';
const variant = process.argv[2] ?? 'prodRelease';
const task = `:app:lint${variant[0].toUpperCase()}${variant.slice(1)}`;

// The app module compiles the UniFFI bindings. Generate them first. The
// shim builds for the host; no NDK.
console.log('\nGenerating UniFFI bindings...');
const generated = spawnSync(
  process.execPath,
  [join(SCRIPTS_DIR, 'generate_kotlin_bindings.mjs'), '--variants', 'release'],
  { stdio: 'inherit' },
);
if (generated.status !== 0) {
  process.exit(generated.status ?? 1);
}

console.log(`\nLinting ${variant}...`);
// Node refuses to spawn .bat/.cmd without a shell (CVE-2024-27980).
const gradlew = join(ANDROID_DIR, isWindows ? 'gradlew.bat' : 'gradlew');
const { status } = spawnSync(gradlew, [task], {
  cwd: ANDROID_DIR,
  stdio: 'inherit',
  shell: isWindows,
});

console.log(`\nReport: ${join('android', 'app', 'build', 'reports', `lint-results-${variant}.html`)}`);
process.exit(status ?? 1);
