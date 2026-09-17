import {
  MixnetStatusReport,
  mixnetReport,
} from '@app/walletBackend/transforms/mixnetTransform';
import { callWallet } from '@app/walletBackend/wallet';

/**
 * Attaches Mixnet Mode to the platform-hosted SOCKS5 endpoint that bound
 * `exitNode`; poll `getMixnetStatus` for `bootstrapping` -> `ready`, or `died`.
 */
export async function attachMixnet(
  socks5Addr: string,
  exitNode: string,
): Promise<MixnetStatusReport> {
  return mixnetReport(
    await callWallet(wallet => wallet.attachMixnet(socks5Addr, exitNode)),
  );
}

/** Enables Mixnet Mode by spawning the bundled nym-proxy binary at `proxyPath`. */
export async function enableMixnet(
  proxyPath: string,
): Promise<MixnetStatusReport> {
  return mixnetReport(
    await callWallet(wallet => wallet.enableMixnet(proxyPath)),
  );
}

/** The current Mixnet Mode indicator, address and bootstrap narration. */
export async function getMixnetStatus(): Promise<MixnetStatusReport> {
  return mixnetReport(await callWallet(wallet => wallet.mixnetStatus()));
}

/** Disables Mixnet Mode, the user's per-session consent to clearnet, and reads the status back. */
export async function disableMixnet(): Promise<MixnetStatusReport> {
  const disabled = await callWallet(wallet => wallet.disableMixnet());
  return disabled.ok ? getMixnetStatus() : mixnetReport(disabled);
}
