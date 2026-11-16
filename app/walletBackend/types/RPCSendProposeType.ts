import { PoolNameType } from '@app/wallet/types';

export type RPCSendProposeType = {
  fee?: number;
  amount?: number;
  source_pools?: PoolNameType[];
  destination_pools?: PoolNameType[];
  error?: string;
};
