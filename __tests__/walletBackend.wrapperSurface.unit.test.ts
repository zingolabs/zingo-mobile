/**
 * The one-call wrappers of walletUtils, table-driven: each forwards its
 * arguments to the wallet method, yields the typed value with zatoshi
 * amounts as numbers, and funnels a rejection into the typed error.
 */
jest.mock('@app/RPCModule', () =>
  require('../__mocks__/rpcModuleProxy').rpcModuleProxyMock(),
);

import {
  Pool,
  parseAddress as parseAddressFfi,
  serverLatestBlock,
  ZingoError,
  ZingoError_Tags,
} from 'zingo-ffi';
import { FfiResult } from '@app/walletBackend/ffi';
import {
  changeServer,
  checkMyAddress,
  confirmSend,
  createNewTransparentAddress,
  createNewUnifiedAddress,
  drainOrchard,
  getBalanceInfo,
  getLatestBlockServerInfo,
  getServerInfo,
  getSpendableBalanceWithAddress,
  getTotalMemobytesToAddress,
  getTotalSpendsToAddress,
  getTotalValueToAddress,
  parseAddress,
  planOrchardDrain,
  removeTransaction,
  sendPropose,
  setWalletSettings,
  shieldPropose,
} from '@app/walletBackend/utils/walletUtils';
import { RPCPerformanceLevelEnum } from '@app/walletBackend/enums/RPCPerformanceLevelEnum';
import { installMockWallet, MockWallet } from '../__mocks__/mockWallet';

type Case = {
  name: string;
  method: string;
  call: () => Promise<FfiResult<unknown>>;
  answer: unknown;
  expected: unknown;
  args?: unknown[];
};

