import { ChainNameEnum, ServerType, remoteServer } from '@app/AppState';
import { loadDefaultIndexer } from '@app/uris/defaultIndexer';
import { getLatestBlockServerInfo } from '@app/walletBackend';

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

// Automatic is the chain's Default Indexer, which zingolib defines; null for
// a chain without one.
export const pickAutomatic = async (
  chain: ChainNameEnum,
): Promise<ServerType | null> => {
  const uri = await loadDefaultIndexer(chain);
  return uri ? remoteServer(uri, chain) : null;
};
