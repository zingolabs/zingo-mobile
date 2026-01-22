export default interface StakingActionType {
  kind: 'create_bond' | 'begin_unbonding' | 'withdraw_bond' | 'redelegate';
  val: number;
  target: string;
  unique_public_key: string;
}