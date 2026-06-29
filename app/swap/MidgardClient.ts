import { SwapKitProviderEnum } from './enums/SwapKitProviderEnum';

/**
 * Midgard is the THORChain/Mayachain L2 indexer. SwapKit's own `/track`
 * endpoint wraps Midgard internally (verified by inspecting the open-source
 * `packages/helpers/src/api/midgard/endpoints.ts` in the SwapKit monorepo on
 * 2026-06-28). For our wallet the relevant property of Midgard is that it
 * indexes swap actions by **destination address** — meaning we can discover
 * the source-chain tx hash of an inbound swap without ever signing or seeing
 * the source-chain tx, just by asking "any actions on our t-addr?".
 *
 * That discovery closes the only real gap in our SwapKit `/track` integration
 * for Maya/THORChain inbound: once we have the source-chain hash, `/track`
 * does the rest of the work with its normalized status pipeline and 4-leg
 * decomposition. So this client's sole job is to take `{destinationAddress,
 * memo, provider}` and return the source hash + chain prefix when Midgard
 * has indexed the matching action; it does NOT try to model status, fees,
 * or completion — `/track` remains the source of truth for those.
 *
 * Per-provider host (xchainjs and the SwapKit SDK use the same URLs):
 *
 *   - Mayachain → https://midgard.mayachain.info
 *   - THORChain → https://midgard.ninerealms.com
 *
 * Both speak the same `/v2/actions?address=…&type=swap` schema, so a single
 * client class handles both providers with only the host swap.
 */

const MIDGARD_HOSTS: Partial<Record<SwapKitProviderEnum, string>> = {
  [SwapKitProviderEnum.MayachainStreaming]: 'https://midgard.mayachain.info',
  [SwapKitProviderEnum.ThorchainStreaming]: 'https://midgard.ninerealms.com',
};

const MIDGARD_TIMEOUT_MS = 10_000;
/**
 * Cap on actions to scan per request. The action we care about is always
 * within the most recent few (we query immediately after commit and Midgard
 * orders newest-first), so 10 gives a comfortable margin without paying for
 * pages of irrelevant history.
 */
const MIDGARD_ACTIONS_LIMIT = 10;

type MidgardCoinType = {
  amount: string;
  asset: string;
};

type MidgardTransactionType = {
  address: string;
  coins: MidgardCoinType[];
  txID: string;
};

type MidgardActionType = {
  date: string;
  height: string;
  in: MidgardTransactionType[];
  out: MidgardTransactionType[];
  metadata?: {
    swap?: {
      memo?: string;
    };
  };
  pools?: string[];
  status: 'pending' | 'success';
  type: string;
};

type MidgardActionsResponseType = {
  actions: MidgardActionType[];
  count?: string;
};

export type MidgardInboundDiscoveryType = {
  /** Source-chain tx hash, normalized for SwapKit /track (0x-prefixed for
   *  EVM chainIds, raw lowercase for non-EVM). */
  sourceTxHash: string;
  /** Chain prefix from the Midgard asset string (e.g. `"ETH"` from
   *  `"ETH.ETH"`). Caller can use this to sanity-check it matches the
   *  record's sellAsset.chain. */
  sourceChainPrefix: string;
};

