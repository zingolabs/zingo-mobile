import { RPCValueTransfersStatusEnum } from '../../walletBackend/types/rpcTransactionTypes';
import { ValueTransferKindEnum } from '../enums/ValueTransferKindEnum';

export default interface ContactType {
  address: string;

  // for searching
  label: string;

  // for wiewing
  color: string;

  // last message
  time: number;
  memos: string[];
  confirmations: number;
  status?: RPCValueTransfersStatusEnum;
  kind?: ValueTransferKindEnum;
}
