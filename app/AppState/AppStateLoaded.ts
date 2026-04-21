import ServerType from './types/ServerType';

import { AppStateStatus } from 'react-native';
import { SelectServerEnum } from './enums/SelectServerEnum';
import { DrawerContentComponentProps } from '@react-navigation/drawer';

export default interface AppStateLoaded {
  navigationHome: DrawerContentComponentProps['navigation'] | null;
  appStateStatus: AppStateStatus;

  // change server helper
  newServer: ServerType;
  newSelectServer: SelectServerEnum | null;

  // to do scroll to top in history
  scrollToTop: boolean;

  // to do scroll to bottom in messages
  scrollToBottom: boolean;

  // to know if the modal is open or not
  isSeedViewModalOpen: boolean;
}
