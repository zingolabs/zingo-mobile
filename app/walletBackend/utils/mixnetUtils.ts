import RPCModule from '../../RPCModule';
import {
  MixnetDetailReport,
  MixnetStatusReport,
  describeRejection,
  transformMixnetDetail,
  transformMixnetStatus,
} from '../transforms/mixnetTransform';

// The effectful edge of the Mixnet Mode surface. Each function makes one
// native call; the two channels are settled separately and typed
// (zingo-mobile#1151): the resolved DATA string goes to a pure transform,
// and a REJECTION — the error channel — is contained here at the single
// seam as the typed `failure` arm, never re-encoded as prose. All decision
// logic lives in the pure transforms.

async function statusCall(
  nativeCall: () => Promise<string>,
): Promise<MixnetStatusReport> {
  try {
    return transformMixnetStatus(await nativeCall());
  } catch (thrown: unknown) {
    return { kind: 'failure', failure: describeRejection(thrown) };
  }
}

/**
 * Attach Mixnet Mode to an already-running, platform-hosted SOCKS5 endpoint
 * (the proxy shim's address) that bound `exitNode`. Poll [`getMixnetStatus`]
 * for `bootstrapping` -> `ready`, or `died`.
 */
export async function attachMixnet(
  socks5Addr: string,
  exitNode: string,
): Promise<MixnetStatusReport> {
  return statusCall(() => RPCModule.attachMixnet(socks5Addr, exitNode));
}

/**
 * Enable Mixnet Mode by spawning a bundled nym-proxy binary (the exec
 * fallback; the shim-hosted path uses [`attachMixnet`] instead).
 */
export async function enableMixnet(
  proxyPath: string,
): Promise<MixnetStatusReport> {
  return statusCall(() => RPCModule.enableMixnet(proxyPath));
}

/**
 * Disable Mixnet Mode: the user's deliberate per-session consent to
 * clearnet for the send and price surfaces.
 */
export async function disableMixnet(): Promise<MixnetStatusReport> {
  return statusCall(() => RPCModule.disableMixnet());
}

/** The current Mixnet Mode indicator, with the local SOCKS5 address when ready. */
export async function getMixnetStatus(): Promise<MixnetStatusReport> {
  return statusCall(() => RPCModule.mixnetIndicatorInfo());
}

/** The live bootstrap narration line, empty outside of bootstrapping. */
export async function getMixnetBootstrapDetail(): Promise<MixnetDetailReport> {
  try {
    return transformMixnetDetail(await RPCModule.mixnetBootstrapDetailInfo());
  } catch (thrown: unknown) {
    return { kind: 'failure', failure: describeRejection(thrown) };
  }
}
