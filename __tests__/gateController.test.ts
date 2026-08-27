/**
 * The gate controller of ADR 0007: one device-auth ceremony at a time, a
 * freshness window instead of purposes and holds, and a uniform fail-open
 * answer for every way the gate cannot run.
 */
jest.mock('../app/DeviceAuthModule', () => ({
  __esModule: true,
  default: {
    canAuthenticate: jest.fn(),
    authenticate: jest.fn(),
  },
}));

jest.mock('@react-native-async-storage/async-storage', () => ({
  __esModule: true,
  default: {
    setItem: jest.fn(async () => {}),
    getItem: jest.fn(async () => null),
  },
}));

import type { TranslateType } from '../app/AppState';

const translate = (k: string): TranslateType => k;

type NativeMock = { canAuthenticate: jest.Mock; authenticate: jest.Mock };

// The controller keeps process-wide state (the freshness memory and the
// shared in-flight ceremony), so every test loads a fresh module registry.
const load = () => {
  jest.resetModules();
  const controller =
    require('../app/gateController') as typeof import('../app/gateController');
  const native = (require('../app/DeviceAuthModule') as { default: NativeMock })
    .default;
  return { controller, native };
};

const secured = (native: NativeMock) =>
  native.canAuthenticate.mockResolvedValue({ available: true, code: '' });

afterEach(() => {
  jest.restoreAllMocks();
  jest.useRealTimers();
});

test('an authenticated ceremony passes the gate', async () => {
  const { controller, native } = load();
  secured(native);
  native.authenticate.mockResolvedValue({ outcome: 'authenticated', code: '' });

  await expect(controller.askGate({ translate })).resolves.toEqual({
    kind: 'passed',
  });
  expect(native.authenticate).toHaveBeenCalledWith(
    'biometrics-message',
    'cancel',
  );
});

test('a declined ceremony locks, carrying the platform code as the param', async () => {
  const { controller, native } = load();
  secured(native);
  native.authenticate.mockResolvedValue({ outcome: 'declined', code: '10' });

  await expect(controller.askGate({ translate })).resolves.toMatchObject({
    kind: 'declined',
    failure: { errorKey: 'biometrics-failure-declined', param: '10' },
  });
});

test('an unavailable ceremony fails open under the notserved key', async () => {
  const { controller, native } = load();
  secured(native);
  native.authenticate.mockResolvedValue({ outcome: 'unavailable', code: '11' });

  await expect(controller.askGate({ translate })).resolves.toMatchObject({
    kind: 'failedOpen',
    failure: { errorKey: 'biometrics-failure-notserved', param: '11' },
  });
});

test('a device without security fails open before any ceremony', async () => {
  const { controller, native } = load();
  native.canAuthenticate.mockResolvedValue({ available: false, code: '12' });

  await expect(controller.askGate({ translate })).resolves.toMatchObject({
    kind: 'failedOpen',
    failure: { errorKey: 'biometrics-failure-nosecurity', param: '12' },
  });
  expect(native.authenticate).not.toHaveBeenCalled();
});

test('a trigger inside the freshness window shares the pass silently', async () => {
  const { controller, native } = load();
  secured(native);
  native.authenticate.mockResolvedValue({ outcome: 'authenticated', code: '' });

  await controller.askGate({ translate });
  await expect(controller.askGate({ translate })).resolves.toEqual({
    kind: 'passed',
  });
  expect(native.authenticate).toHaveBeenCalledTimes(1);
});

test('a trigger past the freshness window runs a new ceremony', async () => {
  const { controller, native } = load();
  secured(native);
  native.authenticate.mockResolvedValue({ outcome: 'authenticated', code: '' });
  const now = jest.spyOn(Date, 'now');

  now.mockReturnValue(1_000_000);
  await controller.askGate({ translate });
  now.mockReturnValue(1_000_000 + controller.AUTH_FRESHNESS_MS + 1);
  await controller.askGate({ translate });

  expect(native.authenticate).toHaveBeenCalledTimes(2);
});

