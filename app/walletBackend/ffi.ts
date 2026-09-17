/**
 * The one seam between the typed bindings and the app: a rejection becomes
 * an FfiError keyed by its variant tag, and a promise becomes a
 * discriminated FfiResult.
 */
import {
  JobKind,
  LoadError,
  LoadError_Tags,
  ZingoError,
  ZingoError_Tags,
} from 'zingo-ffi';

export type FfiTag = ZingoError_Tags | LoadError_Tags | 'Host' | 'Unknown';

export type FfiError = {
  tag: FfiTag;
  detail: string;
  error?: ZingoError | LoadError;
};

export type FfiResult<T> =
  | { ok: true; value: T }
  | { ok: false; error: FfiError };

const HOST_TAGS: ReadonlySet<string> = new Set([
  ...Object.values(LoadError_Tags),
  'Host',
]);

function detailOf(error: ZingoError | LoadError): string {
  if (ZingoError.instanceOf(error) && error.tag === ZingoError_Tags.Busy) {
    return JobKind[error.inner.running];
  }
  if ('inner' in error && 'detail' in error.inner) {
    return error.inner.detail;
  }
  return error.message;
}

function codeOf(rejection: unknown): string | undefined {
  if (typeof rejection !== 'object' || rejection === null) {
    return undefined;
  }
  const code = (rejection as { code?: unknown }).code;
  return typeof code === 'string' ? code : undefined;
}

export function toFfiError(rejection: unknown): FfiError {
  if (
    typeof rejection === 'object' &&
    rejection !== null &&
    (ZingoError.instanceOf(rejection) || LoadError.instanceOf(rejection))
  ) {
    return { tag: rejection.tag, detail: detailOf(rejection), error: rejection };
  }
  const detail =
    rejection instanceof Error ? rejection.message : String(rejection);
  const code = codeOf(rejection);
  if (code !== undefined && HOST_TAGS.has(code)) {
    return { tag: code as LoadError_Tags | 'Host', detail };
  }
  return { tag: 'Unknown', detail };
}

export function ffiFailure<T>(tag: FfiTag, detail: string): FfiResult<T> {
  return { ok: false, error: { tag, detail } };
}

export async function callFfi<T>(call: Promise<T>): Promise<FfiResult<T>> {
  try {
    return { ok: true, value: await call };
  } catch (rejection) {
    return { ok: false, error: toFfiError(rejection) };
  }
}

export function callFfiSync<T>(call: () => T): FfiResult<T> {
  try {
    return { ok: true, value: call() };
  } catch (rejection) {
    return { ok: false, error: toFfiError(rejection) };
  }
}

/** Zatoshi amounts cross the seam as bigint and stay under 2^53 in the app. */
export const zats = (amount: bigint | undefined): number =>
  amount === undefined ? 0 : Number(amount);
