import {
  AddressBookFileClass,
  ChainNameEnum,
  ValueTransferKindEnum,
} from '@app/AppState';
import ValueTransferType from '@app/AppState/types/ValueTransferType';
import { RPCValueTransfersStatusEnum } from '@app/walletBackend/enums/RPCValueTransfersStatusEnum';
import {
  buildInsight,
  groupTotal,
  niceTop,
  OTHERS_COLOR,
} from '@screens/Insight/insightModel';

const NOW = new Date(2026, 9, 14, 12);
const DAY = 24 * 60 * 60;
const nowSec = NOW.getTime() / 1000;

const sent = (
  address: string,
  amount: number,
  daysAgo: number,
  txid = `${address}-${daysAgo}`,
  memo = '',
): ValueTransferType => ({
  txid,
  kind: ValueTransferKindEnum.Sent,
  confirmations: 10,
  blockheight: 1,
  time: nowSec - daysAgo * DAY,
  address,
  amount,
  memos: memo ? [memo] : [],
  status: RPCValueTransfersStatusEnum.confirmed,
});

const ana = new AddressBookFileClass(
  'Ana',
  'u1ana',
  '#123456',
  false,
  ChainNameEnum.mainChainName,
  'ZEC',
);

test('Tests that the five largest recipients keep their own group and the rest join Others when more than five were paid.', () => {
  const transfers = ['a', 'b', 'c', 'd', 'e', 'f', 'g'].map((a, i) =>
    sent(`u1${a}`, 10 - i, 1),
  );
  const insight = buildInsight(transfers, [], NOW);
  expect(insight.groups).toHaveLength(6);
  expect(insight.groups[0]).toMatchObject({
    kind: 'recipient',
    address: 'u1a',
  });
  expect(insight.groups[5]).toEqual({
    kind: 'others',
    count: 2,
    color: OTHERS_COLOR,
  });
  expect(groupTotal(insight, 5, 0, insight.weeks - 1).amount).toBe(9);
});

test('Tests that a contact keeps its name and color when the book holds its address.', () => {
  const insight = buildInsight([sent('u1ana', 1, 1)], [ana], NOW);
  expect(insight.groups[0]).toMatchObject({
    name: 'Ana',
    contact: true,
    color: '#123456',
  });
});

test('Tests that sends land in their week and receipts stay out when the history mixes both.', () => {
  const received = {
    ...sent('u1x', 5, 1),
    kind: ValueTransferKindEnum.Received,
  };
  const insight = buildInsight(
    [sent('u1x', 1, 1, 't1', 'hi'), sent('u1x', 2, 20), received],
    [],
    NOW,
  );
  const last = insight.weeks - 1;
  expect(insight.weeks).toBe(4);
  expect(insight.cells[0][last]).toEqual({ amount: 1, sends: 1, bytes: 2 });
  expect(insight.cells[0][last - 2].amount).toBe(2);
});

test('Tests that one transaction counts as one send per recipient when it has several outputs to that recipient.', () => {
  const insight = buildInsight(
    [sent('u1x', 1, 1, 'same'), sent('u1x', 1, 1, 'same')],
    [],
    NOW,
  );
  expect(insight.cells[0][insight.weeks - 1].sends).toBe(1);
});

test('Tests that the axis top rounds up to 1, 2, 2.5 or 5 times a power of ten when the metric is the amount.', () => {
  expect(niceTop(1.7, 'amount')).toBe(2);
  expect(niceTop(2.2, 'amount')).toBe(2.5);
  expect(niceTop(3, 'sends')).toBe(4);
});
