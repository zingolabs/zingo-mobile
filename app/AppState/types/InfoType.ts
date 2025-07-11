import { ChainNameEnum } from '../enums/ChainNameEnum';
import { CurrencyNameEnum } from '../enums/CurrencyNameEnum';

export default interface InfoType {
  chainName: ChainNameEnum;
  serverUri: string;
  latestBlock: number;
  version: string;
  currencyName: CurrencyNameEnum;
  // eslint-disable-next-line semi
}