const cases: Case[] = [
  {
    name: 'changeServer',
    method: 'changeServer',
    call: () => changeServer('https://next.example'),
    answer: undefined,
    expected: undefined,
    args: ['https://next.example'],
  },
  {
    name: 'changeServer to Offline',
    method: 'changeServer',
    call: () => changeServer(''),
    answer: undefined,
    expected: undefined,
    args: [undefined],
  },
  {
    name: 'getServerInfo',
    method: 'serverInfo',
    call: () => getServerInfo(),
    answer: { chainName: 'main', latestBlockHeight: 10n },
    expected: { chainName: 'main', latestBlockHeight: 10n },
  },
  {
    name: 'setWalletSettings',
    method: 'setSettings',
    call: () => setWalletSettings(RPCPerformanceLevelEnum.High, 3),
    answer: undefined,
    expected: undefined,
    args: [{ performance: 2, minConfirmations: 3 }],
  },
  {
    name: 'getBalanceInfo',
    method: 'balance',
    call: () => getBalanceInfo(),
    answer: { totalOrchardBalance: 1n },
    expected: { totalOrchardBalance: 1n },
  },
  {
    name: 'sendPropose',
    method: 'proposeSend',
    call: () => sendPropose([{ address: 'u1...', amount: 5000, memo: 'hi' }]),
    answer: {
      fee: 10_000n,
      sourcePools: [Pool.Orchard],
      destinationPools: [Pool.Ironwood],
    },
    expected: {
      fee: 10_000,
      sourcePools: ['orchard'],
      destinationPools: ['ironwood'],
    },
    args: [[{ address: 'u1...', amount: 5000n, memo: 'hi' }]],
  },
  {
    name: 'confirmSend',
    method: 'confirm',
    call: () => confirmSend(),
    answer: ['txid1'],
    expected: ['txid1'],
  },
  {
    name: 'shieldPropose',
    method: 'proposeShield',
    call: () => shieldPropose(),
    answer: { fee: 10_000n, valueToShield: 200_000n },
    expected: { fee: 10_000, valueToShield: 200_000 },
  },
  {
    name: 'planOrchardDrain',
    method: 'planDrain',
    call: () => planOrchardDrain(),
    answer: {
      transactions: [{ inputs: [5n], output: 4n, fee: 1n }],
      migrated: 4n,
      fee: 1n,
      residual: 0n,
    },
    expected: {
      transactions: [{ inputs: [5], output: 4, fee: 1 }],
      migrated: 4,
      fee: 1,
      residual: 0,
    },
  },
  {
    name: 'drainOrchard',
    method: 'drain',
    call: () => drainOrchard(),
    answer: { txids: ['t'], migrated: 4n, fee: 1n, residual: 0n },
    expected: { txids: ['t'], migrated: 4, fee: 1, residual: 0 },
  },
  {
    name: 'getSpendableBalanceWithAddress',
    method: 'spendableBalanceTo',
    call: () => getSpendableBalanceWithAddress('u1...', true),
    answer: 123n,
    expected: 123,
    args: ['u1...', true],
  },
  {
    name: 'getTotalValueToAddress',
    method: 'totalValueToAddress',
    call: () => getTotalValueToAddress(),
    answer: { totals: new Map([['u1', 5n]]) },
    expected: { u1: 5 },
  },
  {
    name: 'getTotalSpendsToAddress',
    method: 'totalSpendsToAddress',
    call: () => getTotalSpendsToAddress(),
    answer: { totals: new Map([['u1', 2n]]) },
    expected: { u1: 2 },
  },
  {
    name: 'getTotalMemobytesToAddress',
    method: 'totalMemobytesToAddress',
    call: () => getTotalMemobytesToAddress(),
    answer: { totals: new Map() },
    expected: {},
  },
  {
    name: 'createNewUnifiedAddress',
    method: 'newUnifiedAddress',
    call: () => createNewUnifiedAddress({ orchard: true, sapling: false }),
    answer: { encodedAddress: 'u1new' },
    expected: { encodedAddress: 'u1new' },
    args: [{ orchard: true, sapling: false }],
  },
  {
    name: 'createNewTransparentAddress',
    method: 'newTransparentAddress',
    call: () => createNewTransparentAddress(),
    answer: { encodedAddress: 't1new' },
    expected: { encodedAddress: 't1new' },
  },
  {
    name: 'removeTransaction',
    method: 'removeTransaction',
    call: () => removeTransaction('txid'),
    answer: undefined,
    expected: undefined,
    args: ['txid'],
  },
  {
    name: 'checkMyAddress',
    method: 'checkAddress',
    call: () => checkMyAddress('u1...'),
    answer: undefined,
    expected: undefined,
    args: ['u1...'],
  },
];

describe.each(cases)('$name', ({ method, call, answer, expected, args }) => {
  let wallet: MockWallet;
  beforeEach(() => {
    wallet = installMockWallet().wallet;
  });

  test('Tests that the typed value crosses when the wallet answers', async () => {
    wallet[method].mockResolvedValue(answer);
    await expect(call()).resolves.toEqual({ ok: true, value: expected });
    if (args !== undefined) {
      expect(wallet[method]).toHaveBeenCalledWith(...args);
    }
  });

  test('Tests that the rejection crosses as the typed error when the wallet refuses', async () => {
    wallet[method].mockRejectedValue(
      new ZingoError.Wallet({ detail: 'boom' }),
    );
    await expect(call()).resolves.toMatchObject({
      ok: false,
      error: { tag: ZingoError_Tags.Wallet, detail: 'boom' },
    });
  });
});

describe('the free functions', () => {
  test('Tests that getLatestBlockServerInfo yields the height when the server answers', async () => {
    (serverLatestBlock as jest.Mock).mockResolvedValue(2_500_000);
    await expect(getLatestBlockServerInfo('uri')).resolves.toEqual({
      ok: true,
      value: 2_500_000,
    });
  });

  test('Tests that parseAddress yields the typed error when the parser throws', () => {
    (parseAddressFfi as jest.Mock).mockImplementation(() => {
      throw new ZingoError.InvalidInput({ detail: 'not an address' });
    });
    expect(parseAddress('bad')).toMatchObject({
      ok: false,
      error: { tag: ZingoError_Tags.InvalidInput },
    });
  });
});
