import { matchZecPriceOutcome, ZecPriceOutcome } from '../utils/walletUtils';

/**
 * The stable first line of every price failure report. A support reply can
 * key on it, and a user who copies only one line still identifies the
 * surface that failed.
 */
export const PRICE_FAILURE_HEADLINE = 'price fetch failed';

/**
 * Renders a failed price fetch as one complete, copyable report for the
 * support channel. The terse headline the screens used to render threw the
 * diagnosis away: a tester who saw "Error fetching the price from the
 * Internet." could report nothing else. Every failure arm renders here
 * with all of its fields verbatim, and the whole report is a single string
 * that survives copy-paste into a support email intact.
 *
 * Returns null for the success arm. Exhaustive by construction through
 * [`matchZecPriceOutcome`]: a new outcome arm fails compilation here until
 * it decides what its report says.
 *
 * Surface it through `createAlert(title, report, false, translate,
 * sendEmail, zingolibVersion)`: the alert renders the full report and its
 * support button pre-fills an email carrying this text with device and
 * version info.
 */
export function zecPriceFailureReport(
  outcome: ZecPriceOutcome,
): string | null {
  return matchZecPriceOutcome<string | null>(outcome, {
    price: () => null,
    noData: noData =>
      report('no data', [
        'the oracle answered without a price field',
        elapsed(noData.elapsedMs),
      ]),
    gateRefusal: refusal => report('gate refusal', [refusal.error]),
    timedOut: timedOut =>
      report('timed out', [
        `the watchdog released the fetch after ${timedOut.afterMs} ms with no answer`,
      ]),
    ffiRejection: rejection =>
      report('ffi rejection', [
        `code: ${rejection.code}`,
        `message: ${rejection.message}`,
        elapsed(rejection.elapsedMs),
      ]),
    oracleError: oracle =>
      report('oracle error', [oracle.error, elapsed(oracle.elapsedMs)]),
    malformedPayload: malformed =>
      report('malformed payload', [
        `detail: ${malformed.detail}`,
        `payload: ${malformed.payload}`,
        elapsed(malformed.elapsedMs),
      ]),
  });
}

function report(kind: string, lines: readonly string[]): string {
  return [`${PRICE_FAILURE_HEADLINE} (${kind})`, ...lines].join('\n');
}

function elapsed(elapsedMs: number): string {
  return `elapsed: ${elapsedMs} ms`;
}
