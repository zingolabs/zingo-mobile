import { test } from '@playwright/test';
import { readFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';

type Entry = {
  type: string;
  id: string;
  name: string;
  title: string;
  tags?: string[];
};

const indexPath = join(__dirname, '../storybook-static/index.json');
const entries = Object.values(
  (JSON.parse(readFileSync(indexPath, 'utf8')).entries ?? {}) as Record<
    string,
    Entry
  >,
).filter(e => e.type === 'story');

// A capture writes a self-contained bundle to VISUAL_OUT (images/, plus
// timelines/ and filmstrip/ from the timeline spec). CI points head and base
// at different bundles; local defaults to __current__.
const out = process.env.VISUAL_OUT ?? join(__dirname, '__current__');
const imagesDir = join(out, 'images');
mkdirSync(imagesDir, { recursive: true });
const shot = (id: string, state: string) => join(imagesDir, `${id}__${state}.png`);

// Fake-clock milliseconds stepped before a screenshot: long enough for a
// sheet to finish presenting, and the fixed tick every loop is caught on.
const FRAME = 1200;
// Fake-clock milliseconds for hover/press feedback to settle.
const FEEDBACK = 200;
// CSS animations and transitions run on real time, not the fake clock, so
// the screenshot freezes them (finite ones jump to their end state) and
// hides the text caret, whose blink is real time too.
const still = { animations: 'disabled', caret: 'hide' } as const;

for (const entry of entries) {
  test(`${entry.title} — ${entry.name}`, async ({ page }) => {
    // Fake clock, paused from before the page loads, so any RN Animated loop
    // lands on a fixed frame — animated stories screenshot deterministically
    // instead of catching a random tick. Pausing first also keeps a slow
    // runner's load time from running the clock past the frame.
    await page.clock.install({ time: 0 });
    await page.clock.pauseAt(0);
    await page.goto(`/iframe.html?id=${entry.id}&viewMode=story`);
    const root = page.locator('#storybook-root');
    await root.waitFor({ state: 'visible' });
    // Animated stories are owned by mixnet-timeline.spec (numeric gate +
    // filmstrip); nothing here to pixel-diff for them.
    if (entry.tags?.includes('animated')) return;

    // Fonts and layout observers run on real time, outside the fake clock.
    // Let them land first, so every animation they trigger (a sheet
    // presenting after its measurement) plays inside the stepped window
    // below instead of racing the screenshot.
    await page.evaluate('document.fonts.ready');
    await page.waitForTimeout(250);
    await page.clock.runFor(FRAME); // one fixed frame for any incidental motion
    await page.screenshot({ path: shot(entry.id, 'default'), ...still });

    // The `static` tag skips the interaction pass for modal-sheet stories, whose backdrop swallows pointer events.
    if (entry.tags?.includes('static')) return;

    // Interaction states, only where the story renders something pressable.
    // The clock stays paused, so the feedback (RN Animated opacity) is
    // stepped the same way, not waited for on real time.
    const pressable = root.getByRole('button').first();
    if ((await pressable.count()) === 0) return;

    await pressable.hover();
    await page.clock.runFor(FEEDBACK);
    await page.screenshot({ path: shot(entry.id, 'hover'), ...still });

    const box = await pressable.boundingBox();
    if (!box) return;
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await page.mouse.down();
    await page.clock.runFor(FEEDBACK); // active opacity settles
    await page.screenshot({ path: shot(entry.id, 'press'), ...still });
    await page.mouse.up();
  });
}
