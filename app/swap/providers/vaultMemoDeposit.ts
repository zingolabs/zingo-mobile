import { SwapResponseType } from '@app/swap/types/SwapResponseType';

/**
 * The deposit shape shared by the THORChain-family providers: pay a rotating
 * inbound vault address, and say which swap it is in a memo carried on the
 * source-chain transaction.
 *
 * Mayachain is a THORChain fork and both answer `/v3/swap` the same way, so
 * the extraction is one piece of code rather than two that have to be kept in
 * step. What differs between them — the provider identity and the persisted
 * `providerData` — stays with each executor.
 *
 * The probing below is not defensive padding. SwapKit's response shape has
 * drifted across provider revisions, and the memo has been observed at
 * `tx.memo`, top-level `memo`, `meta.memo`, and inside
 * `transient.providerDetails.memo`. A deposit paid to the right vault with no
 * memo is a deposit the provider cannot attribute, so reading it is not
 * optional.
 */
export type VaultMemoDeposit = {
  vaultAddress: string;
  memoText: string;
};

const VAULT_PATHS: ReadonlyArray<ReadonlyArray<string>> = [
  ['inboundAddress'],
  ['vault'],
  ['vaultAddress'],
  ['address'],
  ['depositAddress'],
  ['tx', 'address'],
];

const MEMO_PATHS: ReadonlyArray<ReadonlyArray<string>> = [
  ['memo'],
  ['data', 'memo'],
  ['meta', 'memo'],
  ['transient', 'memo'],
  ['transient', 'providerDetails', 'memo'],
  ['provider', 'memo'],
];

/**
 * Read the vault address and memo out of a `/v3/swap` response, or throw
 * naming what was missing and where it was looked for.
 *
 * `executorName` only appears in those errors. It is there because the error
 * reaches a device log with no other clue as to which provider produced the
 * response being complained about.
 */
export function extractVaultMemoDeposit(
  swapResponse: SwapResponseType,
  executorName: string,
): VaultMemoDeposit {
  const vaultAddress =
    swapResponse.tx?.to ??
    swapResponse.inboundAddress ??
    pickString(swapResponse, VAULT_PATHS);
  const memoText =
    swapResponse.tx?.memo ?? pickString(swapResponse, MEMO_PATHS);

  if (!vaultAddress || !memoText) {
    // Surface the raw shape on the device log so the field that moved can be
    // pinned down and adapted to — better than swallowing the structure
    // behind a generic error message.
    try {
      console.log(
        `${executorName}: /v3/swap response shape`,
        JSON.stringify(swapResponse, null, 2),
      );
    } catch {
      console.log(
        `${executorName}: /v3/swap response (unstringifiable):`,
        swapResponse,
      );
    }
  }
  if (!vaultAddress) {
    throw new Error(
      `${executorName}: SwapKit /v3/swap response missing inbound vault address (tx.to / inboundAddress / probed fallbacks).`,
    );
  }
  if (!memoText) {
    throw new Error(
      `${executorName}: SwapKit /v3/swap response missing memo. Probed: tx.memo, ${MEMO_PATHS.map(
        path => path.join('.'),
      ).join(
        ', ',
      )}. Top-level keys present: ${Object.keys(swapResponse).join(', ')}`,
    );
  }

  return { vaultAddress, memoText };
}

/**
 * Walk a list of dotted-key paths against the raw response, returning the
 * first non-empty string found. Absorbs shape drift across SwapKit revisions
 * without hard-coupling an executor to one historical capture.
 */
function pickString(
  obj: unknown,
  paths: ReadonlyArray<ReadonlyArray<string>>,
): string | undefined {
  for (const path of paths) {
    let cursor: unknown = obj;
    for (const segment of path) {
      if (cursor === null || typeof cursor !== 'object') {
        cursor = undefined;
        break;
      }
      cursor = (cursor as Record<string, unknown>)[segment];
    }
    if (typeof cursor === 'string' && cursor.length > 0) {
      return cursor;
    }
  }
  return undefined;
}
