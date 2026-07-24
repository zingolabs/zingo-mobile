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
