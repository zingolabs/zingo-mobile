import RPCModule from '@app/RPCModule';
import {
  MixnetDetailReport,
  MixnetStatusReport,
  describeRejection,
  transformMixnetDetail,
  transformMixnetStatus,
} from '@app/walletBackend/transforms/mixnetTransform';

// A rejection becomes the typed failure arm here, at the native edge.
async function statusCall(
  nativeCall: () => Promise<string>,
): Promise<MixnetStatusReport> {
  try {
    return transformMixnetStatus(await nativeCall());
  } catch (thrown: unknown) {
    return { kind: 'failure', failure: describeRejection(thrown) };
  }
}

export async function attachMixnet(
  socks5Addr: string,
  exitNode: string,
): Promise<MixnetStatusReport> {
  return statusCall(() => RPCModule.attachMixnet(socks5Addr, exitNode));
}

export async function enableMixnet(
  proxyPath: string,
): Promise<MixnetStatusReport> {
  return statusCall(() => RPCModule.enableMixnet(proxyPath));
}

export async function getMixnetStatus(): Promise<MixnetStatusReport> {
  return statusCall(() => RPCModule.mixnetIndicatorInfo());
}

export async function getMixnetBootstrapDetail(): Promise<MixnetDetailReport> {
  try {
    return transformMixnetDetail(await RPCModule.mixnetBootstrapDetailInfo());
  } catch (thrown: unknown) {
    return { kind: 'failure', failure: describeRejection(thrown) };
  }
}
