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

describe('recoveryWalletInfo - the device is failing or it is not', () => {
  beforeEach(() => {
    jest.resetModules();
    jest.clearAllMocks();
  });

  test('an entry the device returns means everything is fine', async () => {
    const { keychain, service } = load();
    keychain.hasGenericPassword.mockResolvedValue(true);

    await expect(service.recoveryWalletInfoIsFailing()).resolves.toBe(false);
  });

  test('no entry is a failure: the App always keeps one', async () => {
    const { keychain, service } = load();
    keychain.hasGenericPassword.mockResolvedValue(false);

    await expect(service.recoveryWalletInfoIsFailing()).resolves.toBe(true);
  });

  test('a device that throws is a failure, and does not throw at the caller', async () => {
    const { keychain, service } = load();
    keychain.hasGenericPassword.mockRejectedValue(
      new Error('keystore unavailable'),
    );

    await expect(service.hasRecoveryWalletInfo()).resolves.toBe(false);
    await expect(service.recoveryWalletInfoIsFailing()).resolves.toBe(true);
  });

  test('a read that errors once stops answering as soon as the device replies again', async () => {
    const { keychain, service } = load();
    keychain.hasGenericPassword.mockRejectedValueOnce(
      new Error('keystore busy'),
    );
    keychain.hasGenericPassword.mockResolvedValue(true);

    await expect(service.recoveryWalletInfoIsFailing()).resolves.toBe(true);
    // No restart in between: a transient read error must not pin the warning.
    await expect(service.recoveryWalletInfoIsFailing()).resolves.toBe(false);
  });

  test('a save that fails twice is remembered, and a later success clears it', async () => {
    const { keychain, service } = load();
    keychain.setGenericPassword.mockRejectedValue(new Error('no write'));
    keychain.resetGenericPassword.mockResolvedValue(true);
    keychain.hasGenericPassword.mockResolvedValue(true);

    await service.saveRecoveryWalletInfo({
      seed: 'twenty four words',
      birthday: 1,
    });
    // the entry is there, so only the remembered failure can answer true
    await expect(service.recoveryWalletInfoIsFailing()).resolves.toBe(true);

    keychain.setGenericPassword.mockResolvedValue(written);
    await service.saveRecoveryWalletInfo({
      seed: 'twenty four words',
      birthday: 1,
    });

    await expect(service.recoveryWalletInfoIsFailing()).resolves.toBe(false);
  });

  test('a device that refuses the write without throwing is a failure too', async () => {
    const { keychain, service } = load();
    // setGenericPassword reports a refusal by resolving falsy, not by throwing.
    keychain.setGenericPassword.mockResolvedValue(false);
    keychain.resetGenericPassword.mockResolvedValue(true);
    keychain.hasGenericPassword.mockResolvedValue(true);

    await service.saveRecoveryWalletInfo({
      seed: 'twenty four words',
      birthday: 1,
    });

    // the reset+retry ran and was refused as well
    expect(keychain.setGenericPassword).toHaveBeenCalledTimes(2);
    await expect(service.recoveryWalletInfoIsFailing()).resolves.toBe(true);
  });

  test('a wallet with nothing to store is not failing on an empty keychain', async () => {
    const { keychain, service } = load();
    keychain.hasGenericPassword.mockResolvedValue(false);

    await expect(service.recoveryWalletInfoIsFailing(false)).resolves.toBe(
      false,
    );
  });

  test('a wallet with nothing to store still reports a device that errors', async () => {
    const { keychain, service } = load();
    keychain.hasGenericPassword.mockRejectedValue(new Error('keystore gone'));

    await expect(service.recoveryWalletInfoIsFailing(false)).resolves.toBe(
      true,
    );
  });

  test('nothing to store leaves the entry alone: an empty fetch is an error, not an answer', async () => {
    const { keychain, service } = load();
    keychain.hasGenericPassword.mockResolvedValue(true);
    keychain.resetGenericPassword.mockResolvedValue(true);

    await service.saveRecoveryWalletInfo({ birthday: 0 });

    expect(keychain.setGenericPassword).not.toHaveBeenCalled();
    // Dropping the entry is the wallet-kind branch's call, never this one:
    // `fetchWallet` hands back an empty object on an RPC error too.
    expect(keychain.resetGenericPassword).not.toHaveBeenCalled();
  });

  test('the screen refresh never wipes the entry to retry a refused write', async () => {
    const { keychain, service } = load();
    keychain.setGenericPassword.mockResolvedValue(false);
    keychain.resetGenericPassword.mockResolvedValue(true);
    keychain.hasGenericPassword.mockResolvedValue(true);

    await service.saveRecoveryWalletInfo(
      { seed: 'twenty four words', birthday: 1 },
      { resetOnFailure: false },
    );

    expect(keychain.setGenericPassword).toHaveBeenCalledTimes(1);
    expect(keychain.resetGenericPassword).not.toHaveBeenCalled();
    // still remembered as a failure, the warning has to show up
    await expect(service.recoveryWalletInfoIsFailing()).resolves.toBe(true);
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
    // and the next call that does answer forgives it: the read half of the
    // warning is deliberately the forgiving one
    keychain.hasGenericPassword.mockResolvedValue(true);
    await expect(service.recoveryWalletInfoIsFailing()).resolves.toBe(false);
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

  test('a device that will not answer the read keeps its entry through a refused write', async () => {
    const { keychain, service } = load();
    keychain.getGenericPassword.mockRejectedValue(new Error('keystore busy'));
    keychain.setGenericPassword.mockResolvedValue(false);
    keychain.resetGenericPassword.mockResolvedValue(true);

    await service.createUpdateRecoveryWalletInfo(keys);

    // nothing is known about the entry, so it stands: one attempt, no reset
    expect(keychain.setGenericPassword).toHaveBeenCalledTimes(1);
    expect(keychain.resetGenericPassword).not.toHaveBeenCalled();
    // and the failure is still remembered
    keychain.hasGenericPassword.mockResolvedValue(true);
    await expect(service.recoveryWalletInfoIsFailing()).resolves.toBe(true);
  });

  test('a keyless wallet does not inherit the previous wallet-s save failure', async () => {
    const { keychain, service } = load();
    keychain.setGenericPassword.mockRejectedValue(new Error('no write'));
    keychain.resetGenericPassword.mockResolvedValue(true);
    keychain.hasGenericPassword.mockResolvedValue(false);

    await service.saveRecoveryWalletInfo(keys);
    await expect(service.recoveryWalletInfoIsFailing()).resolves.toBe(true);

    // same process, a keyless wallet is now open: an empty keychain is right,
    // and the flag belongs to the wallet used before it
    await expect(service.recoveryWalletInfoIsFailing(false)).resolves.toBe(
      false,
    );
  });
});
