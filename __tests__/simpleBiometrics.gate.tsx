/**
 * Issue #1266. The gate guards a keychain entry holding the string "1", so no
 * failure of it is worth trapping a user outside their own wallet. These cover
 * the ways it used to do exactly that (a platform error read as a decline, a
 * native call that never comes back) and the ways the fixes overcorrected
 * (two failed prompts in a row opening the gate, a watchdog firing over a
 * live prompt, a never-settling call making Try Again a permanent lock).
 */
jest.mock('react-native', () => {
  const appState = {
    currentState: 'active',
    listeners: [] as Array<(next: string) => void>,
  };
  return {
    __esModule: true,
    Platform: {
      OS: 'ios',
      select: (spec: Record<string, unknown>) => spec.ios,
    },
    AppState: {
      get currentState() {
        return appState.currentState;
      },
      addEventListener: (_event: string, listener: (next: string) => void) => {
        appState.listeners.push(listener);
        return {
          remove: () => {
            appState.listeners = appState.listeners.filter(l => l !== listener);
          },
        };
      },
    },
    DeviceEventEmitter: { emit: jest.fn() },
    __appState: appState,
  };
});

import type { GateVerdict } from '../app/simpleBiometrics';
import type { TranslateType } from '../app/AppState';

type GateModule = typeof import('../app/simpleBiometrics');
type RnMock = {
  Platform: { OS: string };
  DeviceEventEmitter: { emit: jest.Mock };
  __appState: {
    currentState: string;
    listeners: Array<(next: string) => void>;
  };
};

let simpleBiometrics: GateModule['default'];
let getLastGateFailure: GateModule['getLastGateFailure'];
let blankingEvent: GateModule['BIOMETRIC_BLANKING_EVENT'];
let kc: Record<string, jest.Mock>;
let rn: RnMock;

const translate = (k: string): TranslateType => k;
const osError = (code: string) => Object.assign(new Error('boom'), { code });

const setAppState = (next: string) => {
  rn.__appState.currentState = next;
  [...rn.__appState.listeners].forEach(l => l(next));
};

beforeEach(() => {
  // The gate keeps a process-wide lifecycle, so every test loads a fresh
  // module (and, through the re-run mock factories, fresh mocks).
  jest.resetModules();
  rn = require('react-native');
  kc = require('react-native-keychain');
  const gate: GateModule = require('../app/simpleBiometrics');
  simpleBiometrics = gate.default;
  getLastGateFailure = gate.getLastGateFailure;
  blankingEvent = gate.BIOMETRIC_BLANKING_EVENT;
  kc.canImplyAuthentication.mockResolvedValue(true);
  kc.resetGenericPassword.mockResolvedValue(true);
  kc.setGenericPassword.mockResolvedValue({});
});

afterEach(() => {
  jest.useRealTimers();
});

test('errSecUserCanceled is still a decline', async () => {
  kc.hasGenericPassword.mockResolvedValue(true);
  kc.getGenericPassword.mockRejectedValue(osError('-128'));

  await expect(
    simpleBiometrics({ translate, purpose: 'appEntry' }),
  ).resolves.toMatchObject({
    kind: 'declined',
  });
  expect(kc.setGenericPassword).not.toHaveBeenCalled();
});

test('errSecAuthFailed against a rebuilt sentinel declines instead of opening the gate', async () => {
  kc.hasGenericPassword.mockResolvedValue(true);
  kc.getGenericPassword.mockRejectedValue(osError('-25293'));

  // The first failure earns one rebuild (issue #1266); the second runs
  // against an entry written seconds ago, so it is the user failing auth.
  // Before this fix the pair resolved to `undefined` -> callers proceeded.
  await expect(
    simpleBiometrics({ translate, purpose: 'appEntry' }),
  ).resolves.toMatchObject({
    kind: 'declined',
  });
  expect(kc.setGenericPassword).toHaveBeenCalledTimes(1);
});

