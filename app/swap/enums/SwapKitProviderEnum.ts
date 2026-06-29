/**
 * Identifies the SwapKit provider that routes a swap.
 *
 * Source: `meta.provider` field in SwapKit `/v3/quote` and `/track` responses,
 * and `providers[0]` in route options. These literal strings are required by
 * SwapKit's REST API and must not be renamed without a SwapKit-side change.
 *
 * Adding a new provider:
 *   1. Add the literal here (must match what SwapKit returns).
 *   2. Add a `ProviderExecutor` implementation under `app/swap/providers/`.
 *   3. Register it in `ProviderRegistry`.
 *   No other code paths should hard-code provider identifiers.
 */
export enum SwapKitProviderEnum {
  // Providers that currently route ZEC as source/destination, per
  // `/providers`.supportedChainIds. These are the only ones we need executors
  // for today.
  MayachainStreaming = 'MAYACHAIN_STREAMING',
  Near = 'NEAR',
  Flashnet = 'FLASHNET',

  // Providers SwapKit exposes today but that do not route ZEC. Listed here so
  // unknown identifiers in quote responses are recognised by the enum even
  // when we have no executor; the registry filter drops them downstream.
  ThorchainStreaming = 'THORCHAIN_STREAMING',
  Chainflip = 'CHAINFLIP',
  ChainflipStreaming = 'CHAINFLIP_STREAMING',
  Harbor = 'HARBOR',
  Mayan = 'MAYAN',
  OneInch = 'ONEINCH',
  UniswapV2 = 'UNISWAP_V2',
  UniswapV3 = 'UNISWAP_V3',
  Garden = 'GARDEN',
  TraderJoeV2 = 'TRADERJOE_V2',
  PancakeSwap = 'PANCAKESWAP',
  Jupiter = 'JUPITER',
  SushiSwapV2 = 'SUSHISWAP_V2',
}
