import { ChainNameEnum } from '@app/AppState/enums/ChainNameEnum';

type OfflineServer = { kind: 'offline'; chainName: ChainNameEnum };
type RemoteServer = { kind: 'remote'; uri: string; chainName: ChainNameEnum };
type ServerType = OfflineServer | RemoteServer;

export default ServerType;

/** Builds the server choice that talks to the indexer at `uri`. */
export const remoteServer = (
  uri: string,
  chainName: ChainNameEnum,
): RemoteServer => ({ kind: 'remote', uri, chainName });

/** Builds the server choice that talks to no indexer. */
export const offlineServer = (chainName: ChainNameEnum): OfflineServer => ({
  kind: 'offline',
  chainName,
});

/** Encodes a server choice as the uri the native layer reads, empty for offline. */
export const nativeUri = (server: ServerType): string =>
  server.kind === 'remote' ? server.uri : '';
