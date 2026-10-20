import 'react-native';
import * as Keychain from 'react-native-keychain';
import { GlobalConst } from '@app/AppState';
import { getRecoveryWalletInfo } from '@app/services/recoveryWalletInfo';

const keychain = Keychain as jest.Mocked<typeof Keychain>;

const stored = (saved: object) =>
  keychain.getGenericPassword.mockResolvedValue({
    username: GlobalConst.keyKeyChain,
    password: JSON.stringify(saved),
    service: GlobalConst.serviceKeyChain,
  } as never);

afterEach(() => {
  jest.clearAllMocks();
});

test('Tests that a saved phrase reads as birthday 0 when the entry has no birthday', async () => {
  stored({ seed: 'abandon ability able' });

  await expect(getRecoveryWalletInfo()).resolves.toEqual({
    seed: 'abandon ability able',
    birthday: 0,
  });
});

test('Tests that a saved birthday is kept when the entry has one', async () => {
  stored({ seed: 'abandon ability able', birthday: 1994579 });

  await expect(getRecoveryWalletInfo()).resolves.toEqual({
    seed: 'abandon ability able',
    birthday: 1994579,
  });
});
