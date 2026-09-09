import {
  PoolEnum,
  ValueTransferType,
  ValueTransferKindEnum,
} from '@app/AppState';
import { RPCValueTransfersStatusEnum } from '@app/walletBackend/enums/RPCValueTransfersStatusEnum';

// Fixed instant rather than Date.now(): these rows reach the History snapshot
// verbatim, and a wall-clock reading makes it fail on the next run. The
// offsets below keep the original ordering.
const BASE_TIME = Date.parse('2026-01-01T00:00:00Z');

export const mockValueTransfers: ValueTransferType[] = [
  {
    kind: ValueTransferKindEnum.Sent,
    fee: 0.0001,
    confirmations: 22,
    status: RPCValueTransfersStatusEnum.confirmed,
    txid: 'sent-txid-1234567890',
    time: BASE_TIME - 1000,
    zecPrice: 33.33,
    address: 'sent-address-1-12345678901234567890',
    amount: 0.12345678,
    memos: ['hola', '  & ', 'hello'],
    blockheight: 2000000,
  },
  {
    kind: ValueTransferKindEnum.MemoToSelf,
    fee: 0.0001,
    confirmations: 12,
    status: RPCValueTransfersStatusEnum.confirmed,
    txid: 'memotooself-txid-1234567890',
    time: BASE_TIME - 100,
    zecPrice: 33.33,
    amount: 0,
    memos: ['orchard memo', 'sapling memo'],
    blockheight: 2000000,
  },
  {
    kind: ValueTransferKindEnum.SendToSelf,
    fee: 0.0001,
    confirmations: 12,
    status: RPCValueTransfersStatusEnum.confirmed,
    txid: 'sendtooself-txid-1234567890',
    time: BASE_TIME - 100,
    zecPrice: 33.33,
    amount: 0,
    blockheight: 2000000,
  },
  {
    kind: ValueTransferKindEnum.Received,
    confirmations: 133,
    status: RPCValueTransfersStatusEnum.confirmed,
    txid: 'receive-txid-1234567890',
    time: BASE_TIME - 10,
    zecPrice: 66.66,
    amount: 0.77654321,
    poolType: PoolEnum.OrchardPool,
    memos: ['hola', '  & ', 'hello'],
    blockheight: 2000000,
  },
  {
    kind: ValueTransferKindEnum.Shield,
    fee: 0.0001,
    confirmations: 12,
    status: RPCValueTransfersStatusEnum.confirmed,
    txid: 'shield-txid-1234567890',
    time: BASE_TIME,
    zecPrice: 33.33,
    amount: 0.0009,
    blockheight: 2000000,
  },
  {
    kind: ValueTransferKindEnum.Rejection,
    fee: 0.0001,
    confirmations: 12,
    status: RPCValueTransfersStatusEnum.confirmed,
    txid: 'rejection-320-tex-txid-1234567890',
    time: BASE_TIME,
    zecPrice: 33.33,
    amount: 0.0009,
    blockheight: 2000000,
  },
];
