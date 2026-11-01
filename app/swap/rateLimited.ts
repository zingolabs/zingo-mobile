import { SwapKitHttpError } from './errors';
import { swapKey } from './swapText';
import type { SwapTextType } from './swapText';

/**
 * Whether SwapKit turned the request away for the app's request quota.
 *
 * The quota belongs to the app's API key, which every user of the app shares,
 * so a 429 is about how busy the swap service is, not about the route, the
 * provider or the wallet.
 */
export const isRateLimited = (error: unknown): boolean =>
  error instanceof SwapKitHttpError && error.httpStatus === 429;

/** What the user is told about a 429, wherever it lands. */
export const RATE_LIMITED_MESSAGE: SwapTextType = swapKey('swap.msg-busy');

// The quota is counted per minute, so a minute is what a 429 that does not say
// how long to wait is given. The bounds keep a header that says too little or
// too much from turning into a hammering retry or a screen that never comes
// back.
export const RATE_LIMIT_DEFAULT_WAIT_MS = 60 * 1000;
const RATE_LIMIT_MIN_WAIT_MS = 5 * 1000;
const RATE_LIMIT_MAX_WAIT_MS = 10 * 60 * 1000;

/**
 * How long to leave the swap service alone after a 429: what its
 * `Retry-After` asked for, or a minute when it did not say.
 *
 * Every user waits on the same quota, so asking again sooner only spends it
 * for all of them while it is out.
 */
export function rateLimitWaitMs(error: unknown): number {
  const asked = error instanceof SwapKitHttpError ? error.retryAfterMs : null;
  if (asked === null) return RATE_LIMIT_DEFAULT_WAIT_MS;
  return Math.min(
    RATE_LIMIT_MAX_WAIT_MS,
    Math.max(RATE_LIMIT_MIN_WAIT_MS, asked),
  );
}

/** "0:42", from milliseconds. */
const minutesAndSeconds = (ms: number): string => {
  const total = Math.max(0, Math.ceil(ms / 1000));
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, '0')}`;
};

/** What the swap screen says while it holds off. */
export const rateLimitedNotice = (remainingMs: number): SwapTextType =>
  swapKey('swap.msg-busy-resume', { time: minutesAndSeconds(remainingMs) });
