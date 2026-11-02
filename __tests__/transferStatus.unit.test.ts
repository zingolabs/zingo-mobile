jest.mock('@app/RPCModule', () => ({ __esModule: true, default: {} }));

import { transferStatus } from '@app/utils/transferStatus';
import { RPCValueTransfersStatusEnum } from '@app/walletBackend/enums/RPCValueTransfersStatusEnum';

const t = (key: string) =>
  key === 'history.confirming' ? 'Confirming {n} of {of}' : key;
const at = (confirmations: number) =>
  transferStatus(
    { status: RPCValueTransfersStatusEnum.confirmed, confirmations },
    t,
  );

test('Tests that a transaction reads as confirming, n of the minimum, until it reaches it', () => {
  expect(at(0)).toEqual({ text: 'history.in-mempool', tone: 'warning' });
  expect(at(1)).toEqual({ text: 'Confirming 1 of 3', tone: 'warning' });
  expect(at(2)).toEqual({ text: 'Confirming 2 of 3', tone: 'warning' });
  expect(at(3)).toEqual({ text: 'swap.tx-confirmed', tone: 'accent' });
});

test('Tests that a failed transaction reads as failed whatever its confirmations', () => {
  expect(
    transferStatus(
      { status: RPCValueTransfersStatusEnum.failed, confirmations: 0 },
      t,
    ),
  ).toEqual({ text: 'history.state-failed', tone: 'danger' });
});
