import { saleDepositRequest } from '@app/swap/saleDepositRequest';
import { SwapDirectionEnum } from '@app/swap/enums/SwapDirectionEnum';
import { SwapKitProviderEnum } from '@app/swap/enums/SwapKitProviderEnum';
import { SwapStatusEnum } from '@app/swap/enums/SwapStatusEnum';
import type { SwapRecordType } from '@app/swap/types/SwapRecordType';

const sale = (overrides: Partial<SwapRecordType>): SwapRecordType =>
  ({
    recordId: 'rec-1',
    depositAddress: 't1vault',
    provider: SwapKitProviderEnum.Flashnet,
    direction: SwapDirectionEnum.Outbound,
    routeId: 'route-1',
    sellAsset: {
      swapKitId: 'ZEC.ZEC',
      chain: 'ZEC',
      symbol: 'ZEC',
      ticker: 'ZEC',
      chainId: 'zcash',
      decimals: 8,
    },
    receiveAsset: {
      swapKitId: 'BTC.BTC',
      chain: 'BTC',
      symbol: 'BTC',
      ticker: 'BTC',
      chainId: 'bitcoin',
      decimals: 8,
    },
    sellAmountHumanDecimal: '0.1',
    expectedReceiveAmount: '0.0005',
    minReceiveAmount: '0.0004',
    destinationAddress: 'bc1qdestination',
    sourceAddress: 't1source',
    status: SwapStatusEnum.PendingDeposit,
    providerData: {
      kind: SwapKitProviderEnum.Flashnet,
      swapKitAssignedId: 'fl-1',
      vaultAddress: 't1vault',
    },
    fiatValueBasis: {
      sellUsdUnitPrice: 30,
      receiveUsdUnitPrice: 60000,
      capturedAt: 0,
    },
    createdAtMs: 0,
    updatedAtMs: 0,
    ...overrides,
  }) as SwapRecordType;

test('Tests that a Flashnet sale without a memo is paid through the source address when its record predates the kept rule', () => {
  expect(saleDepositRequest(sale({}))).toEqual({
    depositAddress: 't1vault',
    amountAtomic: 10_000_000,
    memoBytes: undefined,
    viaSourceAddress: true,
    shieldedMemoAddress: undefined,
  });
});

test('Tests that the rule kept at commit decides the shape when the record has it', () => {
  expect(
    saleDepositRequest(
      sale({
        provider: SwapKitProviderEnum.Near,
        depositFromSourceAddress: false,
        providerData: {
          kind: SwapKitProviderEnum.Near,
          depositAddress: 't1vault',
        },
      }),
    ).viaSourceAddress,
  ).toBe(false);
  expect(
    saleDepositRequest(sale({ depositFromSourceAddress: true }))
      .viaSourceAddress,
  ).toBe(true);
});

test('Tests that a Maya sale carries its memo and its shielded memo address when it has one', () => {
  const request = saleDepositRequest(
    sale({
      provider: SwapKitProviderEnum.MayachainStreaming,
      providerData: {
        kind: SwapKitProviderEnum.MayachainStreaming,
        vaultAddress: 't1vault',
        memo: '=:b:bc1q',
        shieldedMemoAddress: 'u1memo',
      },
    }),
  );
  expect(new TextDecoder().decode(request.memoBytes)).toBe('=:b:bc1q');
  expect(request.viaSourceAddress).toBe(true);
  expect(request.shieldedMemoAddress).toBe('u1memo');
});
