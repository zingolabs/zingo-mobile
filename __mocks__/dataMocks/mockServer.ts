import { ChainNameEnum, ServerType } from '../../app/AppState';
import { serverUris } from '../../app/uris';

export const mockLightWalletServer: ServerType = {
  uri: serverUris(() => '').filter((s: ServerType) => s.chainName === ChainNameEnum.testChainName)[0].uri,
  chainName: serverUris(() => '').filter((s: ServerType) => s.chainName === ChainNameEnum.testChainName)[0].chainName,
};

export const mockValidatorServer: ServerType = {
  uri: '',
  chainName: ChainNameEnum.testChainName,
};
