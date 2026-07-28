import RPCModule from '../../RPCModule';
import {
  MixnetDeathReport,
  MixnetDetailReport,
  MixnetStatusReport,
  MixnetTimingReport,
  describeRejection,
  transformMixnetDeathReport,
  transformMixnetDetail,
  transformMixnetStatus,
  transformMixnetTiming,
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
 * (the proxy shim's address). Poll [`getMixnetStatus`] for
 * `bootstrapping` -> `ready`, or `died`.
 */
export async function attachMixnet(
  socks5Addr: string,
): Promise<MixnetStatusReport> {
  return statusCall(() => RPCModule.attachMixnet(socks5Addr));
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

/** The current Mixnet Mode, with the local SOCKS5 address when ready. */
export async function getMixnetStatus(): Promise<MixnetStatusReport> {
  return statusCall(() => RPCModule.mixnetModeInfo());
}

/** The live bootstrap narration line, empty outside of bootstrapping. */
export async function getMixnetBootstrapDetail(): Promise<MixnetDetailReport> {
  try {
    return transformMixnetDetail(await RPCModule.mixnetBootstrapDetailInfo());
  } catch (thrown: unknown) {
    return { kind: 'failure', failure: describeRejection(thrown) };
  }
}

/**
 * The latched death read whole — a fresh clamped age each poll and, when
 * the watcher held one, the typed cause — while the mode is `died`;
 * `none` in every other mode.
 */
export async function getMixnetDeathReport(): Promise<MixnetDeathReport> {
  try {
    return transformMixnetDeathReport(await RPCModule.mixnetDeathReportInfo());
  } catch (thrown: unknown) {
    return { kind: 'failure', failure: describeRejection(thrown) };
  }
}

/**
 * The wallet's temporal calibration for the mixnet transport: the honest
 * upper bound on "Connecting to mixnet…" and the per-attempt round-trip
 * bound, from the same constants the wallet's gates run on.
 */
export async function getMixnetTiming(): Promise<MixnetTimingReport> {
  try {
    return transformMixnetTiming(await RPCModule.mixnetTimingInfo());
  } catch (thrown: unknown) {
    return { kind: 'failure', failure: describeRejection(thrown) };
  }
}

/**
 * The canonical ZIP-0318 IP-correlation disclaimer: one constant from
 * zingolib so every frontend renders the same text, verbatim and
 * untranslated. Null when the native layer rejects — the text is
 * presentation only, and a broken FFI already fails the operational
 * surface closed through the typed reports above.
 */
export async function getMixnetIpCorrelationDisclaimer(): Promise<
  string | null
> {
  try {
    return await RPCModule.mixnetIpCorrelationDisclaimerInfo();
  } catch {
    return null;
  }
}
