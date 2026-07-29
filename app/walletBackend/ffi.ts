/**
 * The typed FFI error contract at the TS boundary (ADRs 0001/0002): every
 * native method resolves only success payloads, and every failure is a
 * rejected promise whose `.code` is a ZingolibError variant name. callFfi is
 * the one place a native promise becomes a discriminated FfiResult; wrappers
 * stay pure — one native call, one mapped return, no side effects.
 */

// The stable rejection codes: exactly the ZingolibError variant names the
// native bridges emit. Anything unrecognized maps to 'Unknown'.
const FFI_ERROR_CODES = [
  'LightclientNotInitialized',
  'LightclientLockPoisoned',
  'Panic',
  'Save',
  'Init',
  'Sync',
  'Rescan',
  'Read',
  'Mixnet',
  'Send',
  'Shield',
  'InvalidInput',
  'Wallet',
  'Indexer',
  'Offline',
  'SideChannelPoisoned',
  'MigrationNotInProgress',
  'MigrationAlreadyInProgress',
  'MigrationConsentStale',
  'MigrationSplit',
  'Migration',
  'Mixnet',
] as const;

export type FfiErrorCode = (typeof FFI_ERROR_CODES)[number] | 'Unknown';

export type FfiError = {
  code: FfiErrorCode;
  message: string;
};

export type FfiResult<T> =
  | { ok: true; value: T }
  | { ok: false; error: FfiError };

const KNOWN_CODES: ReadonlySet<string> = new Set(FFI_ERROR_CODES);

// Maps a native rejection to a typed FfiError: the bridge's `.code` when it
// is a known variant name, 'Unknown' otherwise.
export function toFfiError(rejection: unknown): FfiError {
  const code =
    typeof rejection === 'object' && rejection !== null && 'code' in rejection
      ? String((rejection as { code: unknown }).code)
      : undefined;
  return {
    code:
      code !== undefined && KNOWN_CODES.has(code)
        ? (code as FfiErrorCode)
        : 'Unknown',
    message:
      rejection instanceof Error ? rejection.message : String(rejection),
  };
}

// The one funnel from the promise channel to the discriminated union:
// resolution → ok, rejection → typed error.
export async function callFfi(
  call: Promise<string>,
): Promise<FfiResult<string>> {
  try {
    return { ok: true, value: await call };
  } catch (rejection) {
    return { ok: false, error: toFfiError(rejection) };
  }
}

/**
 * The transport-level decode every JSON-carrying native surface shares,
 * written once: a settled FfiResult either yields parsed JSON or exactly
 * one named transport failure. Domain interpreters (price, wallet fetch,
 * address check) start from the `json` arm and add only their own payload
 * validation — none of them re-implements the rejection / empty /
 * unparseable triage. `raw` travels with the JSON so a consumer that
 * rejects the payload for domain reasons can still report it verbatim.
 */
export type FfiJsonDecode =
  | {
      readonly kind: 'ffiRejection';
      readonly code: FfiErrorCode;
      readonly message: string;
    }
  | { readonly kind: 'emptyPayload' }
  | {
      readonly kind: 'malformedPayload';
      readonly payload: string;
      readonly detail: string;
    }
  | { readonly kind: 'json'; readonly value: unknown; readonly raw: string };

export function decodeFfiJson(result: FfiResult<string>): FfiJsonDecode {
  if (!result.ok) {
    return {
      kind: 'ffiRejection',
      code: result.error.code,
      message: result.error.message,
    };
  }
  if (!result.value) {
    return { kind: 'emptyPayload' };
  }
  try {
    return { kind: 'json', value: JSON.parse(result.value), raw: result.value };
  } catch (error) {
    return {
      kind: 'malformedPayload',
      payload: result.value,
      detail: String(error),
    };
  }
}
