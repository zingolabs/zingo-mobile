/**
 * The wallet lifecycle and the one-off wrappers in walletUtils: opening
 * writes the file, a failed write surfaces, the file probes answer booleans,
 * and the secret-material reads answer undefined when the wallet refuses.
 */
jest.mock('@app/RPCModule', () =>
  require('../__mocks__/rpcModuleProxy').rpcModuleProxyMock(),
);

import {
  Chain,
  currentWallet,
  Wallet,
  WalletKind,
  ZingoError,
  ZingoError_Tags,
} from 'zingo-ffi';
import RPCModule from '@app/RPCModule';
import { ChainNameEnum } from '@app/AppState';
import { RPCPerformanceLevelEnum } from '@app/walletBackend/enums/RPCPerformanceLevelEnum';
import {
  createNewWallet,
  doSave,
  doSaveBackup,
  fetchWallet,
  getZecPrice,
  isWalletAddress,
  loadExistingWallet,
  restoreExistingWalletBackup,
  restoreWalletFromSeed,
  walletBackupExists,
  walletExists,
  walletProfile,
} from '@app/walletBackend/utils/walletUtils';
import { installMockWallet, mockWallet } from '../__mocks__/mockWallet';

const bridge = RPCModule as unknown as Record<string, jest.Mock>;
const constructors = Wallet as unknown as Record<string, jest.Mock>;
const mockedCurrentWallet = currentWallet as jest.Mock;

const hostRejection = (code: string, message: string) =>
  Object.assign(new Error(message), { code });

afterEach(() => {
  jest.clearAllMocks();
  mockedCurrentWallet.mockReset();
});

describe('opening a wallet', () => {
  test('Tests that createNewWallet opens with the built connection and writes the file when both succeed', async () => {
    const { handle } = mockWallet();
    constructors.openNew.mockResolvedValue(handle);
    bridge.saveWallet.mockResolvedValue(undefined);

    const opened = await createNewWallet(
      'https://server.example',
      0,
      'main',
      RPCPerformanceLevelEnum.High,
      3,
    );

    expect(opened.ok && opened.value).toBe(handle);
    expect(constructors.openNew).toHaveBeenCalledWith(
      expect.objectContaining({
        serverUri: 'https://server.example',
        chain: Chain.Main,
        minConfirmations: 3,
      }),
      0,
    );
    expect(bridge.saveWallet).toHaveBeenCalledTimes(1);
  });

  test('Tests that a regtest hint carries its schedule and an empty uri reads as Offline when opening', async () => {
    const { handle } = mockWallet();
    constructors.openFromSeed.mockResolvedValue(handle);
    bridge.saveWallet.mockResolvedValue(undefined);

    await restoreWalletFromSeed(
      'seed words',
      100,
      '',
      'regtest:nu6=1',
      RPCPerformanceLevelEnum.Low,
      1,
    );

    expect(constructors.openFromSeed).toHaveBeenCalledWith(
      expect.objectContaining({
        serverUri: undefined,
        chain: Chain.Regtest,
        regtestSchedule: 'nu6=1',
      }),
      'seed words',
      100,
    );
  });

  test('Tests that the open rejection surfaces typed and the file stays unwritten when the constructor throws', async () => {
    constructors.openFromSeed.mockRejectedValue(
      new ZingoError.InvalidMnemonic({ detail: 'word 3 is unknown' }),
    );

    const opened = await restoreWalletFromSeed(
      'seed',
      1,
      'uri',
      'main',
      RPCPerformanceLevelEnum.Medium,
      1,
    );

    expect(opened).toMatchObject({
      ok: false,
      error: { tag: ZingoError_Tags.InvalidMnemonic, detail: 'word 3 is unknown' },
    });
    expect(bridge.saveWallet).not.toHaveBeenCalled();
  });

  test('Tests that a failed file write surfaces as the Save tag when the open succeeded', async () => {
    constructors.openNew.mockResolvedValue(mockWallet().handle);
    bridge.saveWallet.mockRejectedValue(hostRejection('Save', 'disk full'));

    await expect(
      createNewWallet('uri', 0, 'main', RPCPerformanceLevelEnum.Medium, 1),
    ).resolves.toEqual({
      ok: false,
      error: { tag: 'Save', detail: 'disk full' },
    });
  });

  test('Tests that loadExistingWallet yields the current wallet when the file module loads it', async () => {
    const { handle } = installMockWallet();
    bridge.loadExistingWallet.mockResolvedValue(undefined);

    const loaded = await loadExistingWallet(
      'uri',
      'main',
      RPCPerformanceLevelEnum.Medium,
      3,
    );
    expect(loaded.ok && loaded.value).toBe(handle);
    expect(bridge.loadExistingWallet).toHaveBeenCalledWith(
      'uri',
      'main',
      'Medium',
      3,
    );
  });

  test('Tests that loadExistingWallet yields the load tag when the file module rejects', async () => {
    bridge.loadExistingWallet.mockRejectedValue(
      hostRejection('Unreadable', 'bad magic'),
    );
    await expect(
      loadExistingWallet('uri', 'main', RPCPerformanceLevelEnum.Medium, 3),
    ).resolves.toEqual({
      ok: false,
      error: { tag: 'Unreadable', detail: 'bad magic' },
    });
  });

  test('Tests that loadExistingWallet yields Closed when the module resolves without registering a wallet', async () => {
    mockedCurrentWallet.mockReturnValue(undefined);
    bridge.loadExistingWallet.mockResolvedValue(undefined);
    await expect(
      loadExistingWallet('uri', 'main', RPCPerformanceLevelEnum.Medium, 3),
    ).resolves.toMatchObject({
      ok: false,
      error: { tag: ZingoError_Tags.Closed },
    });
  });
});

