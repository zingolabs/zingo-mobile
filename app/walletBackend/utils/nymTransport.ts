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
}

const NymTransportModule = NativeModules.NymTransportModule as NymTransportModuleAPI;

/**
 * The injected `StartMixnetTransport` seam for the coordinator: (re)start
 * the platform-hosted proxy and yield its local SOCKS5 address. Rejections
 * propagate to the coordinator, which publishes the typed failure view.
 */
export const startMixnetTransport: StartMixnetTransport = () =>
  NymTransportModule.startMixnetTransport();

/**
 * Deliberate teardown of the platform-hosted proxy (app shutdown or the
 * user's per-session clearnet consent). A stop is not a death: the shim
 * cancels its liveness monitor before the listener goes down.
 */
export async function stopMixnetTransport(): Promise<void> {
  await NymTransportModule.stopMixnetTransport();
}
