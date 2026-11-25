import { ServerHealthLevel } from '@app/services/serverHealth';

/** The menu dot shows the worst news: a down server in red, a slow one or an unsaved seed in amber. */
export const menuDotTone = (
  health: ServerHealthLevel,
  seedUnsaved: boolean,
): 'danger' | 'warning' | 'none' =>
  health === 'down' || health === 'unusable'
    ? 'danger'
    : health === 'slow' || seedUnsaved
      ? 'warning'
      : 'none';
