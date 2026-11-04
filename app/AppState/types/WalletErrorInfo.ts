import { ChainNameEnum } from '@app/AppState/enums/ChainNameEnum';

/** The way the wallet was being loaded. */
export type WalletLoadKind = 'open' | 'create' | 'restore';

/**
 * Why it failed, from the error's type. 'chain': the wallet is on another
 * network than the server it would open on.
 */
export type WalletErrorCause = 'server' | 'key' | 'file' | 'chain' | 'unknown';

/** What the error screen shows when a wallet will not load. */
export type WalletErrorInfo = {
  load: WalletLoadKind;
  cause: WalletErrorCause;
  details: string;
  /** The wallet's own network, for the 'chain' cause. */
  walletChain?: ChainNameEnum;
};
