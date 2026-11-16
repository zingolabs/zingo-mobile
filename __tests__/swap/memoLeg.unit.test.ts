import { ValueTransferKindEnum } from '@app/AppState';
import type { ValueTransferType } from '@app/AppState';
import { SwapKitProviderEnum } from '@app/swap/enums/SwapKitProviderEnum';
import { SwapStatusEnum } from '@app/swap/enums/SwapStatusEnum';
import type { SwapRecordType } from '@app/swap/types/SwapRecordType';
import { legRowText } from '@screens/History/historyRowText';
import { legName } from '@screens/Swap/swapLegs';

jest.mock('@app/RPCModule', () => ({ __esModule: true, default: {} }));

const t = (key: string) =>
  ({
    'history.sent': 'Sent',
    'history.memo-sent': 'Memo sent',
    'history.no-funds': 'No funds',
    'history.fee': 'Fee',
    'swap.leg-payment-to': 'Payment to',
    'swap.leg-memo-to': 'Memo to',
  })[key] ?? key;

const leg = (amount: number) =>
  ({
    txid: 'tx-1',
    kind: ValueTransferKindEnum.Sent,
    amount,
    fee: 0.00015,
    time: 1_700_000_000,
  }) as ValueTransferType;

const record = {
  provider: SwapKitProviderEnum.MayachainStreaming,
  status: SwapStatusEnum.Pending,
} as SwapRecordType;

const row = (vt: ValueTransferType) =>
  legRowText({ vt, time: '1:43 pm', currency: 'ZEC', usd: '$0.00', t });

describe('a Maya deposit’s memo note', () => {
  it('Tests that History calls the 0 ZEC leg a memo with no funds when a shielded deposit sends its memo apart. The fee stays on the line.', () => {
    expect(row(leg(0))).toMatchObject({
      title: 'Memo sent',
      top: 'No funds',
      topTone: 'muted',
      bottom: '',
      lineAmount: ' · Fee 0.00015 ZEC',
    });
    expect(row(leg(0.01202694))).toMatchObject({
      title: 'Sent',
      top: '−0.01202694 ZEC',
    });
  });

  it('Tests that the swap details call the 0 ZEC leg a memo to the provider when a shielded deposit sends its memo apart', () => {
    expect(legName(leg(0), record, t)).toBe('Memo to MayaChain');
    expect(legName(leg(0.01202694), record, t)).toBe('Payment to MayaChain');
  });
});
