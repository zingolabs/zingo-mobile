import { FlashnetExecutor } from '@app/swap/providers/FlashnetExecutor';
import { MayaExecutor } from '@app/swap/providers/MayaExecutor';
import { ThorchainExecutor } from '@app/swap/providers/ThorchainExecutor';
import { NearIntentsExecutor } from '@app/swap/providers/NearIntentsExecutor';
import {
  ProviderRegistry,
  createDefaultProviderRegistry,
} from '@app/swap/providers/ProviderRegistry';
import { SwapKitProviderEnum } from '@app/swap/enums/SwapKitProviderEnum';
import type { ExtractDepositInstructionsContext } from '@app/swap/providers/ProviderExecutor';
import type { SwapAssetType } from '@app/swap/types/SwapAssetType';
import type { SwapResponseType } from '@app/swap/types/SwapResponseType';

/**
 * Executors decide where a deposit goes and what rides with it. Everything
 * else in the swap layer can be wrong and cost the user a confusing screen;
 * these two fields wrong cost them the deposit.
 *
 * The shapes below are the ones the comments in each executor cite from
 * mainnet captures, plus the drifted variants the fallback chains exist to
 * absorb. A chain that stops matching is the failure this suite is for.
 */

const ZEC: SwapAssetType = {
  swapKitId: 'ZEC.ZEC',
  chain: 'ZEC',
  symbol: 'ZEC',
  ticker: 'ZEC',
  chainId: 'zcash',
  decimals: 8,
};

const ETH: SwapAssetType = {
  swapKitId: 'ETH.ETH',
  chain: 'ETH',
  symbol: 'ETH',
  ticker: 'ETH',
  chainId: '1',
  decimals: 18,
};

const MAYA_MEMO = '=:e:0xAA00000000000000000000000000000000000000:0/1/0';
const VAULT = 'maya1vaultaddress';

const context = (
  swapResponse: SwapResponseType,
): ExtractDepositInstructionsContext => ({
  swapResponse,
  sellAsset: ZEC,
  receiveAsset: ETH,
  sellAmountHumanDecimal: '1.5',
  destinationAddress: '0xdestination',
  sourceAddress: 't1ephemeral',
});

const decodeMemo = (bytes: Uint8Array | undefined): string =>
  bytes ? new TextDecoder().decode(bytes) : '';

describe('MayaExecutor deposit instructions', () => {
  const executor = new MayaExecutor();

  it('reads the vault and memo from the documented shape', () => {
    const instructions = executor.extractDepositInstructions(
      context({
        tx: { to: VAULT, memo: MAYA_MEMO, chainId: 'zcash' },
        inboundAddress: VAULT,
        meta: { streamingInterval: 1, maxStreamingQuantity: 0 },
      }),
    );

    expect(instructions.depositAddress).toBe(VAULT);
    expect(instructions.memoText).toBe(MAYA_MEMO);
    expect(instructions.amountHumanDecimal).toBe('1.5');
  });

  // The memo goes into an OP_RETURN, so the bytes are the payload the vault
  // reads. Anything that mangles them loses the deposit to a refund cycle.
  it('encodes the memo as the UTF-8 bytes the OP_RETURN carries', () => {
    const instructions = executor.extractDepositInstructions(
      context({ tx: { to: VAULT, memo: MAYA_MEMO } }),
    );

    expect(decodeMemo(instructions.memoBytes)).toBe(MAYA_MEMO);
  });

  // SwapKit has moved the memo across revisions. The fallback chain is why the
  // executor still works, so each rung is worth pinning.
  it.each([
    ['top-level memo', { inboundAddress: VAULT, memo: MAYA_MEMO }],
    ['meta.memo', { inboundAddress: VAULT, meta: { memo: MAYA_MEMO } }],
    [
      'transient.memo',
      { inboundAddress: VAULT, transient: { memo: MAYA_MEMO } },
    ],
    [
      'transient.providerDetails.memo',
      {
        inboundAddress: VAULT,
        transient: { providerDetails: { memo: MAYA_MEMO } },
      },
    ],
  ])('finds the memo at %s', (_label, response) => {
    const instructions = executor.extractDepositInstructions(
      context(response as SwapResponseType),
    );
    expect(instructions.memoText).toBe(MAYA_MEMO);
  });

  it('falls back through the vault-address spellings', () => {
    const instructions = executor.extractDepositInstructions(
      context({ vault: VAULT, memo: MAYA_MEMO } as SwapResponseType),
    );
    expect(instructions.depositAddress).toBe(VAULT);
  });

  // Refusing beats persisting a record whose deposit address is undefined, or
  // whose memo is missing: the first sends funds nowhere, the second sends them
  // somewhere that cannot route them.
  it('refuses a response with no vault address', () => {
    expect(() =>
      executor.extractDepositInstructions(context({ tx: { memo: MAYA_MEMO } })),
    ).toThrow(/vault address/i);
  });

  it('refuses a response with no memo, naming what it probed', () => {
    expect(() =>
      executor.extractDepositInstructions(context({ tx: { to: VAULT } })),
    ).toThrow(/memo/i);
  });

  it('carries the streaming meta onto the record', () => {
    const instructions = executor.extractDepositInstructions(
      context({
        tx: { to: VAULT, memo: MAYA_MEMO },
        meta: { streamingInterval: 3, maxStreamingQuantity: 7 },
      }),
    );

    expect(instructions.providerData).toMatchObject({
      kind: SwapKitProviderEnum.MayachainStreaming,
      vaultAddress: VAULT,
      streamingIntervalBlocks: 3,
      maxStreamingQuantity: 7,
    });
  });
});

