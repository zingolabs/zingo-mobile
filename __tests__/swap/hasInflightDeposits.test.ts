import { SwapService } from '@app/swap/SwapService';
import { BroadcastStatusEnum } from '@app/swap/enums/BroadcastStatusEnum';
import { SwapDirectionEnum } from '@app/swap/enums/SwapDirectionEnum';
import { SwapKitProviderEnum } from '@app/swap/enums/SwapKitProviderEnum';
import { SwapStatusEnum } from '@app/swap/enums/SwapStatusEnum';
import type { SwapStore } from '@app/swap/SwapStore';
import type { SwapAssetType } from '@app/swap/types/SwapAssetType';
import type { SwapRecordType } from '@app/swap/types/SwapRecordType';

// SwapService reaches the network clients, which read `window.electronAPI` at
// module load. Nothing on this path calls them, but the import has to resolve.

/**
 * `hasInflightDeposits` is the predicate behind the delete-wallet warning, so
 * what it counts decides whether a user is told their funds are still moving.
 * It reads nothing but the store, which is why the service under test is built
 * from a fake one and null dependencies: none of the others are reachable from
 * this path.
 */

const ZEC: SwapAssetType = {
  swapKitId: 'ZEC.ZEC',
  chain: 'ZEC',
  symbol: 'ZEC',
  ticker: 'ZEC',
  chainId: 'zcash',
  decimals: 8,
};

const BTC: SwapAssetType = {
  swapKitId: 'BTC.BTC',
  chain: 'BTC',
  symbol: 'BTC',
  ticker: 'BTC',
  chainId: 'bitcoin',
  decimals: 8,
};

const makeRecord = (
  overrides: Partial<SwapRecordType> = {},
): SwapRecordType => ({
  recordId: 'rec-1',
  depositAddress: 'maya1vault',
  provider: SwapKitProviderEnum.MayachainStreaming,
  direction: SwapDirectionEnum.Outbound,
  routeId: 'route-1',
  sellAsset: ZEC,
  receiveAsset: BTC,
  sellAmountHumanDecimal: '1.5',
  expectedReceiveAmount: '0.002',
  minReceiveAmount: '0.0019',
  destinationAddress: 'bc1qdestination',
  sourceAddress: 't1ephemeral',
  status: SwapStatusEnum.Pending,
  providerData: {
    kind: SwapKitProviderEnum.MayachainStreaming,
    vaultAddress: 'maya1vault',
    memo: '=:b:bc1q',
  },
  fiatValueBasis: {
    sellUsdUnitPrice: 30,
    receiveUsdUnitPrice: 60000,
    capturedAt: 0,
  },
  createdAtMs: 1_700_000_000_000,
  updatedAtMs: 1_700_000_000_000,
  ...overrides,
});

const serviceOver = (records: SwapRecordType[]): SwapService => {
  const store = { readAll: async () => records } as unknown as typeof SwapStore;
  return new SwapService({
    client: null as never,
    registry: null as never,
    store,
    poller: null as never,
    tokenCatalog: null as never,
  });
};

describe('SwapService.hasInflightDeposits', () => {
  it('is false with no swaps at all', async () => {
    await expect(serviceOver([]).hasInflightDeposits()).resolves.toBe(false);
  });

  it('counts an outbound deposit this wallet broadcast and the provider has not settled', async () => {
    const record = makeRecord({
      broadcast: {
        status: BroadcastStatusEnum.Broadcasted,
        txId: 'a'.repeat(64),
      },
    });
    await expect(serviceOver([record]).hasInflightDeposits()).resolves.toBe(
      true,
    );
  });

  // The sharper case: the payout is addressed to an ephemeral address of this
  // wallet, so deleting it without the seed loses the incoming funds. The
  // mobile wallet's version misses this because its guard sits on a flow that
  // keeps the seed.
  it('counts an inbound deposit the user paid from elsewhere', async () => {
    const record = makeRecord({
      direction: SwapDirectionEnum.Inbound,
      sellAsset: BTC,
      receiveAsset: ZEC,
      observedDepositTxHash: 'b'.repeat(64),
      broadcast: undefined,
    });
    await expect(serviceOver([record]).hasInflightDeposits()).resolves.toBe(
      true,
    );
  });

  // Nothing has moved, so a quote the user abandoned must not stand between
  // them and deleting a wallet.
  it('ignores a swap that is only reserved', async () => {
    const pendingDeposit = makeRecord({
      status: SwapStatusEnum.PendingDeposit,
      broadcast: undefined,
    });
    const awaitingExternal = makeRecord({
      recordId: 'rec-2',
      direction: SwapDirectionEnum.Inbound,
      status: SwapStatusEnum.AwaitingExternalDeposit,
      broadcast: undefined,
    });
    await expect(
      serviceOver([pendingDeposit, awaitingExternal]).hasInflightDeposits(),
    ).resolves.toBe(false);
  });

  it('ignores a swap that already reached a terminal status', async () => {
    const records = [
      SwapStatusEnum.Completed,
      SwapStatusEnum.Refunded,
      SwapStatusEnum.Failed,
    ].map((status, i) =>
      makeRecord({
        recordId: `rec-${i}`,
        status,
        broadcast: {
          status: BroadcastStatusEnum.Broadcasted,
          txId: 'c'.repeat(64),
        },
      }),
    );
    await expect(serviceOver(records).hasInflightDeposits()).resolves.toBe(
      false,
    );
  });

  // `/track` emits an all-zero hash for a leg that has not landed, and records
  // written before that filter existed still carry one. Reading it as evidence
  // would warn about a deposit nobody has made.
  it('does not read an all-zero placeholder hash as a paid deposit', async () => {
    const record = makeRecord({
      direction: SwapDirectionEnum.Inbound,
      status: SwapStatusEnum.AwaitingExternalDeposit,
      observedDepositTxHash: `0x${'0'.repeat(64)}`,
      broadcast: undefined,
    });
    await expect(serviceOver([record]).hasInflightDeposits()).resolves.toBe(
      false,
    );
  });

  it('finds the one in-flight swap among settled ones', async () => {
    const settled = makeRecord({
      recordId: 'done',
      status: SwapStatusEnum.Completed,
    });
    const moving = makeRecord({
      recordId: 'moving',
      status: SwapStatusEnum.Processing,
      broadcast: {
        status: BroadcastStatusEnum.Broadcasted,
        txId: 'd'.repeat(64),
      },
    });
    await expect(
      serviceOver([settled, moving]).hasInflightDeposits(),
    ).resolves.toBe(true);
  });
});