test('a rebuilt sentinel that then reads fine authenticates', async () => {
  kc.hasGenericPassword.mockResolvedValue(true);
  kc.getGenericPassword
    .mockRejectedValueOnce(osError('-25293'))
    .mockResolvedValueOnce({ password: '1' });

  await expect(
    simpleBiometrics({ translate, purpose: 'appEntry' }),
  ).resolves.toMatchObject({
    kind: 'authenticated',
  });
});

test('a first-run sentinel that fails auth declines without a second rebuild', async () => {
  kc.hasGenericPassword.mockResolvedValue(false);
  kc.getGenericPassword.mockRejectedValue(osError('-25293'));

  await expect(
    simpleBiometrics({ translate, purpose: 'appEntry' }),
  ).resolves.toMatchObject({
    kind: 'declined',
  });
  expect(kc.setGenericPassword).toHaveBeenCalledTimes(1);
});

test('a wedged native queue is unavailable instead of hanging', async () => {
  jest.useFakeTimers();
  kc.hasGenericPassword.mockReturnValue(new Promise(() => {}));

  const gate = simpleBiometrics({ translate, purpose: 'appEntry' });
  await Promise.resolve();
  await jest.advanceTimersByTimeAsync(10 * 1000);

  await expect(gate).resolves.toMatchObject({ kind: 'unavailable' });
  expect(getLastGateFailure()).toMatchObject({
    errorKey: 'biometrics-failure-stalled',
  });
});

test('a wedged capability probe is unavailable too', async () => {
  jest.useFakeTimers();
  kc.canImplyAuthentication.mockReturnValue(new Promise(() => {}));

  const gate = simpleBiometrics({ translate, purpose: 'appEntry' });
  await Promise.resolve();
  await jest.advanceTimersByTimeAsync(10 * 1000);

  await expect(gate).resolves.toMatchObject({ kind: 'unavailable' });
  expect(kc.hasGenericPassword).not.toHaveBeenCalled();
});

test('the countdown pauses off-active and re-arms in full on return', async () => {
  jest.useFakeTimers();
  kc.hasGenericPassword.mockResolvedValue(true);
  kc.getGenericPassword.mockReturnValue(new Promise(() => {}));

  let verdict: GateVerdict | undefined;
  simpleBiometrics({ translate, purpose: 'appEntry' }).then(v => {
    verdict = v;
  });
  await jest.advanceTimersByTimeAsync(5 * 1000);
  setAppState('inactive'); // the auth sheet is up
  await jest.advanceTimersByTimeAsync(60 * 1000);
  expect(verdict).toBeUndefined(); // parked on the user: no stall
  setAppState('active'); // sheet gone, callback lost
  await jest.advanceTimersByTimeAsync(9 * 1000);
  expect(verdict).toBeUndefined(); // the full window, not a remainder
  // The last second of the window plus the iOS veto grace.
  await jest.advanceTimersByTimeAsync(2 * 1000);
  expect(verdict).toMatchObject({ kind: 'unavailable' });
});

test('a gate that runs before the app is active never stalls the live prompt', async () => {
  jest.useFakeTimers();
  rn.__appState.currentState = 'inactive';
  kc.hasGenericPassword.mockResolvedValue(true);
  let serveSentinel: (cred: { password: string }) => void = () => {};
  kc.getGenericPassword.mockReturnValue(
    new Promise(resolve => {
      serveSentinel = resolve;
    }),
  );

  let verdict: GateVerdict | undefined;
  simpleBiometrics({ translate, purpose: 'appEntry' }).then(v => {
    verdict = v;
  });
  await jest.advanceTimersByTimeAsync(60 * 1000);
  expect(verdict).toBeUndefined(); // no fire while the user types a passcode
  serveSentinel({ password: '1' });
  await jest.advanceTimersByTimeAsync(0);
  expect(verdict).toMatchObject({ kind: 'authenticated' });
});

