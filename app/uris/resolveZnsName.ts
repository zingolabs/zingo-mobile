import { ZNS } from 'zcashname-sdk';
import { ChainNameEnum } from '@app/AppState';

// Zcash Name Service (ZNS) resolution for the Send recipient field.
//
// The lookup is a clearnet request to the ZNS indexer, on the same footing as
// the server registry in `fetchServerList`: it does not go through the mixnet,
// so it discloses to that indexer which name this IP is about to pay. That is
// an accepted trade-off, taken deliberately and matching zingo-pc.
//
// zingo-pc drives this same SDK from its Electron main process because its
// renderer cannot reach the network (CSP, CORS from file://, sandboxing).
// React Native has no such restriction, so the SDK is called directly here —
// and using the SDK rather than hand-rolling the JSON-RPC keeps the protocol
// details somebody else's to maintain.

const RESOLVE_TIMEOUT_MS = 5000;
const ZNS_SUFFIX = '.zcash';

export type ZnsResolution =
  | { ok: true; address: string }
  | { ok: false; reason: 'not-found' | 'network' | 'unsupported-chain' };

// The resolver runs off a debounced keystroke, so the client is kept per
// network rather than rebuilt on every lookup.
const clients: Map<string, ZNS> = new Map();

const clientFor = (chainName: ChainNameEnum): ZNS | null => {
  const network =
    chainName === ChainNameEnum.mainChainName
      ? 'mainnet'
      : chainName === ChainNameEnum.testChainName
        ? 'testnet'
        : // Regtest is a local dev chain with no ZNS indexer.
          null;
  if (!network) {
    return null;
  }
  const cached = clients.get(network);
  if (cached) {
    return cached;
  }
  const client = new ZNS({ network });
  clients.set(network, client);
  return client;
};

// The protocol's own name rule. The SDK ships an `isValidName` but does not
// export it, so this is the one piece of ZNS knowledge kept here; zingo-pc
// carries the same expression.
const ZNS_NAME = /^[a-z0-9]{1,62}$/;

/** True when `text` reads as a ZNS alias, e.g. "alice.zcash". */
export const isZnsAlias = (text: string): boolean => {
  const trimmed = text.trim().toLowerCase();
  return (
    trimmed.endsWith(ZNS_SUFFIX) &&
    ZNS_NAME.test(trimmed.slice(0, -ZNS_SUFFIX.length))
  );
};

/**
 * Resolve "alice.zcash" to the unified address it points at.
 *
 * Never throws. An unreachable indexer, a malformed answer or the 5s deadline
 * all come back as `network`. The SDK's fetch takes no abort signal, so the
 * deadline stops us waiting on the request rather than cancelling it.
 */
export const resolveZnsName = async (
  alias: string,
  chainName: ChainNameEnum,
): Promise<ZnsResolution> => {
  // A name the protocol would refuse cannot be registered, so it resolves to
  // nothing rather than being worth a round trip.
  if (!isZnsAlias(alias)) {
    return { ok: false, reason: 'not-found' };
  }
  const client = clientFor(chainName);
  if (!client) {
    return { ok: false, reason: 'unsupported-chain' };
  }

  const name = alias.trim().toLowerCase().slice(0, -ZNS_SUFFIX.length);
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    const registration = await Promise.race([
      client.resolveName(name),
      new Promise<never>((_resolve, reject) => {
        timer = setTimeout(
          () => reject(new Error('ZNS resolve timed out')),
          RESOLVE_TIMEOUT_MS,
        );
      }),
    ]);
    if (!registration?.address) {
      return { ok: false, reason: 'not-found' };
    }
    return { ok: true, address: registration.address };
  } catch {
    return { ok: false, reason: 'network' };
  } finally {
    clearTimeout(timer);
  }
};

export default resolveZnsName;
