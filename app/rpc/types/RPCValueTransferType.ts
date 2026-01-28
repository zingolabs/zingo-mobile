import { PoolEnum, StakingActionType } from '../../AppState';
import { RPCValueTransferStatusEnum } from '../enums/RPCValueTransferStatusEnum';
import { RPCValueTransferKindEnum } from '../enums/RPCValueTransferKindEnum';

export type RPCValueTransferType = {
  txid: string;
  datetime: number;
  status: RPCValueTransferStatusEnum;
  blockheight: number;
  transaction_fee?: number;
  zec_price?: number;
  kind: RPCValueTransferKindEnum;
  value: number;
  recipient_address?: string;
  pool_received?: PoolEnum;
  memos?: string[];
  staking_action: StakingActionType | null;
};
