import { ChainNameEnum } from '@app/AppState/enums/ChainNameEnum';
import { CurrencyNameEnum } from '@app/AppState/enums/CurrencyNameEnum';

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
  // Seconds per block as actually observed from consecutive server-height
  // readings (EMA), for wall-clock estimates that hold on chains ticking off
  // the mainnet target. Absent until two readings at different heights land;
  // fall back to TARGET_BLOCK_SPACING_SECONDS.
  secondsPerBlock?: number;
}