describe('NearIntentsExecutor deposit instructions', () => {
  const executor = new NearIntentsExecutor();

  it('reads the per-quote deposit address and leaves the OP_RETURN empty', () => {
    const instructions = executor.extractDepositInstructions(
      context({
        tx: { to: 'near1deposit', chainId: 'zcash' },
        inboundAddress: 'near1deposit',
        transient: {
          swapId: 'sk-123',
          providerDetails: { depositChannelId: 'chan-9' },
        },
      }),
    );

    expect(instructions.depositAddress).toBe('near1deposit');
    // NEAR identifies the swap by the address, so a memo would be noise the
    // OP_RETURN would pay for.
    expect(instructions.memoBytes).toBeUndefined();
    expect(instructions.memoText).toBeUndefined();
  });

  it('prefers the channel id over the swap id when both are present', () => {
    const instructions = executor.extractDepositInstructions(
      context({
        tx: { to: 'near1deposit' },
        transient: { swapId: 'sk-123', depositChannelId: 'chan-1' },
      }),
    );

    expect(instructions.providerData).toMatchObject({
      swapKitDepositChannelId: 'chan-1',
    });
  });

  it('falls back to the swap id when no channel id is offered', () => {
    const instructions = executor.extractDepositInstructions(
      context({ tx: { to: 'near1deposit' }, transient: { swapId: 'sk-123' } }),
    );

    expect(instructions.providerData).toMatchObject({
      swapKitDepositChannelId: 'sk-123',
    });
  });

  it('refuses a response with no deposit address', () => {
    expect(() =>
      executor.extractDepositInstructions(
        context({ transient: { swapId: 'sk-1' } }),
      ),
    ).toThrow(/deposit address/i);
  });
});

describe('FlashnetExecutor deposit instructions', () => {
  const executor = new FlashnetExecutor();

  it('reads the deposit address and treats a memo as optional', () => {
    const instructions = executor.extractDepositInstructions(
      context({ tx: { to: 'sp1deposit' }, transient: { swapId: 'sk-77' } }),
    );

    expect(instructions.depositAddress).toBe('sp1deposit');
    expect(instructions.memoText).toBeUndefined();
    expect(instructions.providerData).toMatchObject({
      swapKitAssignedId: 'sk-77',
    });
  });

  // The first mainnet trace, 2026-09-11: a deposit paid straight out of the
  // shielded pool carries no sender to check, and Flashnet refunded it with
  // errorCode deposit_source_mismatch. Saying so here is what routes the
  // deposit through the transparent address the quote named.
  it('says its provider requires the deposit to come from the source address', () => {
    const instructions = executor.extractDepositInstructions(
      context({ tx: { to: 'sp1deposit' } }),
    );

    expect(instructions.requiresDepositFromSourceAddress).toBe(true);
  });

  it('encodes a memo when one is offered', () => {
    const instructions = executor.extractDepositInstructions(
      context({ tx: { to: 'sp1deposit', memo: 'flash-memo' } }),
    );

    expect(decodeMemo(instructions.memoBytes)).toBe('flash-memo');
  });

  it('refuses a response with no deposit address', () => {
    expect(() =>
      executor.extractDepositInstructions(context({ transient: {} })),
    ).toThrow(/deposit address/i);
  });
});

