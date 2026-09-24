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

// The protocol's own name rule, wrapped in the suffix this app puts around
// it. The SDK ships an `isValidName` but does not export it, so this is the
// one piece of ZNS knowledge kept here; zingo-pc carries the same expression.
//
// The suffix is ours, not the protocol's: a registration is the bare name and
// the rules forbid a dot inside it, so the indexer never sees ".zcash" or
// ".zec" and cannot tell them apart.
//
// Which is why this list stays closed rather than becoming "anything after a
// dot". Accepting any suffix would turn a fumbled address, a domain or half
// an email into a silent lookup of whoever owns its first label, and hand
// back a real address to send funds to. These two earn their place by being
// in circulation — .zcash from zcashnames itself, .zec from Edge, which hands
// out names in that form — and nothing else is.
const ZNS_ALIAS = /^([a-z0-9]{1,62})\.(?:zcash|zec)$/;

/** The registered name inside an alias, or null when `text` is not one. */
const znsName = (text: string): string | null => {
  const match = text.trim().toLowerCase().match(ZNS_ALIAS);
  return match ? match[1] : null;
};

/** True when `text` reads as a ZNS alias, e.g. "alice.zcash" or "alice.zec". */
export const isZnsAlias = (text: string): boolean => znsName(text) !== null;

/**
 * Resolve "alice.zcash" (or "alice.zec") to the unified address it points at.
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
  const name = znsName(alias);
  if (name === null) {
    return { ok: false, reason: 'not-found' };
  }
  const client = clientFor(chainName);
  if (!client) {
    return { ok: false, reason: 'unsupported-chain' };
  }
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
