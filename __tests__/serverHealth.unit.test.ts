import {
  DOWN_RUN,
  INITIAL_SERVER_HEALTH,
  ProbeAnswer,
  ServerHealthState,
  SLOW_RUN,
  UNUSABLE_RUN,
  recordAnswer,
  recordSyncLaunch,
  upToDate,
} from '@app/services/serverHealth';

const fast: ProbeAnswer = { kind: 'answered', latencyMs: 150, height: 100 };
const slow: ProbeAnswer = { kind: 'answered', latencyMs: 2400, height: 100 };
const failed: ProbeAnswer = { kind: 'failed', error: 'timeout' };

const after = (
  answers: ProbeAnswer[],
  from: ServerHealthState = INITIAL_SERVER_HEALTH,
) => answers.reduce(recordAnswer, from);

test('Tests that the server stays fine when a few answers fail in a row', () => {
  expect(after(Array(DOWN_RUN - 1).fill(failed)).level).toBe('ok');
});

test('Tests that the server is down when four answers fail in a row', () => {
  const state = after(Array(DOWN_RUN).fill(failed));
  expect(state.level).toBe('down');
  expect(state.lastError).toBe('timeout');
});

test('Tests that one answer between failures starts the count again', () => {
  expect(after([failed, failed, failed, fast, failed]).level).toBe('ok');
});

test('Tests that the server is slow when three answers take over two seconds', () => {
  expect(after(Array(SLOW_RUN - 1).fill(slow)).level).toBe('ok');
  expect(after(Array(SLOW_RUN).fill(slow)).level).toBe('slow');
});

test('Tests that a down server stays down until three fast answers come', () => {
  const down = after(Array(DOWN_RUN).fill(failed));
  expect(after([fast, fast], down).level).toBe('down');
  expect(after([fast, fast, fast], down).level).toBe('ok');
});

test('Tests that the server is unusable when it answers and four sync launches fail', () => {
  const answering = after([fast]);
  const launches = Array(UNUSABLE_RUN).fill({ kind: 'failed', error: 'sync' });
  const state = launches.reduce(recordSyncLaunch, answering);
  expect(state.level).toBe('unusable');
  expect(recordSyncLaunch(state, { kind: 'launched' }).level).toBe('ok');
});

test('Tests that failed sync launches do not make it unusable when the server does not answer', () => {
  const launches = Array(UNUSABLE_RUN).fill({ kind: 'failed', error: 'sync' });
  const state = launches.reduce(recordSyncLaunch, INITIAL_SERVER_HEALTH);
  expect(state.level).toBe('ok');
  expect(after(Array(DOWN_RUN).fill(failed), state).level).toBe('down');
});

test('Tests that a height counts as up to date within five blocks of the tip, and always when the tip is unknown', () => {
  expect(upToDate(995, 1000)).toBe(true);
  expect(upToDate(994, 1000)).toBe(false);
  expect(upToDate(1, 0)).toBe(true);
});
