import { GlobalConst, ServerUrisType } from './AppState';
import RPCModule from './RPCModule';

const calculateLatency = async (server: ServerUrisType, _index: number) => {
  const start: number = Date.now();
  const resp: string = await RPCModule.getLatestBlock(server.uri);

  const end: number = Date.now();
  let latency = null;
  if (resp && !resp.toLowerCase().startsWith(GlobalConst.error)) {
    latency = end - start;
  }
  return latency;
};

const selectingServer = async (serverUris: ServerUrisType[]): Promise<ServerUrisType> => {
  const servers: ServerUrisType[] = serverUris;

  const fastestServer = await Promise.race(
    servers.map(async (server: ServerUrisType) => {
      const latency = await calculateLatency(server, servers.indexOf(server));
      return { ...server, latency };
    }),
  );

  return fastestServer;
};

export default selectingServer;
