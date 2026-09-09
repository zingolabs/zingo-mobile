/**
 * Shared pieces for outcome unions. An error crossing a module boundary
 * travels as an ErrorKey (a translation-catalog key) plus an optional
 * param; the display edge resolves it with translate(). Core modules
 * never build prose. Success variants are domain-named per union
 * ('canonicalUri', 'paymentTarget', 'done'), so the tag says what the
 * caller is holding. See docs/adr/0002-error-keys-not-prose.md.
 */
export type ErrorKeyed<K extends string> = {
  kind: 'error';
  errorKey: K;
  param?: string;
};

export type Done = { kind: 'done' };
export const DONE: Done = { kind: 'done' };

/** Builds an ErrorKeyed failure, the one constructor for the shape. */
export const errorKeyed = <K extends string>(
  errorKey: K,
  param?: string,
): ErrorKeyed<K> => ({ kind: 'error', errorKey, param });
