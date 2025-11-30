import { GlobalConst, ServerUrisType } from './AppState';
import RPCModule from './RPCModule';
function isErrorResp(resp?: string | null) {
  return !resp || resp.toLowerCase().startsWith(GlobalConst.error);
}

export async function pingIndexerServer(
  uri: string,
  timeoutMs = 10_000,
): Promise<number | null> {
  const start = Date.now();

  const rpcPromise = (async () => {
    try {
      const resp: string = await RPCModule.getLatestBlockServerInfo(uri);

      if (isErrorResp(resp)) {
        return null;
      }

      return Date.now() - start;
    } catch (e) {
      console.warn('pingIndexerServer RPC error', uri, e);
      return null;
    }
  })();

  const timeoutPromise = new Promise<null>(resolve =>
    setTimeout(() => resolve(null), timeoutMs),
  );

  const result = await Promise.race<Promise<number | null>[]>([
    rpcPromise,
    timeoutPromise,
  ]);

  // `result` is either latency or null from timeout / error.
  return result ?? null;
}

const calculateLatency = async (server: ServerUrisType, _index: number) => {
  const start: number = Date.now();
  const resp: string = await RPCModule.getLatestBlockServerInfo(server.uri);

  const end: number = Date.now();
  let latency = null;
  if (resp && !resp.toLowerCase().startsWith(GlobalConst.error)) {
    latency = end - start;
  }

  console.log('Checking SERVER', server, latency);

  return latency;
};

const selectingServer = async (
  serverUris: ServerUrisType[],
): Promise<ServerUrisType | null> => {
  const servers: ServerUrisType[] = serverUris;

  // 30 seconds max.
  const timeoutPromise = new Promise<null>(resolve =>
    setTimeout(() => resolve(null), 30 * 1000),
  );

  const validServersPromises = servers.map(
    (server: ServerUrisType) =>
      new Promise<ServerUrisType>(async resolve => {
        const latency = await calculateLatency(server, servers.indexOf(server));
        if (latency !== null) {
          resolve({ ...server, latency });
        }
      }),
  );

  const fastestServer = await Promise.race([
    ...validServersPromises,
    timeoutPromise,
  ]);

  return fastestServer;
};

export default selectingServer;
