import { test, type Page } from '@playwright/test';
import { writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';

// Two separate passes per animated story, on separate pages so they don't
// perturb each other:
//   - timeline: pure numeric sampling (stroke-dashoffset per tick) → the gate.
//   - filmstrip: frozen frames at a few ticks → display only, for the report.
// Screenshotting during the numeric loop was enough to jitter the samples
// past tolerance, hence the split.

const START = 100;
const END = 1000;
const STEP = 100;
const FRAME_TICKS = [100, 300, 500, 700, 900];
const FRAME_CLIP = { x: 6, y: 6, width: 52, height: 52 };

const out = process.env.VISUAL_OUT ?? join(__dirname, '__current__');
const timelinesDir = join(out, 'timelines');
const filmstripDir = join(out, 'filmstrip');

const animated = [
  { story: 'header-mixneticon--connecting', name: 'connecting' },
  { story: 'header-mixneticon--reconnecting', name: 'reconnecting' },
];

async function openStory(page: Page, story: string) {
  await page.clock.install({ time: 0 });
  await page.goto(`/iframe.html?id=${story}&viewMode=story`);
  await page.locator('#storybook-root').waitFor({ state: 'visible' });
  const rect = page.locator('#storybook-root rect[stroke-dashoffset]').first();
  await rect.waitFor({ state: 'attached' });
  return rect;
}

for (const { story, name } of animated) {
  test(`timeline — ${name}`, async ({ page }) => {
    const rect = await openStory(page, story);
    await page.clock.runFor(START); // skip the startup transient

    const samples: { t: number; offset: number }[] = [];
    for (let t = START; t <= END; t += STEP) {
      samples.push({ t, offset: Number(await rect.getAttribute('stroke-dashoffset')) });
      await page.clock.runFor(STEP);
    }

    mkdirSync(timelinesDir, { recursive: true });
    writeFileSync(
      join(timelinesDir, `${story}.timeline.json`),
      JSON.stringify({ story, step: STEP, samples }, null, 2),
    );
  });

  test(`filmstrip — ${name}`, async ({ page }) => {
    await openStory(page, story);
    const frames = join(filmstripDir, story);
    mkdirSync(frames, { recursive: true });

    let clock = 0;
    for (const tick of FRAME_TICKS) {
      await page.clock.runFor(tick - clock);
      clock = tick;
      await page.screenshot({ path: join(frames, `${tick}.png`), clip: FRAME_CLIP });
    }
  });
}
