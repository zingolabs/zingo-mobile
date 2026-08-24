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

    await page.clock.runFor(600); // fixed frame for any incidental motion
    await page.waitForTimeout(250); // real settle for fonts/svg paint
    await page.screenshot({ path: shot(entry.id, 'default') });

    // The `static` tag skips the interaction pass for modal-sheet stories, whose backdrop swallows pointer events.
    if (entry.tags?.includes('static')) return;

    // Interaction states, only where the story renders something pressable.
    const pressable = root.getByRole('button').first();
    if ((await pressable.count()) === 0) return;

    await pressable.hover();
    await page.waitForTimeout(120);
    await page.screenshot({ path: shot(entry.id, 'hover') });

    const box = await pressable.boundingBox();
    if (!box) return;
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await page.mouse.down();
    await page.waitForTimeout(120); // active opacity settles
    await page.screenshot({ path: shot(entry.id, 'press') });
    await page.mouse.up();
  });
}
