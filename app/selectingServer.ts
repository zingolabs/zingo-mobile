import { GlobalConst, ServerUrisType } from './AppState';
import { getLatestBlockServerInfo } from './walletBackend';

const calculateLatency = async (server: ServerUrisType, _index: number) => {
  const start: number = Date.now();
  const resp: string = await getLatestBlockServerInfo(server.uri);

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

  // 15 seconds max.
  const timeoutPromise = new Promise<null>(resolve =>
    setTimeout(() => resolve(null), 15 * 1000),
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
