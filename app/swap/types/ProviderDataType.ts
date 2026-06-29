import { SwapKitProviderEnum } from '../enums/SwapKitProviderEnum';

/**
 * Persisted per-provider data attached to a `SwapRecord`.
 *
 * Each variant is a TypeScript discriminated union keyed by `kind`, which
 * matches the record's top-level `provider` field. Provider executors are
 * responsible for producing their own variant during `extractDepositInstructions`
 * and reading from it when applying tracking updates.
 *
 * Why a discriminated union (and not a `Record<string, unknown>`):
 *   - Type-safety: TypeScript narrows on `record.providerData.kind` so the
 *     compiler enforces the right fields exist per branch.
 *   - Forward compatibility: adding a new provider is a single new variant
 *     here plus a new executor; existing callers either branch exhaustively
 *     (compile error reminds us to handle the new case) or default cleanly.
 *
 * Field choices are driven by what `/v3/swap` actually returns per provider
 * (empirically captured during 2026-06-21/22 mainnet testing) plus what each
 * provider's `/track` payload exposes.
 */

export type MayachainStreamingProviderData = {
  kind: SwapKitProviderEnum.MayachainStreaming;
  /** Inbound vault address (rotates server-side). Sourced from `inboundAddress`. */
  vaultAddress: string;
  /** The full Mayachain swap memo embedded as OP_RETURN. */
  memo: string;
  /** Streaming interval in source-chain blocks (`meta.streamingInterval`). */
  streamingIntervalBlocks?: number;
  /** Maximum number of sub-swaps the streamer is allowed to schedule. */
  maxStreamingQuantity?: number;
};

export type NearProviderData = {
  kind: SwapKitProviderEnum.Near;
  /**
   * Unique deposit address issued by NEAR Intents for this swap.
   * Same value as the record's `depositAddress` PK.
   */
  depositAddress: string;
  /** SwapKit internal channel id (`transient.providerDetails.depositChannelId`). */
  swapKitDepositChannelId?: string;
};

export type FlashnetProviderData = {
  kind: SwapKitProviderEnum.Flashnet;
  /** Auto-generated SwapKit identifier (e.g. `sk-119d25aa3acb`). */
  swapKitAssignedId?: string;
  /** Inbound vault address provided by Flashnet, if any. */
  vaultAddress?: string;
  /** Optional memo if Flashnet adopts a memo scheme in the future. */
  memo?: string;
};

export type ChainflipProviderData = {
  kind: SwapKitProviderEnum.Chainflip | SwapKitProviderEnum.ChainflipStreaming;
  /** Chainflip's deposit channel id (lifecycle bound to its TTL). */
  depositChannelId: string;
  vaultAddress?: string;
};

export type ThorchainStreamingProviderData = {
  kind: SwapKitProviderEnum.ThorchainStreaming;
  vaultAddress: string;
  memo: string;
};

export type GenericProviderData = {
  kind:
    | SwapKitProviderEnum.Harbor
    | SwapKitProviderEnum.Mayan
    | SwapKitProviderEnum.OneInch
    | SwapKitProviderEnum.UniswapV2
    | SwapKitProviderEnum.UniswapV3
    | SwapKitProviderEnum.Garden
    | SwapKitProviderEnum.TraderJoeV2
    | SwapKitProviderEnum.PancakeSwap
    | SwapKitProviderEnum.Jupiter
    | SwapKitProviderEnum.SushiSwapV2;
  vaultAddress?: string;
  memo?: string;
};

/**
 * Discriminated union of all provider-specific persisted data variants.
 * Add a new entry here when adding a new provider executor.
 */
export type ProviderDataType =
  | MayachainStreamingProviderData
  | NearProviderData
  | FlashnetProviderData
  | ChainflipProviderData
  | ThorchainStreamingProviderData
  | GenericProviderData;
