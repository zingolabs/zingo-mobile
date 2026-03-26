import { ChainNameEnum, CurrencyNameEnum, InfoType } from '../../app/AppState';
import { mockIndexerServer } from './mockServers';

export const mockInfo: InfoType = {
  chainName: ChainNameEnum.testChainName,
  serverUri: mockIndexerServer.uri,
  latestBlock: 2000000,
  version: 'server_version',
  currencyName: CurrencyNameEnum.ZEC,
};
