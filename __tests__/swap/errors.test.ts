import {
  SwapKitHttpError,
  SwapKitNetworkError,
  classifySwapError,
} from '@app/swap/errors';
import {
  SwapErrorCategoryEnum,
  SwapOperationEnum,
} from '@app/swap/enums/SwapErrorCategoryEnum';

/**
 * The classifier decides what the user is told when a swap call fails, and the
 * difference matters: "no route, try a different amount" sends them to the
 * amount field, "the service is down" sends them away to wait, and an edge
 * block sends them to a VPN. Getting one for another wastes the user's time on
 * the wrong remedy.
 */

const httpError = (
  httpStatus: number,
  body: string,
  operation = SwapOperationEnum.Quote,
) => new SwapKitHttpError({ operation, httpStatus, body });

describe('edge blocks', () => {
  // Cloudflare answers a blocked region with an HTML page, not JSON. The Swap
  // screen shows a banner about VPNs for this and only this, so the detection
  // has to be narrow.
  it('recognises a 403 whose body is markup', () => {
    const error = httpError(
      403,
      '<!DOCTYPE html><html>Sorry, you have been blocked</html>',
    );

    expect(error.isEdgeBlocked).toBe(true);
    expect(error.message).toContain('edge blocked request');
  });

  it('recognises markup behind leading whitespace', () => {
    expect(httpError(403, '\n  <html>blocked</html>').isEdgeBlocked).toBe(true);
  });

  // A 403 with a JSON body is the backend refusing the key, which a VPN does
  // nothing about.
  it('leaves a 403 carrying JSON alone', () => {
    const error = httpError(
      403,
      JSON.stringify({ message: 'Invalid API key' }),
    );

    expect(error.isEdgeBlocked).toBe(false);
    expect(error.category).toBe(SwapErrorCategoryEnum.Unauthorized);
    expect(error.message).toContain('Invalid API key');
  });

  it('leaves an HTML body on any other status alone', () => {
    expect(httpError(500, '<html>gateway</html>').isEdgeBlocked).toBe(false);
  });
});

describe('no-route classification', () => {
  // SwapKit answers an amount below every provider's minimum with a 404 and
  // `noRoutesFound`, which is availability-shaped wording for an amount-shaped
  // problem. The UX bucket is the same either way.
  it("reads SwapKit's 404 noRoutesFound as no liquidity", () => {
    expect(
      httpError(404, JSON.stringify({ error: 'noRoutesFound' })).category,
    ).toBe(SwapErrorCategoryEnum.NoQuoteOrLiquidity);
  });

  it("reads a provider's spaced English the same way", () => {
    expect(httpError(404, 'no route available for this pair').category).toBe(
      SwapErrorCategoryEnum.NoQuoteOrLiquidity,
    );
  });

  // A 404 on /track means the provider has not seen the deposit, which is a
  // normal early state rather than a routing problem.
  it('keeps a track 404 as a missing deposit', () => {
    expect(httpError(404, 'not found', SwapOperationEnum.Track).category).toBe(
      SwapErrorCategoryEnum.DepositNotFound,
    );
  });
});

describe('4xx body classification', () => {
  it.each([
    [
      'insufficient balance for this swap',
      SwapErrorCategoryEnum.InsufficientBalance,
    ],
    ['sell amount too small', SwapErrorCategoryEnum.AmountTooSmall],
    ['sell amount too large', SwapErrorCategoryEnum.AmountTooLarge],
    ['too many decimals for this asset', SwapErrorCategoryEnum.AmountPrecision],
    ['slippage tolerance exceeded', SwapErrorCategoryEnum.SlippageTooLow],
    ['route expired', SwapErrorCategoryEnum.RouteExpired],
    ['unsupported asset', SwapErrorCategoryEnum.UnsupportedAsset],
    ['unsupported pair', SwapErrorCategoryEnum.UnsupportedPair],
    ['invalid address for chain', SwapErrorCategoryEnum.InvalidAddressForChain],
    ['aml screening failed', SwapErrorCategoryEnum.AmlScreeningRejected],
  ])('reads %s', (body, expected) => {
    expect(httpError(400, body).category).toBe(expected);
  });

  // Guessing at an unrecognised body would put confident wrong advice on
  // screen. Unknown earns the generic message.
  it('leaves an unrecognised body unknown', () => {
    expect(httpError(400, 'something we have never seen').category).toBe(
      SwapErrorCategoryEnum.Unknown,
    );
  });
});

