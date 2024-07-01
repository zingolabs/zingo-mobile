import { PoolEnum, TransactionType, TransactionTypeEnum } from '../../app/AppState';

export const mockTransactions: TransactionType[] = [
  {
    type: TransactionTypeEnum.Sent,
    fee: 0.0001,
    confirmations: 22,
    txid: 'sent-txid-1234567890',
    time: Date.now(),
    zecPrice: 33.33,
    txDetails: [
      {
        address: 'sent-address-1-12345678901234567890',
        amount: 0.12345678,
        memos: ['hola', '  & ', 'hello'],
      },
      {
        address: 'sent-address-2-09876543210987654321',
        amount: 0.1,
        memos: ['hello', '  & ', 'hola'],
      },
    ],
  },
  {
    type: TransactionTypeEnum.SendToSelf,
    fee: 0.0001,
    confirmations: 12,
    txid: 'sendtoself-txid-1234567890',
    time: Date.now(),
    zecPrice: 33.33,
    txDetails: [
      {
        address: '',
        amount: 0,
        memos: ['orchard memo', 'sapling memo'],
      },
    ],
  },
  {
    type: TransactionTypeEnum.Received,
    confirmations: 133,
    txid: 'receive-txid-1234567890',
    time: Date.now(),
    zecPrice: 66.66,
    txDetails: [
      {
        address: '',
        amount: 0.77654321,
        poolType: PoolEnum.OrchardPool,
        memos: ['hola', '  & ', 'hello'],
      },
      {
        address: '',
        amount: 0.1,
        poolType: PoolEnum.SaplingPool,
        memos: ['hello', '  & ', 'hola'],
      },
    ],
  },
  {
    type: TransactionTypeEnum.Shield,
    fee: 0.0001,
    confirmations: 12,
    txid: 'shield-txid-1234567890',
    time: Date.now(),
    zecPrice: 33.33,
    txDetails: [
      {
        address: '',
        poolType: PoolEnum.OrchardPool,
        amount: 0.0009,
      },
    ],
  },
];
