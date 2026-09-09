export type PoolNameType = 'transparent' | 'sapling' | 'orchard' | 'ironwood';

type ProposalPoolsType = {
  source: PoolNameType[];
  destination: PoolNameType[];
};

export default ProposalPoolsType;
