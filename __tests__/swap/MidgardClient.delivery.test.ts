import { MidgardClient } from '@app/swap/MidgardClient';
import { SwapKitProviderEnum } from '@app/swap/enums/SwapKitProviderEnum';
import { swapHttpRequest } from '@app/swap/swapHttp';

jest.mock('@app/swap/swapHttp', () => ({ swapHttpRequest: jest.fn() }));

const DESTINATION = 't1UZUBfxEMJ23fXTiaUoi7xLbbHaZX4Gz2b';
const MEMO = `=:z:${DESTINATION}:1432872/1/0:-_/zio:15/50`;
const IN = 'F46AF7C2DF153D979DEA69CC28E890C9699FE3FA625B2B7364F708D914FA0187';
const OUT = 'EFA1CD580ADA5656E7AEB0829E3ADA3BDAC80498E700C6825A7C3C63FE6641FB';

const answer = (action: Record<string, unknown>) =>
  (swapHttpRequest as jest.Mock).mockResolvedValue({
    ok: true,
    status: 200,
    text: JSON.stringify({
      actions: [
        {
          metadata: { swap: { memo: MEMO } },
          in: [{ txID: IN, coins: [{ asset: 'BTC.BTC', amount: '24887' }] }],
          ...action,
        },
      ],
    }),
  });

const find = () =>
  new MidgardClient().findInboundActionByMemo({
    destinationAddress: DESTINATION,
    memo: MEMO,
    provider: SwapKitProviderEnum.MayachainStreaming,
    chainIdForNormalization: 'bitcoin',
    receiveAssetId: 'ZEC.ZEC',
    receiveChainId: 'zcash',
  });

const FEE = {
  address: 'thor1dl7un46w7l7f3ewrnrm6nq58nerjtp0dradjtd',
  txID: '',
  coins: [{ asset: 'THOR.RUNE', amount: '15473788' }],
};
const PAYOUT = {
  address: DESTINATION,
  txID: OUT,
  coins: [{ asset: 'ZEC.ZEC', amount: '1477710' }],
};

describe('MidgardClient delivery', () => {
  test('Tests that the delivery is read when the action succeeded, whatever fees sit beside it.', async () => {
    answer({ status: 'success', out: [FEE, FEE, PAYOUT] });

    expect((await find())?.delivery).toEqual({
      txHash: OUT.toLowerCase(),
      amount: '0.01477710',
    });
  });

  test('Tests that there is no delivery when the action is still pending.', async () => {
    answer({ status: 'pending', out: [PAYOUT] });

    const found = await find();
    expect(found?.sourceTxHash).toBe(IN.toLowerCase());
    expect(found?.delivery).toBeUndefined();
  });

  test('Tests that there is no delivery when only fees were paid out.', async () => {
    answer({ status: 'success', out: [FEE] });

    expect((await find())?.delivery).toBeUndefined();
  });
});
