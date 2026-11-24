import { ErrorKeyed, errorKeyed } from '@app/AppState/types/Result';
import type { SendRefusalKey } from './sendPermit';

/** Why a confirmed send failed: a node reject the app explains, or any other error it shows as is. */
export type SendFailureClass =
  | { readonly kind: 'duplicateNullifier'; readonly error: string }
  | { readonly kind: 'dust'; readonly error: string }
  | { readonly kind: 'other'; readonly error: string };

const DUPLICATE_NULLIFIER_MARKERS = [
  '18: bad-txns-sapling-duplicate-nullifier',
  '18: bad-txns-sprout-duplicate-nullifier',
  '18: bad-txns-orchard-duplicate-nullifier',
] as const;

/** Classifies a send failure string from the backend. */
export function classifySendFailure(error: string): SendFailureClass {
  if (DUPLICATE_NULLIFIER_MARKERS.some(marker => error.includes(marker))) {
    return { kind: 'duplicateNullifier', error };
  }
  if (error.includes('64: dust')) {
    return { kind: 'dust', error };
  }
  return { kind: 'other', error };
}

/**
 * What the failed screen shows for a classified failure.
 */
export type SendFailureText =
  | ErrorKeyed<
      'send.duplicate-nullifier-error' | 'send.dust-error' | SendRefusalKey
    >
  | { readonly kind: 'verbatim'; readonly text: string };

/**
 * Map a classified failure to its display directive — the one place
 * presentation meets classification.
 */
export function sendFailureText(failure: SendFailureClass): SendFailureText {
  switch (failure.kind) {
    case 'duplicateNullifier':
      return errorKeyed('send.duplicate-nullifier-error');
    case 'dust':
      return errorKeyed('send.dust-error');
    case 'other':
      return { kind: 'verbatim', text: failure.error };
  }
}
