import { SwapOperationEnum } from '@app/swap/enums/SwapErrorCategoryEnum';
import { SwapKitHttpError, parseRetryAfter } from '@app/swap/errors';
import {
  RATE_LIMIT_DEFAULT_WAIT_MS,
  isRateLimited,
  rateLimitWaitMs,
  rateLimitedNotice as rateLimitedNoticeText,
} from '@app/swap/rateLimited';
import { english } from '../../__mocks__/dataMocks/swap/englishText';

/** The sentence as the English app shows it. */
const rateLimitedNotice = (...args: Parameters<typeof rateLimitedNoticeText>) =>
  english(rateLimitedNoticeText(...args));

const NOW = Date.parse('2026-10-13T10:00:00Z');

const tooMany = (retryAfter?: string | null) =>
  new SwapKitHttpError({
    operation: SwapOperationEnum.Quote,
    httpStatus: 429,
    body: '{"message":"Too Many Requests"}',
    retryAfter,
    now: NOW,
  });

describe('parseRetryAfter', () => {
  it('reads seconds', () => {
    expect(parseRetryAfter('30', NOW)).toBe(30_000);
  });

  it('reads an HTTP date as the time left until it', () => {
    expect(parseRetryAfter('Tue, 13 Oct 2026 10:00:45 GMT', NOW)).toBe(45_000);
  });

  it('says nothing for a header that is absent or unreadable', () => {
    expect(parseRetryAfter(null, NOW)).toBeNull();
    expect(parseRetryAfter(undefined, NOW)).toBeNull();
    expect(parseRetryAfter('soon', NOW)).toBeNull();
  });
});

describe('rateLimitWaitMs', () => {
  it('waits as long as the header asks', () => {
    expect(rateLimitWaitMs(tooMany('30'))).toBe(30_000);
  });

  // The quota is counted per minute.
  it('waits a minute when the header does not say', () => {
    expect(rateLimitWaitMs(tooMany(null))).toBe(RATE_LIMIT_DEFAULT_WAIT_MS);
    expect(RATE_LIMIT_DEFAULT_WAIT_MS).toBe(60_000);
  });

  // A header that says nothing useful must not turn into a hammering retry or
  // a screen that never comes back.
  it('keeps the wait between five seconds and ten minutes', () => {
    expect(rateLimitWaitMs(tooMany('0'))).toBe(5_000);
    expect(rateLimitWaitMs(tooMany('86400'))).toBe(600_000);
  });

  it("only takes a 429 for the app's quota", () => {
    expect(isRateLimited(tooMany('30'))).toBe(true);
    expect(
      isRateLimited(
        new SwapKitHttpError({
          operation: SwapOperationEnum.Quote,
          httpStatus: 503,
          body: '',
        }),
      ),
    ).toBe(false);
  });
});

describe('rateLimitedNotice', () => {
  it('counts down in minutes and seconds', () => {
    expect(rateLimitedNotice(42_000)).toBe(
      'The swap service is busy right now. Quotes resume in 0:42.',
    );
    expect(rateLimitedNotice(60_000)).toBe(
      'The swap service is busy right now. Quotes resume in 1:00.',
    );
  });
});
