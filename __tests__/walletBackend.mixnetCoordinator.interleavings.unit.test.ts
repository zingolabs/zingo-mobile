/**
 * Interleavings of the coordinator's transport acts, enumerated rather than
 * sampled (zingo-mobile#1427).
 *
 * Four rounds of review found eleven ordering bugs in these five methods, and
 * every one was the same shape: an interleaving nobody had enumerated. Hand
 * review samples that space, and sampling does not terminate — which is why
 * each round found one more.
 *
 * This file enumerates it. A scenario is a script of the acts a session can
 * perform (go Online, go Offline, let the bootstrap deadline fire) crossed with
 * what actually varies in the field: whether the native start or the wallet's
 * disable returns promptly or hangs, what the attach answers, and whether the
 * stop refuses. Each scenario runs to quiescence and is judged against
 * INVARIANTS — what must hold of any ordering — not against a transcript of
 * one.
 *
 * The harness models the shim it drives, because the invariants that matter are
 * about the proxy rather than about call counts: a start releases whatever
 * proxy was live before it (`releaseHandle` in NymTransportModule), and a stop
 * releases the live one. "No transport outlives an Offline session" is then a
 * question the trace can answer.
 *
 * This file is only worth its weight if it fails when the coordinator is
 * wrong, so `mutations.md` beside it records the deliberate breakages it was
 * checked against. Re-check them after changing either side.
 */
import {
  BOOTSTRAP_DEADLINE_MILLIS,
  MixnetCoordinator,
  MixnetTransportBinding,
} from '@app/walletBackend/modules/MixnetCoordinator';
import { MixnetTransportView } from '@app/walletBackend/transforms/mixnetView';
import { mixnetStatusPayload as statusPayload } from '../__mocks__/dataMocks/mockMixnetStatus';

jest.mock('@app/RPCModule', () =>
  require('../__mocks__/rpcModuleProxy').rpcModuleProxyMock(),
);

import RPCModule from '@app/RPCModule';

const mockedBridge = RPCModule as unknown as Record<string, jest.Mock>;

const MICROTASK_SETTLE_TURNS = 20;

async function settleMicrotasks(): Promise<void> {
  for (let turn = 0; turn < MICROTASK_SETTLE_TURNS; turn += 1) {
    await Promise.resolve();
  }
}

type Deferred<T> = { promise: Promise<T>; resolve: (value: T) => void };

function deferred<T>(): Deferred<T> {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>(settle => {
    resolve = settle;
  });
  return { promise, resolve };
}

const SOCKS5 = '127.0.0.1:1080';

// The acts a script is built from. `deadline` is not a call but a wait: it
// advances the clock past the bootstrap deadline, which is how a redraw and a
// reconnect reach the coordinator in production.
type Act = 'online' | 'offline' | 'deadline';

type AttachAnswer = 'ready' | 'bootstrapping' | 'died';

type Scenario = {
  readonly script: readonly Act[];
  readonly hangingStart: boolean;
  readonly hangingDisable: boolean;
  readonly attach: AttachAnswer;
  // What the wallet answers the disable with. `bootstrapping` is not
  // hypothetical: an answer that still read as bootstrapping is what armed the
  // deadline behind an Offline session once already.
  readonly disableAnswer: 'off' | 'bootstrapping';
  readonly failingStop: boolean;
  // A stop or an attach that lands late is how a teardown reaches across a
  // session boundary: the two orderings that let one act's answer arrive after
  // another act has already taken over.
  readonly hangingStop: boolean;
  readonly hangingAttach: boolean;
};

type Trace = {
  readonly events: readonly string[];
  readonly views: readonly MixnetTransportView[];
  // The shim's state at rest: the proxy still running, if any.
  readonly liveProxy: number | null;
  readonly timersLeft: number;
  // Acts the caller is still waiting on. A caller awaits
  // `ensureForConnectedSession` and `reenable`, so an act that never settles is
  // a hung button, not a tidy-up detail.
  readonly outstanding: number;
};

function label(scenario: Scenario): string {
  return [
    scenario.script.join('>'),
    scenario.hangingStart ? 'start hangs' : 'start prompt',
    scenario.hangingDisable ? 'disable hangs' : 'disable prompt',
    `attach ${scenario.attach}`,
    `disable ${scenario.disableAnswer}`,
    scenario.failingStop ? 'stop fails' : 'stop ok',
    scenario.hangingStop ? 'stop hangs' : 'stop prompt',
    scenario.hangingAttach ? 'attach hangs' : 'attach prompt',
  ].join(' | ');
}

/**
 * Runs one scenario to quiescence, recording every native seam in call order
 * and modelling the shim's own proxy bookkeeping.
 */
