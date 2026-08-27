/**
 * The DeviceAuth binding's contract: the typed surface the gate
 * controller will build on (ADR 0007). The native halves are exercised on
 * device; this pins the JS shape and the pass-through.
 */
jest.mock('react-native', () => ({
  __esModule: true,
  NativeModules: {
    DeviceAuth: {
      authenticate: jest.fn(async () => ({
        outcome: 'authenticated',
        code: '',
      })),
      canAuthenticate: jest.fn(async () => ({ available: true, code: '' })),
    },
  },
}));

import DeviceAuth from '../app/DeviceAuthModule';
import type { DeviceAuthResult } from '../app/DeviceAuthModule';

test('authenticate resolves a typed outcome and forwards its arguments', async () => {
  const result: DeviceAuthResult = await DeviceAuth.authenticate(
    'Please authenticate',
    'Cancel',
  );
  expect(result).toEqual({ outcome: 'authenticated', code: '' });
  expect(DeviceAuth.authenticate).toHaveBeenCalledWith(
    'Please authenticate',
    'Cancel',
  );
});

test('canAuthenticate resolves the availability shape', async () => {
  await expect(DeviceAuth.canAuthenticate()).resolves.toEqual({
    available: true,
    code: '',
  });
});
