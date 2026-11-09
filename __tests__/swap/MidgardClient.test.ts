import { MidgardClient } from '@app/swap/MidgardClient';
import { SwapKitProviderEnum } from '@app/swap/SwapKitProviderEnum';
import { swapHttpRequest } from '@app/swap/swapHttp';

jest.mock('@app/swap/swapHttp', () => ({ swapHttpRequest: jest.fn() }));

const DESTINATION = 't1UZUBfxEMJ23fXTiaUoi7xLbbHaZX4Gz2b';
const MEMO = `=:z:${DESTINATION}:1432872/1/0:-_/zio:15/50`;
const HASH = 'F46AF7C2DF153D979DEA69CC28E890C9699FE3FA625B2B7364F708D914FA0187';

describe('MidgardClient', () => {
  test('Tests that a THORChain deposit is found when its Midgard knows the memo.', async () => {
    (swapHttpRequest as jest.Mock).mockResolvedValue({
      ok: true,
      status: 200,
      text: JSON.stringify({
        actions: [
          {
            metadata: { swap: { memo: MEMO } },
            in: [
              { txID: HASH, coins: [{ asset: 'BTC.BTC', amount: '24887' }] },
            ],
          },
        ],
      }),
    });

    const found = await new MidgardClient().findInboundActionByMemo({
      destinationAddress: DESTINATION,
      memo: MEMO,
      provider: SwapKitProviderEnum.ThorchainStreaming,
      chainIdForNormalization: 'bitcoin',
      receiveAssetId: 'ZEC.ZEC',
      receiveChainId: 'zcash',
    });

    expect((swapHttpRequest as jest.Mock).mock.calls[0][0].url).toBe(
      `https://gateway.liquify.com/chain/thorchain_midgard/v2/actions?address=${DESTINATION}&type=swap&limit=10`,
    );
    expect(found).toEqual({
      sourceTxHash: HASH.toLowerCase(),
      sourceChainPrefix: 'BTC',
    });
  });
});