async function run(scenario: Scenario): Promise<Trace> {
  jest.clearAllMocks();
  const events: string[] = [];
  const releases: Array<() => void> = [];
  let nextProxy = 1;
  let liveProxy: number | null = null;

  const startTransport = jest.fn().mockImplementation(() => {
    const proxy = nextProxy;
    nextProxy += 1;
    events.push(`start#${proxy}`);
    const bind = (): MixnetTransportBinding => {
      // The native start releases the standing proxy before it starts the
      // next one, so a superseded proxy dies here and not by a stop.
      if (liveProxy !== null) {
        events.push(`release#${liveProxy}`);
      }
      liveProxy = proxy;
      return { socks5Addr: SOCKS5, exitNode: `exit-${proxy}` };
    };
    if (!scenario.hangingStart) {
      return Promise.resolve(bind());
    }
    const held = deferred<MixnetTransportBinding>();
    releases.push(() => held.resolve(bind()));
    return held.promise;
  });

  const stopTransport = jest.fn().mockImplementation(() => {
    events.push(`stop(live=${liveProxy ?? 'none'})`);
    const land = (): void => {
      // The native stop releases whatever handle the module holds, which is
      // the proxy that is live when it LANDS, not when it was asked for.
      liveProxy = null;
    };
    if (scenario.failingStop) {
      return Promise.reject(new Error('the shim would not die'));
    }
    if (!scenario.hangingStop) {
      land();
      return Promise.resolve();
    }
    const held = deferred<void>();
    releases.push(() => {
      land();
      held.resolve();
    });
    return held.promise;
  });

  const attachAnswer =
    scenario.attach === 'ready'
      ? statusPayload('ready', SOCKS5)
      : statusPayload(scenario.attach);
  mockedBridge.attachMixnet.mockImplementation(() => {
    events.push('attach');
    if (!scenario.hangingAttach) {
      return Promise.resolve(attachAnswer);
    }
    const held = deferred<string>();
    releases.push(() => held.resolve(attachAnswer));
    return held.promise;
  });
  const disableAnswer = statusPayload(scenario.disableAnswer);
  mockedBridge.disableMixnet.mockImplementation(() => {
    events.push('disable');
    if (!scenario.hangingDisable) {
      return Promise.resolve(disableAnswer);
    }
    const held = deferred<string>();
    releases.push(() => held.resolve(disableAnswer));
    return held.promise;
  });
  mockedBridge.mixnetIndicatorInfo.mockResolvedValue(attachAnswer);
  mockedBridge.mixnetBootstrapDetailInfo.mockResolvedValue(
    JSON.stringify({ detail: '' }),
  );

  const views: MixnetTransportView[] = [];
  const coordinator = new MixnetCoordinator(
    startTransport,
    view => {
      views.push(view);
      events.push(`view:${view.statusKey.replace('mixnet.status.', '')}`);
    },
    stopTransport,
  );

  let outstanding = 0;
  const track = (act: Promise<void>): void => {
    outstanding += 1;
    const done = () => {
      outstanding -= 1;
    };
    act.then(done, done);
  };
  for (const act of scenario.script) {
    if (act === 'online') {
      events.push('go-online');
      track(coordinator.ensureForConnectedSession());
    } else if (act === 'offline') {
      events.push('go-offline');
      track(coordinator.goOffline());
    } else {
      await jest.advanceTimersByTimeAsync(BOOTSTRAP_DEADLINE_MILLIS);
    }
    await settleMicrotasks();
  }

  // Release whatever the script left held, then give the clock room for the
  // redraw or reconnect the release may have unblocked. A reconnect can be
  // parked at the top of its backoff, so the wait covers that too.
  const RELEASE_ROUNDS = 6;
  for (let round = 0; round < RELEASE_ROUNDS; round += 1) {
    const held = releases.splice(0);
    held.forEach(release => release());
    await settleMicrotasks();
    if (held.length > 0 || round === 0) {
      await jest.advanceTimersByTimeAsync(BOOTSTRAP_DEADLINE_MILLIS);
      await settleMicrotasks();
    }
    if (releases.length === 0) {
      break;
    }
  }
  // A last sweep with no clock: anything the previous round queued still has to
  // land before the trace is read.
  while (releases.length > 0) {
    releases.splice(0).forEach(release => release());
    await settleMicrotasks();
  }

  const timersLeft = jest.getTimerCount();
  coordinator.stop();
  return { events, views, liveProxy, timersLeft, outstanding };
}

// The session's own last word: which connectivity act ran last.
function endedOffline(script: readonly Act[]): boolean {
  const connectivity = script.filter(act => act !== 'deadline');
  return connectivity[connectivity.length - 1] === 'offline';
}

function startedAfterGoingOffline(events: readonly string[]): boolean {
  const wentOffline = events.lastIndexOf('go-offline');
  return events.some(
    (event, at) => at > wentOffline && event.startsWith('start#'),
  );
}

