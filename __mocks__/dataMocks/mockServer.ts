import { ChainNameEnum, ServerType } from '../../app/AppState';
import { serverUris } from '../../app/uris';

export const mockServer: ServerType = {
  uri: serverUris(() => '')[0].uri,
  chainName: ChainNameEnum.mainChainName,
};
