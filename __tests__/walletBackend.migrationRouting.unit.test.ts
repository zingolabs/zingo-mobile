/**
 * The consent screens' routing: the special routes (resume, replan, the
 * standing schedule) are reachable only from the rejection tags.
 */
import { ZingoError_Tags } from 'zingo-ffi';
import { FfiResult } from '@app/walletBackend/ffi';
import {
  routeCadencePlan,
  routeRescheduleParts,
  routeStartMigration,
} from '@app/walletBackend/utils/migrationRouting';
import { MigrationPlanType } from '@app/walletBackend/types/MigrationTypes';

const rejected = (tag: ZingoError_Tags, detail = 'boom'): FfiResult<void> => ({
  ok: false,
  error: { tag, detail },
});

const started: FfiResult<void> = { ok: true, value: undefined };

const plan = (parts: number[], residual: number): MigrationPlanType => ({
  splitRounds: [],
  parts,
  splitFee: 0,
  partsFee: 0,
  residual,
  planHash: 'ab12',
});

describe('routeStartMigration', () => {
  test('Tests that the route proceeds when the start resolves', () => {
    expect(routeStartMigration(started)).toEqual({ kind: 'proceed' });
  });

  test('Tests that the route resumes when a migration already exists', () => {
    expect(
      routeStartMigration(rejected(ZingoError_Tags.MigrationAlreadyInProgress)),
    ).toEqual({ kind: 'resume' });
  });

  test('Tests that the route replans when the consent is stale', () => {
    expect(
      routeStartMigration(rejected(ZingoError_Tags.MigrationConsentStale)),
    ).toEqual({ kind: 'replan' });
  });

  test('Tests that any other rejection routes to an error with its detail when the start fails', () => {
    expect(
      routeStartMigration(rejected(ZingoError_Tags.InvalidInput, 'bad hash')),
    ).toEqual({ kind: 'error', detail: 'bad hash' });
  });
});

describe('routeRescheduleParts', () => {
  test('Tests that the route proceeds when the reschedule resolves', () => {
    expect(routeRescheduleParts(started)).toEqual({ kind: 'proceed' });
  });

  test('Tests that the standing schedule stands when the cadence is fixed', () => {
    expect(
      routeRescheduleParts(rejected(ZingoError_Tags.MigrationCadenceFixed)),
    ).toEqual({ kind: 'schedule-stands' });
  });

  test('Tests that any other rejection routes to an error with its detail when the reschedule fails', () => {
    expect(
      routeRescheduleParts(
        rejected(ZingoError_Tags.MigrationNotInProgress, 'none'),
      ),
    ).toEqual({ kind: 'error', detail: 'none' });
  });
});

describe('routeCadencePlan', () => {
  test('Tests that the choice is offered when the plan carries notes', () => {
    expect(routeCadencePlan(plan([100, 100, 50], 7))).toEqual({
      kind: 'choose',
      parts: 3,
    });
  });

  test('Tests that dust is reported when only a residual is left', () => {
    expect(routeCadencePlan(plan([], 4200))).toEqual({
      kind: 'dust',
      residual: 4200,
    });
  });

  test('Tests that unconfirmed is reported when the plan is empty of everything', () => {
    expect(routeCadencePlan(plan([], 0))).toEqual({ kind: 'unconfirmed' });
  });
});