test('a wedged call under an unknown app state still settles', async () => {
  // RN can seed currentState as 'unknown' at launch and never replays the
  // missed transition, so a watchdog that waits for proof of 'active'
  // before arming would leave a wedged call pending forever.
  jest.useFakeTimers();
  rn.__appState.currentState = 'unknown';
  kc.hasGenericPassword.mockResolvedValue(true);
  kc.getGenericPassword.mockReturnValue(new Promise(() => {}));

  let verdict: GateVerdict | undefined;
  simpleBiometrics({ translate, purpose: 'appEntry' }).then(v => {
    verdict = v;
  });
  // The window plus the iOS veto grace: an 'unknown' state never vetoes.
  await jest.advanceTimersByTimeAsync(11 * 1000);
  expect(verdict).toMatchObject({ kind: 'unavailable' });
});

test('a retry after a stalled gate starts a fresh run immediately', async () => {
  jest.useFakeTimers();
  rn.Platform.OS = 'android';
  kc.getSupportedBiometryType.mockResolvedValue('Fingerprint');
  kc.hasGenericPassword.mockResolvedValue(true);
  kc.getGenericPassword.mockReturnValue(new Promise(() => {}));

  let first: GateVerdict | undefined;
  simpleBiometrics({ translate, purpose: 'appEntry' }).then(v => {
    first = v;
  });
  await jest.advanceTimersByTimeAsync(60 * 1000);
  expect(first).toMatchObject({ kind: 'declined' });

  // Try Again issues a fresh prompt at once, even though the first read is
  // still pending in the native module. The collision can answer the fresh
  // prompt ERROR_CANCELED, one bounded and retriable decline; holding the
  // retry back instead made a never-settling call a decline loop no prompt
  // could ever satisfy.
  let second: GateVerdict | undefined;
  simpleBiometrics({ translate, purpose: 'appEntry' }).then(v => {
    second = v;
  });
  await jest.advanceTimersByTimeAsync(1000);
  expect(kc.getGenericPassword).toHaveBeenCalledTimes(2);
  await jest.advanceTimersByTimeAsync(60 * 1000);
  expect(second).toMatchObject({ kind: 'declined' });
});

test('a collision decline is bounded and the next try succeeds', async () => {
  jest.useFakeTimers();
  rn.Platform.OS = 'android';
  kc.getSupportedBiometryType.mockResolvedValue('Fingerprint');
  kc.hasGenericPassword.mockResolvedValue(true);
  kc.getGenericPassword
    .mockReturnValueOnce(new Promise(() => {})) // wedged first read
    .mockRejectedValueOnce(
      Object.assign(new Error('code: 5, msg: Canceled'), {
        code: 'E_CRYPTO_FAILED',
      }),
    ) // the fresh prompt collides with the pending call
    .mockResolvedValue({ password: '1' });

  let first: GateVerdict | undefined;
  simpleBiometrics({ translate, purpose: 'appEntry' }).then(v => {
    first = v;
  });
  await jest.advanceTimersByTimeAsync(60 * 1000);
  expect(first).toMatchObject({ kind: 'declined' });

  let second: GateVerdict | undefined;
  simpleBiometrics({ translate, purpose: 'appEntry' }).then(v => {
    second = v;
  });
  await jest.advanceTimersByTimeAsync(1000);
  expect(second).toMatchObject({ kind: 'declined' }); // bounded, immediate

  let third: GateVerdict | undefined;
  simpleBiometrics({ translate, purpose: 'appEntry' }).then(v => {
    third = v;
  });
  await jest.advanceTimersByTimeAsync(1000);
  expect(third).toMatchObject({ kind: 'authenticated' }); // and retriable
});