test('concurrent triggers share one ceremony, a decline answering both', async () => {
  const { controller, native } = load();
  secured(native);
  let settle: (r: { outcome: string; code: string }) => void = () => {};
  native.authenticate.mockReturnValue(
    new Promise(resolve => {
      settle = resolve;
    }),
  );

  const first = controller.askGate({ translate });
  const second = controller.askGate({ translate });
  settle({ outcome: 'declined', code: '13' });

  await expect(first).resolves.toMatchObject({ kind: 'declined' });
  await expect(second).resolves.toMatchObject({ kind: 'declined' });
  expect(native.authenticate).toHaveBeenCalledTimes(1);
});

test('a ceremony the OS never answers fails open at the stall window', async () => {
  jest.useFakeTimers();
  const { controller, native } = load();
  secured(native);
  native.authenticate.mockReturnValue(new Promise(() => {}));

  const answer = controller.askGate({ translate });
  await jest.advanceTimersByTimeAsync(controller.CEREMONY_STALL_MS);

  await expect(answer).resolves.toMatchObject({
    kind: 'failedOpen',
    failure: { errorKey: 'biometrics-failure-stalled', param: 'authenticate' },
  });
});

test('a wedged availability probe fails the gate open at its own window', async () => {
  jest.useFakeTimers();
  const { controller, native } = load();
  native.canAuthenticate.mockReturnValue(new Promise(() => {}));

  const answer = controller.askGate({ translate });
  await jest.advanceTimersByTimeAsync(controller.PROBE_STALL_MS);

  await expect(answer).resolves.toMatchObject({
    kind: 'failedOpen',
    failure: {
      errorKey: 'biometrics-failure-stalled',
      param: 'canAuthenticate',
    },
  });
});

test('the Android blanking overlay rises before the prompt and drops after', async () => {
  const { controller, native } = load();
  const rn = require('react-native');
  const priorOS = rn.Platform.OS;
  rn.Platform.OS = 'android';
  try {
    secured(native);
    native.authenticate.mockResolvedValue({
      outcome: 'authenticated',
      code: '',
    });
    const seen: boolean[] = [];
    const sub = rn.DeviceEventEmitter.addListener(
      controller.BIOMETRIC_BLANKING_EVENT,
      (show: boolean) => seen.push(show),
    );

    await controller.askGate({ translate });
    sub.remove();
    expect(seen).toEqual([true, false]);
  } finally {
    rn.Platform.OS = priorOS;
  }
});

test('a failing background-flag restore never replaces the answer', async () => {
  const { controller, native } = load();
  const storage = (
    require('@react-native-async-storage/async-storage') as {
      default: { setItem: jest.Mock };
    }
  ).default;
  storage.setItem.mockRejectedValue(new Error('disk full'));
  secured(native);
  native.authenticate.mockResolvedValue({ outcome: 'authenticated', code: '' });

  await expect(controller.askGate({ translate })).resolves.toEqual({
    kind: 'passed',
  });
});

test('the device-security probe names why a device cannot secure', async () => {
  const { controller, native } = load();
  native.canAuthenticate.mockResolvedValue({ available: true, code: '' });
  await expect(controller.probeDeviceSecurity()).resolves.toEqual({
    kind: 'secured',
  });

  native.canAuthenticate.mockResolvedValue({ available: false, code: '' });
  await expect(controller.probeDeviceSecurity()).resolves.toMatchObject({
    kind: 'insecure',
    failure: { errorKey: 'biometrics-failure-nosecurity' },
  });
});

test('a wedged device-security probe reports the stall, never security', async () => {
  jest.useFakeTimers();
  const { controller, native } = load();
  native.canAuthenticate.mockReturnValue(new Promise(() => {}));

  const probe = controller.probeDeviceSecurity();
  await jest.advanceTimersByTimeAsync(controller.PROBE_STALL_MS);

  await expect(probe).resolves.toMatchObject({
    kind: 'insecure',
    failure: {
      errorKey: 'biometrics-failure-stalled',
      param: 'canAuthenticate',
    },
  });
});

