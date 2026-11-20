jest.mock('@app/RPCModule', () =>
  require('../__mocks__/rpcModuleProxy').rpcModuleProxyMock(),
);

import { leftTransparentFunds } from '@screens/Swap/components/ShieldNote';
import { PoolEnum, ValueTransferKindEnum } from '@app/AppState';
import type { ValueTransferType } from '@app/AppState';
import { RPCValueTransfersStatusEnum } from '@app/walletBackend/enums/RPCValueTransfersStatusEnum';

const vt = (
  kind: ValueTransferKindEnum,
  poolType: PoolEnum,
): ValueTransferType => ({
  txid: 'tx',
  kind,
  confirmations: 3,
  blockheight: 1,
  time: 0,
  amount: 1,
  poolType,
  status: RPCValueTransfersStatusEnum.confirmed,
});

test.each([
  ['a receive', ValueTransferKindEnum.Received],
  ['a send to self', ValueTransferKindEnum.SendToSelf],
  ['a memo to self', ValueTransferKindEnum.MemoToSelf],
])(
  'Tests that %s offers to shield when it landed in the transparent pool',
  (_case, kind) => {
    expect(leftTransparentFunds(vt(kind, PoolEnum.TransparentPool))).toBe(true);
  },
);

test('Tests that a receive offers nothing when it landed in a shielded pool', () => {
  expect(
    leftTransparentFunds(
      vt(ValueTransferKindEnum.Received, PoolEnum.OrchardPool),
    ),
  ).toBe(false);
});

test('Tests that a send offers nothing when it went to a transparent address of someone else', () => {
  expect(
    leftTransparentFunds(
      vt(ValueTransferKindEnum.Sent, PoolEnum.TransparentPool),
    ),
  ).toBe(false);
});
