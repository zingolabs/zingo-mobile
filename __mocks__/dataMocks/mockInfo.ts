import { ChainNameEnum, CurrencyNameEnum, InfoType } from '../../app/AppState';
import { serverUris } from '../../app/uris';

export const mockInfo: InfoType = {
  chainName: ChainNameEnum.mainChainName,
  serverUri: serverUris(() => {})[0].uri,
  latestBlock: 2000000,
  connections: 0,
  version: 'server_version',
  verificationProgress: 0,
  currencyName: CurrencyNameEnum.ZEC,
  solps: 0,
  zingolib: 'zingolib_version',
};
