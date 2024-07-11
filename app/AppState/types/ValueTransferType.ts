import { ValueTransferKindEnum } from '../enums/ValueTransferKindEnum';
import { PoolEnum } from '../enums/PoolEnum';

export default interface ValueTransferType {
  txid: string;
  kind?: ValueTransferKindEnum; // like kind
  fee?: number;
  confirmations: number;
  time: number;
  zecPrice?: number;
  address: string;
  amount: number;
  memos?: string[];
  poolType?: PoolEnum;
  // eslint-disable-next-line semi
}
