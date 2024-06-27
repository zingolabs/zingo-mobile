import { StackScreenProps } from '@react-navigation/stack';

import ServerType from './types/ServerType';

import { MenuItemEnum } from './enums/MenuItemEnum';
import { AppStateStatus } from 'react-native';
import { ThemeType } from '../types';
import { ModeEnum } from './enums/ModeEnum';

export default interface AppStateLoaded {
  theme: ThemeType;
  toggleTheme: (mode: ModeEnum) => void;
  route: StackScreenProps<any>['route'];
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

  // eslint-disable-next-line semi
}
