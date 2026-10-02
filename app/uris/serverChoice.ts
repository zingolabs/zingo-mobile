import { ChainNameEnum, ServerType, ServerUrisType } from '@app/AppState';

type RemoteServer = Extract<ServerType, { kind: 'remote' }>;

/** Lists the servers of `list` other than `current`. */
export const otherServers = (
  list: ServerUrisType[],
  current: RemoteServer,
): ServerUrisType[] => list.filter(server => server.uri !== current.uri);

/** Lists the servers of the static `list` that are in service on `chainName`. */
export const staticServers = (
  list: ServerUrisType[],
  chainName: ChainNameEnum,
): ServerUrisType[] =>
  list.filter(server => !server.obsolete && server.chainName === chainName);

/** Lists the servers of the static `list` that can replace `current` on its chain. */
export const staticAlternatives = (
  list: ServerUrisType[],
  current: RemoteServer,
): ServerUrisType[] =>
  otherServers(staticServers(list, current.chainName), current);
