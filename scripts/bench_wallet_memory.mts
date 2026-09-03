#!/usr/bin/env tsx
// Measures peak memory of a wallet load and save on a device, per platform,
// and records the rows in docs/benchmarks/wallet-memory.md.
//
// The fixture defaults to zingolib's synced testnet example wallet
// (glory_goddess) inside the cargo checkout that rust/Cargo.lock pins.
//
// Usage: tsx scripts/bench_wallet_memory.mts
//          [--platform android|ios|both]        (default: both)
//          [--fixture <wallet file>]
//          [--simulator <udid>]                 (iOS, default: first booted)
//          [--no-record]                        (print only)

import { execFileSync, spawnSync, type SpawnSyncOptions } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { homedir, tmpdir } from 'node:os';
import { basename, dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

type Platform = 'android' | 'ios' | 'both';

type Args = {
  platform: Platform;
  fixture?: string;
  simulator?: string;
  record: boolean;
};

type AndroidPeak = { nativeHeap: number; javaHeap: number; rss: number };
type IosPeak = { malloc: number; footprint: number };

type Report =
  | { platform: 'android'; fileBytes: number; load: AndroidPeak; save: AndroidPeak; device: string }
  | { platform: 'ios'; fileBytes: number; load: IosPeak; save: IosPeak; device: string };

type SimulatorDevice = { udid: string; name: string; state: string };

const REPO_DIR = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const RESULTS = join(REPO_DIR, 'docs', 'benchmarks', 'wallet-memory.md');
const ANDROID_HOME = process.env.ANDROID_HOME ?? join(homedir(), 'Library', 'Android', 'sdk');
const FIXTURE_TAIL = join(
  'zingolib', 'src', 'wallet', 'disk', 'testing', 'examples', 'testnet', 'glory_goddess', 'latest', 'zingo-wallet.dat',
);

function parseArgs(argv: string[]): Args {
  const args: Args = { platform: 'both', record: true };
  for (let i = 0; i < argv.length; i++) {
    const flag = argv[i];
    if (flag === '--platform') {
      const platform = argv[++i];
      if (platform !== 'android' && platform !== 'ios' && platform !== 'both') {
        console.error(`unknown platform: ${platform}`);
        process.exit(2);
      }
      args.platform = platform;
    } else if (flag === '--fixture') args.fixture = resolve(argv[++i]);
    else if (flag === '--simulator') args.simulator = argv[++i];
    else if (flag === '--no-record') args.record = false;
    else {
      console.error(`unknown flag: ${flag}`);
      process.exit(2);
    }
  }
  return args;
}

function run(cmd: string, cmdArgs: string[], opts: SpawnSyncOptions = {}): void {
  console.log(`$ ${cmd} ${cmdArgs.join(' ')}`);
  const r = spawnSync(cmd, cmdArgs, { stdio: 'inherit', ...opts });
  if (r.status !== 0) {
    console.error(`ERROR: ${cmd} failed (exit ${r.status})`);
    process.exit(r.status ?? 1);
  }
}

function capture(cmd: string, cmdArgs: string[], cwd?: string): string {
  return execFileSync(cmd, cmdArgs, { encoding: 'utf8', cwd }).trim();
}

// The zingolib checkout that the lockfile pins, under ~/.cargo.
function defaultFixture(): string {
  const lock = readFileSync(join(REPO_DIR, 'rust', 'Cargo.lock'), 'utf8');
  const rev = lock.match(/name = "zingolib"\nversion = "[^"]+"\nsource = "git\+[^#]+#([0-9a-f]+)"/)?.[1];
  if (!rev) throw new Error('no zingolib git source in rust/Cargo.lock');
  const checkouts = join(homedir(), '.cargo', 'git', 'checkouts');
  const dirs = capture('sh', ['-c', `ls -d ${checkouts}/zingolib-*/${rev.slice(0, 7)} 2>/dev/null || true`]);
  const dir = dirs.split('\n').filter(Boolean)[0];
  if (!dir) throw new Error(`no cargo checkout for zingolib ${rev.slice(0, 7)}, run cargo fetch in rust/`);
  return join(dir, FIXTURE_TAIL);
}

function mib(bytes: number): string {
  return `${(bytes / 1048576).toFixed(1)} MiB`;
}

function benchAndroid(fixture: string): Report {
  const adb = join(ANDROID_HOME, 'platform-tools', 'adb');
  const remote = '/data/local/tmp/zingo-bench-wallet.dat';
  run(adb, ['push', fixture, remote]);
  run(adb, ['logcat', '-c']);
  run(
    './gradlew',
    [
      ':app:connectedProdDebugAndroidTest',
      '-Pandroid.testInstrumentationRunnerArguments.class=org.ZingoLabs.Zingo.WalletMemoryBenchmark',
      `-Pandroid.testInstrumentationRunnerArguments.fixture=${remote}`,
    ],
    { cwd: join(REPO_DIR, 'android'), env: { ...process.env, ANDROID_HOME } },
  );
  const line = capture(adb, ['logcat', '-d', '-s', 'WalletMemory'])
    .split('\n')
    .map((l) => l.slice(l.indexOf('{')))
    .filter((l) => l.startsWith('{'))
    .pop();
  if (!line) throw new Error('no WalletMemory line in logcat');
  const device = capture(adb, ['shell', 'getprop', 'ro.product.model']);
  return { ...(JSON.parse(line) as Omit<Report & { platform: 'android' }, 'device'>), device };
}

function simulators(): SimulatorDevice[] {
  const list = JSON.parse(capture('xcrun', ['simctl', 'list', 'devices', '-j'])) as {
    devices: Record<string, SimulatorDevice[]>;
  };
  return Object.values(list.devices).flat();
}

function bootedSimulator(): string {
  const booted = simulators().find((d) => d.state === 'Booted');
  if (!booted) throw new Error('no booted simulator, pass --simulator <udid>');
  return booted.udid;
}

function benchIos(fixture: string, simulator?: string): Report {
  const udid = simulator ?? bootedSimulator();
  const scratch = mkdtempSync(join(tmpdir(), 'zingo-bench-'));
  const out = join(scratch, 'wallet-memory.json');
  run(
    'xcodebuild',
    [
      'test',
      '-workspace', 'Zingo.xcworkspace',
      '-scheme', 'Zingo',
      '-sdk', 'iphonesimulator',
      '-configuration', 'Debug',
      '-destination', `platform=iOS Simulator,id=${udid}`,
      '-derivedDataPath', 'build/DerivedData',
      '-only-testing:ZingoTests/WalletMemoryBenchmark',
      '-quiet',
    ],
    {
      cwd: join(REPO_DIR, 'ios'),
      env: { ...process.env, TEST_RUNNER_ZINGO_BENCH_WALLET: fixture, TEST_RUNNER_ZINGO_BENCH_OUT: out },
    },
  );
  if (!existsSync(out)) throw new Error('the iOS benchmark wrote no result, was it skipped?');
  const report = JSON.parse(readFileSync(out, 'utf8')) as Omit<Report & { platform: 'ios' }, 'device'>;
  rmSync(scratch, { recursive: true, force: true });
  const name = simulators().find((d) => d.udid === udid)?.name ?? udid;
  return { ...report, device: `${name} (simulator)` };
}

function row(report: Report, fixture: string): string {
  const commit = capture('git', ['rev-parse', '--short', 'HEAD'], REPO_DIR);
  const date = new Date().toISOString().slice(0, 10);
  const cells =
    report.platform === 'android'
      ? [
          mib(report.load.nativeHeap), mib(report.load.javaHeap), mib(report.load.rss),
          mib(report.save.nativeHeap), mib(report.save.javaHeap), mib(report.save.rss),
        ]
      : [
          mib(report.load.malloc), mib(report.load.footprint),
          mib(report.save.malloc), mib(report.save.footprint),
        ];
  const fixtureName = `${basename(dirname(dirname(fixture)))} ${mib(report.fileBytes)}`;
  return `| ${date} | ${commit} | ${report.device} | ${fixtureName} | ${cells.join(' | ')} |`;
}

// Inserts the row above the platform's marker, at the end of its table.
function record(report: Report, line: string): void {
  const marker = `<!-- ${report.platform} rows -->`;
  const doc = readFileSync(RESULTS, 'utf8');
  const at = doc.indexOf(marker);
  if (at < 0) throw new Error(`${RESULTS} has no ${marker} marker`);
  writeFileSync(RESULTS, `${doc.slice(0, at)}${line}\n${doc.slice(at)}`);
}

const args = parseArgs(process.argv.slice(2));
const fixture = args.fixture ?? defaultFixture();
if (!existsSync(fixture)) throw new Error(`fixture not found: ${fixture}`);
console.log(`fixture: ${fixture}`);

const reports: Report[] = [];
if (args.platform !== 'ios') reports.push(benchAndroid(fixture));
if (args.platform !== 'android') reports.push(benchIos(fixture, args.simulator));

for (const report of reports) {
  const line = row(report, fixture);
  console.log(`${report.platform}: ${line}`);
  if (args.record) record(report, line);
}
