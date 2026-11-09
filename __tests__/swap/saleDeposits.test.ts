import type { ValueTransferType } from '@app/AppState';
import { ValueTransferKindEnum } from '@app/AppState/enums/ValueTransferKindEnum';
import { RPCValueTransfersStatusEnum } from '@app/walletBackend/enums/RPCValueTransfersStatusEnum';
import { BroadcastStatusEnum } from '@app/swap/BroadcastStatusEnum';
import { SwapDirectionEnum } from '@app/swap/SwapDirectionEnum';
import { SwapKitProviderEnum } from '@app/swap/SwapKitProviderEnum';
import { SwapStatusEnum } from '@app/swap/SwapStatusEnum';
import { createDefaultProviderRegistry } from '@app/swap/ProviderRegistry';
import {
  awaitsSaleDeposit,
  claimSaleDeposit,
  paysSale,
  sentPaymentsFrom,
} from '@app/swap/saleDeposits';
import type { SentPaymentType } from '@app/swap/saleDeposits';
import { SwapService } from '@app/swap/SwapService';
import type { SwapKitClient } from '@app/swap/SwapKitClient';
import type { SwapPoller } from '@app/swap/SwapPoller';
import type { SwapStore } from '@app/swap/SwapStore';
import type { TokenCatalog } from '@app/swap/TokenCatalog';
import type { SwapRecordType } from '@app/swap/SwapRecordType';

const CREATED_MS = 1_800_000_000_000;

const sale = (over: Partial<SwapRecordType> = {}) =>
  ({
    recordId: 'sale-1',
    provider: SwapKitProviderEnum.Near,
    direction: SwapDirectionEnum.Outbound,
    sellAsset: { chain: 'ZEC', chainId: 'zcash' },
    receiveAsset: { chain: 'ETH', chainId: '1' },
    sellAmountHumanDecimal: '0.25',
    depositAddress: 't1deposit',
    providerData: { kind: SwapKitProviderEnum.Near },
    status: SwapStatusEnum.PendingDeposit,
    createdAtMs: CREATED_MS,
    updatedAtMs: CREATED_MS,
    ...over,
  }) as unknown as SwapRecordType;

const payment = (over: Partial<SentPaymentType> = {}): SentPaymentType => ({
  txid: 'aa11',
  address: 't1deposit',
  amountAtomic: 25_000_000,
  timeMs: CREATED_MS + 60_000,
  ...over,
});

const vt = (over: Partial<ValueTransferType>): ValueTransferType => ({
  txid: 'aa11',
  kind: ValueTransferKindEnum.Sent,
  confirmations: 0,
  blockheight: 0,
  time: (CREATED_MS + 60_000) / 1000,
  amount: 0.25,
  address: 't1deposit',
  status: RPCValueTransfersStatusEnum.mempool,
  ...over,
});

describe('sentPaymentsFrom', () => {
  it('Tests that a send to an address is a payment in atomic units', () => {
    expect(sentPaymentsFrom([vt({})])).toEqual([payment()]);
  });

  it('Tests that nothing is a payment when it was received, failed, a swap row or has no address', () => {
    expect(
      sentPaymentsFrom([
        vt({ kind: ValueTransferKindEnum.Received }),
        vt({ status: RPCValueTransfersStatusEnum.failed }),
        vt({ swapRecordId: 'sale-1' }),
        vt({ address: undefined }),
      ]),
    ).toEqual([]);
  });
});

describe('awaitsSaleDeposit', () => {
  it('Tests that a sale still pending its deposit with no transaction awaits one', () => {
    expect(awaitsSaleDeposit(sale())).toBe(true);
    expect(
      awaitsSaleDeposit(
        sale({
          broadcast: {
            status: BroadcastStatusEnum.PendingBroadcast,
            allTxIds: ['deshield'],
          },
        }),
      ),
    ).toBe(true);
  });

  it('Tests that nothing awaits a deposit when it has one, moved on or is a purchase', () => {
    expect(
      awaitsSaleDeposit(
        sale({
          broadcast: {
            status: BroadcastStatusEnum.Broadcasted,
            txId: 'aa11',
            allTxIds: ['aa11'],
          },
        }),
      ),
    ).toBe(false);
    expect(awaitsSaleDeposit(sale({ status: SwapStatusEnum.Pending }))).toBe(
      false,
    );
    expect(
      awaitsSaleDeposit(sale({ direction: SwapDirectionEnum.Inbound })),
    ).toBe(false);
  });
});

