import { execFileSync, spawnSync } from 'node:child_process';
import { cpSync, existsSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { RunJob, captureVerdict } from './captureVerdict';

const dir = dirname(fileURLToPath(import.meta.url));
const baseline = join(dir, '__baseline__');

const need = (name: string): string => {
  const value = process.env[name];
  if (value === undefined || value === '') {
    throw new Error(`missing env ${name}`);
  }
  return value;
};

const repo = need('GITHUB_REPOSITORY');
const headSha = need('HEAD_SHA');
const headRef = need('HEAD_REF');
const prNumber = need('PR_NUMBER');
const authorLogin = need('AUTHOR_LOGIN');
const authorId = need('AUTHOR_ID');

const gh = (ghArgs: string[]): string => {
  const out = spawnSync('gh', ghArgs, { encoding: 'utf8' });
  if (out.status !== 0) {
    throw new Error(out.stderr || `gh ${ghArgs.join(' ')} failed`);
  }
  return out.stdout;
};

const ghJson = <T>(path: string): T => JSON.parse(gh(['api', path])) as T;

const ghPost = (path: string, body: unknown) => {
  const tmp = join(mkdtempSync(join(tmpdir(), 'gh-body-')), 'body.json');
  writeFileSync(tmp, JSON.stringify(body));
  gh(['api', '-X', 'POST', path, '--input', tmp]);
  rmSync(dirname(tmp), { recursive: true, force: true });
};

const comment = (bodyText: string) =>
  ghPost(`repos/${repo}/issues/${prNumber}/comments`, { body: bodyText });

const refuse = (message: string): never => {
  comment(message);
  process.exit(1);
};

type Runs = { workflow_runs: { id: number; head_sha: string; status: string }[] };
const runs = ghJson<Runs>(
  `repos/${repo}/actions/workflows/visual-review.yaml/runs?head_sha=${headSha}&per_page=20`,
);
const run = runs.workflow_runs.find(r => r.status === 'completed');
if (run === undefined) {
  refuse(
    'No finished visual review yet. Wait for the check, then run the command again.',
  );
}

const { jobs } = ghJson<{ jobs: RunJob[] }>(
  `repos/${repo}/actions/runs/${run!.id}/jobs`,
);
const verdict = captureVerdict(jobs);
if (verdict.kind === 'notCaptured') {
  refuse(
    'The visual capture did not complete on this commit. Wait for a green capture, then run the command again.',
  );
}

const tmp = mkdtempSync(join(tmpdir(), 'visual-head-'));
gh(['run', 'download', String(run!.id), '-n', 'visual-head', '-D', tmp]);
if (!existsSync(join(tmp, 'images'))) {
  refuse(`Run ${run!.id} has no images to accept.`);
}
rmSync(baseline, { recursive: true, force: true });
cpSync(tmp, baseline, { recursive: true });
rmSync(tmp, { recursive: true, force: true });

const git = (args: string[]) =>
  execFileSync('git', args, { encoding: 'utf8' }).trim();

git(['config', 'user.name', 'visual-review-bot']);
git(['config', 'user.email', 'visual-review-bot@users.noreply.github.com']);
git(['add', 'visual/__baseline__']);

const staged = spawnSync('git', ['diff', '--cached', '--quiet']).status;
if (staged === 0) {
  comment('The baseline already matches this run. Nothing to accept.');
  process.exit(0);
}

const coauthor = `Co-authored-by: ${authorLogin} <${authorId}+${authorLogin}@users.noreply.github.com>`;
git(['commit', '-m', `test(visual): accept baseline (PR #${prNumber})`, '-m', coauthor]);
git(['push', 'origin', `HEAD:${headRef}`]);
const newSha = git(['rev-parse', 'HEAD']);

ghPost(`repos/${repo}/check-runs`, {
  name: 'Visual review',
  head_sha: newSha,
  status: 'completed',
  conclusion: 'success',
  output: {
    title: 'Baseline accepted',
    summary: `Baseline accepted via \`/visual-accept\` by @${authorLogin}.`,
  },
});

comment(
  `Baseline accepted from run \`${run!.id}\` and pushed. The Visual review check is green.`,
);
