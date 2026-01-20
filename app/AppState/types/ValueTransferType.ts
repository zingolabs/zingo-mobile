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
  kind: 'stake' | 'begin_unstake' | 'withdraw_stake' | 'redelegate';
  val: number;
  target: string;
  source: string;
  insecureTargetName: string;
  insecureSourceName: string;
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
