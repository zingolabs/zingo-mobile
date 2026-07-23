import RPCModule from '../../RPCModule';
import {
  MixnetDetailReport,
  MixnetStatusReport,
  transformMixnetDetail,
  transformMixnetStatus,
} from '../transforms/mixnetTransform';

// The effectful edge of the Mixnet Mode surface: each function makes one
// native call and delegates every decision to the pure transforms in
// `mixnetTransform.ts`, so all logic stays unit-testable without a bridge.

/**
 * Attach Mixnet Mode to an already-running, platform-hosted SOCKS5 endpoint
 * (the proxy shim's address). Poll [`getMixnetStatus`] for
 * `bootstrapping` -> `ready`, or `died`.
 */
export async function attachMixnet(
  socks5Addr: string,
): Promise<MixnetStatusReport> {
  const nativeReply: string = await RPCModule.attachMixnet(socks5Addr);
  return transformMixnetStatus(nativeReply);
}

/**
 * Enable Mixnet Mode by spawning a bundled nym-proxy binary (the exec
 * fallback; the shim-hosted path uses [`attachMixnet`] instead).
 */
export async function enableMixnet(
  proxyPath: string,
): Promise<MixnetStatusReport> {
  const nativeReply: string = await RPCModule.enableMixnet(proxyPath);
  return transformMixnetStatus(nativeReply);
}

/**
 * Disable Mixnet Mode: the user's deliberate per-session consent to
 * clearnet for the send and price surfaces.
 */
export async function disableMixnet(): Promise<MixnetStatusReport> {
  const nativeReply: string = await RPCModule.disableMixnet();
  return transformMixnetStatus(nativeReply);
}

/** The current Mixnet Mode, with the local SOCKS5 address when ready. */
export async function getMixnetStatus(): Promise<MixnetStatusReport> {
  const nativeReply: string = await RPCModule.mixnetModeInfo();
  return transformMixnetStatus(nativeReply);
}

/** The live bootstrap narration line, empty outside of bootstrapping. */
export async function getMixnetBootstrapDetail(): Promise<MixnetDetailReport> {
  const nativeReply: string = await RPCModule.mixnetBootstrapDetailInfo();
  return transformMixnetDetail(nativeReply);
}
