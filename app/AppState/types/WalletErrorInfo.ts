import { ChainNameEnum } from '@app/AppState/enums/ChainNameEnum';

// 'chain': the wallet is on another network than the server it would open on.
export type WalletErrorKind = 'open' | 'server' | 'chain';

// What the error screen shows when the wallet on disk will not open.
export type WalletErrorInfo = {
  kind: WalletErrorKind;
  details: string;
  // The wallet's own network, for the 'chain' kind.
  walletChain?: ChainNameEnum;
};
