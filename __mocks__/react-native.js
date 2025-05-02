jest.mock('react-native', () => {
  const RN = jest.requireActual('react-native');

  RN.NativeModules.RPCModule = {
    execute: jest.fn(() => '{}'),
    getLatestBlockServerInfo: jest.fn(() => '{}'),
    getLatestBlockWalletInfo: jest.fn(() => '{}'),
    walletExists: jest.fn(() => 'false'),
    getValueTransfersList: jest.fn(() => '{ "value_transfers": [], "total": 0 }'),
    setCryptoDefaultProvider: jest.fn(() => 'true'),
    createNewWallet: jest.fn(() => '{ "seed": "seed phrase test", "birthday": 0 }'),
    doSave: jest.fn(),
    pollSyncInfo: jest.fn(() => '{}'),
    runSyncProcess: jest.fn(() => '{}'),
    pauseSyncProcess: jest.fn(() => '{}'),
    stopSyncProcess: jest.fn(() => '{}'),
    statusSyncInfo: jest.fn(() => '{}'),
    runRescanProcess: jest.fn(() => '{}'),
  };
  RN.View = jest.fn();

  return RN;
});
