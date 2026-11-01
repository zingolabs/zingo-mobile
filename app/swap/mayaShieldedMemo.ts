import { swapHttpRequest } from './swapHttp';
import { SwapResponseType } from './types/SwapResponseType';

/**
 * Maya's shielded memo deposit for ZEC.
 *
 * Instead of deshielding to a transparent address and paying the vault from
 * there with the memo in an OP_RETURN, one transaction out of the shielded
 * pool pays the vault and carries the memo in a 0 ZEC Orchard note to Maya's
 * memo address, which Maya reads with the incoming viewing key it publishes.
 * One fee instead of two, and the funds never sit on a transparent address of
 * ours. Unstoppable and Edge ship it the same way.
 */
export type ShieldedMemoTarget = {
  /** The transparent vault the value goes to: Maya's ZEC inbound address. */
  vaultAddress: string;
  /** Where the 0 ZEC note with the memo goes. Never send value here. */
  unifiedAddress: string;
};

const MAYANODE_INBOUND_URL =
  'https://mayanode.mayachain.info/mayachain/inbound_addresses';
const MAYANODE_TIMEOUT_MS = 10 * 1000;

/** An Orchard memo holds 512 bytes. */
export const SHIELDED_MEMO_MAX_BYTES = 512;

type InboundAddress = {
  chain?: string;
  address?: string;
  halted?: boolean;
  shielded_memo_config?: {
    unified_address?: string;
    enabled?: boolean;
    trial_decryption_enabled?: boolean;
  };
};

/**
 * Maya's ZEC shielded memo target, or null when Maya does not take one right
 * now (disabled, not decrypting, ZEC halted) or could not be asked. Null means
 * the deposit goes the OP_RETURN way, as before.
 */
export async function fetchMayaShieldedMemoTarget(): Promise<ShieldedMemoTarget | null> {
  try {
    const response = await swapHttpRequest({
      url: MAYANODE_INBOUND_URL,
      method: 'GET',
      headers: { Accept: 'application/json' },
      timeoutMs: MAYANODE_TIMEOUT_MS,
    });
    if (!response.ok) return null;
    const inbound = JSON.parse(response.text) as InboundAddress[];
    const zec = Array.isArray(inbound)
      ? inbound.find(entry => entry.chain === 'ZEC')
      : undefined;
    const config = zec?.shielded_memo_config;
    if (
      !zec?.address ||
      zec.halted ||
      !config?.enabled ||
      !config.trial_decryption_enabled ||
      !config.unified_address
    ) {
      return null;
    }
    return {
      vaultAddress: zec.address,
      unifiedAddress: config.unified_address,
    };
  } catch {
    return null;
  }
}

/** The memo address SwapKit's `/v3/swap` names, when it names one. */
export function shieldedMemoAddressFromSwap(
  swapResponse: SwapResponseType,
): string | undefined {
  const shieldedMemo = swapResponse.shieldedMemo as
    { unifiedAddress?: unknown } | undefined;
  return typeof shieldedMemo?.unifiedAddress === 'string' &&
    shieldedMemo.unifiedAddress.length > 0
    ? shieldedMemo.unifiedAddress
    : undefined;
}

/**
 * The swap memo with `refundAddress` after the destination
 * (`=:ASSET:DEST/REFUND:…`), or null when it is not a swap memo this can
 * amend. A shielded deposit names no transparent sender for Maya to refund
 * to, so the refund address has to ride in the memo. One already there is
 * kept.
 */
export function memoWithRefundAddress(
  memo: string,
  refundAddress: string,
): string | null {
  const fields = memo.split(':');
  if (fields.length < 3 || !/^(=|s|swap)$/i.test(fields[0]) || !fields[2])
    return null;
  if (fields[2].includes('/')) return memo;
  fields[2] = `${fields[2]}/${refundAddress}`;
  return fields.join(':');
}
