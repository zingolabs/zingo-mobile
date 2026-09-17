/**
 * Maps the actionable FfiError tags to catalog keys; every other tag has
 * no key and the display edge shows the detail instead.
 */
import { ZingoError, ZingoError_Tags } from 'zingo-ffi';
import { FfiError } from '@app/walletBackend/ffi';

export type FfiErrorKey =
  | 'ffi.invalidmnemonic'
  | 'ffi.mnemonicnotfound'
  | 'ffi.viewingkeymalformed'
  | 'ffi.viewingkeynetworkmismatch'
  | 'ffi.birthdaybelowactivation'
  | 'ffi.walletunreadable'
  | 'ffi.indexerunreachable'
  | 'ffi.indexerrequestfailed'
  | 'ffi.offline'
  | 'ffi.insufficientfunds'
  | 'ffi.syncrequired'
  | 'ffi.panic'
  | 'ffi.poisoned'
  | 'ffi.busy';

export type FfiErrorText = {
  errorKey: FfiErrorKey;
  params: Record<string, string>;
};

const KEYED_TAGS: Record<string, FfiErrorKey> = {
  InvalidMnemonic: 'ffi.invalidmnemonic',
  MnemonicNotFound: 'ffi.mnemonicnotfound',
  ViewingKeyMalformed: 'ffi.viewingkeymalformed',
  ViewingKeyNetworkMismatch: 'ffi.viewingkeynetworkmismatch',
  BirthdayBelowActivation: 'ffi.birthdaybelowactivation',
  WalletUnreadable: 'ffi.walletunreadable',
  Unreadable: 'ffi.walletunreadable',
  IndexerUnreachable: 'ffi.indexerunreachable',
  IndexerRequestFailed: 'ffi.indexerrequestfailed',
  Offline: 'ffi.offline',
  InsufficientFunds: 'ffi.insufficientfunds',
  SyncRequired: 'ffi.syncrequired',
  Panic: 'ffi.panic',
  Poisoned: 'ffi.poisoned',
  Busy: 'ffi.busy',
};

function paramsOf(error: FfiError): Record<string, string> {
  const cause = error.error;
  if (cause !== undefined && ZingoError.instanceOf(cause)) {
    if (cause.tag === ZingoError_Tags.BirthdayBelowActivation) {
      return {
        birthday: String(cause.inner.birthday),
        activation: String(cause.inner.activation),
      };
    }
    if (cause.tag === ZingoError_Tags.InsufficientFunds) {
      return {
        available: String(cause.inner.available),
        required: String(cause.inner.required),
      };
    }
  }
  return { detail: error.detail };
}

export function ffiErrorText(error: FfiError): FfiErrorText | undefined {
  const errorKey = KEYED_TAGS[error.tag];
  return errorKey === undefined
    ? undefined
    : { errorKey, params: paramsOf(error) };
}

/** Fills `{name}` placeholders in an already translated sentence. */
export function fillParams(
  text: string,
  params: Record<string, string>,
): string {
  return Object.entries(params).reduce(
    (filled, [name, value]) => filled.split(`{${name}}`).join(value),
    text,
  );
}
