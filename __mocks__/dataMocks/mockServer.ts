import { ChainNameEnum, offlineServer, remoteServer } from '@app/AppState';

export const mockServer = remoteServer(
  'https://indexer.example:443',
  ChainNameEnum.mainChainName,
);

export const mockOfflineServer = offlineServer(ChainNameEnum.noneChainName);
