jest.mock('@app/RPCModule', () =>
  require('../__mocks__/rpcModuleProxy').rpcModuleProxyMock(),
);

import RPCModule from '@app/RPCModule';
import { TransactionService } from '@app/walletBackend/modules/TransactionService';
import {
  DepositAfterDeshieldError,
  heldDeshield,
} from '@app/swap/depositAfterDeshield';

const bridge = RPCModule as unknown as Record<string, jest.Mock>;

const service = () =>
  new TransactionService(
    { keepAwake: jest.fn() } as never,
    {
      clearTimers: jest.fn(async () => {}),
      refreshSync: jest.fn(async () => {}),
      configure: jest.fn(async () => {}),
    } as never,
  );

const VAULT = 't1VaultAddressForTheProvider000000';
const MEMO = new TextEncoder().encode('=:BTC.BTC:bc1qdest:0/1/0');

beforeEach(() => {
  jest.clearAllMocks();
  bridge.sendProcess.mockResolvedValue(JSON.stringify({ fee: 10000 }));
  bridge.confirmProcess.mockResolvedValue(
    JSON.stringify({ txids: ['deshield', 'deposit'] }),
  );
  bridge.sendSwapDepositProcess.mockResolvedValue(
    JSON.stringify({ txids: ['deshield', 'deposit'] }),
  );
});

test('Tests that a memo-bearing deposit takes the native entry and answers the txids in order when the provider wants an OP_RETURN', async () => {
  const txids = await service().sendSwapDeposit({
    depositAddress: VAULT,
    amountAtomic: 150_000_000,
    memoBytes: MEMO,
  });

  expect(txids).toEqual(['deshield', 'deposit']);
  expect(bridge.sendSwapDepositProcess).toHaveBeenCalledWith(
    VAULT,
    '150000000',
    Buffer.from(MEMO).toString('hex'),
  );
  expect(bridge.sendProcess).not.toHaveBeenCalled();
});

test('Tests that a deposit without a memo is an ordinary send when the provider checks no sender', async () => {
  bridge.confirmProcess.mockResolvedValueOnce(
    JSON.stringify({ txids: ['deposit'] }),
  );

  const txids = await service().sendSwapDeposit({
    depositAddress: VAULT,
    amountAtomic: 150_000_000,
  });

  expect(txids).toEqual(['deposit']);
  expect(bridge.sendProcess).toHaveBeenCalledWith(
    JSON.stringify([{ address: VAULT, amount: 150_000_000 }]),
  );
  expect(bridge.sendSwapDepositProcess).not.toHaveBeenCalled();
});

test('Tests that the native entry carries an empty memo when the provider checks the source address alone', async () => {
  await service().sendSwapDeposit({
    depositAddress: VAULT,
    amountAtomic: 150_000_000,
    viaSourceAddress: true,
  });

  expect(bridge.sendSwapDepositProcess).toHaveBeenCalledWith(
    VAULT,
    '150000000',
    '',
  );
});

test("Tests that Maya's shielded memo rides as a 0 ZEC note beside the payment when the provider names a memo address, on Hermes without TextDecoder", async () => {
  // Hermes has no TextDecoder; Node does, so take it away here.
  const decoder = global.TextDecoder;
  delete (global as { TextDecoder?: unknown }).TextDecoder;
  bridge.confirmProcess.mockResolvedValueOnce(
    JSON.stringify({ txids: ['deposit'] }),
  );

  await service().sendSwapDeposit({
    depositAddress: VAULT,
    amountAtomic: 150_000_000,
    memoBytes: MEMO,
    shieldedMemoAddress: 'u1mayamemoaddress',
  });

  expect(bridge.sendProcess).toHaveBeenCalledWith(
    JSON.stringify([
      { address: VAULT, amount: 150_000_000 },
      {
        address: 'u1mayamemoaddress',
        amount: 0,
        memo: '=:BTC.BTC:bc1qdest:0/1/0',
      },
    ]),
  );
  expect(bridge.sendSwapDepositProcess).not.toHaveBeenCalled();
  global.TextDecoder = decoder;
});

test('Tests that a refused deposit rejects with the native error when the entry answers an error document', async () => {
  bridge.sendSwapDepositProcess.mockResolvedValueOnce(
    JSON.stringify({ error: 'Error: send after deshield: ...' }),
  );

  await expect(
    service().sendSwapDeposit({
      depositAddress: VAULT,
      amountAtomic: 1,
      memoBytes: MEMO,
    }),
  ).rejects.toThrow('send after deshield');
});

const HELD = 'ab'.repeat(32);
const rejection = (code: string, message: string) =>
  Object.assign(new Error(message), { code });

test('Tests that a deposit whose vault payment fails after the deshield rejects typed and holds the deshield when the FFI says SendAfterDeshield', async () => {
  bridge.sendSwapDepositProcess.mockRejectedValueOnce(
    rejection(
      'SendAfterDeshield',
      `Error: send after deshield: OP_RETURN send failed after the deshield ${HELD} was transmitted. timeout`,
    ),
  );

  const sent = service().sendSwapDeposit({
    depositAddress: VAULT,
    amountAtomic: 150_000_000,
    memoBytes: MEMO,
  });

  await expect(sent).rejects.toBeInstanceOf(DepositAfterDeshieldError);
  await expect(sent).rejects.toMatchObject({
    kind: 'failed',
    deshieldTxId: HELD,
  });
  expect(heldDeshield(HELD)).toBe(true);
});

test('Tests that a resumed deposit releases the held deshield when its vault payment goes', async () => {
  bridge.confirmProcess.mockResolvedValueOnce(
    JSON.stringify({ txids: ['deposit'] }),
  );
  expect(await service().resumeSwapDeposit()).toEqual(['deposit']);
  expect(heldDeshield(HELD)).toBe(false);
});

test('Tests that any other deposit rejection passes through as it came when the FFI code is not SendAfterDeshield', async () => {
  const other = rejection('Send', 'Error: send: insufficient funds');
  bridge.sendSwapDepositProcess.mockRejectedValueOnce(other);

  await expect(
    service().sendSwapDeposit({
      depositAddress: VAULT,
      amountAtomic: 150_000_000,
      memoBytes: MEMO,
    }),
  ).rejects.toBe(other);
});
