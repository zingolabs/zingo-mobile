import { ChainNameEnum, CurrencyNameEnum, InfoType } from '@app/AppState';

export const mockInfo: InfoType = {
  chainName: ChainNameEnum.mainChainName,
  serverUri: 'https://indexer.example:443',
  latestBlock: 2000000,
  version: 'server_version',
  currencyName: CurrencyNameEnum.ZEC,
  ironwoodActivationHeight: 3428143,
};