test('the blanking overlay drops at the verdict, prompt or no prompt', async () => {
  jest.useFakeTimers();
  rn.Platform.OS = 'android';
  kc.getSupportedBiometryType.mockResolvedValue('Fingerprint');
  kc.hasGenericPassword.mockResolvedValue(true);
  kc.getGenericPassword.mockReturnValue(new Promise(() => {}));

  let verdict: GateVerdict | undefined;
  simpleBiometrics({ translate, purpose: 'appEntry' }).then(v => {
    verdict = v;
  });
  await jest.advanceTimersByTimeAsync(60 * 1000);
  expect(verdict).toMatchObject({ kind: 'declined' });
  // The stranded prompt may still be on screen; dropping anyway trades a
  // bounded exposure behind it for never burying a screen under a black,
  // dead overlay.
  expect(rn.DeviceEventEmitter.emit).toHaveBeenCalledWith(blankingEvent, false);
});

test('an android interactive stall locks with a retriable decline', async () => {
  jest.useFakeTimers();
  rn.Platform.OS = 'android';
  kc.getSupportedBiometryType.mockResolvedValue('Fingerprint');
  kc.hasGenericPassword.mockResolvedValue(true);
  kc.getGenericPassword.mockReturnValue(new Promise(() => {}));

  let verdict: GateVerdict | undefined;
  simpleBiometrics({ translate, purpose: 'appEntry' }).then(v => {
    verdict = v;
  });
  await jest.advanceTimersByTimeAsync(10 * 1000);
  expect(verdict).toBeUndefined(); // the iOS window must not govern Android
  await jest.advanceTimersByTimeAsync(50 * 1000);
  expect(verdict).toMatchObject({ kind: 'declined' });
  expect(getLastGateFailure()).toMatchObject({
    errorKey: 'biometrics-failure-stalled',
  });
});

test('concurrent callers share one gate run', async () => {
  kc.hasGenericPassword.mockResolvedValue(true);
  kc.getGenericPassword.mockResolvedValue({ password: '1' });

  const [first, second] = await Promise.all([
    simpleBiometrics({ translate, purpose: 'appEntry' }),
    simpleBiometrics({ translate, purpose: 'appEntry' }),
  ]);
  expect(first).toMatchObject({ kind: 'authenticated' });
  expect(second).toMatchObject({ kind: 'authenticated' });
  expect(kc.getGenericPassword).toHaveBeenCalledTimes(1);
});

test('a resign-active event landing just after the fire still vetoes the stall', async () => {
  // The auth sheet can appear near the end of the window; the native side
  // has left 'active', but the change event reaches JS milliseconds after
  // the timer fires and the veto would read a stale 'active'.
  jest.useFakeTimers();
  kc.hasGenericPassword.mockResolvedValue(true);
  let serveSentinel: (cred: { password: string }) => void = () => {};
  kc.getGenericPassword.mockReturnValue(
    new Promise(resolve => {
      serveSentinel = resolve;
    }),
  );

  let verdict: GateVerdict | undefined;
  simpleBiometrics({ translate, purpose: 'appEntry' }).then(v => {
    verdict = v;
  });
  await jest.advanceTimersByTimeAsync(10 * 1000); // the window closes
  setAppState('inactive'); // the delayed event lands within the grace
  await jest.advanceTimersByTimeAsync(60 * 1000);
  expect(verdict).toBeUndefined(); // parked on the user, not stalled
  serveSentinel({ password: '1' });
  await jest.advanceTimersByTimeAsync(0);
  expect(verdict).toMatchObject({ kind: 'authenticated' });
});

test('an android launch with no frames still settles the gate', async () => {
  jest.useFakeTimers();
  rn.Platform.OS = 'android';
  const realFrame = globalThis.requestAnimationFrame;
  globalThis.requestAnimationFrame = (() =>
    0) as typeof globalThis.requestAnimationFrame;
  try {
    kc.getSupportedBiometryType.mockResolvedValue('Fingerprint');
    kc.hasGenericPassword.mockResolvedValue(true);
    kc.getGenericPassword.mockResolvedValue({ password: '1' });

    let verdict: GateVerdict | undefined;
    simpleBiometrics({ translate, purpose: 'appEntry' }).then(v => {
      verdict = v;
    });
    await jest.advanceTimersByTimeAsync(10 * 1000);
    await jest.advanceTimersByTimeAsync(0);
    expect(verdict).toMatchObject({ kind: 'authenticated' });
  } finally {
    globalThis.requestAnimationFrame = realFrame;
  }
});