describe('transport and availability', () => {
  it.each([
    [408, SwapErrorCategoryEnum.NetworkTimeout],
    [504, SwapErrorCategoryEnum.NetworkTimeout],
    [502, SwapErrorCategoryEnum.ServiceUnavailable],
    [503, SwapErrorCategoryEnum.ServiceUnavailable],
    [500, SwapErrorCategoryEnum.ServiceUnavailable],
    [401, SwapErrorCategoryEnum.Unauthorized],
  ])('maps HTTP %s', (status, expected) => {
    expect(httpError(status, '').category).toBe(expected);
  });

  it("wraps a transport failure with the cause's message", () => {
    const error = new SwapKitNetworkError(
      SwapOperationEnum.Track,
      new Error('socket hang up'),
    );

    expect(error.category).toBe(SwapErrorCategoryEnum.NetworkTimeout);
    expect(error.message).toContain('socket hang up');
  });

  it('stringifies a non-Error cause rather than printing an object tag', () => {
    expect(
      new SwapKitNetworkError(SwapOperationEnum.Quote, { code: 'ENOTFOUND' })
        .message,
    ).toContain('ENOTFOUND');
  });
});

describe('message building', () => {
  it('surfaces both fields SwapKit uses to explain itself', () => {
    const error = httpError(
      400,
      JSON.stringify({ message: 'Bad input', error: 'badRequest' }),
    );

    expect(error.message).toContain('Bad input');
    expect(error.message).toContain('badRequest');
  });

  // The message reaches a snackbar, so a provider dumping a wall of text must
  // not take the screen with it.
  it('caps a long body', () => {
    const error = httpError(400, 'x'.repeat(1000));

    expect(error.message.length).toBeLessThan(320);
  });

  it('still names the operation and status when the body says nothing', () => {
    const error = httpError(500, '', SwapOperationEnum.Swap);

    expect(error.message).toContain(SwapOperationEnum.Swap);
    expect(error.message).toContain('500');
  });
});

describe('classifySwapError', () => {
  it('reads the category off a SwapKit error', () => {
    expect(classifySwapError(httpError(503, ''))).toBe(
      SwapErrorCategoryEnum.ServiceUnavailable,
    );
  });

  it('answers unknown for anything else that reached the caller', () => {
    expect(classifySwapError(new Error('boom'))).toBe(
      SwapErrorCategoryEnum.Unknown,
    );
    expect(classifySwapError('a string somebody threw')).toBe(
      SwapErrorCategoryEnum.Unknown,
    );
  });
});

describe('a gateway timeout from the edge', () => {
  // Cloudflare answers a 504 in RFC 7807 problem shape, which is JSON but not
  // SwapKit's JSON: `title` and `detail` where the API uses `message` and
  // `error`. It used to fall through to the raw-body branch and reach the
  // screen as the whole document, documentation URL included.
  const CLOUDFLARE_504 = JSON.stringify({
    type: 'https://developers.cloudflare.com/support/troubleshooting/http-status-codes/cloudflare-5xx-errors/error-504/',
    title: 'Error 504: Gateway time-out',
    status: 504,
    detail:
      'The origin web server did not respond to Cloudflare within the timeout period.',
  });

  it('states the detail and nothing else', () => {
    const error = httpError(504, CLOUDFLARE_504);

    expect(error.message).toBe(
      'SwapKit quote HTTP 504: The origin web server did not respond to Cloudflare within the timeout period.',
    );
    expect(error.message).not.toContain('developers.cloudflare.com');
    expect(error.message).not.toContain('"status"');
  });

  it('falls back to the title when no detail is carried', () => {
    const error = httpError(
      504,
      JSON.stringify({ title: 'Error 504: Gateway time-out', status: 504 }),
    );

    expect(error.message).toContain('Error 504: Gateway time-out');
  });

  // SwapKit's own shape still wins: it is the one that says something about
  // the swap rather than about the plumbing in front of it.
  it("prefers SwapKit's own fields when the body carries both", () => {
    const error = httpError(
      504,
      JSON.stringify({ error: 'noRoutesFound', detail: 'some edge prose' }),
    );

    expect(error.message).toContain('noRoutesFound');
    expect(error.message).not.toContain('some edge prose');
  });
});
