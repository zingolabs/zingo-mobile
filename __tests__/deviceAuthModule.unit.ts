/**
 * The DeviceAuth binding's contract: the typed surface the gate
 * controller will build on (ADR 0007). The native halves are exercised on
 * device; what this file can pin is the seam between them and JS.
 *
 * The binding is a lookup, not a wrapper, so there is no pass-through to
 * assert — asserting one would only compare a mock against itself. What
 * can break here, and what these tests hold, is the name: the binding must
 * resolve the module Android registers as `getName() = "DeviceAuth"` and
 * iOS as `RCT_EXTERN_MODULE(DeviceAuth, …)`, and it must expose both
 * methods of the API the controller calls. The stub lives in the repo's
 * manual mock (`__mocks__/react-native.js`), so this suite sees the same
 * registry every other consumer does instead of a private one.
 */
// Side-effect import, and it must come first: `__mocks__/react-native.js`
// exports nothing, it registers the stubbed registry for later importers,
// and the binding below reads that registry at module scope.
import 'react-native';

import DeviceAuth from '@app/services/DeviceAuthModule';
import type {
  DeviceAuthAvailability,
  DeviceAuthResult,
} from '@app/services/DeviceAuthModule';

test('the binding resolves the natively registered DeviceAuth module', () => {
  // A top-level `import { NativeModules } from 'react-native'` here lands
  // on the empty shim; requireActual reaches the same registry the binding
  // read. A rename on either native half, or in the binding, lands here
  // rather than as an undefined call at the first ceremony.
  const { NativeModules } = jest.requireActual('react-native');
  expect(NativeModules.DeviceAuth).toBeDefined();
  expect(DeviceAuth).toBe(NativeModules.DeviceAuth);
});

test('the binding exposes the whole API the gate controller calls', () => {
  expect(typeof DeviceAuth.authenticate).toBe('function');
  expect(typeof DeviceAuth.canAuthenticate).toBe('function');
});

test('a ceremony resolves the typed outcome shape', async () => {
  const result: DeviceAuthResult = await DeviceAuth.authenticate(
    'Please authenticate',
    'Cancel',
  );
  expect(result).toEqual({ outcome: 'authenticated', code: '' });
});

test('availability resolves the typed availability shape', async () => {
  const availability: DeviceAuthAvailability =
    await DeviceAuth.canAuthenticate();
  expect(availability).toEqual({ available: true, code: '' });
});
