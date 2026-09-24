#!/usr/bin/env tsx
// Peak heap each wallet-file path adds above the wallet it already holds,
// measured on a connected device or emulator and compared against the
// recorded baseline. The test itself enforces a fixed budget per guarded
// path; this compares against what the path measured last time, which is
// what catches a path that grew without crossing its budget.
//
// Usage:
//   tsx scripts/wallet_memory_bench.mts              # measure and compare
//   tsx scripts/wallet_memory_bench.mts --report     # measure only
//   tsx scripts/wallet_memory_bench.mts --accept     # record a new baseline
//   tsx scripts/wallet_memory_bench.mts --tolerance 2.0

import { spawnSync } from 'node:child_process';
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

type Kind = 'guarded' | 'reference';
type Measurement = { kind: Kind; bytes: number };
type Baseline = {
  walletSize: number;
  measurements: Record<string, Measurement>;
};

const SCRIPTS_DIR = dirname(fileURLToPath(import.meta.url));
const REPO_DIR = resolve(SCRIPTS_DIR, '..');
const ANDROID_DIR = join(REPO_DIR, 'android');
const BASELINE = join(SCRIPTS_DIR, 'wallet_memory_baseline.json');
const TEST_CLASS = 'org.ZingoLabs.Zingo.WalletFileMemoryTest';

const args = process.argv.slice(2);
const report = args.includes('--report');
const accept = args.includes('--accept');
const toleranceFlag = args.indexOf('--tolerance');
const tolerance = toleranceFlag === -1 ? 1.5 : Number(args[toleranceFlag + 1]);

const isWindows = process.platform === 'win32';
const sdk = process.env.ANDROID_HOME ?? process.env.ANDROID_SDK_ROOT;
const adb = sdk
  ? join(sdk, 'platform-tools', isWindows ? 'adb.exe' : 'adb')
  : 'adb';

const devices = spawnSync(adb, ['devices'], { encoding: 'utf8' }).stdout ?? '';
if (!devices.split('\n').some(line => /\tdevice$/.test(line))) {
  console.error('No device or emulator is attached. Start one and retry.');
  process.exit(1);
}

spawnSync(adb, ['logcat', '-c']);

console.log(`Measuring ${TEST_CLASS} ...`);
const gradle = spawnSync(
  isWindows ? 'gradlew.bat' : './gradlew',
  [
    ':app:connectedProdDebugAndroidTest',
    `-Pandroid.testInstrumentationRunnerArguments.class=${TEST_CLASS}`,
  ],
  { cwd: ANDROID_DIR, stdio: 'inherit', env: process.env },
);
if (gradle.status !== 0) {
  console.error('The measurement run failed. See the gradle output above.');
  process.exit(gradle.status ?? 1);
}

const logcat =
  spawnSync(adb, ['logcat', '-d'], { encoding: 'utf8' }).stdout ?? '';
const measured: Record<string, Measurement> = {};
let walletSize = 0;
for (const line of logcat.split('\n')) {
  const match = line.match(
    /\[memory\] key=(\S+) kind=(\S+) bytes=(\d+) wallet=(\d+)/,
  );
  if (match) {
    const [, key, kind, bytes, wallet] = match;
    measured[key] = { kind: kind as Kind, bytes: Number(bytes) };
    walletSize = Number(wallet);
  }
}

if (Object.keys(measured).length === 0) {
  console.error('The run produced no [memory] lines. Nothing to compare.');
  process.exit(1);
}

if (accept) {
  const recorded: Baseline = { walletSize, measurements: measured };
  writeFileSync(BASELINE, `${JSON.stringify(recorded, undefined, 2)}\n`);
  console.log(
    `\nRecorded ${Object.keys(measured).length} measurements in ${BASELINE}`,
  );
  process.exit(0);
}

const asMib = (bytes: number): string =>
  `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
const baseline: Baseline | undefined =
  !report && existsSync(BASELINE)
    ? (JSON.parse(readFileSync(BASELINE, 'utf8')) as Baseline)
    : undefined;

console.log(`\nWallet size: ${asMib(walletSize)}\n`);
const regressions: {
  key: string;
  before: number;
  bytes: number;
  ratio: number;
}[] = [];
for (const [key, { kind, bytes }] of Object.entries(measured)) {
  const before = baseline?.measurements?.[key]?.bytes;
  let verdict = '';
  if (before !== undefined) {
    const ratio = before === 0 ? 1 : bytes / before;
    verdict = ` (baseline ${asMib(before)}, ${ratio.toFixed(2)}x)`;
    if (kind === 'guarded' && ratio > tolerance) {
      regressions.push({ key, before, bytes, ratio });
    }
  }
  console.log(
    `  ${kind.padEnd(9)} ${key.padEnd(26)} ${asMib(bytes).padStart(9)}${verdict}`,
  );
}

if (report || baseline === undefined) {
  if (baseline === undefined && !report) {
    console.log(`\nNo baseline at ${BASELINE}. Record one with --accept.`);
  }
  process.exit(0);
}

if (regressions.length > 0) {
  console.error(
    `\n${regressions.length} guarded path(s) grew past ${tolerance}x of the baseline:`,
  );
  for (const { key, before, bytes, ratio } of regressions) {
    console.error(
      `  ${key}: ${asMib(before)} to ${asMib(bytes)} (${ratio.toFixed(2)}x)`,
    );
  }
  console.error('\nAccept the change with --accept when it is intended.');
  process.exit(1);
}

console.log('\nEvery guarded path is within tolerance of the baseline.');
