import { ServerUrisType } from './AppState';
import RPCModule from './RPCModule';

const calculateLatency = async (server: ServerUrisType, index: number) => {
  const start: number = Date.now();
  const resp: string = await RPCModule.getLatestBlock(server.uri);
  console.log(resp);

  const end: number = Date.now();
  let latency = null;
  if (resp && !resp.toLowerCase().startsWith('error')) {
    latency = end - start;
  }
  console.log('******* server LAST BLOCK', server.uri, index, resp, latency, 'ms');
  return latency;
};

const selectingServer = async (serverUris: ServerUrisType[]): Promise<ServerUrisType[]> => {
  const servers: ServerUrisType[] = serverUris;
  for (let index: number = 0; index < servers.length; index++) {
    servers[index].latency = await calculateLatency(servers[index], index);
  }
  return servers;
};

export default selectingServer;
