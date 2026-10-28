jest.mock('@app/RPCModule', () => ({ __esModule: true, default: {} }));

import { ValueTransferKindEnum } from '@app/AppState';
import { PoolEnum } from '@app/AppState';
import type { ValueTransferType } from '@app/AppState';
import { RPCValueTransfersStatusEnum } from '@app/walletBackend/enums/RPCValueTransfersStatusEnum';
import { SwapDirectionEnum } from '@app/swap/enums/SwapDirectionEnum';
import { SwapKitProviderEnum } from '@app/swap/enums/SwapKitProviderEnum';
import { SwapStatusEnum } from '@app/swap/enums/SwapStatusEnum';
import type { SwapRecordType } from '@app/swap/types/SwapRecordType';
import { buildHistoryItems } from '@screens/History/historyItems';
import {
  shortWhen,
  swapRowText,
  transferRowText,
} from '@screens/History/historyRowText';

const HOP = 'a'.repeat(64);
const DEPOSIT = 'b'.repeat(64);

const vt = (
  txid: string,
  time: number,
  kind = ValueTransferKindEnum.Sent,
  extra: Partial<ValueTransferType> = {},
): ValueTransferType => ({
  txid,
  kind,
  confirmations: 3,
  blockheight: 1,
  time,
  amount: 1.5,
  status: RPCValueTransfersStatusEnum.confirmed,
  ...extra,
});

const record = (overrides: Partial<SwapRecordType> = {}): SwapRecordType =>
  ({
    recordId: 'rec-1',
    depositAddress: 't1vault',
    provider: SwapKitProviderEnum.MayachainStreaming,
    direction: SwapDirectionEnum.Outbound,
    routeId: 'r',
    sellAsset: {
      swapKitId: 'ZEC.ZEC',
      chain: 'ZEC',
      symbol: 'ZEC',
      ticker: 'ZEC',
      chainId: 'zcash',
      decimals: 8,
    },
    receiveAsset: {
      swapKitId: 'BTC.BTC',
      chain: 'BTC',
      symbol: 'BTC',
      ticker: 'BTC',
      chainId: 'bitcoin',
      decimals: 8,
    },
    sellAmountHumanDecimal: '1.5',
    expectedReceiveAmount: '0.0095',
    minReceiveAmount: '0.009',
    destinationAddress: 'bc1qdest',
    sourceAddress: 't1eph',
    status: SwapStatusEnum.Completed,
    broadcast: { txId: DEPOSIT, allTxIds: [HOP, DEPOSIT] },
    createdAtMs: 2_000_000_000,
    updatedAtMs: 2_000_000_000,
    ...overrides,
  }) as SwapRecordType;

const monthOf = (timeSec: number) =>
  timeSec >= 1_900_000 ? 'Oct 2026' : 'Apr 2026';

const swapRow = (r: SwapRecordType) =>
  vt(DEPOSIT, r.createdAtMs / 1000, ValueTransferKindEnum.Swap, {
    swapRecordId: r.recordId,
  });

test('Tests that a swap is one row and its Zcash transactions leave the flat list when they belong to it', () => {
  const r = record();
  const rows = [
    swapRow(r),
    vt(DEPOSIT, 2_000_010),
    vt(HOP, 2_000_005, ValueTransferKindEnum.SendToSelf),
    vt('c'.repeat(64), 1_000_000, ValueTransferKindEnum.Received),
  ];

  const items = buildHistoryItems({
    rows,
    all: rows,
    records: [r],
    open: new Set(),
    monthOf,
  });

  expect(items.map(i => i.kind)).toEqual([
    'month',
    'swap',
    'month',
    'transfer',
  ]);
  const swap = items[1];
  expect(swap.kind === 'swap' && swap.legCount).toBe(2);
});

test('Tests that an open swap shows its transactions under it, oldest first, when its chevron is open', () => {
  const r = record();
  const rows = [
    swapRow(r),
    vt(DEPOSIT, 2_000_010),
    vt(HOP, 2_000_005, ValueTransferKindEnum.SendToSelf),
  ];

  const items = buildHistoryItems({
    rows,
    all: rows,
    records: [r],
    open: new Set(['rec-1']),
    monthOf,
  });

  expect(items.map(i => i.kind)).toEqual(['month', 'swap', 'leg', 'leg']);
  expect(items.slice(2).map(i => (i.kind === 'leg' ? i.vt.txid : ''))).toEqual([
    HOP,
    DEPOSIT,
  ]);
});

