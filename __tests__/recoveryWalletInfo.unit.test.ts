/**
 * @format
 */

// The service reaches react-native only for Platform.OS, to pick the keychain
// options profile; the rest of the module is irrelevant here.
jest.mock('react-native', () => ({ Platform: { OS: 'ios' } }));

import type * as Keychain from 'react-native-keychain';
import type * as RecoveryWalletInfo from '@app/services/recoveryWalletInfo';
import type WalletType from '@app/AppState/types/WalletType';

// The service remembers the last save and the last read in module state, so
// each test takes a fresh copy of it — and of the keychain mock the fresh copy
// binds to. Reaching for the module at the top of the file instead would make
// the suite pass only in the order it happens to be written in.
const load = (): {
  keychain: jest.Mocked<typeof Keychain>;
  service: typeof RecoveryWalletInfo;
} => ({
  keychain: require('react-native-keychain') as jest.Mocked<typeof Keychain>,
  service:
    require('@app/services/recoveryWalletInfo') as typeof RecoveryWalletInfo,
});

// What the library hands back on a successful write. Through unknown because
// the real STORAGE_TYPE enum is a value, and this file only imports types.
const written = {
  service: 'test',
  storage: 'AES_GCM_NO_AUTH',
} as unknown as Awaited<ReturnType<typeof Keychain.setGenericPassword>>;

describe('recoveryWalletInfo - is the device keeping this wallet?', () => {
  beforeEach(() => {
    jest.resetModules();
    jest.clearAllMocks();
  });

  const keys = { seed: 'twenty four words', birthday: 1 };
  const entry = (payload: object) =>
    ({
      username: 'ZINGO_SEED_BIRTHDAY',
      service: 'ZINGO',
      password: JSON.stringify(payload),
      storage: 'AES_GCM_NO_AUTH',
    }) as unknown as Awaited<ReturnType<typeof Keychain.getGenericPassword>>;

  test('the entry holds this wallet: nothing to warn about', async () => {
    const { keychain, service } = load();
    keychain.getGenericPassword.mockResolvedValue(entry(keys));

    await expect(service.recoveryWalletInfoIsFailing(keys)).resolves.toBe(
      false,
    );
  });

  test('an empty keychain is a failure for a wallet that has keys', async () => {
    const { keychain, service } = load();
    keychain.getGenericPassword.mockResolvedValue(false);

    await expect(service.recoveryWalletInfoIsFailing(keys)).resolves.toBe(true);
  });

  test('somebody else-s entry is a failure: this wallet is not backed up', async () => {
    const { keychain, service } = load();
    keychain.getGenericPassword.mockResolvedValue(
      entry({ seed: 'someone else-s words', birthday: 2 }),
    );

    await expect(service.recoveryWalletInfoIsFailing(keys)).resolves.toBe(true);
  });

  test('the same seed on another birthday is not this wallet either', async () => {
    const { keychain, service } = load();
    keychain.getGenericPassword.mockResolvedValue(
      entry({ seed: 'twenty four words', birthday: 500000 }),
    );

    await expect(service.recoveryWalletInfoIsFailing(keys)).resolves.toBe(true);
  });

  test('a device that will not answer is a failure whatever is stored', async () => {
    const { keychain, service } = load();
    keychain.getGenericPassword.mockRejectedValue(new Error('keystore gone'));

    await expect(service.recoveryWalletInfoIsFailing(keys)).resolves.toBe(true);
  });

  test('a wallet with no keys of its own: an empty keychain is correct', async () => {
    const { keychain, service } = load();
    keychain.getGenericPassword.mockResolvedValue(false);

    await expect(service.recoveryWalletInfoIsFailing(null)).resolves.toBe(
      false,
    );
  });

  test('a wallet with no keys of its own ignores the entry left behind', async () => {
    const { keychain, service } = load();
    // the previous wallet's, and no screen will show it to this one
    keychain.getGenericPassword.mockResolvedValue(
      entry({ seed: 'someone else-s words', birthday: 2 }),
    );

    await expect(service.recoveryWalletInfoIsFailing(null)).resolves.toBe(
      false,
    );
  });

  test('a wallet with no keys of its own still reports a silent device', async () => {
    const { keychain, service } = load();
    keychain.getGenericPassword.mockRejectedValue(new Error('keystore gone'));

    await expect(service.recoveryWalletInfoIsFailing(null)).resolves.toBe(true);
  });

  test('the answer is asked of the device every time, never remembered', async () => {
    const { keychain, service } = load();
    // a save that fails leaves nothing behind: the next question is answered
    // by what the device holds, and here it holds this wallet
    keychain.setGenericPassword.mockResolvedValue(false);
    keychain.resetGenericPassword.mockResolvedValue(true);
    keychain.getGenericPassword.mockResolvedValue(entry(keys));

    await service.saveRecoveryWalletInfo(keys);

    await expect(service.recoveryWalletInfoIsFailing(keys)).resolves.toBe(
      false,
    );
  });
});