test('a wedged storage write in the epilogue still settles the verdict', async () => {
  jest.useFakeTimers();
  const storage = (
    require('@react-native-async-storage/async-storage') as {
      default: Record<string, jest.Mock>;
    }
  ).default;
  storage.setItem.mockReturnValue(new Promise(() => {}));
  kc.hasGenericPassword.mockResolvedValue(true);
  kc.getGenericPassword.mockResolvedValue({ password: '1' });

  let verdict: GateVerdict | undefined;
  simpleBiometrics({ translate, purpose: 'appEntry' }).then(v => {
    verdict = v;
  });
  await jest.advanceTimersByTimeAsync(10 * 1000);
  expect(verdict).toMatchObject({ kind: 'authenticated' });
});

test('an authentication that outlasts the window locks, then recovers on the next try', async () => {
  // The 60 s lock is the chosen policy: failing open instead would let
  // whoever holds the phone wait out the prompt. What the lifecycle owes
  // the slow-but-legitimate user is an instant, working retry once their
  // stranded call settles.
  jest.useFakeTimers();
  rn.Platform.OS = 'android';
  kc.getSupportedBiometryType.mockResolvedValue('Fingerprint');
  kc.hasGenericPassword.mockResolvedValue(true);
  let servePrompt: (cred: { password: string }) => void = () => {};
  kc.getGenericPassword
    .mockReturnValueOnce(
      new Promise(resolve => {
        servePrompt = resolve;
      }),
    )
    .mockResolvedValue({ password: '1' });

  let first: GateVerdict | undefined;
  simpleBiometrics({ translate, purpose: 'appEntry' }).then(v => {
    first = v;
  });
  await jest.advanceTimersByTimeAsync(60 * 1000);
  expect(first).toMatchObject({ kind: 'declined' }); // still authenticating

  servePrompt({ password: '1' }); // the slow authentication lands late
  await jest.advanceTimersByTimeAsync(0);
  let second: GateVerdict | undefined;
  simpleBiometrics({ translate, purpose: 'appEntry' }).then(v => {
    second = v;
  });
  await jest.advanceTimersByTimeAsync(100); // one frame, no second window
  expect(second).toMatchObject({ kind: 'authenticated' });
  expect(kc.getGenericPassword).toHaveBeenCalledTimes(2);
});

test('a cancelled screen prompt does not relock the app gate', async () => {
  kc.hasGenericPassword.mockResolvedValue(true);
  let refuse: (e: Error) => void = () => {};
  kc.getGenericPassword
    .mockReturnValueOnce(
      new Promise((_serve, reject) => {
        refuse = reject;
      }),
    )
    .mockResolvedValue({ password: '1' });

  const screenGate = simpleBiometrics({ translate, purpose: 'screenEntry' });
  const appGate = simpleBiometrics({ translate, purpose: 'appEntry' });
  refuse(osError('-128')); // the user cancels, meaning 'leave this screen'
  await expect(screenGate).resolves.toMatchObject({ kind: 'declined' });
  // The decline answers only the purpose the user was shown; the app gate
  // runs its own prompt instead of relocking the wallet on it.
  await expect(appGate).resolves.toMatchObject({ kind: 'authenticated' });
  expect(kc.getGenericPassword).toHaveBeenCalledTimes(2);
});

