import { errorKeyed } from '@app/AppState';
import type { ZecPriceOutcome } from '@app/walletBackend';

export const mockZecQuote: ZecPriceOutcome = { kind: 'zecPrice', usd: 42 };

export const mockZecRefusal = (param: string): ZecPriceOutcome =>
  errorKeyed('info.error-price-fetch', param);
