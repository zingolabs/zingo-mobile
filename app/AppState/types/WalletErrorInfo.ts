import { ChainNameEnum } from '@app/AppState/enums/ChainNameEnum';
import { RouteEnum } from '@app/AppState/enums/RouteEnum';

/**
 * The wallet action that failed, carrying what a rerun needs.
 */
export type Step =
  | { kind: 'open' }
  | { kind: 'create' }
  | { kind: 'restore'; seedUfvk: string; birthday: number; origin: RouteEnum };

export type InitStep = Exclude<Step, { kind: 'open' }>;

/**
 * Why the step failed, by what the user can change about it: the server,
 * the seed or viewing key, the birthday, the wallet file on disk, or the
 * network the server is on. 'unknown' is everything else.
 */
export type Cause =
  | { kind: 'connection' }
  | { kind: 'key' }
  | { kind: 'birthday' }
  | { kind: 'file' }
  | { kind: 'chain'; walletChain: ChainNameEnum }
  | { kind: 'unknown' };

export type WalletErrorInfo = { cause: Cause; step: Step; details: string };
