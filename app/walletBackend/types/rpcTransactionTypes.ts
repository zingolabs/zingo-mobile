import { z } from 'zod';
import { PoolEnum, TransactionTypeEnum } from '../../AppState';

export const ProposalInfoSchema = z.object({
  fee: z.number().nonnegative(),
});
export type ProposalInfo = z.infer<typeof ProposalInfoSchema>;

export const ShieldProposalInfoSchema = z.object({
  fee:             z.number().nonnegative(),
  value_to_shield: z.number().nonnegative(),
});
export type ShieldProposalInfo = z.infer<typeof ShieldProposalInfoSchema>;

export const ConfirmInfoSchema = z.object({
  txids: z.array(z.string()),
});
export type ConfirmInfo = z.infer<typeof ConfirmInfoSchema>;

export enum RPCValueTransfersKindEnum {
  sent = 'sent',
  memoToSelf = 'memo-to-self',
  shield = 'shield',
  received = 'received',
  sendToSelf = 'send-to-self',
  rejection = 'rejection',
}

export enum RPCValueTransfersStatusEnum {
  calculated = 'calculated',
  transmitted = 'transmitted',
  mempool = 'mempool',
  confirmed = 'confirmed',
  failed = 'failed',
}

export type RPCValueTransferType = {
  txid: string;
  datetime: number;
  status: RPCValueTransfersStatusEnum;
  blockheight: number;
  transaction_fee?: number;
  zec_price?: number;
  kind: RPCValueTransfersKindEnum;
  value: number;
  recipient_address?: string;
  pool_received?: PoolEnum;
  memos?: string[];
};

export type RPCValueTransfersType = {
  value_transfers: RPCValueTransferType[];
  total: number;
};

export type RPCOrchardNoteType = {
  created_in_block: number;
  datetime: number;
  created_in_txid: string;
  value: string;
  pending: string;
  address: string;
  spendable: string;
  spent: string;
  spent_at_height: number;
  pending_spent: string;
};

export type RPCSaplingNoteType = {
  created_in_block: number;
  datetime: number;
  created_in_txid: string;
  value: string;
  pending: string;
  address: string;
  spendable: string;
  spent: string;
  spent_at_height: number;
  pending_spent: string;
};

export type RPCUtxoNoteType = {
  created_in_block: number;
  datetime: number;
  created_in_txid: string;
  value: string;
  scriptkey: string;
  address: string;
  spent_at_height: number;
  spent: string;
  pending_spent: string;
};

export type RPCOutgoingMetadataType = {
  address: string;
  value: number;
  memo?: string;
  memohex?: string;
};

export type RPCNotesType = {
  unspent_sapling_notes: RPCSaplingNoteType[];
  pending_sapling_notes: RPCSaplingNoteType[];
  unspent_orchard_notes: RPCOrchardNoteType[];
  pending_orchard_notes: RPCOrchardNoteType[];
  utxos: RPCUtxoNoteType[];
  pending_utxos: RPCUtxoNoteType[];
};

export type RPCSummariesType = {
  block_height: number;
  datetime: number;
  txid: string;
  price?: number | null | 'None';
  amount: number;
  to_address?: string;
  memos?: string[];
  kind: TransactionTypeEnum;
  pool_type?: PoolEnum | 'None';
  pending: boolean;
};

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

export type RPCZecPriceType = {
  current_price?: number;
  error?: string;
};