test('a wedge starting at the v1 cleanup settles unavailable in the probe window', async () => {
  jest.useFakeTimers();
  rn.Platform.OS = 'android';
  kc.getSupportedBiometryType.mockResolvedValue('Fingerprint');
  kc.hasGenericPassword.mockResolvedValue(false);
  kc.resetGenericPassword.mockReturnValue(new Promise(() => {}));
  kc.setGenericPassword.mockReturnValue(new Promise(() => {}));
  kc.getGenericPassword.mockReturnValue(new Promise(() => {}));

  let verdict: GateVerdict | undefined;
  simpleBiometrics({ translate, purpose: 'appEntry' }).then(v => {
    verdict = v;
  });
  // The wedge is caught at the non-interactive cleanup, not ridden into the
  // interactive attempt and its 60 s window.
  await jest.advanceTimersByTimeAsync(10 * 1000);
  expect(verdict).toMatchObject({ kind: 'unavailable' });
  expect(getLastGateFailure()).toMatchObject({
    param: 'resetGenericPassword:v1',
  });
});

test('an android lockout declines instead of opening the gate', async () => {
  // Five failed faces must not classify as brokenEntry: a rebuild there
  // would turn the lockout into 'unavailable' and open the wallet.
  rn.Platform.OS = 'android';
  kc.getSupportedBiometryType.mockResolvedValue('Fingerprint');
  kc.hasGenericPassword.mockResolvedValue(true);
  kc.getGenericPassword.mockRejectedValue(
    Object.assign(new Error('code: 7, msg: Too many attempts'), {
      code: 'E_CRYPTO_FAILED',
    }),
  );

  await expect(
    simpleBiometrics({ translate, purpose: 'appEntry' }),
  ).resolves.toMatchObject({ kind: 'declined' });
  expect(kc.setGenericPassword).not.toHaveBeenCalled();
});

test('a permanent android lockout declines too', async () => {
  rn.Platform.OS = 'android';
  kc.getSupportedBiometryType.mockResolvedValue('Fingerprint');
  kc.hasGenericPassword.mockResolvedValue(true);
  kc.getGenericPassword.mockRejectedValue(
    Object.assign(new Error('code: 9, msg: Too many attempts. Locked.'), {
      code: 'E_CRYPTO_FAILED',
    }),
  );

  await expect(
    simpleBiometrics({ translate, purpose: 'appEntry' }),
  ).resolves.toMatchObject({ kind: 'declined' });
  expect(kc.setGenericPassword).not.toHaveBeenCalled();
});

test('a missing sentinel read rebuilds and then authenticates', async () => {
  kc.hasGenericPassword.mockResolvedValue(true);
  kc.getGenericPassword
    .mockResolvedValueOnce(false) // found no entry: no prompt was satisfied
    .mockResolvedValueOnce({ password: '1' });

  await expect(
    simpleBiometrics({ translate, purpose: 'appEntry' }),
  ).resolves.toMatchObject({ kind: 'authenticated' });
  expect(kc.setGenericPassword).toHaveBeenCalledTimes(1);
  expect(kc.resetGenericPassword).toHaveBeenCalledTimes(1);
});

test('a stalled sentinel write locks by the android policy', async () => {
  jest.useFakeTimers();
  rn.Platform.OS = 'android';
  kc.getSupportedBiometryType.mockResolvedValue('Fingerprint');
  kc.hasGenericPassword.mockResolvedValue(false);
  kc.setGenericPassword.mockReturnValue(new Promise(() => {}));

  let verdict: GateVerdict | undefined;
  simpleBiometrics({ translate, purpose: 'appEntry' }).then(v => {
    verdict = v;
  });
  await jest.advanceTimersByTimeAsync(60 * 1000);
  expect(verdict).toMatchObject({ kind: 'declined' });
  expect(getLastGateFailure()).toMatchObject({
    kind: 'error',
    errorKey: 'biometrics-failure-stalled',
    param: 'setGenericPassword',
  });
  expect(kc.getGenericPassword).not.toHaveBeenCalled();
});

