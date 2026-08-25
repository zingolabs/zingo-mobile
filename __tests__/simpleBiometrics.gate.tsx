/**
 * Issue #1266. The gate guards a keychain entry holding the string "1", so no
 * failure of it is worth trapping a user outside their own wallet. These cover
 * the two ways it used to do exactly that: a platform error read as a decline,
 * and a native call that never comes back.
 */
jest.mock('react-native', () => ({
  __esModule: true,
  Platform: { OS: 'ios', select: (o: any) => o.ios },
  AppState: { addEventListener: jest.fn(() => ({ remove: jest.fn() })) },
  DeviceEventEmitter: { emit: jest.fn() },
}));

import * as Keychain from 'react-native-keychain';
import simpleBiometrics, { getLastGateFailure } from '../app/simpleBiometrics';

const kc = Keychain as unknown as Record<string, jest.Mock>;
const translate = ((k: string) => k) as never;
const osError = (code: string) => Object.assign(new Error('boom'), { code });

beforeEach(() => {
  jest.clearAllMocks();
  kc.canImplyAuthentication.mockResolvedValue(true);
  kc.resetGenericPassword.mockResolvedValue(true);
  kc.setGenericPassword.mockResolvedValue({});
});

test('errSecUserCanceled is still a decline', async () => {
  kc.hasGenericPassword.mockResolvedValue(true);
  kc.getGenericPassword.mockRejectedValue(osError('-128'));

  await expect(simpleBiometrics({ translate })).resolves.toBe(false);
  expect(kc.setGenericPassword).not.toHaveBeenCalled();
});

test('errSecAuthFailed rebuilds the sentinel instead of locking out', async () => {
  kc.hasGenericPassword.mockResolvedValue(true);
  kc.getGenericPassword.mockRejectedValue(osError('-25293'));

  // Before the fix this resolved to `false` -> permanent Unlock screen.
  await expect(simpleBiometrics({ translate })).resolves.toBeUndefined();
  expect(kc.setGenericPassword).toHaveBeenCalledTimes(1);
});

test('a rebuilt sentinel that then reads fine authenticates', async () => {
  kc.hasGenericPassword.mockResolvedValue(true);
  kc.getGenericPassword
    .mockRejectedValueOnce(osError('-25293'))
    .mockResolvedValueOnce({ password: '1' });

  await expect(simpleBiometrics({ translate })).resolves.toBe(true);
});

test('a wedged native queue fails open instead of hanging', async () => {
  jest.useFakeTimers();
  kc.hasGenericPassword.mockReturnValue(new Promise(() => {}));

  const gate = simpleBiometrics({ translate });
  await Promise.resolve();
  await jest.advanceTimersByTimeAsync(10 * 1000);

  await expect(gate).resolves.toBeUndefined();
  expect(getLastGateFailure()).toMatch(/stalled/);
  jest.useRealTimers();
});

test('a wedged capability probe fails open too', async () => {
  jest.useFakeTimers();
  kc.canImplyAuthentication.mockReturnValue(new Promise(() => {}));

  const gate = simpleBiometrics({ translate });
  await Promise.resolve();
  await jest.advanceTimersByTimeAsync(10 * 1000);

  await expect(gate).resolves.toBeUndefined();
  expect(kc.hasGenericPassword).not.toHaveBeenCalled();
  jest.useRealTimers();
});
