import RPCModule from '@app/RPCModule';
import { callFfi } from '@app/walletBackend/ffi';
import { deriveWalletFingerprint } from './walletFingerprint';

/**
 * The storage fingerprint of the wallet currently open in zingolib.
 *
 * Two callers need it and must agree: the provider that binds `SwapStore` to
 * the open wallet, and the delete flow that wipes that same bucket. A
 * fingerprint derived two different ways would have the delete clear a key
 * nothing was written under.
 *
 * Returns `''` when the UFVK cannot be read. Callers treat that as no
 * opinion and skip what they were going to do with it, since a guessed
 * fingerprint could name another wallet's bucket.
 *
 * The read goes through zingolib because the bucket is keyed by the wallet's
 * own key material: the same seed restored twice must find its own records.
 */
export async function readCurrentWalletFingerprint(): Promise<string> {
  const reply = await callFfi(RPCModule.getUfvkInfo());
  if (!reply.ok) {
    return '';
  }
  const parsed = JSON.parse(reply.value) as { ufvk?: string };
  return deriveWalletFingerprint(parsed.ufvk ?? '');
}