function scenarios(): Scenario[] {
  const acts: Act[] = ['online', 'offline', 'deadline'];
  const scripts: Act[][] = [];
  for (const first of acts) {
    for (const second of acts) {
      scripts.push([first, second]);
      for (const third of acts) {
        scripts.push([first, second, third]);
      }
    }
  }
  const built: Scenario[] = [];
  for (const script of scripts) {
    // A script that never connects has nothing to order.
    if (!script.includes('online') && !script.includes('offline')) {
      continue;
    }
    for (const hangingStart of [false, true]) {
      for (const hangingDisable of [false, true]) {
        for (const attach of ['ready', 'bootstrapping', 'died'] as const) {
          for (const disableAnswer of ['off', 'bootstrapping'] as const) {
            for (const failingStop of [false, true]) {
              for (const hangingStop of [false, true]) {
                for (const hangingAttach of [false, true]) {
                  built.push({
                    script,
                    hangingStart,
                    hangingDisable,
                    attach,
                    disableAnswer,
                    failingStop,
                    hangingStop,
                    hangingAttach,
                  });
                }
              }
            }
          }
        }
      }
    }
  }
  return built;
}

const ALL = scenarios();

// One violation, named and carrying the ordering that produced it.
type Violation = {
  invariant: string;
  scenario: string;
  events: readonly string[];
  detail: string;
};

function violationsOf(scenario: Scenario, trace: Trace): Violation[] {
  const found: Violation[] = [];
  const note = (invariant: string, detail: string) =>
    found.push({
      invariant,
      scenario: label(scenario),
      events: trace.events,
      detail,
    });
  const offline = endedOffline(scenario.script);
  const resting = trace.views[trace.views.length - 1];
  const restingKey = resting === undefined ? 'none' : resting.statusKey;

  // The bug four consecutive rounds of review found: an Offline session dials.
  if (offline && startedAfterGoingOffline(trace.events)) {
    note(
      'no start after the session went Offline',
      'a start followed go-offline',
    );
  }

  // No transport outlives the session that owns it. A stop that refused is
  // exempt: the shim would not die, which the view reports as trouble.
  if (offline && !scenario.failingStop && trace.liveProxy !== null) {
    note(
      'no transport outlives an Offline session',
      `proxy ${trace.liveProxy} still live`,
    );
  }

  // The header tells the truth at rest.
  if (offline && !scenario.failingStop && restingKey !== 'mixnet.status.off') {
    note('an Offline session rests at off', `rested at ${restingKey}`);
  }
  if (!offline && restingKey === 'mixnet.status.off') {
    note('an Online session never rests at off', `rested at ${restingKey}`);
  }

  // Sends ride on this: a view claiming ready must be backed by an attach that
  // answered ready.
  if (
    scenario.attach !== 'ready' &&
    trace.views.some(view => view.statusKey === 'mixnet.status.ready')
  ) {
    note('ready is never claimed without a ready attach', 'claimed ready');
  }

  // A stale teardown must not paint a session that has already returned
  // Online: no view may say off after the last go-online.
  const returnedOnline = trace.events.lastIndexOf('go-online');
  if (
    !offline &&
    returnedOnline !== -1 &&
    trace.events.some(
      (event, at) => at > returnedOnline && event === 'view:off',
    )
  ) {
    note(
      'no off view after the session returned Online',
      'a teardown published off over a live session',
    );
  }

  // A session that came up and proved itself keeps its transport: a stop that
  // raced the start must not have taken the new proxy with it.
  if (
    !offline &&
    scenario.attach === 'ready' &&
    !scenario.failingStop &&
    trace.events.includes('attach') &&
    trace.liveProxy === null
  ) {
    note(
      'a proven Online session keeps its transport',
      'no proxy is live although the attach answered ready',
    );
  }

  // Callers await these acts, so one that never settles is a hung caller —
  // exactly the head-of-line block that awaiting a queued teardown produces.
  if (trace.outstanding !== 0) {
    note('every act settles', `${trace.outstanding} act(s) never resolved`);
  }

  // An Offline session is at rest: nothing is left armed to wake it up.
  if (offline && trace.timersLeft !== 0) {
    note(
      'an Offline session leaves no timer armed',
      `${trace.timersLeft} timers left`,
    );
  }

  return found;
}

describe('every interleaving of the coordinator acts', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  // Guards the enumeration itself: a scripting mistake that collapsed the space
  // would make every invariant below vacuously true.
  it('enumerates a space that reaches the interesting states', () => {
    expect(ALL.length).toBeGreaterThan(5_000);
    const reaches = (predicate: (s: Scenario) => boolean) =>
      ALL.some(predicate);
    expect(reaches(s => s.hangingStart && endedOffline(s.script))).toBe(true);
    expect(reaches(s => s.hangingDisable && s.script.includes('online'))).toBe(
      true,
    );
    expect(reaches(s => s.attach === 'died')).toBe(true);
    expect(reaches(s => s.failingStop)).toBe(true);
    expect(reaches(s => s.disableAnswer === 'bootstrapping')).toBe(true);
    expect(reaches(s => s.hangingStop && endedOffline(s.script))).toBe(true);
    expect(reaches(s => s.hangingAttach)).toBe(true);
  });

  it('holds every invariant, whatever the ordering', async () => {
    const violations: Violation[] = [];
    for (const scenario of ALL) {
      violations.push(...violationsOf(scenario, await run(scenario)));
    }
    // The first few carry their own traces, which is the ordering to read.
    expect(violations.slice(0, 5)).toEqual([]);
    expect(violations).toHaveLength(0);
  }, 300_000);
});
