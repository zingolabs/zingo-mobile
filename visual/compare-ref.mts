// Compare the working tree against any git ref, locally — the same head-vs-base
// diff the CI runs, but the base is a ref you name.
//
//   yarn visual:compare <ref>     e.g. origin/dev, a tag, a commit sha
//
// Captures the current working tree, then builds+captures <ref> on a detached
// worktree (sharing node_modules), and diffs the two bundles. The ref must
// carry the visual harness; against an older commit that lacks it, every story
// reads as new.
import { spawnSync, execSync } from 'node:child_process';
import { rmSync, existsSync, symlinkSync } from 'node:fs';
import { join } from 'node:path';

const ref = process.argv[2];
if (!ref) {
  console.error('usage: yarn visual:compare <ref>');
  process.exit(2);
}

const repo = execSync('git rev-parse --show-toplevel').toString().trim();
const ci = join(repo, 'visual', '.ci');
const headBundle = join(ci, 'head');
const refBundle = join(ci, 'ref');
const worktree = join(ci, 'worktree');
const report = join(ci, 'index.html');

const run = (
  cmd: string,
  args: string[],
  opts: Parameters<typeof spawnSync>[2] = {},
) => spawnSync(cmd, args, { stdio: 'inherit', cwd: repo, ...opts });

const tolerant = (cmd: string): void => {
  try {
    execSync(cmd, { cwd: repo, stdio: 'ignore' });
  } catch {
    // nothing to clean
  }
};

const snapshot = (out: string, cwd: string) =>
  run('yarn', ['visual:snapshot'], {
    cwd,
    env: { ...process.env, VISUAL_OUT: out },
  });

console.log('› capturing working tree');
rmSync(headBundle, { recursive: true, force: true });
if (snapshot(headBundle, repo).status !== 0) {
  console.error('working-tree capture failed');
  process.exit(1);
}

console.log(`› capturing ${ref}`);
rmSync(refBundle, { recursive: true, force: true });
tolerant(`git worktree remove --force ${worktree}`);
try {
  execSync(`git worktree add --detach --force ${worktree} ${ref}`, {
    cwd: repo,
    stdio: 'inherit',
  });
  if (!existsSync(join(worktree, 'node_modules'))) {
    symlinkSync(join(repo, 'node_modules'), join(worktree, 'node_modules'));
  }
  if (snapshot(refBundle, worktree).status !== 0) {
    console.warn(`! ${ref} has no harness — every story will read as new`);
  }
} finally {
  tolerant(`git worktree remove --force ${worktree}`);
}

console.log(`› diffing working tree vs ${ref}`);
const diff = run('tsx', ['visual/diff.mts'], {
  env: {
    ...process.env,
    VISUAL_CURRENT: headBundle,
    VISUAL_BASELINE: refBundle,
    VISUAL_REPORT: report,
  },
});
console.log(
  `\nreport: ${report}  (open ${join('visual', '.ci', 'index.html')})`,
);
process.exit(diff.status ?? 0);