test('a throwing availability call fails the gate open, never rejecting', async () => {
  const { controller, native } = load();
  native.canAuthenticate.mockImplementation(() => {
    throw new Error('DeviceAuth missing');
  });

  await expect(controller.askGate({ translate })).resolves.toMatchObject({
    kind: 'failedOpen',
    failure: {
      errorKey: 'biometrics-failure-notserved',
      param: expect.stringContaining('DeviceAuth missing'),
    },
  });
});

test('a rejecting ceremony fails the gate open, never rejecting', async () => {
  const { controller, native } = load();
  secured(native);
  native.authenticate.mockRejectedValue(new Error('bridge died'));

  await expect(controller.askGate({ translate })).resolves.toMatchObject({
    kind: 'failedOpen',
    failure: {
      errorKey: 'biometrics-failure-notserved',
      param: expect.stringContaining('bridge died'),
    },
  });
});

test('a throwing device-security probe answers insecure, never rejecting', async () => {
  const { controller, native } = load();
  native.canAuthenticate.mockImplementation(() => {
    throw new Error('DeviceAuth missing');
  });

  await expect(controller.probeDeviceSecurity()).resolves.toMatchObject({
    kind: 'insecure',
    failure: { errorKey: 'biometrics-failure-notserved' },
  });
});

test('a stall never fires over a provably-away app, and a late pass lands', async () => {
  jest.useFakeTimers();
  const { controller, native } = load();
  const rn = require('react-native');
  const priorState = rn.AppState.currentState;
  rn.AppState.currentState = 'background';
  try {
    secured(native);
    let settle: (r: { outcome: string; code: string }) => void = () => {};
    native.authenticate.mockReturnValue(
      new Promise(resolve => {
        settle = resolve;
      }),
    );

    const answer = controller.askGate({ translate });
    await jest.advanceTimersByTimeAsync(controller.CEREMONY_STALL_MS * 3);
    await expect(
      Promise.race([answer, Promise.resolve('pending')]),
    ).resolves.toBe('pending');

    settle({ outcome: 'authenticated', code: '' });
    await expect(answer).resolves.toEqual({ kind: 'passed' });
  } finally {
    rn.AppState.currentState = priorState;
  }
});

test('a ceremony interrupted by leaving the app locks, on both platforms', async () => {
  const { controller, native } = load();
  secured(native);
  // iOS reports the backgrounded sheet as LAError.systemCancel.
  native.authenticate.mockResolvedValue({ outcome: 'unavailable', code: '-4' });
  await expect(controller.askGate({ translate })).resolves.toMatchObject({
    kind: 'declined',
    failure: { errorKey: 'biometrics-failure-declined', param: '-4' },
  });

  // A cold Android start backgrounded before the prompt has no resumed
  // activity to attach it to.
  const second = load();
  secured(second.native);
  second.native.authenticate.mockResolvedValue({
    outcome: 'unavailable',
    code: 'no-resumed-activity',
  });
  await expect(second.controller.askGate({ translate })).resolves.toMatchObject(
    {
      kind: 'declined',
      failure: {
        errorKey: 'biometrics-failure-declined',
        param: 'no-resumed-activity',
      },
    },
  );
});

test('a trigger after a stalled ceremony adopts the pending prompt', async () => {
  jest.useFakeTimers();
  const { controller, native } = load();
  secured(native);
  let settle: (r: { outcome: string; code: string }) => void = () => {};
  native.authenticate.mockReturnValue(
    new Promise(resolve => {
      settle = resolve;
    }),
  );

  const first = controller.askGate({ translate });
  await jest.advanceTimersByTimeAsync(controller.CEREMONY_STALL_MS);
  await expect(first).resolves.toMatchObject({ kind: 'failedOpen' });

  // The prompt may still be on screen; a fresh authenticate() would
  // cancel one of the two and read as a decline nobody made.
  const second = controller.askGate({ translate });
  await jest.advanceTimersByTimeAsync(0);
  expect(native.authenticate).toHaveBeenCalledTimes(1);

  settle({ outcome: 'authenticated', code: '' });
  await expect(second).resolves.toEqual({ kind: 'passed' });
});

