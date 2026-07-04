import {
  SwapErrorCategoryEnum,
  SwapOperationEnum,
} from './enums/SwapErrorCategoryEnum';

/**
 * Strongly-typed errors thrown by `SwapKitClient` and provider executors.
 *
 * Why a class hierarchy instead of plain `Error`:
 *   - Callers (poller, service, UI) need to branch on transport vs semantic
 *     failures to decide whether to retry, surface a banner, or mark a record
 *     terminal. A `category` on the error makes that branching exhaustive.
 *   - The HTTP body of a SwapKit error is provider-shaped (each provider
 *     returns its own JSON); keeping the raw body on the error lets executors
 *     extract provider-specific context when classifying.
 *
 * The classifier `classifySwapError` maps a raw error into the UX-facing
 * `SwapErrorCategoryEnum` used by `app/swap/errors`. Provider executors may
 * extend the mapping by checking `body` for provider-specific markers.
 */

export class SwapKitError extends Error {
  readonly category: SwapErrorCategoryEnum;
  readonly operation: SwapOperationEnum;
  /** Raw body string (may be JSON, may be plain text). */
  readonly body?: string;
  /** HTTP status when the error came from a response. */
  readonly httpStatus?: number;
  /** Original error when wrapping a network/transport failure. */
  readonly cause?: unknown;

  constructor(args: {
    message: string;
    category: SwapErrorCategoryEnum;
    operation: SwapOperationEnum;
    body?: string;
    httpStatus?: number;
    cause?: unknown;
  }) {
    super(args.message);
    this.name = 'SwapKitError';
    this.category = args.category;
    this.operation = args.operation;
    this.body = args.body;
    this.httpStatus = args.httpStatus;
    this.cause = args.cause;
  }
}

/** Wrap a fetch/transport-level failure (timeout, DNS, TLS, abort). */
export class SwapKitNetworkError extends SwapKitError {
  constructor(operation: SwapOperationEnum, cause: unknown) {
    super({
      message: `SwapKit ${operation} transport failure: ${stringifyCause(cause)}`,
      category: SwapErrorCategoryEnum.NetworkTimeout,
      operation,
      cause,
    });
    this.name = 'SwapKitNetworkError';
  }
}

/** Wrap a non-2xx HTTP response. */
export class SwapKitHttpError extends SwapKitError {
  /** True when the response is the CF "Sorry, you have been blocked" page
   *  (or any 403 returning an HTML body). Used by the UI to render a
   *  region-specific banner instead of the generic error message. */
  readonly isEdgeBlocked: boolean;

  constructor(args: {
    operation: SwapOperationEnum;
    httpStatus: number;
    body: string;
  }) {
    // Extract a short, user-visible reason from the JSON body when SwapKit
    // returns one (`{message, error}`). Falls back to the raw body when not
    // JSON. Capped at 240 chars so the snackbar stays readable on phones.
    const reason = extractServerReason(args.body);
    const message = reason
      ? `SwapKit ${args.operation} HTTP ${args.httpStatus}: ${reason}`
      : `SwapKit ${args.operation} HTTP ${args.httpStatus}`;
    super({
      message,
      category: classifyHttpStatus(args.operation, args.httpStatus, args.body),
      operation: args.operation,
      body: args.body,
      httpStatus: args.httpStatus,
    });
    this.name = 'SwapKitHttpError';
    this.isEdgeBlocked = isEdgeBlockedResponse(args.httpStatus, args.body);
  }
}

/**
 * Detect Cloudflare's "Sorry, you have been blocked" / generic block page.
 * Triggered when SwapKit's edge rejects the request before it reaches the
 * API backend — typically a WAF rule (region/IP reputation) rather than a
 * backend authorization failure. The body is HTML in this case.
 */
function isEdgeBlockedResponse(httpStatus: number, body: string): boolean {
  if (httpStatus !== 403) return false;
  const trimmed = body.trimStart();
  return trimmed.startsWith('<');
}

function extractServerReason(body: string): string {
  if (!body) return '';
  try {
    const parsed = JSON.parse(body) as { message?: string; error?: string };
    const parts = [parsed.message, parsed.error].filter(
      (s): s is string => typeof s === 'string' && s.length > 0,
    );
    if (parts.length > 0) {
      return parts.join(' / ').slice(0, 240);
    }
  } catch {
    // not JSON
  }
  // When SwapKit's edge (Cloudflare) returns its own error page the body is
  // HTML — dumping the markup into a snackbar reads like garbage. Detect
  // that case and emit a short, descriptive label instead. Cheap heuristic:
  // anything starting with `<` after trimming is treated as markup.
  const trimmed = body.trimStart();
  if (trimmed.startsWith('<')) {
    return 'edge blocked request';
  }
  return body.slice(0, 240);
}

