// Promotes a capture bundle to the committed baseline, visual/__baseline__.
//
//   yarn visual:accept              # the CI capture of this branch's latest run
//   yarn visual:accept --run <id>   # a specific Visual review run
//   yarn visual:accept --local      # visual/__current__, rendered on this machine
//
// CI compares every PR against the committed baseline, rendered on the CI
// runner. A baseline rendered elsewhere differs by font hinting and
// anti-aliasing, so the default source is the CI run's own capture: review its
// report, accept, commit visual/__baseline__, push. --local exists for trying
// the harness out; expect CI to flag drift against it.
import { execSync, spawnSync } from 'node:child_process';
import { cpSync, existsSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const dir = dirname(fileURLToPath(import.meta.url));
const baseline = join(dir, '__baseline__');
const args = process.argv.slice(2);
const local = args.includes('--local');
const runFlag = args.indexOf('--run');
const runArg = runFlag === -1 ? undefined : args[runFlag + 1];

const fail = (message: string): never => {
  console.error(message);
  process.exit(1);
};

const git = (cmd: string) =>
  execSync(`git ${cmd}`, { cwd: dir }).toString().trim();

const gh = (ghArgs: string[]) => {
  const out = spawnSync('gh', ghArgs, { encoding: 'utf8' });
  if (out.error) {
    fail('gh CLI not found: install it and run `gh auth login`.');
  }
  if (out.status !== 0) {
    fail(out.stderr || `gh ${ghArgs.join(' ')} failed`);
  }
  return out.stdout;
};

type Run = {
  databaseId: number;
  headSha: string;
  status: string;
  conclusion: string;
};

const latestRun = (): Run => {
  const branch = git('rev-parse --abbrev-ref HEAD');
  const runs = JSON.parse(
    gh([
      'run',
      'list',
      '--workflow',
      'visual-review.yaml',
      '--branch',
      branch,
      '--limit',
      '1',
      '--json',
      'databaseId,headSha,status,conclusion',
    ]),
  ) as Run[];
  if (runs.length === 0) {
    fail(
      `no Visual review run for ${branch}: push the branch and open a PR first.`,
    );
  }
  return runs[0];
};

const promote = (bundle: string, label: string) => {
  if (!existsSync(join(bundle, 'images'))) {
    fail(`${label} has no images/ folder: nothing to accept.`);
  }
  rmSync(baseline, { recursive: true, force: true });
  cpSync(bundle, baseline, { recursive: true });
  console.log(`baseline ← ${label}`);
  console.log('review `git status visual/__baseline__`, then commit and push.');
};

if (local) {
  console.warn('! accepting a local render; CI renders differ, expect drift.');
  promote(join(dir, '__current__'), 'visual/__current__');
} else {
  const run = runArg === undefined ? latestRun() : undefined;
  const runId = runArg ?? String(run!.databaseId);
  if (run) {
    const head = git('rev-parse HEAD');
    if (run.headSha !== head) {
      fail(
        `run ${runId} captured ${run.headSha.slice(0, 9)}, HEAD is ${head.slice(0, 9)}: ` +
          'push and wait for its run, or name one with --run <id>.',
      );
    }
    if (run.status !== 'completed') {
      console.log(`run ${runId} is ${run.status}: watching it.`);
      const watch = spawnSync('gh', ['run', 'watch', runId], {
        stdio: 'inherit',
      });
      if (watch.status !== 0) {
        fail(`watching run ${runId} failed.`);
      }
    }
  }
  const tmp = mkdtempSync(join(tmpdir(), 'visual-head-'));
  gh(['run', 'download', runId, '-n', 'visual-head', '-D', tmp]);
  promote(tmp, `CI run ${runId}`);
  rmSync(tmp, { recursive: true, force: true });
}
