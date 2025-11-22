import { ChainNameEnum, ServerType, ServerUrisType } from '../../app/AppState';
import { serverUris } from '../../app/uris';

export const mockIndexerServer: ServerType = {
  uri: serverUris(() => '').filter((s: ServerUrisType) => s.chainName === ChainNameEnum.testChainName)[0].uri,
  chainName: serverUris(() => '').filter((s: ServerUrisType) => s.chainName === ChainNameEnum.testChainName)[0].chainName,
};