/**
 * Map an HTTP status (plus body markers) to a `SwapErrorCategoryEnum`.
 *
 * The mapping is intentionally conservative — when a status could be several
 * categories, we pick the most actionable one for the user. Provider executors
 * can override per-provider semantics by parsing `body` themselves.
 */
function classifyHttpStatus(
  operation: SwapOperationEnum,
  httpStatus: number,
  body: string,
): SwapErrorCategoryEnum {
  if (httpStatus === 401 || httpStatus === 403) {
    return SwapErrorCategoryEnum.Unauthorized;
  }
  if (httpStatus === 408 || httpStatus === 504) {
    return SwapErrorCategoryEnum.NetworkTimeout;
  }
  if (httpStatus === 503 || httpStatus === 502) {
    return SwapErrorCategoryEnum.ServiceUnavailable;
  }
  if (httpStatus === 404 && operation === SwapOperationEnum.Track) {
    return SwapErrorCategoryEnum.DepositNotFound;
  }
  // SwapKit returns 404 with `{"error":"noRoutesFound"}` on /v3/quote when the
  // requested amount is below a provider's minimum or above its maximum — the
  // wire error is misleading (it is amount-shaped, not availability-shaped),
  // but the UX bucket is the same: tell the user no route is available so
  // they try a different amount.
  if (httpStatus === 404 && bodyIndicatesNoRoutes(body)) {
    return SwapErrorCategoryEnum.NoQuoteOrLiquidity;
  }
  if (httpStatus === 400 || httpStatus === 422) {
    return classify4xxBody(operation, body);
  }
  if (httpStatus >= 500) {
    return SwapErrorCategoryEnum.ServiceUnavailable;
  }
  return SwapErrorCategoryEnum.Unknown;
}

/**
 * Recognise the various ways SwapKit / providers signal "no usable route" in
 * a response body. The SwapKit `/v3/quote` payload uses camelCase
 * (`noRoutesFound`), provider 4xx text bodies often use spaced English
 * (`no route`, `no quote`, `insufficient liquidity`); the lowercased compare
 * covers both forms.
 */
function bodyIndicatesNoRoutes(body: string): boolean {
  const lower = body.toLowerCase();
  return (
    lower.includes('noroutesfound') ||
    lower.includes('no routes found') ||
    lower.includes('no route') ||
    lower.includes('no quote') ||
    lower.includes('liquidity')
  );
}

/**
 * 400/422 bodies vary per provider. We look for known keywords; anything we do
 * not recognise falls through to `Unknown` so the UI shows a generic message.
 */
function classify4xxBody(
  operation: SwapOperationEnum,
  body: string,
): SwapErrorCategoryEnum {
  const lower = body.toLowerCase();
  if (lower.includes('insufficient') && lower.includes('balance')) {
    return SwapErrorCategoryEnum.InsufficientBalance;
  }
  if (lower.includes('amount') && lower.includes('too small')) {
    return SwapErrorCategoryEnum.AmountTooSmall;
  }
  if (lower.includes('amount') && lower.includes('too large')) {
    return SwapErrorCategoryEnum.AmountTooLarge;
  }
  if (lower.includes('precision') || lower.includes('decimals')) {
    return SwapErrorCategoryEnum.AmountPrecision;
  }
  if (lower.includes('slippage')) {
    return SwapErrorCategoryEnum.SlippageTooLow;
  }
  if (
    lower.includes('no quote') ||
    lower.includes('no route') ||
    lower.includes('liquidity')
  ) {
    return SwapErrorCategoryEnum.NoQuoteOrLiquidity;
  }
  if (lower.includes('expired')) {
    return SwapErrorCategoryEnum.RouteExpired;
  }
  if (lower.includes('unsupported') && lower.includes('asset')) {
    return SwapErrorCategoryEnum.UnsupportedAsset;
  }
  if (lower.includes('unsupported') && lower.includes('pair')) {
    return SwapErrorCategoryEnum.UnsupportedPair;
  }
  if (lower.includes('invalid') && lower.includes('address')) {
    return SwapErrorCategoryEnum.InvalidAddressForChain;
  }
  if (lower.includes('aml')) {
    return SwapErrorCategoryEnum.AmlScreeningRejected;
  }
  if (operation === SwapOperationEnum.Track && lower.includes('not found')) {
    return SwapErrorCategoryEnum.DepositNotFound;
  }
  return SwapErrorCategoryEnum.Unknown;
}

function stringifyCause(cause: unknown): string {
  if (cause instanceof Error) {
    return cause.message;
  }
  if (typeof cause === 'string') {
    return cause;
  }
  try {
    return JSON.stringify(cause);
  } catch {
    return String(cause);
  }
}

/**
 * Public helper for callers that already hold a `SwapKitError` (or any error)
 * and need a category for UI purposes without unwrapping by hand.
 */
export function classifySwapError(err: unknown): SwapErrorCategoryEnum {
  if (err instanceof SwapKitError) {
    return err.category;
  }
  return SwapErrorCategoryEnum.Unknown;
}
