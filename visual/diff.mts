// Diffs current captures against baseline and gates on any change (images
// via reg-cli, animations via the numeric timeline). Writes one page,
// index.html: the animation section (replays, curve overlay, filmstrip) on
// top, the reg-cli image report embedded in an iframe below.
import { spawnSync } from 'node:child_process';
import {
  readdirSync,
  readFileSync,
  existsSync,
  writeFileSync,
  mkdirSync,
} from 'node:fs';
import { join, dirname, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { advancedTokens } from '@app/theme/tokens';

type Sample = { t: number; offset: number };
type Timeline = { story: string; step: number; samples: Sample[] };
type Verdict = 'new' | 'pass' | 'changed';
type Entry = {
  file: string;
  story: string;
  verdict: Verdict;
  maxDev: number;
  at: number;
  cur: Timeline;
  base?: Timeline;
};

const dir = dirname(fileURLToPath(import.meta.url));
// Two capture bundles to compare. Local defaults; CI sets these to the head
// and base builds. Each bundle is { images/, timelines/, filmstrip/ }.
const currentDir = process.env.VISUAL_CURRENT ?? join(dir, '__current__');
const baselineDir = process.env.VISUAL_BASELINE ?? join(dir, '__baseline__');
const indexPage = process.env.VISUAL_REPORT ?? join(dir, 'index.html');
// Optional URL (relative to the report) of the current interactive Storybook.
// When set, the report gains a "Current" tab that embeds it — the browse view
// for a designer. Omitted locally where there's nothing to embed.
const storybookUrl = process.env.VISUAL_STORYBOOK;
const reportDir = dirname(indexPage);
const diffDir = join(reportDir, '__diff__');
const regReport = join(reportDir, 'report.html');
mkdirSync(reportDir, { recursive: true });

// A local-only styled variant driven by the app design tokens. `yarn
// visual:styled` sets this; the default gating report stays plain. The palette
// feeds both the CSS vars (report.css) and the generated SVG colours below.
const styled = process.env.VISUAL_STYLE === 'tokens';
const T = advancedTokens;
const palette = styled
  ? {
      bg: T.bgCanvas, surface: T.bgSurface, border: T.bottomSheetBorder,
      fg: T.fgDefault, muted: T.fgMuted, figcap: T.fgMuted, accent: T.fgAccent,
      passBg: T.bgSecondaryDisabled, passFg: T.fgAccent,
      newBg: T.bottomSheetBorder, newFg: T.fgDefault,
      dangerBg: T.bgWarning, dangerFg: T.fgDanger,
    }
  : {
      bg: '#060b12', surface: '#0d1520', border: '#1c2634',
      fg: '#e6edf3', muted: '#8b98a5', figcap: '#6b7684', accent: '#07ff94',
      passBg: '#123524', passFg: '#3fb950',
      newBg: '#1c2a3a', newFg: '#58a6ff',
      dangerBg: '#3d1d1d', dangerFg: '#ff7b72',
    };
const ACCENT = palette.accent;
const MUTED = styled ? T.fgMuted : '#5b6b7f';
const CHART_BG = styled ? T.bgCanvas : '#0b1220';
const reportSrc = join(dir, 'report');

const TOLERANCE = 2; // px; above run-to-run jitter, below a real curve change

// MixnetIcon halo geometry, mirrored so a replay draws the same arc.
const SIDE = 20;
const RADIUS = 6;
const PERIMETER = 4 * (SIDE - 2 * RADIUS) + 2 * Math.PI * RADIUS;
const LIT_ARC = PERIMETER * 0.32;

// Pixels a pair may differ by and still pass. A long linear animation (the
// 8s quote ring) lands a frame apart between two runs of the same machine,
// about 40 anti-aliased pixels on a 1.5M-pixel capture. A real change to
// even a small icon is hundreds. The budget sits between.
const JITTER_PIXELS = 100;

// --- image gate: reg-cli exits nonzero when a pair differs. A story with
// no baseline, or a baseline with no story, fails too: the committed
// baseline must cover exactly the stories that exist.
const regBin = join(dir, '..', 'node_modules', '.bin', 'reg-cli');
const regJson = join(reportDir, 'report.json'); // reg-cli's json, out of the repo root
const reg = spawnSync(
  regBin,
  [
    join(currentDir, 'images'),
    join(baselineDir, 'images'),
    diffDir,
    '-R',
    regReport,
    '-J',
    regJson,
    '-S',
    String(JITTER_PIXELS),
  ],
  { stdio: 'inherit' },
);
const regResult = JSON.parse(readFileSync(regJson, 'utf8')) as {
  newItems: string[];
  deletedItems: string[];
};
const imagesChanged =
  reg.status !== 0 ||
  regResult.newItems.length > 0 ||
  regResult.deletedItems.length > 0;

// --- timeline gate ---
const readSamples = (path: string): Timeline =>
  JSON.parse(readFileSync(path, 'utf8')) as Timeline;
const curTimelines = join(currentDir, 'timelines');
const timelineFiles = existsSync(curTimelines)
  ? readdirSync(curTimelines).filter(f => f.endsWith('.timeline.json'))
  : [];

const timelines: Entry[] = timelineFiles.map(file => {
  const cur = readSamples(join(curTimelines, file));
  const basePath = join(baselineDir, 'timelines', file);
  if (!existsSync(basePath)) {
    return { file, story: cur.story, verdict: 'new', maxDev: 0, at: 0, cur };
  }
  const base = readSamples(basePath);
  let maxDev = 0;
  let at = 0;
  const n = Math.min(cur.samples.length, base.samples.length);
  for (let i = 0; i < n; i += 1) {
    const d = Math.abs(cur.samples[i].offset - base.samples[i].offset);
    if (d > maxDev) {
      maxDev = d;
      at = cur.samples[i].t;
    }
  }
  const verdict: Verdict = maxDev > TOLERANCE ? 'changed' : 'pass';
  return { file, story: cur.story, verdict, maxDev, at, cur, base };
});

// A baseline timeline whose story no longer captures is stale.
const baseTimelines = join(baselineDir, 'timelines');
const staleTimelines = existsSync(baseTimelines)
  ? readdirSync(baseTimelines).filter(
      f => f.endsWith('.timeline.json') && !timelineFiles.includes(f),
    )
  : [];
const timelineChanged =
  timelines.some(t => t.verdict !== 'pass') || staleTimelines.length > 0;

// --- unified report (optional Current tab + animation + image tabs) ---
writeFileSync(
  indexPage,
  renderReport(timelines, imagesChanged, timelineChanged, storybookUrl),
);

// --- summary + gate ---
for (const t of timelines) {
  const tag =
    t.verdict === 'changed' ? 'CHANGED' : t.verdict === 'new' ? 'new' : 'pass';
  console.log(
    `timeline: ${t.story} — ${tag}` +
      (t.verdict === 'changed' ? `, max Δ ${t.maxDev.toFixed(2)}px @ ${t.at}ms` : ''),
  );
}
for (const f of staleTimelines) {
  console.log(`timeline: ${f} — DELETED (baseline has no matching story)`);
}
console.log(`report: ${indexPage}`);
console.log(
  `\nGATE: images ${imagesChanged ? 'CHANGED' : 'pass'}, timelines ${
    timelineChanged ? 'CHANGED' : 'pass'
  }`,
);
const changed = imagesChanged || timelineChanged;
writeFileSync(
  join(reportDir, 'status.json'),
  JSON.stringify({ status: changed ? 'changed' : 'matches' }),
);
process.exit(changed ? 1 : 0);

// ---------------------------------------------------------------------------

function curveSvg(base: Timeline | undefined, cur: Timeline): string {
  const W = 320;
  const H = 120;
  const pad = 12;
  const series = [base, cur].filter((s): s is Timeline => Boolean(s));
  const ts = series.flatMap(s => s.samples.map(p => p.t));
  const os = series.flatMap(s => s.samples.map(p => p.offset));
  const tMin = Math.min(...ts);
  const tMax = Math.max(...ts);
  const oMin = Math.min(...os);
  const oMax = Math.max(...os);
  const x = (t: number) => pad + ((t - tMin) / (tMax - tMin || 1)) * (W - 2 * pad);
  const y = (o: number) => pad + ((o - oMax) / (oMin - oMax || 1)) * (H - 2 * pad);
  const line = (s: Timeline, color: string, dash: boolean) =>
    `<polyline fill="none" stroke="${color}" stroke-width="2"${
      dash ? ` stroke-dasharray="4 3"` : ''
    } points="${s.samples.map(p => `${x(p.t)},${y(p.offset)}`).join(' ')}" />`;
  return `<svg viewBox="0 0 ${W} ${H}" width="${W}" height="${H}">
    <rect width="${W}" height="${H}" fill="${CHART_BG}" rx="6" />
    ${base ? line(base, MUTED, true) : ''}
    ${line(cur, ACCENT, false)}
  </svg>`;
}

function filmstripRow(label: string, story: string, kind: 'current' | 'baseline'): string {
  const frameDir = join(kind === 'current' ? currentDir : baselineDir, 'filmstrip', story);
  if (!existsSync(frameDir)) {
    return `<div class="row"><span class="lbl">${label}</span><em>—</em></div>`;
  }
  const frames = readdirSync(frameDir)
    .filter(f => f.endsWith('.png'))
    .sort((a, b) => parseInt(a) - parseInt(b));
  const imgs = frames
    .map(f => {
      const src = relative(reportDir, join(frameDir, f));
      return `<figure><img src="${src}" /><figcaption>${parseInt(f)}ms</figcaption></figure>`;
    })
    .join('');
  return `<div class="row"><span class="lbl">${label}</span>${imgs}</div>`;
}

// One arc, replaying its captured offsets over a fixed 2s loop. Same loop
// duration for both series, so a faster animation visibly pulls ahead.
function replayArc(samples: Sample[], color: string): string {
  const t0 = samples[0].t;
  const span = samples[samples.length - 1].t - t0 || 1;
  const values = samples.map(s => s.offset).join(';');
  const keyTimes = samples.map(s => ((s.t - t0) / span).toFixed(3)).join(';');
  return `<rect x="1" y="1" width="${SIDE}" height="${SIDE}" rx="${RADIUS}" ry="${RADIUS}"
      fill="none" stroke="${color}" stroke-width="2" stroke-linecap="round"
      stroke-dasharray="${LIT_ARC.toFixed(2)} ${(PERIMETER - LIT_ARC).toFixed(2)}"
      stroke-dashoffset="${samples[0].offset}">
      <animate attributeName="stroke-dashoffset" values="${values}"
        keyTimes="${keyTimes}" dur="2s" repeatCount="indefinite" />
    </rect>`;
}

function replaySvg(...arcs: string[]): string {
  return `<svg viewBox="0 0 22 22" width="72" height="72" class="replay">${arcs.join('')}</svg>`;
}

function replays(t: Entry): string {
  const cur = replaySvg(replayArc(t.cur.samples, ACCENT));
  if (!t.base) {
    return `<figure>${cur}<figcaption>current</figcaption></figure>`;
  }
  const base = replaySvg(replayArc(t.base.samples, MUTED));
  const overlay = replaySvg(
    replayArc(t.base.samples, MUTED),
    replayArc(t.cur.samples, ACCENT),
  );
  // Separate replays kept alongside the overlay so you can read each alone.
  return `<figure>${base}<figcaption>baseline</figcaption></figure>
    <figure>${cur}<figcaption>current</figcaption></figure>
    <figure>${overlay}<figcaption>overlay</figcaption></figure>`;
}

function renderReport(
  entries: Entry[],
  imagesChangedFlag: boolean,
  timelineChangedFlag: boolean,
  storybook?: string,
): string {
  const cards = entries
    .map(t => {
      const badge =
        t.verdict === 'changed'
          ? `<span class="badge changed">CHANGED · Δ ${t.maxDev.toFixed(
              1,
            )}px @ ${t.at}ms</span>`
          : `<span class="badge ${t.verdict}">${t.verdict}</span>`;
      return `<section class="card">
        <header><h2>${t.story}</h2>${badge}</header>
        <div class="replays">${replays(t)}</div>
        <div class="curve">${curveSvg(t.base, t.cur)}
          <p class="legend"><span class="s base">— baseline</span> <span class="s cur">— current</span></p>
        </div>
        <div class="strip">
          ${filmstripRow('before', t.story, 'baseline')}
          ${filmstripRow('after', t.story, 'current')}
        </div>
      </section>`;
    })
    .join('');
  const animStatus: 'pass' | 'fail' = timelineChangedFlag ? 'fail' : 'pass';
  const imgStatus: 'pass' | 'fail' = imagesChangedFlag ? 'fail' : 'pass';
  // Open on a failing tab so a change is never a click away; otherwise land on
  // Current (the browse view) when present, else Animations.
  const first = timelineChangedFlag
    ? 'animations'
    : imagesChangedFlag
      ? 'images'
      : storybook
        ? 'current'
        : 'animations';
  const stat = (s: 'pass' | 'fail') =>
    `<span class="tstat ${s}">${s === 'fail' ? 'CHANGED' : 'pass'}</span>`;
  const currentTab = storybook
    ? `<button class="tab" data-tab="current">Current</button>`
    : '';
  const currentPanel = storybook
    ? `<div class="panel" id="current"><iframe src="${storybook}"></iframe></div>`
    : '';
  const tabs = [
    currentTab,
    `<button class="tab" data-tab="animations">Animations ${stat(animStatus)}</button>`,
    `<button class="tab" data-tab="images">Image diffs ${stat(imgStatus)}</button>`,
  ].join('');
  const panels = [
    currentPanel,
    `<div class="panel" id="animations">${cards || '<p>No animated stories.</p>'}</div>`,
    `<div class="panel ${styled ? 'viewer' : 'iframe'}" id="images">${
      styled ? imagePanel() : '<iframe src="report.html"></iframe>'
    }</div>`,
  ].join('\n  ');
  const styles =
    rootVars() + '\n' + readFileSync(join(reportSrc, 'report.css'), 'utf8');
  const script = readFileSync(join(reportSrc, 'report.js'), 'utf8');
  const tpl = readFileSync(join(reportSrc, 'report.html'), 'utf8');
  // Function replacers so `$` in the assets is never read as a replace pattern.
  return tpl
    .replace('{{styles}}', () => styles)
    .replace('{{first}}', () => first)
    .replace('{{tabs}}', () => tabs)
    .replace('{{panels}}', () => panels)
    .replace('{{script}}', () => script);
}

// The palette maps to the CSS custom properties report.css reads.
function rootVars(): string {
  const p = palette;
  return `:root{--bg:${p.bg};--surface:${p.surface};--border:${p.border};--fg:${p.fg};--muted:${p.muted};--figcap:${p.figcap};--accent:${p.accent};--pass-bg:${p.passBg};--pass-fg:${p.passFg};--new-bg:${p.newBg};--new-fg:${p.newFg};--danger-bg:${p.dangerBg};--danger-fg:${p.dangerFg}}`;
}

type RegReport = {
  failedItems: string[];
  newItems: string[];
  deletedItems: string[];
  passedItems: string[];
  actualDir: string;
  expectedDir: string;
  diffDir: string;
};

function slug(f: string): string {
  return f.replace(/[^\w]+/g, '-').replace(/^-|-$/g, '');
}

type NavLeaf = { label: string; id: string; cls: string; rank: number };
type NavNode = { dirs: Map<string, NavNode>; leaves: NavLeaf[] };

// Builds the left-nav file tree from reg item names. A name is the Storybook id
// `section-component--story__step.png`; the dash-separated head becomes folders,
// the story__step tail a leaf. Failing branches and leaves sort first.
function tree(entries: { f: string; cls: string; rank: number }[]): string {
  const root: NavNode = { dirs: new Map(), leaves: [] };
  for (const e of entries) {
    const base = e.f.replace(/\.png$/i, '');
    const dd = base.indexOf('--');
    const head = dd >= 0 ? base.slice(0, dd) : base;
    const tail = dd >= 0 ? base.slice(dd + 2) : '';
    const segs = head.split('-');
    const label = (tail || segs[segs.length - 1]).replace(/__/g, ' · ');
    let node = root;
    for (const s of segs) {
      let next = node.dirs.get(s);
      if (!next) {
        next = { dirs: new Map(), leaves: [] };
        node.dirs.set(s, next);
      }
      node = next;
    }
    node.leaves.push({ label, id: slug(e.f), cls: e.cls, rank: e.rank });
  }
  const nodeRank = (n: NavNode): number => {
    let r = 9;
    for (const l of n.leaves) r = Math.min(r, l.rank);
    for (const [, c] of n.dirs) r = Math.min(r, nodeRank(c));
    return r;
  };
  const render = (n: NavNode, depth: number): string => {
    const dirs = [...n.dirs.entries()].sort(
      (a, b) => nodeRank(a[1]) - nodeRank(b[1]) || a[0].localeCompare(b[0]),
    );
    const leaves = [...n.leaves].sort(
      (a, b) => a.rank - b.rank || a.label.localeCompare(b.label),
    );
    const dirsHtml = dirs
      .map(
        ([name, c]) =>
          `<details open><summary>${name}</summary>${render(c, depth + 1)}</details>`,
      )
      .join('');
    const leavesHtml = leaves
      .map(
        x =>
          `<a class="navitem ${x.cls}" href="#${x.id}"><span class="dot"></span><span class="navname">${x.label}</span></a>`,
      )
      .join('');
    const inner = dirsHtml + leavesHtml;
    return depth === 0 ? inner : `<div class="branch">${inner}</div>`;
  };
  return `<div class="branch">${render(root, 0)}</div>`;
}

// Renders the image diffs from reg-cli's report.json rather than embedding its
// page: a left nav, a layout switch and baseline/current/diff tiles per story.
// Failing rows come first; the nav and rows share the same order.
function imagePanel(): string {
  const rj = JSON.parse(
    readFileSync(join(reportDir, 'report.json'), 'utf8'),
  ) as RegReport;
  const src = (d: string, f: string) => `${d}/${f}`.replace(/^\.\//, '');
  const tile = (label: string, d: string, f: string) =>
    `<figure class="tile"><figcaption>${label}</figcaption><img class="zoom" loading="lazy" src="${src(d, f)}"></figure>`;
  const row = (f: string, badge: string, cls: string, tiles: string) =>
    `<div class="imgrow" id="${slug(f)}"><div class="imghd"><a class="anchor" href="#${slug(f)}" title="link">#</a><span class="name" title="${f}">${f}</span><span class="badge ${cls}">${badge}</span></div><div class="tiles">${tiles}</div></div>`;
  const groups = [
    {
      items: rj.failedItems, badge: 'CHANGED', cls: 'changed',
      tiles: (f: string) =>
        tile('baseline', rj.expectedDir, f) +
        tile('current', rj.actualDir, f) +
        tile('diff', rj.diffDir, f),
    },
    {
      items: rj.deletedItems, badge: 'DELETED', cls: 'changed',
      tiles: (f: string) => tile('baseline', rj.expectedDir, f),
    },
    {
      items: rj.newItems, badge: 'NEW', cls: 'new',
      tiles: (f: string) => tile('current', rj.actualDir, f),
    },
  ];
  const rows = groups
    .flatMap(g => g.items.map(f => row(f, g.badge, g.cls, g.tiles(f))))
    .join('');
  // Nav is a file tree keyed on the Storybook id: `section-component--story`.
  // Failing branches and leaves sort first (rank 0 changed/deleted, 2 new).
  const entries = groups.flatMap(g =>
    g.items.map(f => ({ f, cls: g.cls, rank: g.cls === 'new' ? 2 : 0 })),
  );
  const nav = entries.length ? tree(entries) : '<p class="navempty">no diffs</p>';
  const passed = rj.passedItems.length
    ? `<div class="imgbar"><span class="passline">${rj.passedItems.length} unchanged</span></div>`
    : '';
  return `<aside class="imgnav">${nav}</aside>
    <div class="imgmain">
      ${passed}
      <div class="imgviewer">${rows || '<p>No image differences.</p>'}</div>
    </div>
    <div class="lightbox" id="lb"><div class="lb-bg"></div><img alt=""></div>`;
}
