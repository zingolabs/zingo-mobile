import { rmSync } from 'node:fs';
import { join } from 'node:path';

// Clear capture outputs once before the workers start, so a renamed or
// retagged story never leaves a stale artifact behind (which would get
// re-baselined and mask real changes).
export default function globalSetup() {
  const out = process.env.VISUAL_OUT ?? join(__dirname, '__current__');
  rmSync(out, { recursive: true, force: true });
}
