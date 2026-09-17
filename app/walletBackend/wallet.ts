/**
 * The open wallet as a typed handle: `currentWallet()` when a wallet is
 * open, a `Closed` FfiError otherwise, so no caller reaches for `!`.
 */
import { currentWallet, WalletInterface, ZingoError_Tags } from 'zingo-ffi';
import { callFfi, FfiResult } from './ffi';

export type WalletHandle =
  | { ok: true; value: WalletInterface }
  | { ok: false; error: { tag: ZingoError_Tags.Closed; detail: string } };

export const CLOSED_DETAIL = 'no wallet is open';

export function openWallet(): WalletHandle {
  const wallet = currentWallet();
  return wallet === undefined
    ? { ok: false, error: { tag: ZingoError_Tags.Closed, detail: CLOSED_DETAIL } }
    : { ok: true, value: wallet };
}

/** Runs one call against the open wallet and funnels its outcome into an FfiResult. */
export async function callWallet<T>(
  call: (wallet: WalletInterface) => Promise<T>,
): Promise<FfiResult<T>> {
  const handle = openWallet();
  return handle.ok ? callFfi(call(handle.value)) : handle;
}