test('the probe carries the platform code that refused to secure', async () => {
  const { controller, native } = load();
  native.canAuthenticate.mockResolvedValue({ available: false, code: '12' });

  await expect(controller.probeDeviceSecurity()).resolves.toMatchObject({
    kind: 'insecure',
    failure: { errorKey: 'biometrics-failure-nosecurity', param: '12' },
  });
});

test('enactGateAnswer locks a decline, notices a fail-open, proceeds a pass', () => {
  const { controller } = load();
  const lock = jest.fn();
  const notice = jest.fn();
  const site = { lock, notice };

  const declined = {
    kind: 'declined',
    failure: {
      kind: 'error',
      errorKey: 'biometrics-failure-declined',
      param: '10',
    },
  } as const;
  expect(controller.enactGateAnswer(declined, site, translate)).toBe(false);
  expect(lock).toHaveBeenCalledWith(declined);
  expect(notice).not.toHaveBeenCalled();

  const failedOpen = {
    kind: 'failedOpen',
    failure: {
      kind: 'error',
      errorKey: 'biometrics-failure-stalled',
      param: 'authenticate',
    },
  } as const;
  expect(controller.enactGateAnswer(failedOpen, site, translate)).toBe(true);
  expect(notice).toHaveBeenCalledWith(expect.stringContaining('authenticate'));
  expect(lock).toHaveBeenCalledTimes(1);

  expect(controller.enactGateAnswer({ kind: 'passed' }, site, translate)).toBe(
    true,
  );
  expect(lock).toHaveBeenCalledTimes(1);
  expect(notice).toHaveBeenCalledTimes(1);
});

test('a carried answer is consumed as data, never re-asking the gate', async () => {
  const { controller, native } = load();
  secured(native);
  const carried = {
    kind: 'failedOpen',
    failure: {
      kind: 'error',
      errorKey: 'biometrics-failure-stalled',
      param: 'authenticate',
    },
  } as const;

  await expect(
    controller.resolveTriggerGate(carried, true, { translate }),
  ).resolves.toBe(carried);
  expect(native.authenticate).not.toHaveBeenCalled();
});

test('an empty-handed trigger asks only when enabled', async () => {
  const { controller, native } = load();
  secured(native);
  native.authenticate.mockResolvedValue({ outcome: 'authenticated', code: '' });

  await expect(
    controller.resolveTriggerGate(undefined, false, { translate }),
  ).resolves.toEqual({ kind: 'passed' });
  expect(native.authenticate).not.toHaveBeenCalled();

  await expect(
    controller.resolveTriggerGate(undefined, true, { translate }),
  ).resolves.toEqual({ kind: 'passed' });
  expect(native.authenticate).toHaveBeenCalledTimes(1);
});

test('resetGateController clears the freshness memory', async () => {
  const { controller, native } = load();
  secured(native);
  native.authenticate.mockResolvedValue({ outcome: 'authenticated', code: '' });

  await controller.askGate({ translate });
  controller.resetGateController();
  await controller.askGate({ translate });

  expect(native.authenticate).toHaveBeenCalledTimes(2);
});

test('every gate failure key exists in every catalog', () => {
  const keys = [
    'biometrics-failure-stalled',
    'biometrics-failure-declined',
    'biometrics-failure-notserved',
    'biometrics-failure-nosecurity',
  ];
  const languages = ['en', 'es', 'pt', 'ru', 'tr'];
  for (const language of languages) {
    const catalog = require(`../app/translations/${language}.json`) as Record<
      string,
      unknown
    >;
    for (const key of keys) {
      expect({ language, key, entry: catalog[key] }).toEqual({
        language,
        key,
        entry: expect.any(String),
      });
    }
  }
});
