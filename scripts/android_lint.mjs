#!/usr/bin/env node
// Android Lint on the app module. Static analysis on the host, with no
// emulator, no device and no container. The builder's kotlin mode generates
// the Binding Layer's Kotlin bindings from a host build of the proxy crate,
// and Gradle compiles against them. Catches NewApi (a call above minSdk
// behind a too-low SDK_INT guard), which otherwise only shows up as a crash
// on a user's older device. Needs cargo and protoc on the host, because the
// kotlin mode builds the proxy crate and its protobuf dependencies.
// Cross-platform: Linux, macOS, Windows.
//
// Usage: node scripts/android_lint.mjs [variant]   # default prodRelease

import { spawnSync } from 'node:child_process';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const SCRIPTS_DIR = dirname(fileURLToPath(import.meta.url));
const REPO_DIR = resolve(SCRIPTS_DIR, '..');
const ANDROID_DIR = join(REPO_DIR, 'android');
const ZINGOLIB_DIR = join(REPO_DIR, 'zingolib');
const BINDINGS_DIR = join(
  ZINGOLIB_DIR,
  'bindings',
  'android',
  'build',
  'binding-layer',
);

const isWindows = process.platform === 'win32';
const variant = process.argv[2] ?? 'prodRelease';
const task = `:app:lint${variant[0].toUpperCase()}${variant.slice(1)}`;

// With a shell, Node joins the arguments unquoted, so a caller that needs
// the shell quotes any argument that may hold a space.
function run(cmd, args, cwd, shell = false) {
  const { status } = spawnSync(cmd, args, {
    cwd,
    stdio: 'inherit',
    shell,
  });
  if (status !== 0) {
    console.error(`${cmd} ${args.join(' ')} failed (${status})`);
    process.exit(status ?? 1);
  }
}

// cargo is an executable on every platform, so it needs no shell.
console.log('\nGenerating the Kotlin bindings...');
run(
  'cargo',
  [
    'run',
    '--quiet',
    '--manifest-path',
    join(ZINGOLIB_DIR, 'tools', 'workbench', 'Cargo.toml'),
    '--bin',
    'build-binding-layer',
    '--',
    'kotlin',
    '--out',
    BINDINGS_DIR,
  ],
  REPO_DIR,
);

console.log(`\nLinting ${variant}...`);
// Node refuses to spawn .bat/.cmd without a shell (CVE-2024-27980), and
// the shell splits an unquoted path on its spaces.
const quoted = value => (isWindows ? `"${value}"` : value);
const gradlew = quoted(
  join(ANDROID_DIR, isWindows ? 'gradlew.bat' : 'gradlew'),
);
run(
  gradlew,
  [task, quoted(`-PbindingLayerPrebuilt=${BINDINGS_DIR}`)],
  ANDROID_DIR,
  isWindows,
);

console.log(
  `\nReport: ${join('android', 'app', 'build', 'reports', `lint-results-${variant}.html`)}`,
);
