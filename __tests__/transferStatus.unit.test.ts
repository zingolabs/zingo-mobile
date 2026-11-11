jest.mock('@app/RPCModule', () => ({ __esModule: true, default: {} }));

import { transferStatus } from '@app/utils/transferStatus';
import { ValueTransferStatus } from '@app/wallet/transfer';

const t = (key: string) =>
  key === 'history.confirming' ? 'Confirming {n} of {of}' : key;
const at = (confirmations: number) =>
  transferStatus({ status: 'confirmed', confirmations }, t);
const pending = (status: ValueTransferStatus) =>
  transferStatus({ status, confirmations: 0 }, t);

test('Tests that a transaction reads as confirming, n of the minimum, until it reaches it', () => {
  expect(at(1)).toEqual({ text: 'Confirming 1 of 3', tone: 'warning' });
  expect(at(2)).toEqual({ text: 'Confirming 2 of 3', tone: 'warning' });
  expect(at(3)).toEqual({ text: 'swap.tx-confirmed', tone: 'accent' });
});

test('Tests that a transaction reads as the status zingolib reports when it is not mined yet', () => {
  expect(pending('calculated')).toEqual({
    text: 'history.state-prepared',
    tone: 'warning',
  });
  expect(pending('transmitted')).toEqual({
    text: 'history.state-sending',
    tone: 'warning',
  });
  expect(pending('mempool')).toEqual({
    text: 'history.in-mempool',
    tone: 'warning',
  });
});

test('Tests that a failed transaction reads as failed whatever its confirmations', () => {
  expect(transferStatus({ status: 'failed', confirmations: 0 }, t)).toEqual({
    text: 'history.state-failed',
    tone: 'danger',
  });
});
