import {
  ChainNameEnum,
  ServerType,
  ServerUrisType,
  TranslateType,
} from '@app/AppState';
import { minBy, uniqBy } from 'lodash';
import { fetchServerList, serverUris } from '@app/uris';
import { upToDate } from './serverHealth';
import { getLatestBlockServerInfo } from '@app/walletBackend';

type Translate = (key: string) => TranslateType | void;
type RemoteServer = Extract<ServerType, { kind: 'remote' }>;

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

// The chain's one default server from the static list, which Automatic
// always takes; null only for a chain without a default (regtest).
export const defaultServer = (
  translate: Translate,
  chain: ChainNameEnum,
): ServerUrisType | null =>
  serverUris(translate).find(s => s.chainName === chain && s.default) ?? null;

/**
 * Whether a server chosen from the list keeps its place at boot: in service
 * in the static list, listed by the live registry or the static list, and
 * answering. Without internet only the static list is read.
 */
export const keepListedServer = async (
  translate: Translate,
  server: RemoteServer,
  online: boolean,
): Promise<boolean> => {
  const known = serverUris(translate).find(
    s => s.uri === server.uri && s.chainName === server.chainName,
  );
  if (known?.obsolete) {
    return false;
  }
  if (!online) {
    return true;
  }
  const live = await fetchServerList(server.chainName);
  if (live.length > 0 && !known && !live.some(s => s.uri === server.uri)) {
    return false;
  }
  return (await probeUri(server.uri)).latency !== null;
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

export type MeasuredServer = {
  uri: string;
  chainName: ChainNameEnum;
  latency: number | null;
  height: number;
};

/**
 * The server the health sheet offers instead of `current`: the default when
 * it answers up to date, else the fastest one that does. The tip is the
 * highest block any of them, or `tip`, gave.
 */
export const healthyCandidate = (
  measured: MeasuredServer[],
  current: string,
  defaultUri: string | null,
  tip: number,
): MeasuredServer | null => {
  const reference = Math.max(tip, ...measured.map(m => m.height));
  const fit = measured.filter(
    m =>
      m.uri !== current && m.latency !== null && upToDate(m.height, reference),
  );
  return (
    fit.find(m => m.uri === defaultUri) ??
    minBy(fit, m => m.latency ?? Infinity) ??
    null
  );
};

/** Measures the default, the recommended and the other servers of `chain`, each once. */
export const measureServers = async (
  translate: Translate,
  chain: ChainNameEnum,
  online: boolean,
): Promise<MeasuredServer[]> => {
  const others = await otherServersFor(translate, chain, online);
  const pool = uniqBy(
    [
      ...[defaultServer(translate, chain)].filter(
        (s): s is ServerUrisType => s !== null,
      ),
      ...recommendedServers(translate, chain),
      ...others,
    ],
    s => s.uri,
  );
  return Promise.all(
    pool.map(async s => {
      const probe = await probeUri(s.uri);
      return {
        uri: s.uri,
        chainName: s.chainName,
        latency: probe.latency,
        height: Number(probe.height) || 0,
      };
    }),
  );
};
