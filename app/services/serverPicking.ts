import { ChainNameEnum, ServerUrisType, TranslateType } from '@app/AppState';
import { fetchServerList, serverUris } from '@app/uris';
import { getLatestBlockServerInfo } from '@app/walletBackend';

type Translate = (key: string) => TranslateType | void;

// The bound on one tip request when timing a server.
export const PROBE_TIMEOUT_MS = 15 * 1000;

// Times one tip request; a server that does not answer in time has no latency.
export const probeUri = async (
  uri: string,
): Promise<{ latency: number | null; height: string }> => {
  const start = Date.now();
  const resp = await Promise.race([
    getLatestBlockServerInfo(uri),
    new Promise<null>(resolve =>
      setTimeout(() => resolve(null), PROBE_TIMEOUT_MS),
    ),
  ]);
  if (!resp || !resp.ok || !resp.value) {
    return { latency: null, height: '' };
  }
  return { latency: Date.now() - start, height: resp.value };
};

// The recommended (Zaino) servers of a chain, from the static list.
export const recommendedServers = (
  translate: Translate,
  chain: ChainNameEnum,
): ServerUrisType[] =>
  serverUris(translate).filter(
    s => s.recommended && !s.obsolete && s.chainName === chain,
  );

// The first of `servers` to answer, with its latency; null when none does.
const fastestOf = async (
  servers: ServerUrisType[],
): Promise<ServerUrisType | null> =>
  new Promise(resolve => {
    let pending = servers.length;
    if (pending === 0) {
      resolve(null);
      return;
    }
    servers.forEach(async s => {
      const probe = await probeUri(s.uri);
      if (probe.latency !== null) {
        resolve({ ...s, latency: probe.latency });
      } else if (--pending === 0) {
        resolve(null);
      }
    });
  });

// Where Automatic's pick came from; 'default' means no server answered.
export type AutomaticTier = 'recommended' | 'registry' | 'static' | 'default';

// The chain's one default server from the static list.
export const defaultServer = (
  translate: Translate,
  chain: ChainNameEnum,
): ServerUrisType | null =>
  serverUris(translate).find(s => s.chainName === chain && s.default) ?? null;

// Automatic, in order: the fastest recommended (Zaino) server, the fastest
// of the live registry, the fastest of the static list, and the chain's
// default when none answers or there is no internet. Null only for a chain
// without a default (regtest).
export const pickAutomatic = async (
  translate: Translate,
  chain: ChainNameEnum,
  online: boolean,
): Promise<{ server: ServerUrisType; tier: AutomaticTier } | null> => {
  if (online) {
    const recommended = recommendedServers(translate, chain);
    const fromRecommended = await fastestOf(recommended);
    if (fromRecommended) {
      return { server: fromRecommended, tier: 'recommended' };
    }
    const tried = new Set(recommended.map(r => r.uri));
    const live = (await fetchServerList(chain)).filter(r => !tried.has(r.uri));
    const fromRegistry = await fastestOf(live);
    if (fromRegistry) {
      return { server: fromRegistry, tier: 'registry' };
    }
    live.forEach(r => tried.add(r.uri));
    const fromStatic = await fastestOf(
      serverUris(translate).filter(
        r => r.chainName === chain && !r.obsolete && !tried.has(r.uri),
      ),
    );
    if (fromStatic) {
      return { server: fromStatic, tier: 'static' };
    }
  }
  const fallback = defaultServer(translate, chain);
  return fallback ? { server: fallback, tier: 'default' } : null;
};

// The servers under Other servers: the live registry or, when it gives
// nothing, the static list; recommended servers are on the main screen.
export const otherServersFor = async (
  translate: Translate,
  chain: ChainNameEnum,
  online: boolean,
): Promise<ServerUrisType[]> => {
  const known = serverUris(translate);
  const recommended = new Set(known.filter(s => s.recommended).map(s => s.uri));
  const regions = new Map(known.map(s => [s.uri, s.region]));
  const live = online
    ? (await fetchServerList(chain)).map(s => ({
        ...s,
        region: regions.get(s.uri) ?? '',
      }))
    : [];
  const list =
    live.length > 0
      ? live
      : known.filter(s => s.chainName === chain && !s.obsolete);
  return list.filter(s => !recommended.has(s.uri));
};
