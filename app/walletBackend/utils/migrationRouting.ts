import { FfiResult } from '../ffi';

/**
 * Pure routing of the migration consent screens' FFI outcomes
 * (zingo-mobile#1151): the screens branch on typed rejection codes, never
 * on error prose. A resolved payload carrying the legacy `{ error }` JSON
 * shape is a generic failure — it can no longer trigger the typed routes,
 * which belong to the rejection channel alone. Pure — no navigation, no
 * state — so the routes run under plain jest unit tests.
 */

export type StartMigrationRoute =
  | { kind: 'proceed' }
  | { kind: 'resume' }
  | { kind: 'replan' }
  | { kind: 'error'; message: string };

// Routes start_ironwood_migration at the consent screen: an existing
// migration resumes (re-entry after a kill between consent and splitting),
// stale consent replans, anything else is an error.
export function routeStartMigration(
  start: FfiResult<string>,
): StartMigrationRoute {
  if (!start.ok) {
    switch (start.error.code) {
      case 'MigrationAlreadyInProgress':
        return { kind: 'resume' };
      case 'MigrationConsentStale':
        return { kind: 'replan' };
      default:
        return { kind: 'error', message: start.error.message };
    }
  }
  try {
    const parsed = JSON.parse(start.value);
    if (parsed.error) {
      return { kind: 'error', message: String(parsed.error) };
    }
  } catch (e) {
    return { kind: 'error', message: `${e}` };
  }
  return { kind: 'proceed' };
}

export type ReschedulePartsRoute =
  | { kind: 'proceed' }
  | { kind: 'schedule-stands' }
  | { kind: 'error'; message: string };

// Routes reschedule_parts at the cadence screen: CadenceFixed means a part
// is already signed, so the existing schedule stands and reviewing it is
// still valid; anything else is an error.
export function routeRescheduleParts(
  reschedule: FfiResult<string>,
): ReschedulePartsRoute {
  if (!reschedule.ok) {
    if (reschedule.error.code === 'MigrationCadenceFixed') {
      return { kind: 'schedule-stands' };
    }
    return { kind: 'error', message: reschedule.error.message };
  }
  try {
    const parsed = JSON.parse(reschedule.value);
    if (parsed.error) {
      return { kind: 'error', message: String(parsed.error) };
    }
  } catch (e) {
    return { kind: 'error', message: `${e}` };
  }
  return { kind: 'proceed' };
}
