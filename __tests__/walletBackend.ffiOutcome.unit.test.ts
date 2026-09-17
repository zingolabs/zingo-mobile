/**
 * The wallet handle and the DataService reads: a missing wallet yields the
 * Closed tag, a rejected read reaches onError with its tag, and a resolved
 * read reaches the changed-callback.
 */
jest.mock('@app/RPCModule', () =>
  require('../__mocks__/rpcModuleProxy').rpcModuleProxyMock(),
);

import { currentWallet, version, ZingoError, ZingoError_Tags } from 'zingo-ffi';
import { callWallet, openWallet } from '@app/walletBackend/wallet';
import { DataService } from '@app/walletBackend/modules/DataService';
import { installMockWallet } from '../__mocks__/mockWallet';

const mockedCurrentWallet = currentWallet as jest.Mock;

afterEach(() => {
  jest.clearAllMocks();
  mockedCurrentWallet.mockReset();
});

describe('the wallet handle', () => {
  test('Tests that the handle is Closed when no wallet is open', () => {
    mockedCurrentWallet.mockReturnValue(undefined);
    expect(openWallet()).toMatchObject({
      ok: false,
      error: { tag: ZingoError_Tags.Closed },
    });
  });

  test('Tests that callWallet yields Closed without calling when no wallet is open', async () => {
    mockedCurrentWallet.mockReturnValue(undefined);
    const call = jest.fn();
    await expect(callWallet(call)).resolves.toMatchObject({
      ok: false,
      error: { tag: ZingoError_Tags.Closed },
    });
    expect(call).not.toHaveBeenCalled();
  });

  test('Tests that callWallet funnels the method rejection when the wallet refuses', async () => {
    const { wallet } = installMockWallet();
    wallet.balance.mockRejectedValue(new ZingoError.Offline());
    await expect(callWallet(w => w.balance())).resolves.toMatchObject({
      ok: false,
      error: { tag: ZingoError_Tags.Offline },
    });
  });
});

describe('DataService reads', () => {
  function makeDataService() {
    const onError = jest.fn();
    const onSyncError = jest.fn().mockResolvedValue(undefined);
    const config = {
      onError,
      onAddressesChanged: jest.fn(),
      onBalanceChanged: jest.fn(),
      onInfoChanged: jest.fn(),
      onValueTransfersChanged: jest.fn(),
      onMessagesChanged: jest.fn(),
      onZingolibVersionChanged: jest.fn(),
      readOnly: false,
      server: { uri: 'https://server.example' },
    } as unknown as ConstructorParameters<typeof DataService>[0];
    const dataService = new DataService(config);
    dataService.onSyncError = onSyncError;
    return { dataService, onError, onSyncError, config };
  }

  const reads: Array<[string, (ds: DataService) => Promise<unknown>]> = [
    ['latestBlockWallet', ds => ds.fetchWalletHeight()],
    ['unifiedAddresses', ds => ds.fetchAddresses()],
    ['spendableBalance', ds => ds.fetchTotalBalance()],
    ['valueTransfers', ds => ds.fetchTandZandOValueTransfers()],
    ['messages', ds => ds.fetchTandZandOMessages()],
  ];

  test.each(reads)(
    'Tests that a rejected %s read reaches onError with its tag when the wallet refuses',
    async (method, read) => {
      const { wallet } = installMockWallet();
      wallet[method].mockRejectedValue(
        new ZingoError.IndexerUnreachable({ detail: 'dial failed' }),
      );
      const { dataService, onError, onSyncError } = makeDataService();
      await read(dataService);
      expect(onError).toHaveBeenCalledWith(
        expect.stringContaining('IndexerUnreachable: dial failed'),
      );
      expect(onSyncError).toHaveBeenCalledTimes(1);
    },
  );

  test('Tests that the transparent address rejection reaches onError when the unified read succeeds', async () => {
    const { wallet } = installMockWallet();
    wallet.unifiedAddresses.mockResolvedValue([]);
    wallet.transparentAddresses.mockRejectedValue(new ZingoError.Closed());
    const { dataService, onError } = makeDataService();
    await dataService.fetchAddresses();
    expect(onError).toHaveBeenCalledWith(expect.stringContaining('Closed'));
  });

  test('Tests that isSaveRequired answers false when the wallet refuses', async () => {
    const { wallet } = installMockWallet();
    wallet.isSaveRequired.mockRejectedValue(new ZingoError.Closed());
    const { dataService, onError } = makeDataService();
    await expect(dataService.getWalletSaveRequired()).resolves.toBe(false);
    expect(onError).toHaveBeenCalled();
  });

  test('Tests that the version reaches the changed-callback when the library answers', async () => {
    (version as jest.Mock).mockReturnValue('2.0.0');
    const { dataService, onError, config } = makeDataService();
    await dataService.fetchZingolibVersion();
    expect(onError).not.toHaveBeenCalled();
    expect(config.onZingolibVersionChanged).toHaveBeenCalledWith('2.0.0');
  });

  test('Tests that an Offline server info publishes empty info without an error when the wallet has no server', async () => {
    const { wallet } = installMockWallet();
    wallet.serverInfo.mockRejectedValue(new ZingoError.Offline());
    const { dataService, onError, config } = makeDataService();
    await dataService.fetchInfoAndServerHeight();
    expect(onError).not.toHaveBeenCalled();
    expect(config.onInfoChanged).toHaveBeenCalledWith(
      expect.objectContaining({ latestBlock: 0, serverUri: '' }),
    );
  });

  test('Tests that the balance reaches the callback in ZEC when both reads answer', async () => {
    const { wallet } = installMockWallet();
    wallet.spendableBalance.mockResolvedValue(150_000_000n);
    wallet.balance.mockResolvedValue({
      confirmedIronwoodBalance: 100_000_000n,
      unconfirmedIronwoodBalance: 0n,
      totalIronwoodBalance: 100_000_000n,
      confirmedOrchardBalance: 50_000_000n,
      unconfirmedOrchardBalance: undefined,
      totalOrchardBalance: 50_000_000n,
      confirmedSaplingBalance: undefined,
      unconfirmedSaplingBalance: undefined,
      totalSaplingBalance: undefined,
      confirmedTransparentBalance: 0n,
      unconfirmedTransparentBalance: 0n,
      totalTransparentBalance: 0n,
    });
    const { dataService, config } = makeDataService();
    await dataService.fetchTotalBalance();
    expect(config.onBalanceChanged).toHaveBeenCalledWith(
      expect.objectContaining({
        totalSpendableBalance: 1.5,
        totalIronwoodBalance: 1,
        confirmedOrchardBalance: 0.5,
        totalSaplingBalance: 0,
      }),
    );
  });
});
