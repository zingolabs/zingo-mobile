import { remoteServer } from '@app/AppState/types/ServerType';
import { ChainNameEnum } from '@app/AppState';
import {
  ACTIVE_PROBE_MS,
  GRACE_MS,
  RETURN_PROBE_MS,
  ServerHealthMonitor,
  ServerHealthView,
} from '@app/services/serverHealthMonitor';

const ZEC_GLOBAL = 'https://zec.global:443';
const OTHER = 'https://eu.zec.rocks:443';
const main = ChainNameEnum.mainChainName;

const answering = new Map<string, { latency: number | null; height: string }>();
const probe = jest.fn(
  async (uri: string) => answering.get(uri) ?? { latency: null, height: '' },
);

let clock = 0;
let spending = false;
let views: ServerHealthView[] = [];

const monitor = () => {
  const m = new ServerHealthMonitor({
    probe,
    onChange: v => views.push(v),
    spending: () => spending,
    now: () => clock,
  });
  m.setConditions({ online: true, foreground: true, network: 'wifi' });
  clock += GRACE_MS;
  return m;
};

const last = () => views[views.length - 1];

/** Runs the timers `ms` ahead and lets the probes settle. */
const advance = async (ms: number) => {
  clock += ms;
  await jest.advanceTimersByTimeAsync(ms);
};

beforeEach(() => {
  jest.useFakeTimers();
  answering.clear();
  probe.mockClear();
  clock = 0;
  spending = false;
  views = [];
});

afterEach(() => {
  jest.useRealTimers();
});

test('Tests that nothing is probed while the server answers the wallet', async () => {
  const m = monitor();
  m.watch(remoteServer(ZEC_GLOBAL, main), null);
  m.answer(ZEC_GLOBAL, { kind: 'answered', latencyMs: 100, height: 10 });
  await advance(ACTIVE_PROBE_MS * 4);
  expect(probe).not.toHaveBeenCalled();
  m.stop();
});

test('Tests that a failed answer starts probing every 15 s, and four failures in a row call the server down', async () => {
  const m = monitor();
  m.watch(remoteServer(ZEC_GLOBAL, main), null);
  m.syncLaunch({ kind: 'failed', error: 'sync' });
  await advance(0);
  expect(probe).toHaveBeenCalledTimes(1);
  await advance(ACTIVE_PROBE_MS * 3);
  expect(probe).toHaveBeenCalledTimes(4);
  expect(last().level).toBe('down');
  m.stop();
});

test('Tests that probing stops when the server answers again after a one-off failure', async () => {
  const m = monitor();
  m.watch(remoteServer(ZEC_GLOBAL, main), null);
  answering.set(ZEC_GLOBAL, { latency: 100, height: '10' });
  m.answer(ZEC_GLOBAL, { kind: 'failed', error: 'blip' });
  await advance(ACTIVE_PROBE_MS * 6);
  expect(probe).toHaveBeenCalledTimes(1);
  expect(last().level).toBe('ok');
  m.stop();
});

test('Tests that a down server is probed until it answers fast three times', async () => {
  const m = monitor();
  m.watch(remoteServer(ZEC_GLOBAL, main), null);
  Array.from({ length: 4 }).forEach(() =>
    m.answer(ZEC_GLOBAL, { kind: 'failed', error: 'x' }),
  );
  expect(last().level).toBe('down');
  probe.mockClear();
  answering.set(ZEC_GLOBAL, { latency: 100, height: '10' });
  await advance(ACTIVE_PROBE_MS * 6);
  expect(probe).toHaveBeenCalledTimes(3);
  expect(last().level).toBe('ok');
  m.stop();
});

test('Tests that answers are ignored without internet, in the background and during the grace after a network change', () => {
  const m = monitor();
  m.watch(remoteServer(ZEC_GLOBAL, main), null);
  const fail = () =>
    Array.from({ length: 4 }).forEach(() =>
      m.answer(ZEC_GLOBAL, { kind: 'failed', error: 'x' }),
    );
  m.setConditions({ online: false, foreground: true, network: 'none' });
  fail();
  m.setConditions({ online: true, foreground: false, network: 'wifi' });
  fail();
  m.setConditions({ online: true, foreground: true, network: 'cellular' });
  clock += GRACE_MS - 1;
  fail();
  expect(last().level).toBe('ok');
  m.stop();
});

test('Tests that an answer of another server than the open one is ignored', () => {
  const m = monitor();
  m.watch(remoteServer(ZEC_GLOBAL, main), null);
  Array.from({ length: 4 }).forEach(() =>
    m.answer(OTHER, { kind: 'failed', error: 'x' }),
  );
  expect(last().level).toBe('ok');
  m.stop();
});

test('Tests that the default server counts as back after two up-to-date answers ten minutes apart', async () => {
  const m = monitor();
  m.watch(remoteServer(OTHER, main), ZEC_GLOBAL);
  m.answer(OTHER, { kind: 'answered', latencyMs: 100, height: 1000 });
  answering.set(ZEC_GLOBAL, { latency: 90, height: '1000' });
  await advance(RETURN_PROBE_MS);
  expect(last().defaultBack).toBe(false);
  await advance(RETURN_PROBE_MS);
  expect(last().defaultBack).toBe(true);
  expect(probe).toHaveBeenCalledTimes(2);
  m.stop();
});

test('Tests that the default server does not count as back while it is behind the tip', async () => {
  const m = monitor();
  m.watch(remoteServer(OTHER, main), ZEC_GLOBAL);
  m.answer(OTHER, { kind: 'answered', latencyMs: 100, height: 1000 });
  answering.set(ZEC_GLOBAL, { latency: 90, height: '990' });
  await advance(RETURN_PROBE_MS * 3);
  expect(last().defaultBack).toBe(false);
  m.stop();
});

test('Tests that the default is not watched while a transaction is on its way, nor again once the user stays', async () => {
  const m = monitor();
  m.watch(remoteServer(OTHER, main), ZEC_GLOBAL);
  answering.set(ZEC_GLOBAL, { latency: 90, height: '1000' });
  spending = true;
  await advance(RETURN_PROBE_MS * 2);
  expect(probe).not.toHaveBeenCalled();
  spending = false;
  m.decline();
  m.watch(remoteServer(OTHER, main), ZEC_GLOBAL);
  await advance(RETURN_PROBE_MS * 3);
  expect(probe).not.toHaveBeenCalled();
  expect(last().defaultBack).toBe(false);
  m.stop();
});

test('Tests that the default is not watched when the wallet is on it', async () => {
  const m = monitor();
  m.watch(remoteServer(ZEC_GLOBAL, main), ZEC_GLOBAL);
  await advance(RETURN_PROBE_MS * 3);
  expect(probe).not.toHaveBeenCalled();
  m.stop();
});
