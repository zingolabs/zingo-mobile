import { NativeModules } from 'react-native';

import { StartMixnetTransport } from '../modules/MixnetCoordinator';

// One-to-one mirror of the @ReactMethod functions exposed by the native
// NymTransportModule (Android: org.ZingoLabs.Zingo.NymTransportModule; the
// iOS module lands with the Mac-gated iOS step). This is the platform half
// of Mixnet Mode: the module hosts the UniFFI proxy shim in-process and
// offers its local SOCKS5 endpoint, which the MixnetCoordinator hands to
// the wallet's attach seam. Failures arrive only as rejections (the typed
// error channel); the resolved string is always a bare `host:port`.
interface NymTransportModuleAPI {
  startMixnetTransport(): Promise<string>;
  stopMixnetTransport(): Promise<null>;
  /** Constant from getConstants(): true only in the "always on" flavor. */
  mixnetAlwaysOn?: boolean;
}

/**
 * Resolved lazily on every call, never at module load: the module is absent
 * on platforms without the native transport (iOS until the Mac-gated step),
 * and eager capture couples every importer to the host's NativeModules
 * shape (which broke the unit suites through the mixnet gate's import).
 */
function nymTransportModule(): NymTransportModuleAPI | undefined {
  return NativeModules?.NymTransportModule as
    | NymTransportModuleAPI
    | undefined;
}

/**
 * The injected `StartMixnetTransport` seam for the coordinator: (re)start
 * the platform-hosted proxy and yield its local SOCKS5 address. Rejections
 * propagate to the coordinator, which publishes the typed failure view; a
 * platform without the module rejects the same way.
 */
export const startMixnetTransport: StartMixnetTransport = async () => {
  const module = nymTransportModule();
  if (module === undefined) {
    throw new Error('NymTransportModule is not present on this platform');
  }
  return module.startMixnetTransport();
};

/**
 * Deliberate teardown of the platform-hosted proxy (app shutdown or the
 * user's per-session clearnet consent). A stop is not a death: the shim
 * cancels its liveness monitor before the listener goes down.
 */
export async function stopMixnetTransport(): Promise<void> {
  await nymTransportModule()?.stopMixnetTransport();
}

/**
 * Whether this build is the "Always On" flavor — the silent alpha APK
 * (CONTEXT.md). True means the app withholds the Mixnet Mode UI projection
 * (no toggle, banner, or disclaimer) while the forced-on, fail-closed
 * transport policy runs unchanged, so a refusal surfaces as a plain send
 * error. Guarded because the module is absent on platforms without the
 * native transport (iOS until the Mac-gated step).
 */
export function isMixnetAlwaysOn(): boolean {
  return nymTransportModule()?.mixnetAlwaysOn === true;
}
