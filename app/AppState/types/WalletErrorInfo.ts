import { ChainNameEnum } from '@app/AppState/enums/ChainNameEnum';

// What the error screen shows when the wallet on disk will not open.
// 'chain': the wallet is on another network than the server it would open on.
export type WalletErrorInfo =
  | { kind: 'open' | 'server'; details: string }
  | { kind: 'chain'; details: string; walletChain: ChainNameEnum };

export type WalletErrorKind = WalletErrorInfo['kind'];