test('Tests that a shielded memo deposit is one transaction under the swap, its vault payment and memo note added up, when the swap is open', () => {
  const r = record();
  const rows = [
    swapRow(r),
    vt(DEPOSIT, 2_000_010, ValueTransferKindEnum.Sent, {
      amount: 0,
      address: 'u1mayamemo',
    }),
    vt(DEPOSIT, 2_000_010, ValueTransferKindEnum.Sent, {
      amount: 0.01,
      address: 't1vault',
    }),
  ];

  const items = buildHistoryItems({
    rows,
    all: rows,
    records: [r],
    open: new Set(['rec-1']),
    monthOf,
  });

  expect(items.map(i => i.kind)).toEqual(['month', 'swap', 'leg']);
  const swap = items[1];
  expect(swap.kind === 'swap' && swap.legCount).toBe(1);
  const leg = items[2];
  expect(leg.kind === 'leg' && [leg.vt.amount, leg.vt.address]).toEqual([
    0.01,
    't1vault',
  ]);
});

const t = (key: string) => key;

test('Tests that a completed sell shows what it got on top and the ZEC that left under it', () => {
  const text = swapRowText({ record: record(), when: 'Oct 17', t });

  expect(text.title).toBe('history.swapped-to BTC');
  expect(text.top).toBe('+0.0095 BTC');
  expect(text.topTone).toBe('positive');
  expect(text.bottom).toBe('−1.5 ZEC');
});

test('Tests that a refunded swap shows what it cost and what came back when the provider reports it', () => {
  const text = swapRowText({
    record: record({
      status: SwapStatusEnum.Refunded,
      refundInfo: { refundedAmountText: '1.4975' },
    }),
    when: 'Oct 14',
    t,
  });

  expect(text.state).toEqual({
    text: 'history.state-refunded',
    tone: 'warning',
  });
  expect(text.top).toBe('−0.0025 ZEC');
  expect(text.bottom).toBe('history.refund-back 1.4975 ZEC');
});

test('Tests that a sent transfer is titled by its address and signed negative', () => {
  const text = transferRowText({
    vt: vt('d'.repeat(64), 1, ValueTransferKindEnum.Sent, { address: 'u1abc' }),
    when: 'Oct 16',
    currency: 'ZEC',
    usd: '$924.36',
    t,
  });

  expect(text.title).toBe('u1abc');
  expect(text.titleMono).toBe(true);
  expect(text.top).toBe('−1.5 ZEC');
  expect(text.bottom).toBe('$924.36');
});

test('Tests that a shield names the pool its funds went to when the transfer carries one', () => {
  const shieldT = (key: string) =>
    key === 'history.shield-line' ? 'Transparent → {pool}' : key;
  const lineOf = (poolType?: PoolEnum) =>
    transferRowText({
      vt: vt('e'.repeat(64), 1, ValueTransferKindEnum.Shield, { poolType }),
      when: 'Oct 24',
      currency: 'ZEC',
      usd: '',
      t: shieldT,
    }).line;

  expect(lineOf(PoolEnum.IronwoodPool)).toBe('Transparent → Ironwood · Oct 24');
  expect(lineOf(PoolEnum.OrchardPool)).toBe('Transparent → Orchard · Oct 24');
  expect(lineOf(undefined)).toBe('Oct 24');
});

test('Tests that a recent row reads in minutes and an older one by day', () => {
  const day = () => 'Oct 17';
  expect(shortWhen(1_000_000, 1_000_000 + 20_000, t, day)).toBe(
    'history.just-now',
  );
  expect(shortWhen(1_000_000, 1_000_000 + 12 * 60_000, t, day)).toBe(
    '12 history.min-ago',
  );
  expect(shortWhen(1_000_000, 1_000_000 + 3 * 3_600_000, t, day)).toBe(
    'Oct 17',
  );
});

test('Tests that a running swap sits above every month while it runs and goes back by date when it ends', () => {
  const older = record({
    recordId: 'rec-old',
    status: SwapStatusEnum.Processing,
    createdAtMs: 1_000_000_000,
    broadcast: undefined,
  });
  const newer = vt('d'.repeat(64), 2_000_000, ValueTransferKindEnum.Received);
  const rows = [newer, swapRow(older)];

  const running = buildHistoryItems({
    rows,
    all: rows,
    records: [older],
    open: new Set(),
    monthOf,
  });
  expect(running.map(i => i.kind)).toEqual(['swap', 'month', 'transfer']);

  const ended = buildHistoryItems({
    rows,
    all: rows,
    records: [{ ...older, status: SwapStatusEnum.Completed }],
    open: new Set(),
    monthOf,
  });
  expect(ended.map(i => i.kind)).toEqual([
    'month',
    'transfer',
    'month',
    'swap',
  ]);
});

