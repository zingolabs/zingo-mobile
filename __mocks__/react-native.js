jest.mock('react-native', () => {
  const RN = jest.requireActual('react-native');

  RN.NativeModules.RPCModule = {
    walletExists: jest.fn(async () => false),
    walletBackupExists: jest.fn(async () => false),
    loadExistingWallet: jest.fn(async () => undefined),
    saveWallet: jest.fn(async () => undefined),
    saveWalletBackup: jest.fn(async () => undefined),
    restoreExistingWalletBackup: jest.fn(async () => undefined),
    deleteExistingWallet: jest.fn(async () => true),
    deleteExistingWalletBackup: jest.fn(async () => true),
    walletFileDiagnosisInfo: jest.fn(async () => '{"files":[]}'),
    repairDoubleWrappedWalletProcess: jest.fn(async () => '{}'),
    walletFileRecoveryInfo: jest.fn(async () => '{}'),
  };
  RN.NativeModules.DeviceAuth = {
    canAuthenticate: jest.fn(async () => ({ available: true, code: '' })),
    authenticate: jest.fn(async () => ({
      outcome: 'authenticated',
      code: '',
    })),
  };
  RN.View = jest.fn();
  RN.RefreshControl = jest.fn(() => null);

  return RN;
});
