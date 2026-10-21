/**
 * Which address a quote carries, and whether a quote carries the current one.
 *
 * SwapKit prices a swap without reading the counterparty address, so quotes
 * can stream while the user is still typing one. The route it mints is a
 * different matter: the route is bound to the addresses it was quoted with,
 * and a provider that builds the route around the destination rather than
 * around a deposit memo will not commit one quoted blank — it refuses the
 * route id, not the swap call, so substituting the real address at commit
 * time does not rescue it.
 *
 * Named here rather than written inline on the screen because the two halves
 * have to agree: the address a quote goes out with, and the test for whether
 * the quote on screen went out with the one the user is looking at now.
 */

type Sides = {
  /** True when this wallet is selling ZEC. */
  isOutbound: boolean;
  /** The wallet-side ZIP-320 address, which sits on whichever side is ZEC. */
  ephemeralAddress: string;
  /**
   * The counterparty-chain address the user entered, or empty while there is
   * no valid one. Empty is what lets a quote happen before they have typed it.
   */
  boundAddress: string;
};

/**
 * The address pair a quote should carry. Outbound sells ZEC, so the wallet's
 * own address is the source and the user's is the destination; inbound is the
 * mirror of that.
 */
export function quoteAddressPair({
  isOutbound,
  ephemeralAddress,
  boundAddress,
}: Sides): {
  sourceAddress: string;
  destinationAddress: string;
} {
  return {
    sourceAddress: isOutbound ? ephemeralAddress : boundAddress,
    destinationAddress: isOutbound ? boundAddress : ephemeralAddress,
  };
}

/**
 * Whether a quote was taken for this address.
 *
 * False while there is no address, which is the state a streaming quote is
 * taken in, and false again for the moment between the user changing the
 * address and the replacement quote landing. Committing in either state asks
 * the provider to honour a route it built for somewhere else.
 */
export function quoteBindsAddress({
  quoted,
  isOutbound,
  boundAddress,
}: {
  /** The address pair the quote on screen went out with. */
  quoted: { sourceAddress: string; destinationAddress: string } | null;
  isOutbound: boolean;
  boundAddress: string;
}): boolean {
  if (!quoted || !boundAddress) return false;
  return (
    (isOutbound ? quoted.destinationAddress : quoted.sourceAddress) ===
    boundAddress
  );
}