test('Tests that a finished sale is titled with the contact name when its address is saved', () => {
  const text = swapRowText({
    record: record(),
    when: 'Oct 2',
    t: key => key,
    contactName: 'Marta',
  });
  expect(text.title).toBe('Marta');
  expect(text.line).toBe('history.swapped-to BTC · MayaChain · Oct 2');
});

test('Tests that a purchase whose payment the provider saw reads payment detected while a sale in flight reads swapping', () => {
  const seen = swapRowText({
    record: record({
      direction: SwapDirectionEnum.Inbound,
      status: SwapStatusEnum.Pending,
    }),
    when: 'Oct 2',
    t,
  });
  expect(seen.state?.text).toBe('history.state-payment-detected');

  const sale = swapRowText({
    record: record({ status: SwapStatusEnum.Pending }),
    when: 'Oct 2',
    t,
  });
  expect(sale.state?.text).toBe('history.state-swapping');
});

test('Tests that a purchase whose deposit was not detected reads grey with the ZEC it would have got struck through and the coin not sent under it', () => {
  const text = swapRowText({
    record: record({
      direction: SwapDirectionEnum.Inbound,
      status: SwapStatusEnum.Expired,
      sellAsset: {
        swapKitId: 'BTC.BTC',
        chain: 'BTC',
        symbol: 'BTC',
        ticker: 'BTC',
        chainId: 'bitcoin',
        decimals: 8,
      },
      receiveAsset: {
        swapKitId: 'ZEC.ZEC',
        chain: 'ZEC',
        symbol: 'ZEC',
        ticker: 'ZEC',
        chainId: 'zcash',
        decimals: 8,
      },
      sellAmountHumanDecimal: '0.03',
      expectedReceiveAmount: '12.5',
    }),
    when: 'Oct 2',
    t,
  });
  expect(text.state).toEqual({ text: 'history.state-expired', tone: 'muted' });
  expect(text.top).toBe('+12.5 ZEC');
  expect(text.topTone).toBe('muted');
  expect(text.topStrike).toBe(true);
  expect(text.bottom).toBe('history.swap-not-sent');
});

test('Tests that a purchase paid after its quote expired reads refunding in amber with the coin going back', () => {
  const text = swapRowText({
    record: record({
      direction: SwapDirectionEnum.Inbound,
      status: SwapStatusEnum.Pending,
      lateDepositAtMs: 1,
      observedDepositTxHash: 'ab'.repeat(32),
    }),
    when: 'Oct 2',
    t,
  });
  expect(text.state).toEqual({
    text: 'history.state-refunding',
    tone: 'warning',
  });
  expect(text.top).toBe('1.5 ZEC');
  expect(text.bottom).toBe('history.going-back');
});

test('Tests that a failed swap reads its amount struck through and grey, as a deposit not detected does', () => {
  const text = swapRowText({
    record: record({ status: SwapStatusEnum.Failed }),
    when: 'Oct 17',
    t,
  });

  expect(text.state).toEqual({ text: 'history.state-failed', tone: 'danger' });
  expect(text.topTone).toBe('muted');
  expect(text.topStrike).toBe(true);
});

test('Tests that a failed send reads its amount struck through and grey, and a sent one does not', () => {
  const failed = transferRowText({
    vt: vt(DEPOSIT, 2_000_010, ValueTransferKindEnum.Sent, {
      status: RPCValueTransfersStatusEnum.failed,
    }),
    when: 'Oct 17',
    currency: 'ZEC',
    usd: '',
    t,
  });
  const sent = transferRowText({
    vt: vt(DEPOSIT, 2_000_010),
    when: 'Oct 17',
    currency: 'ZEC',
    usd: '',
    t,
  });

  expect(failed.topTone).toBe('muted');
  expect(failed.topStrike).toBe(true);
  expect(sent.topStrike).toBeFalsy();
});

test('Tests that a failed shield reads its amount struck through and grey too', () => {
  const text = transferRowText({
    vt: vt(DEPOSIT, 2_000_010, ValueTransferKindEnum.Shield, {
      status: RPCValueTransfersStatusEnum.failed,
    }),
    when: 'Oct 17',
    currency: 'ZEC',
    usd: '',
    t,
  });

  expect(text.topTone).toBe('muted');
  expect(text.topStrike).toBe(true);
});
