#!/usr/bin/env node
// Android Lint on the app module. Static analysis on the host, with no
// emulator, no device and no container. Gradle takes the Binding Layer
// from the pinned Prebuilt Bundle, so the host needs Node, a JDK and the
// Android SDK alone. Catches NewApi (a call above minSdk behind a too-low
// SDK_INT guard), which otherwise only shows up as a crash on a user's
// older device. Cross-platform: Linux, macOS, Windows.
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

// Node refuses to spawn .bat/.cmd without a shell (CVE-2024-27980), and
// the shell splits an unquoted path on its spaces.
const quoted = value => (isWindows ? `"${value}"` : value);
const gradlew = quoted(
  join(ANDROID_DIR, isWindows ? 'gradlew.bat' : 'gradlew'),
);

console.log(`\nLinting ${variant}...`);
const { status } = spawnSync(gradlew, [task], {
  cwd: ANDROID_DIR,
  stdio: 'inherit',
  shell: isWindows,
});
if (status !== 0) {
  console.error(`${gradlew} ${task} failed (${status})`);
  process.exit(status ?? 1);
}

console.log(
  `\nReport: ${join('android', 'app', 'build', 'reports', `lint-results-${variant}.html`)}`,
);
