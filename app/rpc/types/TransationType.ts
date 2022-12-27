import { OutgoingMetadataType } from './OutgoingMetadataType';

export type TransactionType = {
  block_height: number;
  unconfirmed: boolean;
  datetime: number;
  txid: string;
  zec_price: number;
  amount: number;
  outgoing_metadata?: OutgoingMetadataType[];
  address: string;
  memo?: string;
  memohex?: string;
  position: string;
};
