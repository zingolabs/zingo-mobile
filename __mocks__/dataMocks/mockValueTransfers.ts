import { ValueTransferType } from '@app/wallet/transfer';

// Fixed instant rather than Date.now(): these rows reach the History snapshot
// verbatim, and a wall-clock reading makes it fail on the next run. The
// offsets below keep the original ordering.
const BASE_TIME = Date.parse('2026-01-01T00:00:00Z');

export const mockValueTransfers: ValueTransferType[] = [
  {
    kind: 'Sent',
    fee: 0.0001,
    confirmations: 22,
    status: 'confirmed',
    txid: 'sent-txid-1234567890',
    time: BASE_TIME - 1000,
    zecPrice: 33.33,
    address: 'sent-address-1-12345678901234567890',
    amount: 0.12345678,
    memos: ['hola', '  & ', 'hello'],
    blockheight: 2000000,
  },
  {
    kind: 'MemoToSelf',
    fee: 0.0001,
    confirmations: 12,
    status: 'confirmed',
    txid: 'memotooself-txid-1234567890',
    time: BASE_TIME - 100,
    zecPrice: 33.33,
    amount: 0,
    memos: ['orchard memo', 'sapling memo'],
    blockheight: 2000000,
  },
  {
    kind: 'SendToSelf',
    fee: 0.0001,
    confirmations: 12,
    status: 'confirmed',
    txid: 'sendtooself-txid-1234567890',
    time: BASE_TIME - 100,
    zecPrice: 33.33,
    amount: 0,
    blockheight: 2000000,
  },
  {
    kind: 'Received',
    confirmations: 133,
    status: 'confirmed',
    txid: 'receive-txid-1234567890',
    time: BASE_TIME - 10,
    zecPrice: 66.66,
    amount: 0.77654321,
    poolType: 'Orchard',
    memos: ['hola', '  & ', 'hello'],
    blockheight: 2000000,
  },
  {
    kind: 'Shield',
    fee: 0.0001,
    confirmations: 12,
    status: 'confirmed',
    txid: 'shield-txid-1234567890',
    time: BASE_TIME,
    zecPrice: 33.33,
    amount: 0.0009,
    blockheight: 2000000,
  },
  {
    kind: 'Rejection',
    fee: 0.0001,
    confirmations: 12,
    status: 'confirmed',
    txid: 'rejection-320-tex-txid-1234567890',
    time: BASE_TIME,
    zecPrice: 33.33,
    amount: 0.0009,
    blockheight: 2000000,
  },
];