describe('paysSale', () => {
  it('Tests that a payment of the exact amount to the deposit address after the sale pays it', () => {
    expect(paysSale(sale(), payment())).toBe(true);
  });

  it('Tests that a payment does not pay the sale when the address, the amount or the time differ', () => {
    expect(paysSale(sale(), payment({ address: 't1other' }))).toBe(false);
    expect(paysSale(sale(), payment({ amountAtomic: 25_000_001 }))).toBe(false);
    expect(
      paysSale(sale(), payment({ timeMs: CREATED_MS - 60 * 60 * 1000 })),
    ).toBe(false);
  });
});

describe('claimSaleDeposit', () => {
  it('Tests that the sale moves on as broadcast with the payment as its deposit', () => {
    expect(claimSaleDeposit(sale(), payment(), 99)).toEqual(
      expect.objectContaining({
        status: SwapStatusEnum.Pending,
        broadcast: {
          status: BroadcastStatusEnum.Broadcasted,
          txId: 'aa11',
          allTxIds: ['aa11'],
          broadcastedAtMs: CREATED_MS + 60_000,
        },
        updatedAtMs: 99,
      }),
    );
  });

  it('Tests that a deshield already kept stays first when the deposit after it is found', () => {
    const held = sale({
      broadcast: {
        status: BroadcastStatusEnum.PendingBroadcast,
        allTxIds: ['deshield'],
      },
    });

    expect(claimSaleDeposit(held, payment(), 99).broadcast?.allTxIds).toEqual([
      'deshield',
      'aa11',
    ]);
  });

  it('Tests that a sale with its deposit already tied is left as it is', () => {
    const tied = sale({ status: SwapStatusEnum.Pending });

    expect(claimSaleDeposit(tied, payment(), 99)).toBe(tied);
  });
});

describe('SwapService.claimSaleDeposits', () => {
  const harness = (records: SwapRecordType[]) => {
    const stored = new Map(records.map(r => [r.recordId, r]));
    const start = jest.fn();
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
      poller: { start } as unknown as SwapPoller,
      tokenCatalog: null as unknown as TokenCatalog,
    });
    return { service, stored, start };
  };

  it('Tests that a sale whose send reported nothing takes the deposit the wallet shows', async () => {
    const { service, stored, start } = harness([sale()]);

    expect(await service.claimSaleDeposits([payment()])).toEqual(['sale-1']);
    expect(stored.get('sale-1')?.broadcast?.txId).toBe('aa11');
    expect(start).toHaveBeenCalled();
  });

  it('Tests that two sales of one amount to a shared vault take one deposit each, oldest first', async () => {
    const maya = {
      provider: SwapKitProviderEnum.MayachainStreaming,
      depositAddress: 't1vault',
    };
    const { service, stored } = harness([
      sale({ ...maya, recordId: 'later', createdAtMs: CREATED_MS + 1000 }),
      sale({ ...maya, recordId: 'first' }),
    ]);

    await service.claimSaleDeposits([
      payment({
        txid: 'bb22',
        address: 't1vault',
        timeMs: CREATED_MS + 120_000,
      }),
      payment({ txid: 'aa11', address: 't1vault' }),
    ]);

    expect(stored.get('first')?.broadcast?.txId).toBe('aa11');
    expect(stored.get('later')?.broadcast?.txId).toBe('bb22');
  });

  it('Tests that a transaction already tied to another swap is never taken again', async () => {
    const { service, stored, start } = harness([
      sale({
        recordId: 'done',
        status: SwapStatusEnum.Pending,
        broadcast: {
          status: BroadcastStatusEnum.Broadcasted,
          txId: 'aa11',
          allTxIds: ['aa11'],
        },
      }),
      sale(),
    ]);

    expect(await service.claimSaleDeposits([payment()])).toEqual([]);
    expect(stored.get('sale-1')?.status).toBe(SwapStatusEnum.PendingDeposit);
    expect(start).not.toHaveBeenCalled();
  });
});
