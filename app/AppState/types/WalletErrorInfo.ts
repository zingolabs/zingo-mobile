import { ChainNameEnum } from '@app/AppState/enums/ChainNameEnum';
import { RouteEnum } from '@app/AppState/enums/RouteEnum';

// The step a failed init reruns, carrying what the rerun needs.
export type InitStep =
  | { kind: 'create' }
  | { kind: 'restore'; seedUfvk: string; birthday: number; origin: RouteEnum };

// 'chain': the wallet is on another network than the server it would open on.
// 'init': a create or restore failed on its connection to the server.
export type WalletErrorInfo =
  | { kind: 'open'; details: string }
  | { kind: 'server'; details: string }
  | { kind: 'chain'; details: string; walletChain: ChainNameEnum }
  | { kind: 'init'; details: string; step: InitStep };

export type WalletErrorKind = WalletErrorInfo['kind'];