test('a stalled rebuild clear settles unavailable in the probe window', async () => {
  jest.useFakeTimers();
  kc.hasGenericPassword.mockResolvedValue(true);
  kc.getGenericPassword.mockRejectedValue(osError('-25308'));
  kc.resetGenericPassword.mockReturnValue(new Promise(() => {}));

  let verdict: GateVerdict | undefined;
  simpleBiometrics({ translate, purpose: 'appEntry' }).then(v => {
    verdict = v;
  });
  await jest.advanceTimersByTimeAsync(10 * 1000);
  expect(verdict).toMatchObject({ kind: 'unavailable' });
  // The rebuild clear and the v1 migration clear are different defects;
  // their stall diagnostics must stay distinguishable.
  expect(getLastGateFailure()).toMatchObject({
    kind: 'error',
    errorKey: 'biometrics-failure-stalled',
    param: 'resetGenericPassword:rebuild',
  });
  expect(kc.setGenericPassword).not.toHaveBeenCalled();
});

test('an unexpected probe rejection is unavailable, nobody was asked', async () => {
  kc.hasGenericPassword.mockRejectedValue(osError('-34018'));

  await expect(
    simpleBiometrics({ translate, purpose: 'appEntry' }),
  ).resolves.toMatchObject({ kind: 'unavailable' });
  expect(kc.getGenericPassword).not.toHaveBeenCalled();
});

test('an ios retry after a stalled gate also runs fresh', async () => {
  jest.useFakeTimers();
  kc.hasGenericPassword.mockResolvedValue(true);
  kc.getGenericPassword.mockReturnValue(new Promise(() => {}));

  let first: GateVerdict | undefined;
  simpleBiometrics({ translate, purpose: 'appEntry' }).then(v => {
    first = v;
  });
  await jest.advanceTimersByTimeAsync(11 * 1000); // window plus veto grace
  expect(first).toMatchObject({ kind: 'unavailable' });

  let second: GateVerdict | undefined;
  simpleBiometrics({ translate, purpose: 'appEntry' }).then(v => {
    second = v;
  });
  await jest.advanceTimersByTimeAsync(1000);
  expect(kc.getGenericPassword).toHaveBeenCalledTimes(2);
  await jest.advanceTimersByTimeAsync(11 * 1000);
  expect(second).toMatchObject({ kind: 'unavailable' });
});

test('the foreground-flag restore completes before the verdict', async () => {
  const storage = (
    require('@react-native-async-storage/async-storage') as {
      default: Record<string, jest.Mock>;
    }
  ).default;
  let restore: () => void = () => {};
  storage.setItem.mockReturnValue(
    new Promise<void>(resolve => {
      restore = () => resolve();
    }),
  );
  kc.hasGenericPassword.mockResolvedValue(true);
  kc.getGenericPassword.mockResolvedValue({ password: '1' });

  let verdict: GateVerdict | undefined;
  simpleBiometrics({ translate, purpose: 'appEntry' }).then(v => {
    verdict = v;
  });
  await new Promise(resolve => setTimeout(resolve, 0));
  await new Promise(resolve => setTimeout(resolve, 0));
  expect(verdict).toBeUndefined(); // the epilogue holds the verdict
  restore();
  await new Promise(resolve => setTimeout(resolve, 0));
  expect(verdict).toMatchObject({ kind: 'authenticated' });
});

test('a fresh sentinel the platform will not serve fails open, not locked', async () => {
  // errSecInteractionNotAllowed: the OS refused to run the prompt at all,
  // so nobody failed an authentication and locking would re-open the
  // issue #1266 trap for the platform-error class.
  kc.hasGenericPassword.mockResolvedValue(true);
  kc.getGenericPassword.mockRejectedValue(osError('-25308'));

  await expect(
    simpleBiometrics({ translate, purpose: 'appEntry' }),
  ).resolves.toMatchObject({
    kind: 'unavailable',
  });
  expect(kc.setGenericPassword).toHaveBeenCalledTimes(1); // one rebuild try
});

