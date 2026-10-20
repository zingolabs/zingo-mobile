import { ChainNameEnum, offlineServer, remoteServer } from '@app/AppState';
import { serverUris } from '@app/uris';

export const mockServer = remoteServer(
  serverUris(() => '')[0].uri,
  ChainNameEnum.mainChainName,
);

export const mockOfflineServer = offlineServer(ChainNameEnum.noneChainName);
