/**
 * Why a send failed, classified by the rejection's tag first and by the
 * node's reject text only for the consensus verdicts that carry no tag.
 */
import { ZingoError, ZingoError_Tags } from 'zingo-ffi';
import { FfiError } from '@app/walletBackend/ffi';

export type SendFailureClass =
  | {
      readonly kind: 'insufficientFunds';
      readonly available: number;
      readonly required: number;
      readonly error: FfiError;
    }
  | { readonly kind: 'mixnetRefusal'; readonly error: FfiError }
  | { readonly kind: 'destinationIneligible'; readonly error: FfiError }
  | { readonly kind: 'offline'; readonly error: FfiError }
  | { readonly kind: 'duplicateNullifier'; readonly error: FfiError }
  | { readonly kind: 'dust'; readonly error: FfiError }
  | { readonly kind: 'serverSuspect'; readonly error: FfiError };

const DUPLICATE_NULLIFIER_MARKERS = [
  '18: bad-txns-sapling-duplicate-nullifier',
  '18: bad-txns-sprout-duplicate-nullifier',
  '18: bad-txns-orchard-duplicate-nullifier',
] as const;

const MIXNET_TAGS: ReadonlySet<string> = new Set([
  ZingoError_Tags.MixnetUnattached,
  ZingoError_Tags.MixnetBootstrapping,
  ZingoError_Tags.MixnetDied,
  ZingoError_Tags.MixnetSwitchedOff,
  ZingoError_Tags.MixnetEnableFailed,
]);

function amountsOf(error: FfiError): { available: number; required: number } {
  const cause = error.error;
  if (
    cause !== undefined &&
    ZingoError.instanceOf(cause) &&
    cause.tag === ZingoError_Tags.InsufficientFunds
  ) {
    return {
      available: Number(cause.inner.available),
      required: Number(cause.inner.required),
    };
  }
  return { available: 0, required: 0 };
}

export function classifySendFailure(error: FfiError): SendFailureClass {
  if (error.tag === ZingoError_Tags.InsufficientFunds) {
    return { kind: 'insufficientFunds', ...amountsOf(error), error };
  }
  if (MIXNET_TAGS.has(error.tag)) {
    return { kind: 'mixnetRefusal', error };
  }
  if (error.tag === ZingoError_Tags.DestinationIneligible) {
    return { kind: 'destinationIneligible', error };
  }
  if (error.tag === ZingoError_Tags.Offline) {
    return { kind: 'offline', error };
  }
  if (error.tag === ZingoError_Tags.IndexerUnreachable) {
    return { kind: 'serverSuspect', error };
  }
  if (
    DUPLICATE_NULLIFIER_MARKERS.some(marker => error.detail.includes(marker))
  ) {
    return { kind: 'duplicateNullifier', error };
  }
  if (error.detail.includes('64: dust')) {
    return { kind: 'dust', error };
  }
  return { kind: 'serverSuspect', error };
}

/** Whether switching to another server and retrying can help. */
export function retryOnAnotherServer(failure: SendFailureClass): boolean {
  switch (failure.kind) {
    case 'serverSuspect':
      return true;
    case 'insufficientFunds':
    case 'mixnetRefusal':
    case 'destinationIneligible':
    case 'offline':
    case 'duplicateNullifier':
    case 'dust':
      return false;
  }
}

export type SendFailureKey =
  | 'send.duplicate-nullifier-error'
  | 'send.dust-error'
  | 'ffi.insufficientfunds'
  | 'ffi.offline';

export type SendFailureText =
  | { readonly kind: 'key'; readonly errorKey: SendFailureKey }
  | { readonly kind: 'verbatim'; readonly text: string };

export function sendFailureText(failure: SendFailureClass): SendFailureText {
  switch (failure.kind) {
    case 'duplicateNullifier':
      return { kind: 'key', errorKey: 'send.duplicate-nullifier-error' };
    case 'dust':
      return { kind: 'key', errorKey: 'send.dust-error' };
    case 'insufficientFunds':
      return { kind: 'key', errorKey: 'ffi.insufficientfunds' };
    case 'offline':
      return { kind: 'key', errorKey: 'ffi.offline' };
    case 'mixnetRefusal':
    case 'destinationIneligible':
    case 'serverSuspect':
      return { kind: 'verbatim', text: failure.error.detail };
  }
}
