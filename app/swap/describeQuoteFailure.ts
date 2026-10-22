import { SwapKitHttpError } from './errors';
import { RATE_LIMITED_MESSAGE, isRateLimited } from './rateLimited';
import { swapKey, swapRaw } from './swapText';
import type { SwapTextType } from './swapText';

/**
 * Why asking for a quote failed, in the user's terms.
 *
 * "No route" never comes through here: `SwapService.quote` turns it into an
 * empty quote, which `describeEmptyQuote` explains. What is left is a request
 * that was refused or never answered, and almost all of it is said well
 * enough by the error itself.
 *
 * The exception is the size limit on the API key. SwapKit answers a quote
 * above it with 403 `swapSizeExceeded` and "Reach out to SwapKit team to
 * request higher limits", which is advice for the developer and reads to the
 * user as a wallet that has been locked out. The answer does not say what the
 * limit is, so neither does this.
 */
export function describeQuoteFailure(error: unknown): SwapTextType {
  if (isRateLimited(error)) return RATE_LIMITED_MESSAGE;
  const raw =
    `${error instanceof SwapKitHttpError ? `${error.message} ${error.body}` : String(error)}`.toLowerCase();

  if (raw.includes('swapsizeexceeded')) {
    return swapKey('swap.msg-over-limit');
  }
  return swapRaw(`${error}`);
}

export default describeQuoteFailure;
