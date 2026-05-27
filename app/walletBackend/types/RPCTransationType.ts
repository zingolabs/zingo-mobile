import { RPCOutgoingMetadataType } from './RPCOutgoingMetadataType';

export type RPCTransactionType = {
  block_height: number;
  pending: boolean;
  datetime: number;
  txid: string;
  zec_price: number;
  amount: number;
  outgoing_metadata?: RPCOutgoingMetadataType[];
  address: string;
  memo?: string;
  memohex?: string;
  position: string;
};
