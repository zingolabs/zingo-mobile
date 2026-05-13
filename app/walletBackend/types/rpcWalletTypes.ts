import { z } from 'zod';
import { ChainNameEnum } from '../../AppState';

export enum RPCWalletKindEnum {
  LoadedFromSeedPhrase = 'Loaded from seed or mnemonic phrase',
  LoadedFromUnifiedSpendingKey = 'Loaded from unified spending key',
  LoadedFromUnifiedFullViewingKey = 'Loaded from unified full viewing key',
  NoKeysFound = 'No keys found',
}

export const BalancesInfoSchema = z.object({
  total_orchard_balance:           z.number().nonnegative(),
  total_sapling_balance:           z.number().nonnegative(),
  total_transparent_balance:       z.number().nonnegative(),
  confirmed_orchard_balance:       z.number().nonnegative(),
  confirmed_sapling_balance:       z.number().nonnegative(),
  confirmed_transparent_balance:   z.number().nonnegative(),
  unconfirmed_orchard_balance:     z.number().nonnegative(),
  unconfirmed_sapling_balance:     z.number().nonnegative(),
  unconfirmed_transparent_balance: z.number().nonnegative(),
});
export type BalancesInfo = z.infer<typeof BalancesInfoSchema>;

export const SpendableBalanceInfoSchema = z.object({
  spendable_balance: z.number().nonnegative(),
});
export type SpendableBalanceInfo = z.infer<typeof SpendableBalanceInfoSchema>;

export const WalletHeightInfoSchema = z.object({
  height: z.number().int().nonnegative(),
});
export type WalletHeightInfo = z.infer<typeof WalletHeightInfoSchema>;

export const WalletVersionInfoSchema = z.object({
  current_version: z.number().int().nonnegative(),
  read_version:    z.number().int().nonnegative(),
});
export type WalletVersionInfo = z.infer<typeof WalletVersionInfoSchema>;

export const WalletSaveRequiredInfoSchema = z.object({
  save_required: z.boolean(),
});
export type WalletSaveRequiredInfo = z.infer<typeof WalletSaveRequiredInfoSchema>;

export const SeedInfoSchema = z.object({
  seed_phrase:    z.string(),
  birthday:       z.number().int().nonnegative(),
  no_of_accounts: z.number().int().nonnegative(),
});
export type SeedInfo = z.infer<typeof SeedInfoSchema>;

export const UfvkInfoSchema = z.object({
  ufvk:    z.string(),
  birthday: z.number().int().nonnegative(),
});
export type UfvkInfo = z.infer<typeof UfvkInfoSchema>;

export const PerformanceInfoSchema = z.object({
  performance_level: z.string(),
});
export type PerformanceInfo = z.infer<typeof PerformanceInfoSchema>;

// Unchanged — used by domain layer and RPC functions not yet typed

export type RPCWalletKindType = {
  kind: RPCWalletKindEnum;
  transparent: boolean;
  sapling: boolean;
  orchard: boolean;
};

export type RPCInfoType = {
  version: string;
  git_commit: string;
  server_uri: string;
  vendor: string;
  taddr_support: boolean;
  chain_name: ChainNameEnum;
  sapling_activation_height: number;
  consensus_branch_id: string;
  latest_block_height: number;
};
