/**
 * @format
 */

// The service reaches react-native only for Platform.OS, to pick the keychain
// options profile; the rest of the module is irrelevant here.
jest.mock('react-native', () => ({ Platform: { OS: 'ios' } }));

import type * as Keychain from 'react-native-keychain';
import type * as RecoveryWalletInfo from '@app/services/recoveryWalletInfo';

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

  test('a wallet with no keys drops the entry the previous wallet left', async () => {
    const { keychain, service } = load();
    keychain.hasGenericPassword.mockResolvedValue(true);
    keychain.resetGenericPassword.mockResolvedValue(true);

    await service.saveRecoveryWalletInfo({ birthday: 0 });

    expect(keychain.setGenericPassword).not.toHaveBeenCalled();
    expect(keychain.resetGenericPassword).toHaveBeenCalled();
  });
});
