export default interface SecurityType {
  startApp: boolean;
  foregroundApp: boolean;
  sendConfirm: boolean;
  seedUfvkScreen: boolean;
  rescanScreen: boolean;
  settingsScreen: boolean;
  changeWalletScreen: boolean;
  restoreWalletBackupScreen: boolean;

  // obsolete options
  seedScreen?: boolean;
  ufvkScreen?: boolean;

  // eslint-disable-next-line semi
}
