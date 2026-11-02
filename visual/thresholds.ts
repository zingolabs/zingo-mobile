// What the gate counts as the same capture. diff.mts fails a PR above these,
// and promote.mts keeps the committed baseline at or below them, so jitter
// never rewrites a baseline file.

/** px a timeline sample may move; above run-to-run jitter, below a real curve change. */
export const TOLERANCE = 2;

// Pixels a pair may differ by and still pass. A long linear animation (the
// 8s quote ring) lands a frame apart between two runs of the same machine,
// about 40 anti-aliased pixels on a 1.5M-pixel capture. A real change to
// even a small icon is hundreds. The budget sits between.
export const JITTER_PIXELS = 100;

export type Sample = { t: number; offset: number };
export type Timeline = { story: string; step: number; samples: Sample[] };

/** The largest move between two timelines, and the tick it happens at. */
export const timelineDeviation = (cur: Timeline, base: Timeline) => {
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
  return { maxDev, at };
};
