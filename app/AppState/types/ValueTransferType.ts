import { ValueTransferKindEnum } from '../enums/ValueTransferKindEnum';
import { PoolEnum } from '../enums/PoolEnum';
import { RPCValueTransfersStatusEnum } from '../../rpc/enums/RPCValueTransfersStatusEnum';

export default interface ValueTransferType {
  txid: string;
  kind: ValueTransferKindEnum;
  fee?: number;
  confirmations: number;
  blockheight: number;
  time: number;
  zecPrice?: number;
  address?: string;
  amount: number;
  memos?: string[];
  poolType?: PoolEnum;
  status: RPCValueTransfersStatusEnum;
  stakingAction: StakingActionType | null;
}

export interface StakingActionType {
  kind: 'create_bond' | 'begin_unbonding' | 'withdraw_bond' | 'redelegate';
  val: number;
  target: string;
  unique_public_key: string;
  source: string; // maybe obsolete...
}

export interface StakeReceiverToType {
  address: string;
  amount: number;
  memo?: string;
}

export interface StakeJsonToTypeType {
  stakingAction: StakingActionType;
  receivers: StakeReceiverToType[];
}
