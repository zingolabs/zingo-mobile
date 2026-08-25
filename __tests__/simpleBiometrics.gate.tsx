/**
 * Issue #1266. The gate guards a keychain entry holding the string "1", so no
 * failure of it is worth trapping a user outside their own wallet. These cover
 * the ways it used to do exactly that (a platform error read as a decline, a
 * native call that never comes back) and the way the first fix overcorrected
 * (two failed prompts in a row opening the gate).
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
