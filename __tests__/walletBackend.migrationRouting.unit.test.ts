/**
 * The consent screens' routing contract (zingo-mobile#1151): the special
 * routes — resume an existing migration, replan on stale consent — are
 * reachable only from typed rejection codes, never from error prose. A
 * resolved payload carrying the legacy { error } JSON shape is a generic
 * failure.
 */
import { FfiResult } from '../app/walletBackend/ffi';
import { routeStartMigration } from '../app/walletBackend/utils/migrationRouting';

const rejected = (code: string, message = 'boom'): FfiResult<string> => ({
  ok: false,
  error: { code: code as never, message },
});

describe('routeStartMigration', () => {
  it('proceeds on a clean start', () => {
    expect(routeStartMigration({ ok: true, value: '{}' })).toEqual({
      kind: 'proceed',
    });
  });

  it('resumes when a migration already exists', () => {
    expect(routeStartMigration(rejected('MigrationAlreadyInProgress'))).toEqual(
      { kind: 'resume' },
    );
  });

  it('replans on stale consent', () => {
    expect(routeStartMigration(rejected('MigrationConsentStale'))).toEqual({
      kind: 'replan',
    });
  });

  it('surfaces any other rejection as an error with its message', () => {
    expect(routeStartMigration(rejected('InvalidInput', 'bad hash'))).toEqual({
      kind: 'error',
      message: 'bad hash',
    });
    expect(routeStartMigration(rejected('Unknown'))).toEqual({
      kind: 'error',
      message: 'boom',
    });
  });

  it('treats a resolved legacy { error } body as a generic failure', () => {
    // The typed routes belong to the rejection channel alone: prose in
    // the data channel must never trigger resume or replan.
    const legacy: FfiResult<string> = {
      ok: true,
      value: '{"error":"a migration is already in progress"}',
    };
    expect(routeStartMigration(legacy)).toEqual({
      kind: 'error',
      message: 'a migration is already in progress',
    });
  });

  it('treats an unparseable resolved body as a generic failure', () => {
    const route = routeStartMigration({ ok: true, value: 'not json' });
    expect(route.kind).toBe('error');
  });
});

