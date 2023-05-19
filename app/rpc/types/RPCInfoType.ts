export type RPCInfoType = {
  version: string;
  git_commit: string;
  server_uri: string;
  vendor: string;
  taddr_support: boolean;
  chain_name: string;
  sapling_activation_height: number;
  consensus_branch_id: string;
  latest_block_height: number;
};
