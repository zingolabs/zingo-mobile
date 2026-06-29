import { SwapKitProviderEnum } from '../../../app/swap';

/**
 * User-facing labels for the SwapKit provider enum.
 *
 * Two variants intentionally:
 *
 *   - `providerShortLabel` is the compact form used in dense surfaces (the
 *     swap-screen summary row, the route picker rows). Matches the mockup
 *     wording (`"MayaChain"`, `"THORChain"`, `"NEAR"`).
 *   - `providerLongLabel` is the verbose form used in the post-commit deposit
 *     instructions and the review summary, where there is room for the
 *     descriptive suffix (`"Mayachain Streaming"`, etc.) and the user benefits
 *     from knowing the exact routing variant.
 *
 * Falls back to the raw enum value as a last resort so we never render
 * `undefined` if SwapKit adds a provider we have not seen yet.
 */
export function providerShortLabel(provider: SwapKitProviderEnum): string {
  switch (provider) {
    case SwapKitProviderEnum.MayachainStreaming:
      return 'MayaChain';
    case SwapKitProviderEnum.ThorchainStreaming:
      return 'THORChain';
    case SwapKitProviderEnum.Near:
      return 'NEAR';
    case SwapKitProviderEnum.Flashnet:
      return 'Flashnet';
    case SwapKitProviderEnum.Chainflip:
      return 'Chainflip';
    default:
      return String(provider);
  }
}

export function providerLongLabel(provider: SwapKitProviderEnum): string {
  switch (provider) {
    case SwapKitProviderEnum.MayachainStreaming:
      return 'Mayachain Streaming';
    case SwapKitProviderEnum.ThorchainStreaming:
      return 'THORChain Streaming';
    case SwapKitProviderEnum.Near:
      return 'NEAR Intents';
    case SwapKitProviderEnum.Flashnet:
      return 'Flashnet';
    case SwapKitProviderEnum.Chainflip:
      return 'Chainflip';
    default:
      return String(provider);
  }
}
