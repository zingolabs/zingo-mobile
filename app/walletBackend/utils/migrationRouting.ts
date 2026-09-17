import { ZingoError_Tags } from 'zingo-ffi';
import { FfiResult } from '@app/walletBackend/ffi';
import { MigrationPlanType } from '@app/walletBackend/types/MigrationTypes';

/**
 * Pure routing of the migration consent screens' FFI outcomes: the screens
 * branch on rejection tags, never on detail prose.
 */

export type StartMigrationRoute =
  | { kind: 'proceed' }
  | { kind: 'resume' }
  | { kind: 'replan' }
  | { kind: 'error'; detail: string };

// Routes startMigration at the consent screen: an existing migration resumes
// (re-entry after a kill between consent and splitting), stale consent
// replans, anything else is an error.
export function routeStartMigration(
  start: FfiResult<void>,
): StartMigrationRoute {
  if (start.ok) {
    return { kind: 'proceed' };
  }
  switch (start.error.tag) {
    case ZingoError_Tags.MigrationAlreadyInProgress:
      return { kind: 'resume' };
    case ZingoError_Tags.MigrationConsentStale:
      return { kind: 'replan' };
    default:
      return { kind: 'error', detail: start.error.detail };
  }
}

export type CadencePlanRoute =
  | { kind: 'choose'; parts: number }
  | { kind: 'dust'; residual: number }
  | { kind: 'unconfirmed' };

// Routes the post-split plan at the cadence screen, which must never consent
// to a plan carrying no notes. Zero notes with a residual means every note
// sits below the sweep floor. Zero with nothing at all means the split's
// outputs are mined but not yet spendable at the anchor.
export function routeCadencePlan(plan: MigrationPlanType): CadencePlanRoute {
  const parts = plan.parts.length;
  if (parts > 0) {
    return { kind: 'choose', parts };
  }
  return plan.residual > 0
    ? { kind: 'dust', residual: plan.residual }
    : { kind: 'unconfirmed' };
}

export type ReschedulePartsRoute =
  | { kind: 'proceed' }
  | { kind: 'schedule-stands' }
  | { kind: 'error'; detail: string };

// Routes rescheduleParts at the cadence screen: a fixed cadence means a part
// is already signed and the existing schedule stands.
export function routeRescheduleParts(
  reschedule: FfiResult<void>,
): ReschedulePartsRoute {
  if (reschedule.ok) {
    return { kind: 'proceed' };
  }
  if (reschedule.error.tag === ZingoError_Tags.MigrationCadenceFixed) {
    return { kind: 'schedule-stands' };
  }
  return { kind: 'error', detail: reschedule.error.detail };
}
