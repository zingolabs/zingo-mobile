import { ServerUrisType, TranslateType, ChainNameEnum } from '../AppState';
import RPCModule from '../RPCModule';
import staticServerFallback from './staticServerFallback';

/**
 * One entry of the wallet's indexer census (zingolib#2571) as it crosses
 * the bridge: `chain` is "main"/"test", `region_key` the `settings.<key>`
 * translation suffix (empty when unknown).
 */
type CensusEntry = {
  uri: string;
  chain: string;
  operator: string;
  region_key: string;
  is_default: boolean;
  obsolete: boolean;
};

function censusEntry(value: unknown): CensusEntry | null {
  const entry = value as Partial<CensusEntry> | null;
  return entry !== null &&
    typeof entry === 'object' &&
    typeof entry.uri === 'string' &&
    typeof entry.chain === 'string' &&
    typeof entry.operator === 'string' &&
    typeof entry.region_key === 'string' &&
    typeof entry.is_default === 'boolean' &&
    typeof entry.obsolete === 'boolean'
    ? (entry as CensusEntry)
    : null;
}

/**
 * The census as delivered in RPCModule's constants — synchronous, because
 * this list is consulted at JS module load. Null when the native layer
 * predates the census (iOS until its export lands, and tests without a
 * mock); a malformed payload also degrades to null rather than a partial
 * list, so the fallback below is all-or-nothing.
 */
function nativeCensus(): CensusEntry[] | null {
  const raw: unknown = (
    RPCModule as unknown as { indexerCensus?: string } | undefined
  )?.indexerCensus;
  if (typeof raw !== 'string') {
    return null;
  }
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed) || parsed.length === 0) {
      return null;
    }
    const entries = parsed.map(censusEntry);
    return entries.every(entry => entry !== null)
      ? (entries as CensusEntry[])
      : null;
  } catch {
    return null;
  }
}

/**
 * The server list, projected from the wallet's indexer census — the sole
 * source of truth for endpoints (zingolib#2571) — so the picker, the
 * Doctor, and the wallet's own defaults and health gates all read the same
 * data. The static fallback serves only a native layer that predates the
 * census constant, and retires when the iOS export lands.
 */
const serverUris = (
  translate: (key: string) => TranslateType | void,
): ServerUrisType[] => {
  const census = nativeCensus();
  if (census === null) {
    return staticServerFallback(translate);
  }
  return census.map(entry => ({
    uri: entry.uri,
    region:
      entry.region_key === ''
        ? ''
        : (translate(`settings.${entry.region_key}`) as string),
    chainName:
      entry.chain === 'test'
        ? ChainNameEnum.testChainName
        : ChainNameEnum.mainChainName,
    default: entry.is_default,
    latency: null,
    obsolete: entry.obsolete,
  }));
};

export default serverUris;
