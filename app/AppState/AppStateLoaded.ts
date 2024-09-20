import ServerType from './types/ServerType';

import { MenuItemEnum } from './enums/MenuItemEnum';
import { AppStateStatus } from 'react-native';

export default interface AppStateLoaded {
  appStateStatus: AppStateStatus;

  // menu drawer
  isMenuDrawerOpen: boolean;
  selectedMenuDrawerItem: MenuItemEnum | null;

  // modals
  aboutModalVisible: boolean;
  computingModalVisible: boolean;
  settingsModalVisible: boolean;
  infoModalVisible: boolean;
  rescanModalVisible: boolean;
  seedViewModalVisible: boolean;
  seedChangeModalVisible: boolean;
  seedBackupModalVisible: boolean;
  seedServerModalVisible: boolean;
  ufvkViewModalVisible: boolean;
  ufvkChangeModalVisible: boolean;
  ufvkBackupModalVisible: boolean;
  ufvkServerModalVisible: boolean;
  syncReportModalVisible: boolean;
  poolsModalVisible: boolean;
  insightModalVisible: boolean;
  addressBookModalVisible: boolean;

  // change server helper
  newServer: ServerType;

  // to do scroll to top in history
  scrollToTop: boolean;
  recoveryWalletInfoOnDevice: boolean;

  // to do scroll to bottom in messages
  scrollToBottom: boolean;

  // eslint-disable-next-line semi
}
