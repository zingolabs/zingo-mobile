import ServerType from './types/ServerType';

import { AppStateStatus } from 'react-native';
import { SelectServerEnum } from './enums/SelectServerEnum';

export default interface AppStateLoaded {
  appStateStatus: AppStateStatus;

  // change server helper
  pendingServer:
    | { kind: 'none' }
    | { kind: 'pending'; server: ServerType; selectServer: SelectServerEnum };

  // to do scroll to top in history
  scrollToTop: boolean;

  // to do scroll to bottom in messages
  scrollToBottom: boolean;
}
