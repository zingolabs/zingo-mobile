import type { ValueTransferType } from '@app/AppState';
import { ValueTransferKindEnum } from '@app/AppState/enums/ValueTransferKindEnum';
import { RPCValueTransfersStatusEnum } from '@app/walletBackend/enums/RPCValueTransfersStatusEnum';
import { SwapDirectionEnum } from '@app/swap/enums/SwapDirectionEnum';
import { SwapKitProviderEnum } from '@app/swap/enums/SwapKitProviderEnum';
import { SwapStatusEnum } from '@app/swap/enums/SwapStatusEnum';
import {
  awaitsPayout,
  claimPayout,
  payoutNotesFrom,
} from '@app/swap/payoutNotes';
import type { SwapRecordType } from '@app/swap/types/SwapRecordType';

const HASH = 'E717E197095A637090BF5F94609B8BC84D56ACD6DAD4E423D695307CF6259BAA';

const vt = (over: Partial<ValueTransferType>): ValueTransferType => ({
  txid: 'df3fe39c',
  kind: ValueTransferKindEnum.Received,
  confirmations: 1,
  blockheight: 1,
  time: 1,
  amount: 0.01732169,
  status: RPCValueTransfersStatusEnum.confirmed,
  memos: [`OUT:${HASH}`],
  ...over,
});

const purchase = (over: Partial<SwapRecordType> = {}) =>
  ({
    recordId: 'rec-1',
    provider: SwapKitProviderEnum.MayachainStreaming,
    direction: SwapDirectionEnum.Inbound,
    sellAsset: { chain: 'ETH', chainId: '1' },
    receiveAsset: { chain: 'ZEC', chainId: 'zcash' },
    status: SwapStatusEnum.AwaitingExternalDeposit,
    createdAtMs: 1,
    updatedAtMs: 1,
    ...over,
  }) as unknown as SwapRecordType;

describe('payoutNotesFrom', () => {
  it('Tests that a received transfer is a payout when its memo names a deposit hash', () => {
    expect(payoutNotesFrom([vt({})])).toEqual([
      { txid: 'df3fe39c', amount: 0.01732169, inboundHash: HASH },
    ]);
  });

  it('Tests that the memo is read whatever its case and surrounding space', () => {
    expect(
      payoutNotesFrom([vt({ memos: [` out:${HASH.toLowerCase()} `] })]),
    ).toHaveLength(1);
  });

  it('Tests that nothing is a payout when the transfer was not received, failed, or is a swap row', () => {
    expect(
      payoutNotesFrom([
        vt({ kind: ValueTransferKindEnum.Sent }),
        vt({ status: RPCValueTransfersStatusEnum.failed }),
        vt({ swapRecordId: 'rec-1' }),
      ]),
    ).toEqual([]);
  });

  it('Tests that nothing is a payout when the memo is anything else', () => {
    expect(
      payoutNotesFrom([
        vt({ memos: ['thanks'] }),
        vt({ memos: [`REFUND:${HASH}`] }),
        vt({ memos: [`OUT:${HASH.slice(2)}`] }),
        vt({ memos: undefined }),
      ]),
    ).toEqual([]);
  });
});

describe('awaitsPayout', () => {
  it('Tests that a Maya purchase without its payout awaits one whatever the poller made of it', () => {
    expect(awaitsPayout(purchase())).toBe(true);
    expect(awaitsPayout(purchase({ status: SwapStatusEnum.Expired }))).toBe(
      true,
    );
    expect(awaitsPayout(purchase({ status: SwapStatusEnum.Completed }))).toBe(
      true,
    );
  });

  it('Tests that nothing awaits a payout when it has one, was refunded, is a sale or another provider', () => {
    expect(awaitsPayout(purchase({ destinationTxHash: 'ab' }))).toBe(false);
    expect(awaitsPayout(purchase({ status: SwapStatusEnum.Refunded }))).toBe(
      false,
    );
    expect(
      awaitsPayout(purchase({ direction: SwapDirectionEnum.Outbound })),
    ).toBe(false);
    expect(awaitsPayout(purchase({ provider: SwapKitProviderEnum.Near }))).toBe(
      false,
    );
  });
});

describe('claimPayout', () => {
  const note = { txid: 'df3fe39c', amount: 0.01732169, inboundHash: HASH };

  it('Tests that the purchase completes with the ZEC that arrived and the deposit hash /track takes', () => {
    const claimed = claimPayout(purchase(), note, 50);

    expect(claimed).toEqual(
      expect.objectContaining({
        status: SwapStatusEnum.Completed,
        destinationTxHash: 'df3fe39c',
        actualReceiveAmount: '0.01732169',
        observedDepositTxHash: `0x${HASH.toLowerCase()}`,
        terminalAtMs: 50,
      }),
    );
  });

  it('Tests that a hash already found and a completion already dated stay', () => {
    const claimed = claimPayout(
      purchase({
        status: SwapStatusEnum.Completed,
        terminalAtMs: 10,
        observedDepositTxHash: '0xfound',
      }),
      note,
      50,
    );

    expect(claimed.terminalAtMs).toBe(10);
    expect(claimed.observedDepositTxHash).toBe('0xfound');
  });

  it('Tests that a purchase with its payout already tied is left as it is', () => {
    const tied = purchase({ destinationTxHash: 'other' });

    expect(claimPayout(tied, note, 50)).toBe(tied);
  });
});
