import { NativeModules } from 'react-native';

import {
  MixnetTransportBinding,
  StartMixnetTransport,
} from '@app/walletBackend/modules/MixnetCoordinator';

// One-to-one mirror of the native NymTransportModule, exposed on both
// platforms (Android: org.ZingoLabs.Zingo.NymTransportModule; iOS:
// NymTransportModule.swift). This is the platform half
// of Mixnet Mode: the module hosts the UniFFI proxy shim in-process and
// offers its binding — the local SOCKS5 endpoint as a bare `host:port` and
// the Exit Node the proxy bound — which the MixnetCoordinator hands to
// the wallet's attach seam. Failures arrive only as rejections (the typed
// error channel).
interface NymTransportModuleAPI {
  startMixnetTransport(): Promise<MixnetTransportBinding>;
  stopMixnetTransport(): Promise<null>;
}

const NymTransportModule =
  NativeModules.NymTransportModule as NymTransportModuleAPI;

/**
 * The injected `StartMixnetTransport` seam for the coordinator: (re)start
 * the platform-hosted proxy and yield its binding. Rejections propagate to
 * the coordinator, which publishes the typed failure view.
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
