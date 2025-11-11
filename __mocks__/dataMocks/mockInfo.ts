import { ChainNameEnum, CurrencyNameEnum, InfoType } from '../../app/AppState';
import { mockLightWalletServer } from './mockServer';

export const mockInfo: InfoType = {
  chainName: ChainNameEnum.mainChainName,
  serverUri: mockLightWalletServer.uri,
  latestBlock: 2000000,
  version: 'server_version',
  currencyName: CurrencyNameEnum.ZEC,
};
