import { PoolNameType } from '../../AppState/types/ProposalPoolsType';

export type RPCSendProposeType = {
  fee?: number;
  amount?: number;
  source_pools?: PoolNameType[];
  destination_pools?: PoolNameType[];
  error?: string;
};
