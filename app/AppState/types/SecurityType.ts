export default interface SecurityType {
  startApp: boolean;
  foregroundApp: boolean;
  sendConfirm: boolean;
  seedScreen: boolean;
  ufvkScreen: boolean;
  rescanScreen: boolean;
  settingsScreen: boolean;
  changeWalletScreen: boolean;
  restoreWalletBackupScreen: boolean;

  // eslint-disable-next-line semi
}
