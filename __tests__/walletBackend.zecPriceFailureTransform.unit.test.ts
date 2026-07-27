import { COVERED_SURFACE_REFUSAL } from '../app/walletBackend/utils/mixnetGate';
import {
  PRICE_FAILURE_HEADLINE,
  zecPriceFailureReport,
} from '../app/walletBackend/transforms/zecPriceFailureTransform';

describe('zecPriceFailureReport', () => {
  it('renders nothing for a successful fetch', () => {
    expect(
      zecPriceFailureReport({
        kind: 'price',
        usd: 42.5,
        route: { kind: 'attested', viaSocks5: '127.0.0.1:1080' },
        elapsedMs: 1200,
      }),
    ).toBeNull();
  });

  it('carries the gate refusal verbatim, so the user can send the exact fail-closed verdict', () => {
    const rendered = zecPriceFailureReport({
      kind: 'gateRefusal',
      error: COVERED_SURFACE_REFUSAL,
    });
    expect(rendered).toContain(PRICE_FAILURE_HEADLINE);
    expect(rendered).toContain(COVERED_SURFACE_REFUSAL);
  });

  it('carries an ffi rejection with its code and its message', () => {
    const rendered = zecPriceFailureReport({
      kind: 'ffiRejection',
      code: 'Unknown',
      message: 'bridge rejected: RPCModule not initialized',
      elapsedMs: 15,
    });
    expect(rendered).toContain(PRICE_FAILURE_HEADLINE);
    expect(rendered).toContain('code: Unknown');
    expect(rendered).toContain('bridge rejected: RPCModule not initialized');
  });

  it('carries the oracle error chain verbatim, the zingolib Display text intact', () => {
    const chain =
      'Price fetch error. price error. request failed. error sending request: ' +
      'client error (Connect): tcp connect error';
    const rendered = zecPriceFailureReport({
      kind: 'oracleError',
      error: chain,
      elapsedMs: 3200,
    });
    expect(rendered).toContain(chain);
  });

  it('carries a malformed payload with both the detail and the payload verbatim', () => {
    const rendered = zecPriceFailureReport({
      kind: 'malformedPayload',
      payload: '{"current_price": "not-a-number"}',
      detail: 'non-numeric price not-a-number',
      elapsedMs: 900,
    });
    expect(rendered).toContain('detail: non-numeric price not-a-number');
    expect(rendered).toContain('payload: {"current_price": "not-a-number"}');
  });

  it('reports the no-data arm instead of collapsing it into silence', () => {
    const rendered = zecPriceFailureReport({ kind: 'noData', elapsedMs: 640 });
    expect(rendered).toContain(PRICE_FAILURE_HEADLINE);
    expect(rendered).toContain('without a price field');
  });

  it('reports the watchdog timeout with its bound, the hang made legible', () => {
    const rendered = zecPriceFailureReport({ kind: 'timedOut', afterMs: 25000 });
    expect(rendered).toContain(PRICE_FAILURE_HEADLINE);
    expect(rendered).toContain('25000 ms');
  });

  it('renders every failure as one copyable string under the stable headline', () => {
    const failures = [
      zecPriceFailureReport({ kind: 'noData', elapsedMs: 1 }),
      zecPriceFailureReport({ kind: 'gateRefusal', error: 'x' }),
      zecPriceFailureReport({ kind: 'timedOut', afterMs: 25000 }),
      zecPriceFailureReport({
        kind: 'ffiRejection',
        code: 'Unknown',
        message: 'y',
        elapsedMs: 1,
      }),
      zecPriceFailureReport({ kind: 'oracleError', error: 'z', elapsedMs: 1 }),
      zecPriceFailureReport({
        kind: 'malformedPayload',
        payload: 'p',
        detail: 'd',
        elapsedMs: 1,
      }),
    ];
    for (const rendered of failures) {
      expect(typeof rendered).toBe('string');
      expect(rendered!.startsWith(`${PRICE_FAILURE_HEADLINE} (`)).toBe(true);
    }
  });
});
