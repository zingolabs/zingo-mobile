/**
 * The open wallet's server health, folded from direct latest-block answers
 * and sync launches. It only states a level, and the user decides what to do.
 */
export type ServerHealthLevel = 'ok' | 'slow' | 'down' | 'unusable';

/** An answer slower than this counts as slow. */
export const SLOW_ANSWER_MS = 2_000;
/** Slow answers in a row that make the server slow. */
export const SLOW_RUN = 3;
/** Failed answers in a row that make the server down. */
export const DOWN_RUN = 4;
/** Failed sync launches in a row, while the server answers, that make it unusable. */
export const UNUSABLE_RUN = 4;
/** Fast answers in a row that make it fine again. */
export const OK_RUN = 3;

export type ServerHealthState = {
  readonly level: ServerHealthLevel;
  readonly failures: number;
  readonly slow: number;
  readonly fast: number;
  readonly syncFailures: number;
  /** The last error the server or the sync gave, '' when none. */
  readonly lastError: string;
  /** The last answer's round trip, null when it failed or none came. */
  readonly lastLatencyMs: number | null;
  /** The highest block an answer of this server gave, 0 when none did. */
  readonly height: number;
};

export const INITIAL_SERVER_HEALTH: ServerHealthState = {
  level: 'ok',
  failures: 0,
  slow: 0,
  fast: 0,
  syncFailures: 0,
  lastError: '',
  lastLatencyMs: null,
  height: 0,
};

export type ProbeAnswer =
  | { kind: 'answered'; latencyMs: number; height: number }
  | { kind: 'failed'; error: string };

export type SyncLaunch =
  { kind: 'launched' } | { kind: 'failed'; error: string };

/** A level changes only on a full run, and between runs the last one holds. */
const leveled = (state: ServerHealthState): ServerHealthState => {
  const answering = state.failures === 0 && state.lastLatencyMs !== null;
  const level: ServerHealthLevel =
    state.failures >= DOWN_RUN
      ? 'down'
      : answering && state.syncFailures >= UNUSABLE_RUN
        ? 'unusable'
        : state.slow >= SLOW_RUN
          ? 'slow'
          : state.fast >= OK_RUN && state.syncFailures < UNUSABLE_RUN
            ? 'ok'
            : state.level;
  return { ...state, level };
};

export function recordAnswer(
  state: ServerHealthState,
  answer: ProbeAnswer,
): ServerHealthState {
  if (answer.kind === 'failed') {
    return leveled({
      ...state,
      failures: state.failures + 1,
      slow: 0,
      fast: 0,
      lastError: answer.error,
      lastLatencyMs: null,
    });
  }
  const slow = answer.latencyMs > SLOW_ANSWER_MS;
  return leveled({
    ...state,
    failures: 0,
    slow: slow ? state.slow + 1 : 0,
    fast: slow ? 0 : state.fast + 1,
    lastLatencyMs: answer.latencyMs,
    height: Math.max(state.height, answer.height),
  });
}

export function recordSyncLaunch(
  state: ServerHealthState,
  launch: SyncLaunch,
): ServerHealthState {
  if (launch.kind === 'launched') {
    return leveled({
      ...state,
      syncFailures: 0,
      level: state.level === 'unusable' ? 'ok' : state.level,
    });
  }
  return leveled({
    ...state,
    syncFailures: state.syncFailures + 1,
    lastError: launch.error,
  });
}

/** Nothing is wrong and nothing is pending: the monitor can stop asking. */
export const isSettled = (state: ServerHealthState): boolean =>
  state.level === 'ok' &&
  state.failures === 0 &&
  state.slow === 0 &&
  state.syncFailures === 0;

/** A server further behind the tip than this is not up to date. */
export const MAX_BEHIND_BLOCKS = 5;

/** Whether `height` is within reach of the tip `tip`, always true while the tip is unknown. */
export const upToDate = (height: number, tip: number): boolean =>
  tip === 0 || height >= tip - MAX_BEHIND_BLOCKS;

/** How many blocks `height` trails the tip `tip` by, 0 while it is up to date or nothing is known. */
export const blocksBehind = (height: number, tip: number): number =>
  height > 0 && !upToDate(height, tip) ? tip - height : 0;
