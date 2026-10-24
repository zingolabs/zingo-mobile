import { SwapService } from '@app/swap/SwapService';
import { SwapDirectionEnum } from '@app/swap/enums/SwapDirectionEnum';
import { SwapKitProviderEnum } from '@app/swap/enums/SwapKitProviderEnum';
import { depositSpendsSourceAddress } from '@app/swap/depositRouting';
import { fetchMayaShieldedMemoTarget } from '@app/swap/mayaShieldedMemo';
import { createDefaultProviderRegistry } from '@app/swap/providers/ProviderRegistry';
import type { SwapKitClient } from '@app/swap/SwapKitClient';
import type { SwapPoller } from '@app/swap/SwapPoller';
import type { SwapStore } from '@app/swap/SwapStore';
import type { TokenCatalog } from '@app/swap/TokenCatalog';
import type { SwapAssetType } from '@app/swap/types/SwapAssetType';

jest.mock('@app/swap/mayaShieldedMemo', () => ({
  ...jest.requireActual('@app/swap/mayaShieldedMemo'),
  fetchMayaShieldedMemoTarget: jest.fn(),
}));

const target = fetchMayaShieldedMemoTarget as jest.MockedFunction<
  typeof fetchMayaShieldedMemoTarget
>;

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

const VAULT = 't1mayavault';
const UA = 'u1mayamemoaddress';
const EPHEMERAL = 't1ephemeral';
const BTC_ADDRESS = 'bc1qdestination';

// What SwapKit's /v3/swap answers, per provider: a vault and a memo for the
// THORChain family, a minted deposit address for NEAR and Flashnet.
const swapResponse = (provider: SwapKitProviderEnum, outbound: boolean) => {
  const memo = outbound ? `=:b:${BTC_ADDRESS}:0/1/0` : `=:z:${EPHEMERAL}:0/1/0`;
  switch (provider) {
    case SwapKitProviderEnum.MayachainStreaming:
    case SwapKitProviderEnum.ThorchainStreaming:
      return {
        tx: { to: outbound ? VAULT : 'bc1qmayavault', memo },
        inboundAddress: outbound ? VAULT : 'bc1qmayavault',
      };
    default:
      return { tx: { to: 't1deposit' }, inboundAddress: 't1deposit' };
  }
};

const commit = (
  provider: SwapKitProviderEnum,
  direction: SwapDirectionEnum,
) => {
  const outbound = direction === SwapDirectionEnum.Outbound;
  const service = new SwapService({
    client: {
      swap: jest.fn(async () => swapResponse(provider, outbound)),
    } as unknown as SwapKitClient,
    registry: createDefaultProviderRegistry(),
    store: {
      getByRecordId: async () => null,
      upsert: jest.fn(async () => undefined),
    } as unknown as typeof SwapStore,
    poller: { start: jest.fn() } as unknown as SwapPoller,
    tokenCatalog: null as unknown as TokenCatalog,
  });
  return service.commitRoute({
    quoteInput: {
      sellAsset: outbound ? ZEC : BTC,
      receiveAsset: outbound ? BTC : ZEC,
      sellAmountHumanDecimal: outbound ? '0.5' : '0.002',
      sourceAddress: outbound ? EPHEMERAL : BTC_ADDRESS,
      destinationAddress: outbound ? BTC_ADDRESS : EPHEMERAL,
    },
    chosenRoute: {
      routeId: 'r1',
      provider,
      expectedReceiveAmount: '1',
      minReceiveAmount: '0.9',
    },
    direction,
    fiatValueBasis: {
      sellUsdUnitPrice: 1,
      receiveUsdUnitPrice: 1,
      capturedAt: 0,
    },
  });
};

beforeEach(() => {
  target
    .mockReset()
    .mockResolvedValue({ vaultAddress: VAULT, unifiedAddress: UA });
});

/**
 * The shielded memo deposit is Maya's, outbound only. Every other provider,
 * and every inbound swap, keeps the deposit it had, even while Maya has the
 * shielded memo on.
 */
describe('shielded memo deposit across providers and directions', () => {
  it('pays Maya outbound in one shielded send, with the refund address in the memo', async () => {
    const { instructions } = await commit(
      SwapKitProviderEnum.MayachainStreaming,
      SwapDirectionEnum.Outbound,
    );

    expect(target).toHaveBeenCalledTimes(1);
    expect(instructions.shieldedMemoAddress).toBe(UA);
    expect(instructions.memoText).toBe(`=:b:${BTC_ADDRESS}/${EPHEMERAL}:0/1/0`);
    expect(
      depositSpendsSourceAddress({
        ...instructions,
        viaSourceAddress: instructions.requiresDepositFromSourceAddress,
      }),
    ).toBe(false);
  });

  it('keeps the OP_RETURN deposit for Maya outbound when Maya takes no shielded memo', async () => {
    target.mockResolvedValue(null);
    const { instructions } = await commit(
      SwapKitProviderEnum.MayachainStreaming,
      SwapDirectionEnum.Outbound,
    );

    expect(instructions.shieldedMemoAddress).toBeUndefined();
    expect(instructions.memoText).toBe(`=:b:${BTC_ADDRESS}:0/1/0`);
    expect(depositSpendsSourceAddress({ ...instructions })).toBe(true);
  });

  it.each([
    [SwapKitProviderEnum.ThorchainStreaming, SwapDirectionEnum.Outbound],
    [SwapKitProviderEnum.Near, SwapDirectionEnum.Outbound],
    [SwapKitProviderEnum.Flashnet, SwapDirectionEnum.Outbound],
    [SwapKitProviderEnum.MayachainStreaming, SwapDirectionEnum.Inbound],
    [SwapKitProviderEnum.ThorchainStreaming, SwapDirectionEnum.Inbound],
    [SwapKitProviderEnum.Near, SwapDirectionEnum.Inbound],
    [SwapKitProviderEnum.Flashnet, SwapDirectionEnum.Inbound],
  ])('leaves %s %s as it was', async (provider, direction) => {
    const { instructions } = await commit(provider, direction);

    expect(target).not.toHaveBeenCalled();
    expect(instructions.shieldedMemoAddress).toBeUndefined();
  });
});