export class MidgardClient {
  /**
   * Find the inbound action on a destination address that matches a specific
   * memo, and extract the source-chain tx hash. Returns null when:
   *
   *   - The provider does not have a Midgard host configured (anything other
   *     than Maya/THORChain — Chainflip/NEAR/Flashnet use SwapKit's own
   *     indexers, not Midgard).
   *   - Midgard returns 404 (the destination address is unknown to the
   *     network so far — a normal transient state, not an error).
   *   - No action's memo matches the caller's expected memo.
   *   - The matched action has no `in[]` entries or no usable txID
   *     (e.g. the placeholder `0000…` hash Midgard emits for synthetic
   *     internal actions).
   *
   * The memo match is exact: we expect the on-chain memo (parsed by
   * Mayanode/Thornode and surfaced by Midgard) to byte-equal the memo we
   * generated at commit time. Streaming-swap memos include the swap target
   * + slippage + interval which are unique per commit, so collisions across
   * concurrent swaps on the same destination address are not a practical
   * concern.
   *
   * Throws on transport errors (network failure, non-404 HTTP error,
   * malformed JSON) so the caller can decide whether to log + retry or
   * propagate. We do NOT catch and swallow here — the SwapPoller's
   * failure-count machinery already knows how to back off on errors.
   */
  async findInboundActionByMemo(args: {
    destinationAddress: string;
    memo: string;
    provider: SwapKitProviderEnum;
    chainIdForNormalization: string;
  }): Promise<MidgardInboundDiscoveryType | null> {
    const host = MIDGARD_HOSTS[args.provider];
    if (!host) return null;

    const url =
      `${host}/v2/actions` +
      `?address=${encodeURIComponent(args.destinationAddress)}` +
      `&type=swap` +
      `&limit=${MIDGARD_ACTIONS_LIMIT}`;

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), MIDGARD_TIMEOUT_MS);
    let response: Response;
    try {
      response = await fetch(url, {
        method: 'GET',
        signal: controller.signal,
        headers: { Accept: 'application/json' },
      });
    } finally {
      clearTimeout(timer);
    }

    // 404 means the indexer has not seen this destination address at all —
    // very common in the window between commit and the on-chain deposit
    // landing. Treat it as a clean "not found" rather than an error so the
    // poller's failure counter does not increment unnecessarily.
    if (response.status === 404) return null;
    if (!response.ok) {
      const body = await response.text();
      throw new Error(
        `MidgardClient: ${url} returned HTTP ${response.status}: ${body.slice(0, 200)}`,
      );
    }

    const data = (await response.json()) as MidgardActionsResponseType;
    if (!data.actions || data.actions.length === 0) return null;

    const match = data.actions.find(
      action => action.metadata?.swap?.memo === args.memo,
    );
    if (!match) return null;
    if (!match.in || match.in.length === 0) return null;

    const firstIn = match.in[0];
    const rawTxId = firstIn.txID;
    if (!rawTxId) return null;
    // Midgard occasionally emits a placeholder all-zero txID for synthetic
    // internal actions (e.g. native CACAO transfers between vault
    // intermediaries). Those are never usable as source-chain hashes.
    if (/^0+$/.test(rawTxId)) return null;

    const sourceChainPrefix = (firstIn.coins?.[0]?.asset ?? '').split('.')[0];

    return {
      sourceTxHash: normalizeHashForTrack(
        rawTxId,
        args.chainIdForNormalization,
      ),
      sourceChainPrefix,
    };
  }
}

/**
 * SwapKit `/track` accepts the source-chain hash with the chain's native
 * formatting:
 *
 *   - EVM chains (numeric chainId like `"1"`, `"43114"`): require the
 *     `0x` prefix. Both upper and lower case after the prefix work — we
 *     downcase for consistency with how block explorers and wallets
 *     present hashes (verified empirically against `/track` on 2026-06-28).
 *   - Non-EVM chains (lowercase string chainId like `"zcash"`, `"bitcoin"`):
 *     pass the hash verbatim with no prefix.
 *
 * Midgard always emits hashes UPPERCASE without prefix for EVM source
 * chains and lowercase-hex without prefix for UTXO source chains (Maya/THOR
 * normalise inbound observations to their own canonical form). So this
 * function bridges the two encodings.
 */
function normalizeHashForTrack(rawHash: string, chainId: string): string {
  const isEvmChainId = /^\d+$/.test(chainId);
  if (!isEvmChainId) {
    return rawHash.toLowerCase();
  }
  const lower = rawHash.toLowerCase();
  return lower.startsWith('0x') ? lower : `0x${lower}`;
}
