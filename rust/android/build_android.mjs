#!/usr/bin/env node
// Build all 4 Android ABIs in a Docker container (reproducible).
// Output: <repo>/android/app/src/main/jniLibs/<abi>/libuniffi_zingo.so + Kotlin bindings.
// Cross-platform: Linux, macOS, Windows (requires Docker Desktop running).

import { spawnSync } from 'node:child_process';
import { mkdirSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ANDROID_DIR = dirname(fileURLToPath(import.meta.url));
const RUST_DIR = resolve(ANDROID_DIR, '..');
const REPO_DIR = resolve(RUST_DIR, '..');
const IMAGE_TAG = 'localhost/devlocal/build_android';
const JNI_PATH = join(REPO_DIR, 'android', 'app', 'src', 'main', 'jniLibs');
const UNIFFI_PATH = join(REPO_DIR, 'android', 'app', 'build', 'generated', 'source', 'uniffi');

const ABIS = [
  { triple: 'x86_64-linux-android',    jniDir: 'x86_64' },
  { triple: 'i686-linux-android',      jniDir: 'x86' },
  { triple: 'armv7-linux-androideabi', jniDir: 'armeabi-v7a' },
  { triple: 'aarch64-linux-android',   jniDir: 'arm64-v8a' },
];

function run(cmd, args) {
  console.log(`$ ${cmd} ${args.join(' ')}`);
  const r = spawnSync(cmd, args, { stdio: 'inherit' });
  if (r.status !== 0) {
    console.error(`ERROR: ${cmd} failed (exit ${r.status})`);
    process.exit(r.status ?? 1);
  }
}

function capture(cmd, args) {
  const r = spawnSync(cmd, args, { encoding: 'utf8' });
  return r.status === 0 ? r.stdout.trim() : null;
}

if (!capture('docker', ['--version'])) {
  console.error('ERROR: docker not found. Install Docker Desktop and ensure the daemon is running.');
  process.exit(1);
}

process.chdir(RUST_DIR);

// The docker build context is rust/ and has no .git, so describe here.
const gitDescribe =
  capture('git', ['-C', REPO_DIR, 'describe', '--dirty', '--always', '--long', '--match', 'zingo-*']) ?? '';

console.log('=== Building Docker image ===');
run('docker', [
  'build',
  '--target', 'build_android',
  '--build-arg', `ZINGO_MOBILE_GIT_DESCRIBE=${gitDescribe}`,
  '--tag', IMAGE_TAG,
  '.',
  '-f', 'android/docker/Dockerfile',
]);

console.log('\n=== Creating temporary container ===');
const containerId = capture('docker', ['create', IMAGE_TAG]);
if (!containerId) {
  console.error('ERROR: docker create failed');
  process.exit(1);
}

try {
  for (const { jniDir } of ABIS) {
    mkdirSync(join(JNI_PATH, jniDir), { recursive: true });
  }
  for (const variant of ['debug', 'release']) {
    mkdirSync(join(UNIFFI_PATH, variant, 'java', 'uniffi', 'zingo'), { recursive: true });
  }

  console.log('\n=== Extracting .so artifacts ===');
  for (const { triple, jniDir } of ABIS) {
    run('docker', [
      'cp',
      `${containerId}:/opt/zingo/rust/target/${triple}/release/libzingo.so`,
      join(JNI_PATH, jniDir, 'libuniffi_zingo.so'),
    ]);
  }

  console.log('\n=== Extracting Kotlin bindings ===');
  for (const variant of ['debug', 'release']) {
    run('docker', [
      'cp',
      `${containerId}:/opt/zingo/rust/lib/src/uniffi/zingo/zingo.kt`,
      join(UNIFFI_PATH, variant, 'java', 'uniffi', 'zingo', 'zingo.kt'),
    ]);
  }

  console.log('\n=== Extracting mixnet proxy .so artifacts ===');
  for (const { triple, jniDir } of ABIS) {
    run('docker', [
      'cp',
      `${containerId}:/opt/zingo/rust/mixnet-proxy/target/${triple}/release/libmixnet_proxy.so`,
      join(JNI_PATH, jniDir, 'libmixnet_proxy.so'),
    ]);
  }

  console.log('\n=== Extracting mixnet proxy Kotlin bindings ===');
  for (const variant of ['debug', 'release']) {
    const proxyKtDir = join(UNIFFI_PATH, variant, 'java', 'uniffi', 'mixnet_proxy');
    mkdirSync(proxyKtDir, { recursive: true });
    run('docker', [
      'cp',
      `${containerId}:/opt/zingo/rust/mixnet-proxy/generated-kotlin/uniffi/mixnet_proxy/mixnet_proxy.kt`,
      join(proxyKtDir, 'mixnet_proxy.kt'),
    ]);
  }
} finally {
  console.log('\n=== Cleaning up container ===');
  spawnSync('docker', ['rm', '-v', containerId], { stdio: 'inherit' });
}

console.log('\nDone. 4 ABIs built and exported.');
