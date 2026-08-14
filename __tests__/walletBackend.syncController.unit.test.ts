/**
 * The controller machine, driven directly (no device). Pins the pure model
 * ADR 0005 fixes, as amended by the command-scheduler design:
 * reconcile is total and its stale-epoch drop is the first branch, each command
 * clears the in-flight slot on its own ack, and issueCommand serializes writes
 * to one command at a time.
 */
import {
  type SyncMachine,
  PERSISTENT_FAILURE_AT,
  canIssue,
  initialMachine,
  issueCommand,
  reconcile,
} from '../app/walletBackend/controller/syncController';

const SERVER = 'https://main.example:443';

const fresh = (): SyncMachine => initialMachine(SERVER);

describe('syncController — reconcile poll mapping', () => {
  it('drops an observation stamped with a stale epoch, unread', () => {
    const m: SyncMachine = { ...fresh(), epoch: 4 };
    const out = reconcile(m, {
      kind: 'poll',
      issuedEpoch: 3,
      result: { kind: 'complete', percent: 100, saveRequired: true },
    });
    expect(out).toBe(m); // identical reference: nothing reconciled
  });

  it("'not launched' returns sync to idle", () => {
    const m: SyncMachine = { ...fresh(), sync: { kind: 'syncing', percent: 40 } };
    const out = reconcile(m, {
      kind: 'poll',
      issuedEpoch: 0,
      result: { kind: 'notLaunched' },
    });
    expect(out.sync).toEqual({ kind: 'idle' });
  });

  it("'not complete' is syncing and keeps the last percent", () => {
    const m: SyncMachine = { ...fresh(), sync: { kind: 'syncing', percent: 40 } };
    const out = reconcile(m, {
      kind: 'poll',
      issuedEpoch: 0,
      result: { kind: 'notComplete' },
    });
    expect(out.sync).toEqual({ kind: 'syncing', percent: 40 });
  });

  it('a complete poll below the tip is syncing and carries saveRequired', () => {
    const out = reconcile(fresh(), {
      kind: 'poll',
      issuedEpoch: 0,
      result: { kind: 'complete', percent: 62.5, saveRequired: true },
    });
    expect(out.sync).toEqual({ kind: 'syncing', percent: 62.5 });
    expect(out.saveRequired).toBe(true);
  });

  it('reaching the tip returns sync to idle', () => {
    const m: SyncMachine = { ...fresh(), sync: { kind: 'syncing', percent: 99 } };
    const out = reconcile(m, {
      kind: 'poll',
      issuedEpoch: 0,
      result: { kind: 'complete', percent: 100, saveRequired: false },
    });
    expect(out.sync).toEqual({ kind: 'idle' });
  });
});

describe('syncController — reconcile command acks clear the in-flight slot', () => {
  it('a launch ack confirms syncing and clears the slot', () => {
    const issued = issueCommand(fresh(), { kind: 'launchSync' }, 1_000);
    expect(issued.inFlight.kind).toBe('command');
    const out = reconcile(issued, {
      kind: 'commandAck',
      issuedEpoch: issued.epoch,
      command: { kind: 'launchSync' },
      outcome: { kind: 'ok' },
    });
    expect(out.sync).toEqual({ kind: 'syncing', percent: 0 });
    expect(out.inFlight).toEqual({ kind: 'none' });
  });

  it('a save ack clears saveRequired and the slot', () => {
    const issued = issueCommand(
      { ...fresh(), saveRequired: true },
      { kind: 'save' },
      1_000,
    );
    const out = reconcile(issued, {
      kind: 'commandAck',
      issuedEpoch: issued.epoch,
      command: { kind: 'save' },
      outcome: { kind: 'ok' },
    });
    expect(out.saveRequired).toBe(false);
    expect(out.inFlight).toEqual({ kind: 'none' });
  });

  it('a changeServer ack sets configuredServer and clears the slot', () => {
    const target = 'https://backup.example:443';
    const issued = issueCommand(fresh(), { kind: 'changeServer', target }, 1_000);
    const out = reconcile(issued, {
      kind: 'commandAck',
      issuedEpoch: issued.epoch,
      command: { kind: 'changeServer', target },
      outcome: { kind: 'ok' },
    });
    expect(out.configuredServer).toBe(target);
    expect(out.inFlight).toEqual({ kind: 'none' });
  });

  it('a rejected launch moves sync to error, then persistentFailure at the threshold', () => {
    let m = fresh();
    for (let i = 1; i < PERSISTENT_FAILURE_AT; i++) {
      const issued = issueCommand(m, { kind: 'launchSync' }, i);
      m = reconcile(issued, {
        kind: 'commandAck',
        issuedEpoch: issued.epoch,
        command: { kind: 'launchSync' },
        outcome: { kind: 'rejected', code: 'Sync' },
      });
      expect(m.sync).toEqual({
        kind: 'error',
        errorKey: 'sync.fetch-failed',
        consecutiveFailures: i,
      });
    }
    const last = issueCommand(m, { kind: 'launchSync' }, PERSISTENT_FAILURE_AT);
    m = reconcile(last, {
      kind: 'commandAck',
      issuedEpoch: last.epoch,
      command: { kind: 'launchSync' },
      outcome: { kind: 'rejected', code: 'Offline' },
    });
    expect(m.sync).toEqual({
      kind: 'persistentFailure',
      errorKey: 'sync.offline',
    });
  });

  it('a rejected save clears the slot without touching sync', () => {
    const issued = issueCommand(fresh(), { kind: 'save' }, 1_000);
    const out = reconcile(issued, {
      kind: 'commandAck',
      issuedEpoch: issued.epoch,
      command: { kind: 'save' },
      outcome: { kind: 'rejected', code: 'Save' },
    });
    expect(out.sync).toEqual({ kind: 'idle' });
    expect(out.inFlight).toEqual({ kind: 'none' });
  });
});

describe('syncController — issueCommand serializes writes', () => {
  it('refuses a second command while one is in flight', () => {
    const first = issueCommand(fresh(), { kind: 'launchSync' }, 1_000);
    expect(canIssue(first)).toBe(false);
    const second = issueCommand(first, { kind: 'rescan' }, 2_000);
    expect(second).toBe(first); // unchanged: the write is serialized
  });

  it('a launch binds the configured server without bumping the epoch', () => {
    const target = 'https://backup.example:443';
    const switched: SyncMachine = { ...fresh(), configuredServer: target };
    const out = issueCommand(switched, { kind: 'launchSync' }, 1_000);
    expect(out.epoch).toBe(switched.epoch);
    expect(out.boundServer).toBe(target);
  });

  it('a changeServer bumps the epoch and stamps its own command with it', () => {
    const target = 'https://backup.example:443';
    const before = fresh();
    const out = issueCommand(before, { kind: 'changeServer', target }, 1_000);
    expect(out.epoch).toBe(before.epoch + 1);
    expect(out.inFlight).toEqual({
      kind: 'command',
      command: { kind: 'changeServer', target },
      epoch: before.epoch + 1,
      since: 1_000,
    });
  });

  it('drops a poll issued before a changeServer bump', () => {
    const target = 'https://backup.example:443';
    const switched = issueCommand(fresh(), { kind: 'changeServer', target }, 1_000);
    const out = reconcile(switched, {
      kind: 'poll',
      issuedEpoch: switched.epoch - 1, // stamped under the pre-switch epoch
      result: { kind: 'complete', percent: 100, saveRequired: false },
    });
    expect(out).toBe(switched); // the torn read is dropped
  });
});
