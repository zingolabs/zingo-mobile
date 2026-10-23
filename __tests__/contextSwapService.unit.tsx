jest.mock('@app/swap/swapStorage', () => {
  const disk = new Map<string, string>();
  return {
    __esModule: true,
    default: {
      getItem: jest.fn(async (key: string) =>
        disk.has(key) ? disk.get(key) : null,
      ),
      setItem: jest.fn(async (key: string, value: string) => {
        disk.set(key, value);
      }),
      removeItem: jest.fn(async (key: string) => {
        disk.delete(key);
      }),
    },
  };
});

import { renderHook, waitFor } from '@testing-library/react-native';
import { ValueTransferKindEnum } from '@app/AppState';
import type { ValueTransferType } from '@app/AppState';
import { useValueTransfersWithSwaps } from '@app/context';
import { SwapStore } from '@app/swap';
import { SwapDirectionEnum } from '@app/swap/enums/SwapDirectionEnum';
import { SwapKitProviderEnum } from '@app/swap/enums/SwapKitProviderEnum';
import { SwapStatusEnum } from '@app/swap/enums/SwapStatusEnum';
import type { SwapAssetType } from '@app/swap/types/SwapAssetType';
import type { SwapRecordType } from '@app/swap/types/SwapRecordType';
import { RPCValueTransfersStatusEnum } from '@app/walletBackend/enums/RPCValueTransfersStatusEnum';

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
  recordId: string,
  overrides: Partial<SwapRecordType> = {},
): SwapRecordType => ({
  recordId,
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
  status: SwapStatusEnum.PendingDeposit,
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

const sent = (txid: string, time: number): ValueTransferType => ({
  txid,
  kind: ValueTransferKindEnum.Sent,
  confirmations: 3,
  blockheight: 100,
  time,
  amount: 0.5,
  status: RPCValueTransfersStatusEnum.confirmed,
});

beforeEach(async () => {
  await SwapStore.unbind();
});

test('Tests that History lists the swaps of the bound wallet beside its transfers, newest first, when the store holds records', async () => {
  await SwapStore.bindToWallet('wallet-aaa');
  await SwapStore.upsert(makeRecord('rec-1', { createdAtMs: 2_000_000 }));
  const transfers = [sent('tx-old', 1_000), sent('tx-new', 3_000)];

  const { result } = renderHook(() => useValueTransfersWithSwaps(transfers));

  await waitFor(() =>
    expect(result.current.map(vt => vt.txid)).toEqual([
      'tx-new',
      'maya1vault',
      'tx-old',
    ]),
  );
  expect(result.current[1].kind).toBe(ValueTransferKindEnum.Swap);
  expect(result.current[1].swapRecordId).toBe('rec-1');
});

test('Tests that History shows the transfers alone when the wallet has no swaps', async () => {
  await SwapStore.bindToWallet('wallet-bbb');
  const transfers = [sent('tx-1', 1_000)];

  const { result } = renderHook(() => useValueTransfersWithSwaps(transfers));

  await waitFor(() => expect(result.current).toBe(transfers));
});
