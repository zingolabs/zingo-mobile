import { ChainNameEnum } from '../enums/ChainNameEnum';
import { CurrencyNameEnum } from '../enums/CurrencyNameEnum';

export default interface InfoType {
  chainName: ChainNameEnum;
  serverUri: string;
  latestBlock: number;
  version: string;
  currencyName: CurrencyNameEnum;
  // Height at which Ironwood (NU6.3) activates on this chain, as reported by
  // zingolib. Null when it never does, or when the chain is unknown — see
  // `isIronwoodActive`.
  ironwoodActivationHeight: number | null;
}
