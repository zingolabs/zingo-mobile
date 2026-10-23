import { SwapOperationEnum } from '@app/swap/enums/SwapErrorCategoryEnum';
import { SwapKitHttpError } from '@app/swap/errors';
import { describeQuoteFailure } from '@app/swap/describeQuoteFailure';

describe('describeQuoteFailure', () => {
  // Measured against the live API: 0.735 ZEC, a little over $1,000, was
  // answered with exactly this body.
  it("says an amount over the key's limit is too large, not that the wallet is refused", () => {
    const error = new SwapKitHttpError({
      operation: SwapOperationEnum.Quote,
      httpStatus: 403,
      body: '{"error":"swapSizeExceeded","message":"Swap amount unsupported for key. Reach out to SwapKit team to request higher limits"}',
    });

    expect(describeQuoteFailure(error)).toBe(
      'That amount is over the limit for a single swap. Try a smaller amount.',
    );
  });

  it('says the service is busy when the app is over its request quota', () => {
    const error = new SwapKitHttpError({
      operation: SwapOperationEnum.Quote,
      httpStatus: 429,
      body: '{"message":"Too Many Requests"}',
    });

    expect(describeQuoteFailure(error)).toBe(
      'The swap service is busy right now. Try again in a minute.',
    );
  });

  it('leaves any other failure in its own words', () => {
    expect(describeQuoteFailure(new Error('network down'))).toBe(
      'Error: network down',
    );
  });
});
