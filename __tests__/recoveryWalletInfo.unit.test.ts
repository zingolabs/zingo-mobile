/**
 * @format
 */

// The service reaches react-native only for Platform.OS, to pick the keychain
// options profile; the rest of the module is irrelevant here.
jest.mock('react-native', () => ({ Platform: { OS: 'ios' } }));

import * as Keychain from 'react-native-keychain';

import {
  hasRecoveryWalletInfo,
  recoveryWalletInfoIsFailing,
  saveRecoveryWalletInfo,
} from '@app/services/recoveryWalletInfo';

const mockedKeychain = Keychain as jest.Mocked<typeof Keychain>;

describe('recoveryWalletInfo - the device is failing or it is not', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('an entry the device returns means everything is fine', async () => {
    mockedKeychain.hasGenericPassword.mockResolvedValue(true);

    await expect(recoveryWalletInfoIsFailing()).resolves.toBe(false);
  });

  test('no entry is a failure: the App always keeps one', async () => {
    mockedKeychain.hasGenericPassword.mockResolvedValue(false);

    await expect(recoveryWalletInfoIsFailing()).resolves.toBe(true);
  });

  test('a device that throws is a failure, and does not throw at the caller', async () => {
    mockedKeychain.hasGenericPassword.mockRejectedValue(
      new Error('keystore unavailable'),
    );

    await expect(hasRecoveryWalletInfo()).resolves.toBe(false);
    await expect(recoveryWalletInfoIsFailing()).resolves.toBe(true);
  });

  test('a save that fails twice is remembered, and a later success clears it', async () => {
    mockedKeychain.setGenericPassword.mockRejectedValue(new Error('no write'));
    mockedKeychain.resetGenericPassword.mockResolvedValue(true);
    mockedKeychain.hasGenericPassword.mockResolvedValue(true);

    await saveRecoveryWalletInfo({ seed: 'twenty four words', birthday: 1 });
    // the entry is there, so only the remembered failure can answer true
    await expect(recoveryWalletInfoIsFailing()).resolves.toBe(true);

    mockedKeychain.setGenericPassword.mockResolvedValue(false);
    await saveRecoveryWalletInfo({ seed: 'twenty four words', birthday: 1 });

    await expect(recoveryWalletInfoIsFailing()).resolves.toBe(false);
  });
});
