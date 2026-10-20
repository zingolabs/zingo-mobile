import { ServerType, TranslateType, remoteServer } from '@app/AppState';
import { fetchServerList, serverUris } from '@app/uris';
import { otherServers, staticAlternatives } from '@app/uris/serverChoice';
import selectingServer from './selectingServer';

/** Chooses the server for a retry: the first other live server, then the fastest other static server, then `current`. */
export async function retryServer(
  current: ServerType,
  translate: (key: string) => TranslateType,
): Promise<ServerType> {
  if (current.kind === 'offline') {
    return current;
  }
  const [live] = otherServers(
    await fetchServerList(current.chainName),
    current,
  );
  if (live) {
    return remoteServer(live.uri, live.chainName);
  }
  const fastest = await selectingServer(
    staticAlternatives(serverUris(translate), current),
  );
  return fastest && fastest.latency
    ? remoteServer(fastest.uri, fastest.chainName)
    : current;
}
