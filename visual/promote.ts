// Turns a capture bundle ({ images/, timelines/, filmstrip/ }) into the
// committed baseline, file by file. A file the gate would pass (an image
// within JITTER_PIXELS, a timeline within TOLERANCE) keeps its baseline, so
// accepting one PR's change never rewrites another story's jitter, and two
// PRs that accept at once only touch the stories they changed.
import { spawnSync } from 'node:child_process';
import {
  cpSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import {
  JITTER_PIXELS,
  TOLERANCE,
  Timeline,
  timelineDeviation,
} from './thresholds';

type RegReport = {
  failedItems: string[];
  newItems: string[];
  deletedItems: string[];
};

const copyFile = (from: string, to: string) => {
  mkdirSync(dirname(to), { recursive: true });
  cpSync(from, to);
};

/** Images that differ past the jitter budget, new ones, and deleted ones. */
const promoteImages = (bundle: string, baseline: string) => {
  const cur = join(bundle, 'images');
  const base = join(baseline, 'images');
  if (!existsSync(base)) {
    cpSync(cur, base, { recursive: true });
    return;
  }
  const work = mkdtempSync(join(tmpdir(), 'visual-promote-'));
  const json = join(work, 'report.json');
  // reg-cli through node, by its script, so it runs on every OS. The
  // baseline sits at visual/__baseline__, two levels under the repo root.
  spawnSync(
    process.execPath,
    [
      join(baseline, '..', '..', 'node_modules', 'reg-cli', 'dist', 'cli.js'),
      cur,
      base,
      join(work, 'diff'),
      '-J',
      json,
      '-S',
      String(JITTER_PIXELS),
    ],
    { stdio: 'inherit' },
  );
  if (!existsSync(json)) {
    rmSync(work, { recursive: true, force: true });
    throw new Error('reg-cli wrote no report: the baseline is left as it was.');
  }
  const report = JSON.parse(readFileSync(json, 'utf8')) as RegReport;
  for (const item of [...report.failedItems, ...report.newItems]) {
    copyFile(join(cur, item), join(base, item));
  }
  for (const item of report.deletedItems) {
    rmSync(join(base, item), { force: true });
  }
  rmSync(work, { recursive: true, force: true });
};

/** Timelines past the tolerance, with their filmstrips; stale ones go. */
const promoteTimelines = (bundle: string, baseline: string) => {
  const cur = join(bundle, 'timelines');
  const base = join(baseline, 'timelines');
  const files = existsSync(cur)
    ? readdirSync(cur).filter(f => f.endsWith('.timeline.json'))
    : [];
  const read = (path: string) =>
    JSON.parse(readFileSync(path, 'utf8')) as Timeline;
  for (const file of files) {
    const timeline = read(join(cur, file));
    const basePath = join(base, file);
    if (
      existsSync(basePath) &&
      timelineDeviation(timeline, read(basePath)).maxDev <= TOLERANCE
    ) {
      continue;
    }
    copyFile(join(cur, file), basePath);
    const strip = join(baseline, 'filmstrip', timeline.story);
    rmSync(strip, { recursive: true, force: true });
    const fresh = join(bundle, 'filmstrip', timeline.story);
    if (existsSync(fresh)) {
      cpSync(fresh, strip, { recursive: true });
    }
  }
  if (existsSync(base)) {
    for (const file of readdirSync(base)) {
      if (file.endsWith('.timeline.json') && !files.includes(file)) {
        const story = read(join(base, file)).story;
        rmSync(join(base, file), { force: true });
        rmSync(join(baseline, 'filmstrip', story), {
          recursive: true,
          force: true,
        });
      }
    }
  }
};

export const promote = (bundle: string, baseline: string) => {
  promoteImages(bundle, baseline);
  promoteTimelines(bundle, baseline);
};
