import { ChainNameEnum } from '../../AppState';

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
  // Ironwood (NU6.3) activation height for the wallet's chain. Not a
  // lightwalletd field — the native layer grafts it on from zingolib's
  // consensus parameters. Null when the chain has no activation scheduled,
  // and absent entirely on a native lib built before it was added.
  ironwood_activation_height?: number | null;
};
