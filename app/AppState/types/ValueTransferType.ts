import { ValueTransferKindEnum } from '@app/AppState/enums/ValueTransferKindEnum';
import { PoolEnum } from '@app/AppState/enums/PoolEnum';
import { RPCValueTransfersStatusEnum } from '@app/walletBackend/enums/RPCValueTransfersStatusEnum';

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
}