describe('the file probes and writes', () => {
  test.each([
    ['walletExists', walletExists],
    ['walletBackupExists', walletBackupExists],
  ])(
    'Tests that %s answers the module boolean and false when the module rejects',
    async (member, probe) => {
      bridge[member].mockResolvedValueOnce(true);
      await expect(probe()).resolves.toBe(true);
      bridge[member].mockResolvedValueOnce(false);
      await expect(probe()).resolves.toBe(false);
      bridge[member].mockRejectedValueOnce(hostRejection('Host', 'boom'));
      await expect(probe()).resolves.toBe(false);
    },
  );

  test.each([
    ['doSave', 'saveWallet', doSave],
    ['doSaveBackup', 'saveWalletBackup', doSaveBackup],
  ])(
    'Tests that %s answers true on resolution and false when the write rejects',
    async (_name, member, write) => {
      bridge[member].mockResolvedValueOnce(undefined);
      await expect(write()).resolves.toBe(true);
      bridge[member].mockRejectedValueOnce(hostRejection('Save', 'disk full'));
      await expect(write()).resolves.toBe(false);
    },
  );

  test('Tests that a rejected backup restore reads as failure when the module rejects', async () => {
    bridge.restoreExistingWalletBackup.mockRejectedValueOnce(
      hostRejection('Unreadable', 'could not read the backup'),
    );
    await expect(restoreExistingWalletBackup()).resolves.toEqual({
      ok: false,
      error: { tag: 'Unreadable', detail: 'could not read the backup' },
    });
  });
});

describe('getZecPrice', () => {
  test('Tests that the price crosses when the wallet answers', async () => {
    const { wallet } = installMockWallet();
    wallet.zecPrice.mockResolvedValue(42.5);
    await expect(getZecPrice()).resolves.toEqual({ price: 42.5, error: '' });
  });

  test('Tests that the price reads -1 with the detail when the wallet refuses', async () => {
    const { wallet } = installMockWallet();
    wallet.zecPrice.mockRejectedValue(
      new ZingoError.PriceUnavailable({ detail: 'oracle down' }),
    );
    await expect(getZecPrice()).resolves.toEqual({
      price: -1,
      error: 'oracle down',
    });
  });
});

describe('isWalletAddress', () => {
  test('Tests that an address reads as own only when the wallet describes it', async () => {
    const { wallet } = installMockWallet();
    wallet.checkAddress.mockResolvedValueOnce({ tag: 'Sapling' });
    await expect(isWalletAddress('z1...')).resolves.toBe(true);
    wallet.checkAddress.mockResolvedValueOnce(undefined);
    await expect(isWalletAddress('u1...')).resolves.toBe(false);
    wallet.checkAddress.mockRejectedValueOnce(
      new ZingoError.InvalidInput({ detail: 'bad address' }),
    );
    await expect(isWalletAddress('bad')).resolves.toBe(false);
  });
});

describe('fetchWallet', () => {
  test('Tests that the seed material crosses when the wallet holds a seed', async () => {
    const { wallet } = installMockWallet();
    wallet.seed.mockResolvedValue({
      seedPhrase: 'a b c',
      birthday: 42,
      noOfAccounts: 1,
      chain: Chain.Main,
    });
    await expect(fetchWallet(false)).resolves.toEqual({
      seed: 'a b c',
      birthday: 42,
    });
  });

  test('Tests that the viewing key crosses when the wallet is read-only', async () => {
    const { wallet } = installMockWallet();
    wallet.viewingKey.mockResolvedValue({
      ufvk: 'uview1...',
      birthday: 42,
      chain: Chain.Main,
    });
    await expect(fetchWallet(true)).resolves.toEqual({
      ufvk: 'uview1...',
      birthday: 42,
    });
  });

  test('Tests that the material reads undefined when the wallet refuses', async () => {
    const { wallet } = installMockWallet();
    wallet.seed.mockRejectedValue(new ZingoError.MnemonicNotFound());
    await expect(fetchWallet(false)).resolves.toBeUndefined();
  });
});

describe('walletProfile', () => {
  test('Tests that a viewing-key wallet reads read-only with its pools when the kind carries them', async () => {
    const { wallet } = installMockWallet();
    wallet.walletKind.mockResolvedValue(
      new WalletKind.ViewingKey({
        transparent: false,
        sapling: true,
        orchard: true,
      }),
    );
    wallet.chain.mockResolvedValue(Chain.Test);
    await expect(walletProfile()).resolves.toEqual({
      ok: true,
      value: {
        readOnly: true,
        orchardPool: true,
        saplingPool: true,
        transparentPool: false,
        chainName: ChainNameEnum.testChainName,
      },
    });
  });

  test('Tests that a seed wallet reads spendable on every pool when the kind is Seed', async () => {
    const { wallet } = installMockWallet();
    wallet.walletKind.mockResolvedValue(new WalletKind.Seed());
    wallet.chain.mockResolvedValue(Chain.Main);
    await expect(walletProfile()).resolves.toMatchObject({
      ok: true,
      value: { readOnly: false, orchardPool: true, transparentPool: true },
    });
  });
});
