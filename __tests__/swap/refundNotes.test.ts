import type { ValueTransferType } from '@app/AppState';
import { ValueTransferKindEnum } from '@app/wallet/enums';
import { RPCValueTransfersStatusEnum } from '@app/walletBackend/enums/RPCValueTransfersStatusEnum';
import { BroadcastStatusEnum } from '@app/swap/enums/BroadcastStatusEnum';
import { SwapDirectionEnum } from '@app/swap/enums/SwapDirectionEnum';
import { SwapKitProviderEnum } from '@app/swap/enums/SwapKitProviderEnum';
import { SwapStatusEnum } from '@app/swap/enums/SwapStatusEnum';
import { createDefaultProviderRegistry } from '@app/swap/providers/ProviderRegistry';
import { claimRefund, refundNotesFrom } from '@app/swap/refundNotes';
import { SwapService } from '@app/swap/SwapService';
import type { SwapKitClient } from '@app/swap/SwapKitClient';
import type { SwapPoller } from '@app/swap/SwapPoller';
import type { SwapStore } from '@app/swap/SwapStore';
import type { TokenCatalog } from '@app/swap/TokenCatalog';
import type { SwapRecordType } from '@app/swap/types/SwapRecordType';

jest.mock('@app/RPCModule', () => ({ __esModule: true, default: {} }));

const DEPOSIT = 'c0ffee'.padEnd(64, '0');

const vt = (over: Partial<ValueTransferType>): ValueTransferType => ({
  txid: 'refund-tx',
  kind: ValueTransferKindEnum.Received,
  confirmations: 1,
  blockheight: 1,
  time: 1,
  amount: 0.0118,
  status: RPCValueTransfersStatusEnum.confirmed,
  ...over,
});

const sale = (over: Partial<SwapRecordType> = {}) =>
  ({
    recordId: 'sale-1',
    provider: SwapKitProviderEnum.ThorchainStreaming,
    direction: SwapDirectionEnum.Outbound,
    sellAsset: { chain: 'ZEC', chainId: 'zcash' },
    receiveAsset: { chain: 'BTC', chainId: 'bitcoin' },
    status: SwapStatusEnum.Processing,
    broadcast: {
      status: BroadcastStatusEnum.Broadcasted,
      txId: DEPOSIT,
      allTxIds: ['deshield-tx', DEPOSIT],
    },
    createdAtMs: 1,
    updatedAtMs: 1,
    ...over,
  }) as unknown as SwapRecordType;

const harness = (records: SwapRecordType[]) => {
  const stored = new Map(records.map(r => [r.recordId, r]));
  const service = new SwapService({
    client: {} as unknown as SwapKitClient,
    registry: createDefaultProviderRegistry(),
    store: {
      readAll: async () => [...stored.values()],
      update: async (
        id: string,
        change: (current: SwapRecordType) => SwapRecordType,
      ) => {
        const current = stored.get(id);
        if (!current) return undefined;
        stored.set(id, change(current));
        return stored.get(id);
      },
    } as unknown as typeof SwapStore,
    poller: {} as unknown as SwapPoller,
    tokenCatalog: null as unknown as TokenCatalog,
  });
  return { service, stored };
};

describe('refundNotesFrom', () => {
  it('Tests that a received transfer is a refund when its memo or OP_RETURN names a deposit. Maya writes the hash in capitals.', () => {
    expect(
      refundNotesFrom([
        vt({ memos: [`REFUND:${DEPOSIT.toUpperCase()}`] }),
        vt({ txid: 'refund-2', opReturnData: [`REFUND:${DEPOSIT}`] }),
      ]),
    ).toEqual([
      { txid: 'refund-tx', amount: 0.0118, depositTxid: DEPOSIT },
      { txid: 'refund-2', amount: 0.0118, depositTxid: DEPOSIT },
    ]);
  });

  it('Tests that nothing is a refund when the text is a payout or the transfer was not received', () => {
    expect(
      refundNotesFrom([
        vt({ opReturnData: [`OUT:${DEPOSIT}`] }),
        vt({
          kind: ValueTransferKindEnum.Sent,
          opReturnData: [`REFUND:${DEPOSIT}`],
        }),
      ]),
    ).toEqual([]);
  });
});

describe('claimRefund', () => {
  const note = { txid: 'refund-tx', amount: 0.0118, depositTxid: DEPOSIT };

  it('Tests that a sale the provider completed keeps its status when a refund comes back. A streaming swap refunds the part it could not fill.', () => {
    const claimed = claimRefund(
      sale({ status: SwapStatusEnum.Completed, terminalAtMs: 5 }),
      note,
      9,
    );
    expect(claimed.status).toBe(SwapStatusEnum.Completed);
    expect(claimed.terminalAtMs).toBe(5);
    expect(claimed.refundInfo?.refundTxHash).toBe('refund-tx');
  });
});

describe('SwapService.claimRefunds', () => {
  it('Tests that a sale reads refunded, with the ZEC that came back, when a refund names its deposit', async () => {
    const { service, stored } = harness([sale()]);
    const [note] = refundNotesFrom([
      vt({ opReturnData: [`REFUND:${DEPOSIT}`] }),
    ]);

    expect(await service.claimRefunds([note])).toEqual(['refund-tx']);
    expect(stored.get('sale-1')).toMatchObject({
      status: SwapStatusEnum.Refunded,
      refundInfo: {
        refundTxHash: 'refund-tx',
        refundedAmountText: '0.01180000',
      },
    });
  });

  it('Tests that no sale changes when the refund names a deposit this wallet does not keep', async () => {
    const { service, stored } = harness([sale()]);

    expect(
      await service.claimRefunds([
        { txid: 'refund-tx', amount: 0.0118, depositTxid: 'f'.repeat(64) },
      ]),
    ).toEqual(['refund-tx']);
    expect(stored.get('sale-1')?.status).toBe(SwapStatusEnum.Processing);
  });
});
