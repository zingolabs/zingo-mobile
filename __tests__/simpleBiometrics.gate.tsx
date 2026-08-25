/**
 * Issue #1266. The gate guards a keychain entry holding the string "1", so no
 * failure of it is worth trapping a user outside their own wallet. These cover
 * the ways it used to do exactly that (a platform error read as a decline, a
 * native call that never comes back) and the ways the fixes overcorrected
 * (two failed prompts in a row opening the gate, a watchdog firing over a
 * live prompt).
 */
jest.mock('react-native', () => {
  const appState = {
    currentState: 'active',
    listeners: [] as Array<(next: string) => void>,
  };
  return {
    __esModule: true,
    Platform: { OS: 'ios', select: (o: any) => o.ios },
    AppState: {
      get currentState() {
        return appState.currentState;
      },
      addEventListener: (_event: string, listener: (next: string) => void) => {
        appState.listeners.push(listener);
        return {
          remove: () => {
            appState.listeners = appState.listeners.filter(
              l => l !== listener,
            );
          },
        };
      },
    },
    DeviceEventEmitter: { emit: jest.fn() },
    __appState: appState,
  };
});

import * as Keychain from 'react-native-keychain';
import simpleBiometrics, {
  GateVerdict,
  getLastGateFailure,
} from '../app/simpleBiometrics';

const kc = Keychain as unknown as Record<string, jest.Mock>;
const rn = jest.requireMock('react-native') as {
  Platform: { OS: string };
  __appState: { currentState: string; listeners: Array<(next: string) => void> };
};
const translate = ((k: string) => k) as never;
const osError = (code: string) => Object.assign(new Error('boom'), { code });

const setAppState = (next: string) => {
  rn.__appState.currentState = next;
  [...rn.__appState.listeners].forEach(l => l(next));
};

beforeEach(() => {
  jest.clearAllMocks();
  rn.Platform.OS = 'ios';
  rn.__appState.currentState = 'active';
  rn.__appState.listeners = [];
  kc.canImplyAuthentication.mockResolvedValue(true);
  kc.resetGenericPassword.mockResolvedValue(true);
  kc.setGenericPassword.mockResolvedValue({});
});

test('errSecUserCanceled is still a decline', async () => {
  kc.hasGenericPassword.mockResolvedValue(true);
  kc.getGenericPassword.mockRejectedValue(osError('-128'));

  await expect(simpleBiometrics({ translate })).resolves.toMatchObject({
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
  await expect(simpleBiometrics({ translate })).resolves.toMatchObject({
    kind: 'declined',
  });
  expect(kc.setGenericPassword).toHaveBeenCalledTimes(1);
});

test('a rebuilt sentinel that then reads fine authenticates', async () => {
  kc.hasGenericPassword.mockResolvedValue(true);
  kc.getGenericPassword
    .mockRejectedValueOnce(osError('-25293'))
    .mockResolvedValueOnce({ password: '1' });

  await expect(simpleBiometrics({ translate })).resolves.toMatchObject({
    kind: 'authenticated',
  });
});

test('a first-run sentinel that fails auth declines without a second rebuild', async () => {
  kc.hasGenericPassword.mockResolvedValue(false);
  kc.getGenericPassword.mockRejectedValue(osError('-25293'));

  await expect(simpleBiometrics({ translate })).resolves.toMatchObject({
    kind: 'declined',
  });
  expect(kc.setGenericPassword).toHaveBeenCalledTimes(1);
});

test('a wedged native queue is unavailable instead of hanging', async () => {
  jest.useFakeTimers();
  kc.hasGenericPassword.mockReturnValue(new Promise(() => {}));

  const gate = simpleBiometrics({ translate });
  await Promise.resolve();
  await jest.advanceTimersByTimeAsync(10 * 1000);

  await expect(gate).resolves.toMatchObject({ kind: 'unavailable' });
  expect(getLastGateFailure()).toMatch(/stalled/);
  jest.useRealTimers();
});

test('a wedged capability probe is unavailable too', async () => {
  jest.useFakeTimers();
  kc.canImplyAuthentication.mockReturnValue(new Promise(() => {}));

  const gate = simpleBiometrics({ translate });
  await Promise.resolve();
  await jest.advanceTimersByTimeAsync(10 * 1000);

  await expect(gate).resolves.toMatchObject({ kind: 'unavailable' });
  expect(kc.hasGenericPassword).not.toHaveBeenCalled();
  jest.useRealTimers();
});

test('the countdown pauses off-active and re-arms in full on return', async () => {
  jest.useFakeTimers();
  kc.hasGenericPassword.mockResolvedValue(true);
  kc.getGenericPassword.mockReturnValue(new Promise(() => {}));

  let verdict: GateVerdict | undefined;
  simpleBiometrics({ translate }).then(v => {
    verdict = v;
  });
  await jest.advanceTimersByTimeAsync(5 * 1000);
  setAppState('inactive'); // the auth sheet is up
  await jest.advanceTimersByTimeAsync(60 * 1000);
  expect(verdict).toBeUndefined(); // parked on the user: no stall
  setAppState('active'); // sheet gone, callback lost
  await jest.advanceTimersByTimeAsync(10 * 1000);
  expect(verdict).toMatchObject({ kind: 'unavailable' });
  jest.useRealTimers();
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
  simpleBiometrics({ translate }).then(v => {
    verdict = v;
  });
  await jest.advanceTimersByTimeAsync(60 * 1000);
  expect(verdict).toBeUndefined(); // no fire while the user types a passcode
  serveSentinel({ password: '1' });
  await jest.advanceTimersByTimeAsync(0);
  expect(verdict).toMatchObject({ kind: 'authenticated' });
  jest.useRealTimers();
});

test('an android interactive stall locks with a retriable decline', async () => {
  jest.useFakeTimers();
  rn.Platform.OS = 'android';
  kc.getSupportedBiometryType.mockResolvedValue('Fingerprint');
  kc.hasGenericPassword.mockResolvedValue(true);
  kc.getGenericPassword.mockReturnValue(new Promise(() => {}));

  let verdict: GateVerdict | undefined;
  simpleBiometrics({ translate }).then(v => {
    verdict = v;
  });
  await jest.advanceTimersByTimeAsync(10 * 1000);
  expect(verdict).toBeUndefined(); // the iOS window must not govern Android
  await jest.advanceTimersByTimeAsync(50 * 1000);
  expect(verdict).toMatchObject({ kind: 'declined' });
  expect(getLastGateFailure()).toMatch(/stalled/);
  jest.useRealTimers();
});

test('concurrent callers share one gate run', async () => {
  kc.hasGenericPassword.mockResolvedValue(true);
  kc.getGenericPassword.mockResolvedValue({ password: '1' });

  const [first, second] = await Promise.all([
    simpleBiometrics({ translate }),
    simpleBiometrics({ translate }),
  ]);
  expect(first).toMatchObject({ kind: 'authenticated' });
  expect(second).toMatchObject({ kind: 'authenticated' });
  expect(kc.getGenericPassword).toHaveBeenCalledTimes(1);
});
