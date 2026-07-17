import { ServerUrisType, ChainNameEnum } from '../AppState';

// Live lightwalletd registry published by the community server monitor
// (zec.rocks "hosh"). It returns, per chain, a list of servers with health
// metrics (online, height, uptime, ping, version). We use it as the source of
// truth for the "auto" and "list" server-selection modes, falling back to the
// static `serverUris` list whenever it is unreachable.
const HOSH_URL = 'https://hosh.zec.rocks/api/v0/zec.json';
const FETCH_TIMEOUT_MS = 5000;

type HoshServer = {
  hostname?: string;
  port?: number;
  online?: boolean;
  ping?: number;
  uptime_30d?: number;
};

/**
 * Fetch the live server list for a chain, already filtered and ranked.
 *
 * - Tor (`.onion`) hosts are dropped — this wallet does not route over Tor.
 * - Only `online` servers are kept.
 * - Ranked best-first: highest 30-day uptime, ties broken by lowest ping.
 *
 * Regtest (local), an unreachable registry, a non-2xx response, a parse error
 * or the 5s timeout all resolve to `[]` so the caller can fall back to the
 * static list. Never throws.
 */
const fetchServerList = async (
  chainName: ChainNameEnum,
): Promise<ServerUrisType[]> => {
  // Regtest is a local dev chain — no public registry.
  if (chainName === ChainNameEnum.regtestChainName) {
    return [];
  }
  const chain = chainName === ChainNameEnum.testChainName ? 'test' : 'main';

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const resp = await fetch(`${HOSH_URL}?chain=${chain}`, {
      signal: controller.signal,
    });
    if (!resp.ok) {
      return [];
    }
    const json = await resp.json();
    const servers: HoshServer[] = Array.isArray(json?.servers)
      ? json.servers
      : [];

    const clearnetOnline = servers.filter(s => {
      const host = String(s?.hostname ?? '');
      // Drop Tor (.onion) and offline servers.
      return host.length > 0 && !host.endsWith('.onion') && s?.online === true;
    });

    // Best first: highest uptime, tie-broken by lowest ping.
    clearnetOnline.sort((a, b) => {
      const ua = typeof a.uptime_30d === 'number' ? a.uptime_30d : 0;
      const ub = typeof b.uptime_30d === 'number' ? b.uptime_30d : 0;
      if (ub !== ua) {
        return ub - ua;
      }
      const pa = typeof a.ping === 'number' ? a.ping : Number.POSITIVE_INFINITY;
      const pb = typeof b.ping === 'number' ? b.ping : Number.POSITIVE_INFINITY;
      return pa - pb;
    });

    return clearnetOnline.map(s => {
      const host = String(s.hostname);
      const port = Number(s.port) || 443;
      return {
        uri: `https://${host}:${port}`,
        chainName,
        region: '',
        default: false,
        latency: typeof s.ping === 'number' ? Math.round(s.ping) : null,
        obsolete: false,
      } as ServerUrisType;
    });
  } catch {
    // timeout / network / parse error → caller falls back to the static list.
    return [];
  } finally {
    clearTimeout(timer);
  }
};

export default fetchServerList;
