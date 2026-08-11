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
const reportDir = dirname(indexPage);
const diffDir = join(reportDir, '__diff__');
const regReport = join(reportDir, 'report.html');
mkdirSync(reportDir, { recursive: true });

const TOLERANCE = 2; // px; above run-to-run jitter, below a real curve change

// MixnetIcon halo geometry, mirrored so a replay draws the same arc.
const SIDE = 20;
const RADIUS = 6;
const PERIMETER = 4 * (SIDE - 2 * RADIUS) + 2 * Math.PI * RADIUS;
const LIT_ARC = PERIMETER * 0.32;

// --- image gate: reg-cli exits nonzero when anything differs ---
const regBin = join(dir, '..', 'node_modules', '.bin', 'reg-cli');
const reg = spawnSync(
  regBin,
  [
    join(currentDir, 'images'),
    join(baselineDir, 'images'),
    diffDir,
    '-R',
    regReport,
    '-J',
    join(reportDir, 'report.json'), // keep reg-cli's json out of the repo root
  ],
  { stdio: 'inherit' },
);
const imagesChanged = reg.status !== 0;

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

const timelineChanged = timelines.some(t => t.verdict === 'changed');

// --- unified report (animation tab + embedded image report tab) ---
writeFileSync(indexPage, renderReport(timelines, imagesChanged, timelineChanged));

// --- summary + gate ---
for (const t of timelines) {
  const tag =
    t.verdict === 'changed' ? 'CHANGED' : t.verdict === 'new' ? 'new' : 'pass';
  console.log(
    `timeline: ${t.story} — ${tag}` +
      (t.verdict === 'changed' ? `, max Δ ${t.maxDev.toFixed(2)}px @ ${t.at}ms` : ''),
  );
}
console.log(`report: ${indexPage}`);
console.log(
  `\nGATE: images ${imagesChanged ? 'CHANGED' : 'pass'}, timelines ${
    timelineChanged ? 'CHANGED' : 'pass'
  }`,
);
process.exit(imagesChanged || timelineChanged ? 1 : 0);

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
    <rect width="${W}" height="${H}" fill="#0b1220" rx="6" />
    ${base ? line(base, '#5b6b7f', true) : ''}
    ${line(cur, '#07ff94', false)}
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
  const cur = replaySvg(replayArc(t.cur.samples, '#07ff94'));
  if (!t.base) {
    return `<figure>${cur}<figcaption>current</figcaption></figure>`;
  }
  const base = replaySvg(replayArc(t.base.samples, '#5b6b7f'));
  const overlay = replaySvg(
    replayArc(t.base.samples, '#5b6b7f'),
    replayArc(t.cur.samples, '#07ff94'),
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
  // Open on a failing tab so a change is never a click away.
  const first = timelineChangedFlag
    ? 'animations'
    : imagesChangedFlag
      ? 'images'
      : 'animations';
  const stat = (s: 'pass' | 'fail') =>
    `<span class="tstat ${s}">${s === 'fail' ? 'CHANGED' : 'pass'}</span>`;
  return `<!doctype html><meta charset="utf8"><title>visual review</title>
  <style>
    *{box-sizing:border-box}
    body{background:#060b12;color:#e6edf3;font:14px system-ui,sans-serif;margin:0;height:100vh;display:flex;flex-direction:column;overflow:hidden}
    .tabs{flex:none;display:flex;gap:4px;padding:10px 16px 0;border-bottom:1px solid #1c2634}
    .tab{background:none;border:0;color:#8b98a5;font:inherit;padding:8px 14px;border-radius:8px 8px 0 0;cursor:pointer;display:flex;gap:8px;align-items:center}
    .tab.current{background:#0d1520;color:#e6edf3;border:1px solid #1c2634;border-bottom-color:#0d1520;margin-bottom:-1px}
    .tstat{font-size:11px;padding:1px 7px;border-radius:999px}
    .tstat.pass{background:#123524;color:#3fb950}
    .tstat.fail{background:#3d1d1d;color:#ff7b72}
    .panel{flex:1;display:none;min-height:0}
    .panel.current{display:flex;flex-direction:column}
    #animations.current{display:block;overflow:auto;padding:20px}
    #images{overflow:hidden}
    #images iframe{flex:1;width:100%;border:0;background:#fff}
    .card{background:#0d1520;border:1px solid #1c2634;border-radius:10px;padding:16px;margin-bottom:16px}
    .card header{display:flex;align-items:center;gap:12px;margin-bottom:12px}
    h2{font-size:15px;margin:0;font-weight:600}
    .badge{font-size:12px;padding:2px 8px;border-radius:999px}
    .badge.pass{background:#123524;color:#3fb950}
    .badge.new{background:#1c2a3a;color:#58a6ff}
    .badge.changed{background:#3d1d1d;color:#ff7b72}
    .replays{display:flex;gap:20px;margin-bottom:14px}
    .replay{background:#060b12;border:1px solid #1c2634;border-radius:6px}
    .curve{display:flex;align-items:center;gap:16px;margin-bottom:12px}
    .legend .s{margin-right:12px;font-size:12px}
    .legend .base{color:#5b6b7f}.legend .cur{color:#07ff94}
    figure{margin:0;text-align:center}
    .strip figure img{width:52px;height:52px;image-rendering:pixelated;border:1px solid #1c2634;border-radius:4px;background:#060b12}
    figcaption{font-size:10px;color:#6b7684;margin-top:4px}
    .row{display:flex;align-items:center;gap:8px;margin:4px 0}
    .lbl{width:56px;color:#8b98a5;font-size:12px}
  </style>
  <nav class="tabs">
    <button class="tab" data-tab="animations">Animations ${stat(animStatus)}</button>
    <button class="tab" data-tab="images">Image diffs ${stat(imgStatus)}</button>
  </nav>
  <div class="panel" id="animations">${cards || '<p>No animated stories.</p>'}</div>
  <div class="panel" id="images"><iframe src="report.html"></iframe></div>
  <script>
    const show = name => {
      for (const p of document.querySelectorAll('.panel')) p.classList.toggle('current', p.id === name);
      for (const b of document.querySelectorAll('.tab')) b.classList.toggle('current', b.dataset.tab === name);
    };
    for (const b of document.querySelectorAll('.tab')) b.onclick = () => show(b.dataset.tab);
    show(${JSON.stringify(first)});
  </script>`;
}
