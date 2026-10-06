// The sync controller as a pure discriminated union, with no clock and no I/O.
import { FfiErrorCode } from '@app/walletBackend/ffi';

export type Epoch = number;

// Work issued under an epoch applies only while that epoch is still current.
export const isCurrent = (issued: Epoch, current: Epoch): boolean =>
  issued === current;

// The catalog keys the controller surfaces, resolved to prose only for display.
export type SyncControllerErrorKey =
  | 'sync.fetch-failed'
  | 'sync.offline'
  | 'sync.save-failed'
  | 'wallet.corrupt'
  | 'wallet.invariant-break'
  | 'native.unknown';

export type SyncState =
  | { kind: 'idle' }
  | { kind: 'syncing'; percent: number }
  | {
      kind: 'error';
      errorKey: SyncControllerErrorKey;
      consecutiveFailures: number;
    }
  | { kind: 'persistentFailure'; errorKey: SyncControllerErrorKey };

export type Command =
  | { kind: 'launchSync' }
  | { kind: 'pauseSync' }
  | { kind: 'rescan' }
  | { kind: 'changeServer'; target: string }
  | { kind: 'save' };

// Every command confirms on its own ack: the in-flight command
// clears when its native call resolves, never on a later poll. There is no
// `awaitingConfirmation` — the slot is held for exactly its call's duration.
export type InFlight =
  | { kind: 'none' }
  | { kind: 'command'; command: Command; epoch: Epoch; since: number };

export type SyncMachine = {
  epoch: Epoch;
  sync: SyncState;
  saveRequired: boolean;
  // The server the next launch will bind.
  configuredServer: string;
  // The server the running sync captured at its launch.
  boundServer: string;
  inFlight: InFlight;
};

export type PollResult =
  // "Sync task has not been launched."
  | { kind: 'notLaunched' }
  // "Sync task is not complete."
  | { kind: 'notComplete' }
  // The sync_complete JSON.
  | { kind: 'complete'; percent: number; saveRequired: boolean };

export type Ack = { kind: 'ok' } | { kind: 'rejected'; code: FfiErrorCode };

export type Observation =
  | { kind: 'poll'; issuedEpoch: Epoch; result: PollResult }
  | { kind: 'commandAck'; issuedEpoch: Epoch; command: Command; outcome: Ack };

export const PERSISTENT_FAILURE_AT = 3;

// Maps a native error code to the catalog key the controller surfaces.
const classify = (code: FfiErrorCode): SyncControllerErrorKey => {
  switch (code) {
    case 'Sync':
    case 'Rescan':
    case 'Indexer':
      return 'sync.fetch-failed';
    case 'Offline':
    case 'Mixnet':
      return 'sync.offline';
    case 'Save':
      return 'sync.save-failed';
    case 'Init':
      return 'wallet.corrupt';
    case 'LightclientNotInitialized':
    case 'LightclientLockPoisoned':
    case 'SideChannelPoisoned':
    case 'Panic':
      return 'wallet.invariant-break';
    default:
      return 'native.unknown';
  }
};

export const initialMachine = (server: string): SyncMachine => ({
  epoch: 0,
  sync: { kind: 'idle' },
  saveRequired: false,
  configuredServer: server,
  boundServer: server,
  inFlight: { kind: 'none' },
});

const failed = (
  prev: SyncState,
  errorKey: SyncControllerErrorKey,
): SyncState => {
  const priorFailures = prev.kind === 'error' ? prev.consecutiveFailures : 0;
  const consecutiveFailures = priorFailures + 1;
  return consecutiveFailures >= PERSISTENT_FAILURE_AT
    ? { kind: 'persistentFailure', errorKey }
    : { kind: 'error', errorKey, consecutiveFailures };
};

// reconcile: pure and total. The stale-epoch drop is the first branch, so a
// result issued before an invalidating boundary is discarded unread.
export const reconcile = (m: SyncMachine, obs: Observation): SyncMachine => {
  if (!isCurrent(obs.issuedEpoch, m.epoch)) {
    return m;
  }

  if (obs.kind === 'poll') {
    const r = obs.result;
    if (r.kind === 'notLaunched') {
      return { ...m, sync: { kind: 'idle' } };
    }
    if (r.kind === 'notComplete') {
      const percent = m.sync.kind === 'syncing' ? m.sync.percent : 0;
      return { ...m, sync: { kind: 'syncing', percent } };
    }
    const sync: SyncState =
      r.percent >= 100
        ? { kind: 'idle' }
        : { kind: 'syncing', percent: r.percent };
    return { ...m, sync, saveRequired: r.saveRequired };
  }

  const { command, outcome } = obs;
  if (outcome.kind === 'rejected') {
    const errorKey = classify(outcome.code);
    const sync =
      command.kind === 'launchSync' || command.kind === 'rescan'
        ? failed(m.sync, errorKey)
        : m.sync;
    return { ...m, sync, inFlight: { kind: 'none' } };
  }

  switch (command.kind) {
    case 'launchSync':
    case 'rescan':
      // run_sync/run_rescan block until the task reaches Running, so the ack
      // confirms syncing; later polls fill the progress.
      return {
        ...m,
        sync: { kind: 'syncing', percent: 0 },
        inFlight: { kind: 'none' },
      };
    case 'pauseSync':
      // A paused task is not poll-observable; the ack is the only signal JS gets.
      return { ...m, inFlight: { kind: 'none' } };
    case 'save':
      return { ...m, saveRequired: false, inFlight: { kind: 'none' } };
    case 'changeServer':
      return {
        ...m,
        configuredServer: command.target,
        inFlight: { kind: 'none' },
      };
  }
};

// The single-in-flight-command invariant: a command is issuable only when none
// is in flight.
export const canIssue = (m: SyncMachine): boolean => m.inFlight.kind === 'none';

const invalidates = (command: Command): boolean =>
  command.kind === 'changeServer';

// issueCommand: total. Returns the machine unchanged when a command is already
// in flight, which is the JS-side write serialization. An invalidating command
// bumps the epoch and stamps itself with the new one, so its own ack survives.
export const issueCommand = (
  m: SyncMachine,
  command: Command,
  now: number,
): SyncMachine => {
  if (!canIssue(m)) {
    return m;
  }
  const epoch = invalidates(command) ? m.epoch + 1 : m.epoch;
  const boundServer =
    command.kind === 'launchSync' ? m.configuredServer : m.boundServer;
  return {
    ...m,
    epoch,
    boundServer,
    inFlight: { kind: 'command', command, epoch, since: now },
  };
};