describe('recoveryWalletInfo - reading, and what a silent device means', () => {
  beforeEach(() => {
    jest.resetModules();
    jest.clearAllMocks();
  });

  const entry = (password: string) =>
    ({
      username: 'ZINGO_SEED_BIRTHDAY',
      service: 'ZINGO',
      password,
      storage: 'AES_GCM_NO_AUTH',
    }) as unknown as Awaited<ReturnType<typeof Keychain.getGenericPassword>>;

  test('an entry the device hands over comes back parsed, and answered', async () => {
    const { keychain, service } = load();
    keychain.getGenericPassword.mockResolvedValue(
      entry(JSON.stringify({ seed: 'twenty four words', birthday: 7 })),
    );

    await expect(service.readRecoveryWalletInfo()).resolves.toEqual({
      answered: true,
      keys: { seed: 'twenty four words', birthday: 7 },
    });
  });

  test('an empty keychain is an answer: there is nothing worth keeping', async () => {
    const { keychain, service } = load();
    keychain.getGenericPassword.mockResolvedValue(false);

    await expect(service.readRecoveryWalletInfo()).resolves.toEqual({
      answered: true,
      keys: {},
    });
  });

  test('a payload nothing can parse is an answer too', async () => {
    const { keychain, service } = load();
    keychain.getGenericPassword.mockResolvedValue(entry('not json at all'));

    await expect(service.readRecoveryWalletInfo()).resolves.toEqual({
      answered: true,
      keys: {},
    });
  });

  test('a device that throws answers nothing, and the caller learns that', async () => {
    const { keychain, service } = load();
    keychain.getGenericPassword.mockRejectedValue(new Error('keystore busy'));

    await expect(service.readRecoveryWalletInfo()).resolves.toEqual({
      answered: false,
      keys: {},
    });
  });
});

describe('recoveryWalletInfo - the write looks before it leaps', () => {
  beforeEach(() => {
    jest.resetModules();
    jest.clearAllMocks();
  });

  const stored = (keys: object) =>
    ({
      username: 'ZINGO_SEED_BIRTHDAY',
      service: 'ZINGO',
      password: JSON.stringify(keys),
      storage: 'AES_GCM_NO_AUTH',
    }) as unknown as Awaited<ReturnType<typeof Keychain.getGenericPassword>>;

  const keys = { seed: 'twenty four words', birthday: 1 };

  test('an entry that already holds these keys is left alone', async () => {
    const { keychain, service } = load();
    keychain.getGenericPassword.mockResolvedValue(stored(keys));

    await service.createUpdateRecoveryWalletInfo(keys);

    expect(keychain.setGenericPassword).not.toHaveBeenCalled();
    expect(keychain.resetGenericPassword).not.toHaveBeenCalled();
  });

  test('the same seed on an earlier birthday is written, not skipped', async () => {
    const { keychain, service } = load();
    // the repair restore: same words, a birthday further back
    keychain.getGenericPassword.mockResolvedValue(
      stored({ seed: 'twenty four words', birthday: 500000 }),
    );
    keychain.setGenericPassword.mockResolvedValue(written);

    await service.createUpdateRecoveryWalletInfo({
      seed: 'twenty four words',
      birthday: 1,
    });

    // "Recover last Keys used" hands the stored birthday back to the user, so
    // an entry left on the later one would restore a wallet blind to its own
    // history.
    expect(keychain.setGenericPassword).toHaveBeenCalledTimes(1);
  });

  test('a stored zero birthday and a missing one are the same wallet', async () => {
    const { keychain, service } = load();
    // `createNewWallet` writes `birthday || 0`, `fetchWallet` leaves the field
    // out when it is falsy: the same wallet, two shapes.
    keychain.getGenericPassword.mockResolvedValue(
      stored({ seed: 'twenty four words', birthday: 0 }),
    );

    await service.createUpdateRecoveryWalletInfo({
      seed: 'twenty four words',
    } as WalletType);

    expect(keychain.setGenericPassword).not.toHaveBeenCalled();
  });

  test('another wallet-s entry is replaced, and a refused write may reset it', async () => {
    const { keychain, service } = load();
    keychain.getGenericPassword.mockResolvedValue(
      stored({ seed: 'someone else-s words', birthday: 2 }),
    );
    keychain.setGenericPassword.mockResolvedValue(false);
    keychain.resetGenericPassword.mockResolvedValue(true);

    await service.createUpdateRecoveryWalletInfo(keys);

    // the device answered the read, so what is in there is worth nothing
    expect(keychain.resetGenericPassword).toHaveBeenCalled();
    expect(keychain.setGenericPassword).toHaveBeenCalledTimes(2);
  });

  test('an entry the device will not read is still migrated by the reset', async () => {
    const { keychain, service } = load();
    // what an entry left by an older app version with an auth-required cipher
    // looks like: the silent read cannot return it, and the write over it
    // fails too. Deleting never needs auth, so the reset is the way out.
    keychain.getGenericPassword.mockRejectedValue(new Error('auth required'));
    keychain.setGenericPassword.mockResolvedValueOnce(false);
    keychain.setGenericPassword.mockResolvedValue(written);
    keychain.resetGenericPassword.mockResolvedValue(true);

    await service.createUpdateRecoveryWalletInfo(keys);

    expect(keychain.resetGenericPassword).toHaveBeenCalled();
    expect(keychain.setGenericPassword).toHaveBeenCalledTimes(2);
    // the retry landed: the device now answers with this wallet's keys, which
    // is the only thing the warning asks about
    keychain.getGenericPassword.mockReset();
    keychain.getGenericPassword.mockResolvedValue(
      stored(keys) as Awaited<ReturnType<typeof Keychain.getGenericPassword>>,
    );
    await expect(service.recoveryWalletInfoIsFailing(keys)).resolves.toBe(
      false,
    );
  });
});
