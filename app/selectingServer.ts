import { GlobalConst, ServerUrisType } from './AppState';
import RPCModule from './RPCModule';

const calculateLatency = async (server: ServerUrisType, _index: number) => {
  const start: number = Date.now();
  // console.log('Trying with server', server.uri);

  const resp: string = await RPCModule.getLatestBlock(server.uri);

  const end: number = Date.now();
  let latency = null;
  if (resp && !resp.toLowerCase().startsWith(GlobalConst.error)) {
    latency = end - start;
  }
  // console.log('latency', latency, 'ms', index);
  return latency;
};

const selectingServer = async (serverUris: ServerUrisType[]): Promise<ServerUrisType[]> => {
  const servers: ServerUrisType[] = serverUris;
  // const serverUrls = servers.map(server => server.uri);
  // console.log('TESTING: ', serverUrls);

  const latencies = await Promise.all(
    servers.map(server => {
      return calculateLatency(server, servers.indexOf(server));
    }),
  );

  for (let index: number = 0; index < servers.length; index++) {
    servers[index].latency = latencies[index];
  }
  return servers;
};

export default selectingServer;
