import { ValueTransferKindEnum } from '../enums/ValueTransferKindEnum';
import { PoolEnum } from '../enums/PoolEnum';
import { RPCValueTransferStatusEnum } from '../../rpc/enums/RPCValueTransferStatusEnum';
import StakingActionType from './StakingActionType';

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
  status: RPCValueTransferStatusEnum;
  stakingAction: StakingActionType | null;
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