describe('ProviderRegistry', () => {
  it('serves the three providers that route ZEC', () => {
    const registry = createDefaultProviderRegistry();

    expect(registry.has(SwapKitProviderEnum.MayachainStreaming)).toBe(true);
    expect(registry.has(SwapKitProviderEnum.Near)).toBe(true);
    expect(registry.has(SwapKitProviderEnum.Flashnet)).toBe(true);
  });

  // Quote routes are filtered on membership, so a provider without an executor
  // has to answer false rather than throw, or one unroutable option would take
  // down the whole quote.
  it('answers false for a provider it cannot execute', () => {
    expect(
      createDefaultProviderRegistry().has(SwapKitProviderEnum.Chainflip),
    ).toBe(false);
  });

  it('throws when asked to execute a provider it does not carry', () => {
    expect(() =>
      createDefaultProviderRegistry().get(SwapKitProviderEnum.Chainflip),
    ).toThrow(/no executor/i);
  });

  it('refuses to be built with two executors for one provider', () => {
    expect(
      () => new ProviderRegistry([new MayaExecutor(), new MayaExecutor()]),
    ).toThrow(/duplicate/i);
  });
});

describe('ThorchainExecutor deposit instructions', () => {
  const executor = new ThorchainExecutor();
  const THOR_MEMO = '=:ZEC.ZEC:t1destination:0/1/0';

  it("reads the vault and memo the way Maya's response is read", () => {
    const instructions = executor.extractDepositInstructions(
      context({
        tx: { to: VAULT, memo: THOR_MEMO, chainId: 'zcash' },
      }),
    );

    expect(instructions.depositAddress).toBe(VAULT);
    expect(instructions.memoText).toBe(THOR_MEMO);
    expect(decodeMemo(instructions.memoBytes)).toBe(THOR_MEMO);
    expect(instructions.provider).toBe(SwapKitProviderEnum.ThorchainStreaming);
  });

  // A deposit paid to the right vault with no memo is a deposit THORChain
  // cannot attribute to a swap, so a missing one has to stop the commit rather
  // than persist a half-built record.
  it('refuses a response with no memo', () => {
    expect(() =>
      executor.extractDepositInstructions(context({ inboundAddress: VAULT })),
    ).toThrow(/missing memo/i);
  });

  it('refuses a response with no vault address', () => {
    expect(() =>
      executor.extractDepositInstructions(
        context({ tx: { memo: THOR_MEMO, chainId: 'zcash' } }),
      ),
    ).toThrow(/missing inbound vault address/i);
  });
});

// Maya takes the memo in a 0 ZEC shielded note for the vault it names. The
// deposit then names no transparent sender, so the refund address rides in the
// memo.
describe('MayaExecutor shielded memo deposit', () => {
  const executor = new MayaExecutor();
  const UA = 'u1mayamemoaddress';
  const response: SwapResponseType = {
    tx: { to: VAULT, memo: MAYA_MEMO },
    inboundAddress: VAULT,
  };
  const withTarget = (
    vaultAddress: string,
  ): ExtractDepositInstructionsContext => ({
    ...context(response),
    shieldedMemoTarget: { vaultAddress, unifiedAddress: UA },
  });
  const REFUND_MEMO =
    '=:e:0xAA00000000000000000000000000000000000000/t1ephemeral:0/1/0';

  it("sends the memo to Maya's memo address with the refund address in it", () => {
    const instructions = executor.extractDepositInstructions(withTarget(VAULT));

    expect(instructions.depositAddress).toBe(VAULT);
    expect(instructions.shieldedMemoAddress).toBe(UA);
    expect(instructions.memoText).toBe(REFUND_MEMO);
    expect(decodeMemo(instructions.memoBytes)).toBe(REFUND_MEMO);
    // Midgard matches the memo exactly, so the record keeps the one sent.
    expect(instructions.providerData).toMatchObject({
      memo: REFUND_MEMO,
      shieldedMemoAddress: UA,
    });
  });

  it('keeps the OP_RETURN deposit for a vault Maya did not name', () => {
    const instructions = executor.extractDepositInstructions(
      withTarget('t1othervault'),
    );

    expect(instructions.shieldedMemoAddress).toBeUndefined();
    expect(instructions.memoText).toBe(MAYA_MEMO);
  });

  it('keeps the OP_RETURN deposit when Maya takes no shielded memo', () => {
    const instructions = executor.extractDepositInstructions({
      ...context(response),
      shieldedMemoTarget: null,
    });

    expect(instructions.shieldedMemoAddress).toBeUndefined();
    expect(instructions.memoText).toBe(MAYA_MEMO);
  });
});
