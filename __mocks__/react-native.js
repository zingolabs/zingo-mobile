jest.mock('react-native', () => {
  const RN = jest.requireActual('react-native');

  RN.NativeModules.RPCModule = {
    getLatestBlockServerInfo: jest.fn(() => '{}'),
    getLatestBlockWalletInfo: jest.fn(() => '{}'),
    walletExists: jest.fn(() => 'false'),
    walletBackupExists: jest.fn(() => 'false'),
    doSaveBackup: jest.fn(() => 'true'),
    restoreExistingWalletBackup: jest.fn(() => '{}'),
    getValueTransfersList: jest.fn(
      () => '{ "value_transfers": [], "total": 0 }',
    ),
    setCryptoDefaultProvider: jest.fn(() => 'true'),
    createNewWallet: jest.fn(
      () => '{ "seed": "seed phrase test", "birthday": 0 }',
    ),
    doSave: jest.fn(),
    pollSyncInfo: jest.fn(() => '{}'),
    runSyncProcess: jest.fn(() => '{}'),
    pauseSyncProcess: jest.fn(() => '{}'),
    statusSyncInfo: jest.fn(() => '{}'),
    runRescanProcess: jest.fn(() => '{}'),
    infoServerInfo: jest.fn(() => '{}'),
    getSeedInfo: jest.fn(() => '{}'),
    getUfvkInfo: jest.fn(() => '{}'),
    changeServerProcess: jest.fn(() => '{}'),
    walletKindInfo: jest.fn(() => '{}'),
    parseAddressInfo: jest.fn(() => '{}'),
    parseUfvkInfo: jest.fn(() => '{}'),
    getVersionInfo: jest.fn(() => '{}'),
    getMessagesInfo: jest.fn(() => '{}'),
    getBalanceInfo: jest.fn(() => '{}'),
    getTotalMemobytesToAddressInfo: jest.fn(() => '{}'),
    getTotalValueToAddressInfo: jest.fn(() => '{}'),
    getTotalSpendsToAddressInfo: jest.fn(() => '{}'),
    zecPriceInfo: jest.fn(() => '{}'),
    removeTransactionProcess: jest.fn(() => '{}'),
    getSpendableBalanceWithAddressInfo: jest.fn(() => '{}'),
    getSpendableBalanceTotalInfo: jest.fn(() => '{}'),
    getOptionWalletInfo: jest.fn(() => '{}'),
    setOptionWalletProcess: jest.fn(() => '{}'),
    getUnifiedAddressesInfo: jest.fn(() => '{}'),
    getTransparentAddressesInfo: jest.fn(() => '{}'),
    createNewUnifiedAddressProcess: jest.fn(() => '{}'),
    createNewTransparentAddressProcess: jest.fn(() => '{}'),
    checkMyAddressInfo: jest.fn(() => '{}'),
    getWalletSaveRequiredInfo: jest.fn(() => '{}'),
    setConfigWalletToProdProcess: jest.fn(() => '{}'),
    getConfigWalletPerformanceInfo: jest.fn(() => '{}'),
    getWalletVersionInfo: jest.fn(() => '{}'),
    sendProcess: jest.fn(() => '{}'),
    shieldProcess: jest.fn(() => '{}'),
    confirmProcess: jest.fn(() => '{}'),
    getZenniesDonationAddress: jest.fn(() => '{}'),
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
