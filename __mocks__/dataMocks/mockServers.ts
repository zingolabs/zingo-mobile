import { ChainNameEnum, ServerType, ServerUrisType } from '../../app/AppState';
import { serverUris } from '../../app/uris';

export const mockLightWalletServer: ServerType = {
  uri: serverUris(() => '').filter((s: ServerUrisType) => s.chainName === ChainNameEnum.testChainName)[0].uri,
  chainName: serverUris(() => '').filter((s: ServerUrisType) => s.chainName === ChainNameEnum.testChainName)[0].chainName,
};

export const mockValidatorServer: ServerType = {
  uri: '',
  chainName: ChainNameEnum.testChainName,
};
