import { ChainNameEnum, CurrencyNameEnum, InfoType } from '../../app/AppState';
import { serverUris } from '../../app/uris';

export const mockInfo: InfoType = {
  chainName: ChainNameEnum.mainChainName,
  serverUri: serverUris(() => {})[0].uri,
  latestBlock: 2000000,
  version: 'server_version',
  currencyName: CurrencyNameEnum.ZEC,
};
