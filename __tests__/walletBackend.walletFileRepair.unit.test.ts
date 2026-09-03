// Auto-repair keys only on the two repaired files, and the parsed report
// carries the per-file fields without keysetPresent.
jest.mock('react-native', () => ({
  Platform: { OS: 'android' },
}));

jest.mock('@app/RPCModule', () => {
  const members: Record<PropertyKey, jest.Mock> = {};
  return {
    __esModule: true,
    default: new Proxy(members, {
      get: (target, prop) => (target[prop] ??= jest.fn()),
    }),
  };
});

import RPCModule from '@app/RPCModule';
import {
  hasRepairableWalletFile,
  walletFileDiagnosis,
  walletSeedSalvage,
  WalletFileDiagnosis,
  WalletFileState,
  WALLET_FILE_NAME,
  WALLET_BACKUP_FILE_NAME,
} from '@app/walletBackend/utils/walletFileRepair';

const bridge = RPCModule as unknown as Record<string, jest.Mock>;

const diag = (
  name: string,
  state: WalletFileState,
  repairable: boolean,
): WalletFileDiagnosis => ({
  name,
  state,
  size: 100,
  mtime: 0,
  depth: 0,
  repairable,
  unwrapErrors: [],
});

describe('hasRepairableWalletFile', () => {
  it('is true for a repairable main wallet', () => {
    expect(
      hasRepairableWalletFile([diag(WALLET_FILE_NAME, 'doubleWrapped', true)]),
    ).toBe(true);
  });

  it('is true for a repairable backup wallet', () => {
    expect(
      hasRepairableWalletFile([
        diag(WALLET_BACKUP_FILE_NAME, 'doubleWrapped', true),
      ]),
    ).toBe(true);
  });

  it('ignores a repairable twin the native repair never rewrites', () => {
    // A repairable twin the native repair never rewrites must not start auto-repair.
    expect(
      hasRepairableWalletFile([
        diag(`${WALLET_FILE_NAME}.write.tmp`, 'doubleWrapped', true),
        diag('wallet.swap.tmp', 'doubleWrapped', true),
      ]),
    ).toBe(false);
  });

  it('is false when the double-wrapped main is not repairable', () => {
    expect(
      hasRepairableWalletFile([diag(WALLET_FILE_NAME, 'doubleWrapped', false)]),
    ).toBe(false);
  });
});

describe('walletFileDiagnosis', () => {
  it('parses the per-file fields and drops any keysetPresent flag', async () => {
    bridge.walletFileDiagnosisInfo.mockResolvedValueOnce(
      JSON.stringify({
        keysetPresent: true,
        files: [
          {
            name: WALLET_FILE_NAME,
            state: 'undecryptable',
            size: 42,
            mtime: 1000,
            depth: 0,
            repairable: false,
            head: '2800',
            readError: 'AEADBadTagException',
          },
        ],
      }),
    );

    const report = await walletFileDiagnosis();

    expect(report).not.toHaveProperty('keysetPresent');
    expect(report.files).toHaveLength(1);
    expect(report.files[0]).toMatchObject({
      name: WALLET_FILE_NAME,
      state: 'undecryptable',
      readError: 'AEADBadTagException',
      head: '2800',
      unwrapErrors: [],
    });
  });

  it('keeps encryptedLegacy and degrades the retired plainLegacy to unknown', async () => {
    bridge.walletFileDiagnosisInfo.mockResolvedValueOnce(
      JSON.stringify({
        files: [
          {
            name: WALLET_FILE_NAME,
            state: 'encryptedLegacy',
            size: 42,
            mtime: 0,
            depth: 0,
            repairable: false,
          },
          {
            name: WALLET_BACKUP_FILE_NAME,
            state: 'plainLegacy',
            size: 42,
            mtime: 0,
            depth: 0,
            repairable: false,
          },
        ],
      }),
    );

    const report = await walletFileDiagnosis();

    expect(report.files.map(f => f.state)).toEqual([
      'encryptedLegacy',
      'unknown',
    ]);
  });

  it('returns an empty file list when the bridge rejects', async () => {
    bridge.walletFileDiagnosisInfo.mockRejectedValueOnce(new Error('boom'));
    expect(await walletFileDiagnosis()).toEqual({ files: [] });
  });
});

describe('walletSeedSalvage', () => {
  it('salvages the seed phrase and birthday', async () => {
    bridge.walletFileRecoveryInfo.mockResolvedValueOnce(
      JSON.stringify({
        seed_phrase: 'hospital museum valve',
        birthday: 2000000,
        no_of_accounts: 1,
      }),
    );
    expect(await walletSeedSalvage()).toEqual({
      kind: 'salvagedSeed',
      seedPhrase: 'hospital museum valve',
      birthday: 2000000,
    });
  });

  it('fails typed when the bridge rejects', async () => {
    bridge.walletFileRecoveryInfo.mockRejectedValueOnce(new Error('Read'));
    expect(await walletSeedSalvage()).toEqual({
      kind: 'error',
      errorKey: 'loadingapp.walletsalvage-failed',
    });
  });

  it('fails typed on a malformed payload', async () => {
    bridge.walletFileRecoveryInfo.mockResolvedValueOnce('{"birthday":"x"}');
    expect(await walletSeedSalvage()).toEqual({
      kind: 'error',
      errorKey: 'loadingapp.walletsalvage-failed',
    });
  });
});