test('an android hardware error on a fresh sentinel fails open, not locked', async () => {
  rn.Platform.OS = 'android';
  kc.getSupportedBiometryType.mockResolvedValue('Fingerprint');
  kc.hasGenericPassword.mockResolvedValue(true);
  kc.getGenericPassword.mockRejectedValue(
    Object.assign(new Error('code: 1, msg: Hardware unavailable'), {
      code: 'E_CRYPTO_FAILED',
    }),
  );

  await expect(
    simpleBiometrics({ translate, purpose: 'appEntry' }),
  ).resolves.toMatchObject({
    kind: 'unavailable',
  });
});

test('a preflight refusal reports its own reason, not a previous decline', async () => {
  kc.hasGenericPassword.mockResolvedValue(true);
  kc.getGenericPassword.mockRejectedValue(osError('-128'));
  await expect(
    simpleBiometrics({ translate, purpose: 'appEntry' }),
  ).resolves.toMatchObject({
    kind: 'declined',
  });

  kc.canImplyAuthentication.mockResolvedValue(false); // passcode removed
  const verdict = await simpleBiometrics({ translate, purpose: 'appEntry' });
  expect(verdict).toMatchObject({
    kind: 'unavailable',
    failure: { kind: 'error', errorKey: 'biometrics-failure-nosecurity' },
  });
  expect(getLastGateFailure()).toMatchObject({
    kind: 'error',
    errorKey: 'biometrics-failure-nosecurity',
  });
});

test('a failure before the attempt still settles and drops the overlay', async () => {
  // The overlay must be raised inside the try whose finally lowers it: a
  // rejection between the raise and the try would otherwise leave an
  // unclearable black Modal with no external hatch.
  jest.useFakeTimers();
  rn.Platform.OS = 'android';
  const realFrame = globalThis.requestAnimationFrame;
  globalThis.requestAnimationFrame = (() => {
    throw new Error('no frames');
  }) as typeof globalThis.requestAnimationFrame;
  try {
    kc.getSupportedBiometryType.mockResolvedValue('Fingerprint');
    kc.hasGenericPassword.mockResolvedValue(true);
    kc.getGenericPassword.mockResolvedValue({ password: '1' });

    let verdict: GateVerdict | undefined;
    simpleBiometrics({ translate, purpose: 'appEntry' }).then(v => {
      verdict = v;
    });
    await jest.advanceTimersByTimeAsync(1000);
    expect(verdict).toMatchObject({ kind: 'unavailable' });
    expect(rn.DeviceEventEmitter.emit).toHaveBeenCalledWith(
      blankingEvent,
      false,
    );
  } finally {
    globalThis.requestAnimationFrame = realFrame;
  }
});

test('a rejecting storage write does not eat the verdict', async () => {
  const storage = (
    require('@react-native-async-storage/async-storage') as {
      default: Record<string, jest.Mock>;
    }
  ).default;
  storage.setItem.mockRejectedValue(new Error('disk full'));
  kc.hasGenericPassword.mockResolvedValue(true);
  kc.getGenericPassword.mockResolvedValue({ password: '1' });

  await expect(
    simpleBiometrics({ translate, purpose: 'appEntry' }),
  ).resolves.toMatchObject({ kind: 'authenticated' });
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

test('a decline is shared with a concurrent caller without a second prompt', async () => {
  // Distinct authorization points deliberately share one run: the sentinel
  // read reuses the OS auth window, and a second concurrent prompt would
  // collide with the first (Android answers ERROR_CANCELED).
  kc.hasGenericPassword.mockResolvedValue(true);
  kc.getGenericPassword.mockRejectedValue(osError('-128'));

  const [first, second] = await Promise.all([
    simpleBiometrics({ translate, purpose: 'appEntry' }),
    simpleBiometrics({ translate, purpose: 'appEntry' }),
  ]);
  expect(first).toMatchObject({ kind: 'declined' });
  expect(second).toMatchObject({ kind: 'declined' });
  expect(kc.getGenericPassword).toHaveBeenCalledTimes(1);
});
