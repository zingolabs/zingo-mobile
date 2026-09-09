import ServerType from './types/ServerType';

import { AppStateStatus } from 'react-native';
import { SelectServerEnum } from './enums/SelectServerEnum';

export default interface AppStateLoaded {
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

  // Address+ownership pair for the shared "Add Tag/Contact" BottomSheetModal
  // hosted at LoadedApp level. `null` while hidden.
  addTagModalTarget: {
    address: string;
    own: boolean;
    swapChain: string;
    // What to put in the label field before the user types, when the launcher
    // knows a name for the address (a ZNS alias, say). The user is free to
    // replace it.
    initialLabel?: string;
  } | null;
}
