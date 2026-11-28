import { extractFiatValueBasis } from '@app/swap/quoteFiatBasis';
import type { QuoteResponseType } from '@app/swap/types/QuoteResponseType';

describe('extractFiatValueBasis', () => {
  it('Tests that a token gets its price when the catalog spells its identifier in another case. SwapKit lists ARB USDT in lowercase and quotes it in mixed case.', () => {
    const response = {
      routes: [
        {
          meta: {
            assets: [
              { asset: 'ZEC.ZEC', price: 736.18 },
              {
                asset: 'ARB.USDT-0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9',
                price: 0.999108,
              },
            ],
          },
        },
      ],
    } as unknown as QuoteResponseType;
    expect(
      extractFiatValueBasis({
        response,
        sellAssetId: 'ZEC.ZEC',
        receiveAssetId: 'ARB.USDT-0xfd086bc7cd5c481dcc9c85ebe478a1c0b69fcbb9',
        capturedAt: 0,
      }),
    ).toEqual({
      sellUsdUnitPrice: 736.18,
      receiveUsdUnitPrice: 0.999108,
      capturedAt: 0,
    });
  });
});
