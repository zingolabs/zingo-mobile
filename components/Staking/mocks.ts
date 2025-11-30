import {
  PoolEnum,
  ValueTransferKindEnum,
  ValueTransferType,
} from '../../app/AppState';
import { RPCValueTransfersStatusEnum } from '../../app/rpc/enums/RPCValueTransfersStatusEnum';

export const mockMovements: ValueTransferType[] = [
  {
    txid: 'tx-1',
    kind: ValueTransferKindEnum.Sent,
    fee: 0.0001,
    confirmations: 20,
    blockheight: 2_000_001,

    time: 1760094600, // Oct 10, 2025 4:30 PM-ish
    zecPrice: 20.5,
    address: 'zs1-example-stake-1',
    amount: -0.28, // negative = leaving wallet (Staked)
    memos: [],
    poolType: PoolEnum.CrosslinkPool,
    status: RPCValueTransfersStatusEnum.confirmed,
  },
  {
    txid: 'tx-2',
    kind: ValueTransferKindEnum.Sent,
    fee: 0.0001,
    confirmations: 18,
    blockheight: 2_000_000,
    time: 1756969800, // Sep 4, 2025 2:30 PM-ish
    amount: -2.0,
    memos: [],
    poolType: PoolEnum.CrosslinkPool,
    status: RPCValueTransfersStatusEnum.confirmed,
  },
  {
    txid: 'tx-3',
    kind: ValueTransferKindEnum.Received,
    fee: 0.0001,
    confirmations: 15,
    blockheight: 1_999_950,
    time: 1756480680, // Sep 1, 2025 9:58 AM-ish
    amount: 0.185, // positive = Unstaked
    memos: [],
    poolType: PoolEnum.CrosslinkPool,
    status: RPCValueTransfersStatusEnum.confirmed,
  },
  {
    txid: 'tx-4',
    kind: ValueTransferKindEnum.Sent,
    fee: 0.0001,
    confirmations: 50,
    blockheight: 1_998_500,
    time: 1753842600, // Aug 25, 2025 2:30 PM-ish
    amount: -5.0,
    memos: [],
    poolType: PoolEnum.CrosslinkPool,
    status: RPCValueTransfersStatusEnum.confirmed,
  },
  {
    txid: 'tx-5',
    kind: ValueTransferKindEnum.Sent,
    fee: 0.0001,
    confirmations: 80,
    blockheight: 1_997_000,
    time: 1750009800, // Jun 15, 2025 2:30 PM-ish
    amount: -2.0,
    memos: [],
    poolType: PoolEnum.CrosslinkPool,
    status: RPCValueTransfersStatusEnum.confirmed,
  },
];
