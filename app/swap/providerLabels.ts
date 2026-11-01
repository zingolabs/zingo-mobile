import { SwapKitProviderEnum } from './enums/SwapKitProviderEnum';
import { isThorchainFamily } from './thorchainFamily';

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

/** Who holds a deposit between the moment it lands and the moment it is swapped. */
export type ProviderCustodyType = {
  /** One word, set beside the provider's name. */
  label: string;
  /** The sentence behind the word, for whoever hovers it. */
  title: string;
};

/**
 * Who can hold the deposit once it is sent, which the provider's name does not
 * say.
 *
 * A provider that refuses a swap costs nothing: nothing has left the wallet.
 * What differs is after the deposit. THORChain and Maya take it into a vault
 * their nodes control together, so no one party decides about a single
 * deposit. NEAR Intents and Flashnet take it at an address their operator
 * allocated, and an operator can hold a deposit under review — a NEAR Intents
 * user had one held for over fifty days in 2026 after being told in writing it
 * was released.
 *
 * Undefined for a provider nobody has looked at, rather than a guess.
 */
export function providerCustody(
  provider: SwapKitProviderEnum,
): ProviderCustodyType | undefined {
  if (isThorchainFamily(provider)) {
    return {
      label: 'vault',
      title:
        "The deposit goes to a vault the network's nodes control together.",
    };
  }
  switch (provider) {
    case SwapKitProviderEnum.Near:
    case SwapKitProviderEnum.Flashnet:
      return {
        label: 'operator',
        title:
          "The deposit goes to an address the provider's operator controls, which can hold it under review.",
      };
    default:
      return undefined;
  }
}
