import ServerType from './types/ServerType';

import { SelectServerEnum } from './enums/SelectServerEnum';

// The container's own bookkeeping, kept off the shared AppContextLoaded read
// surface: the transient server-switch handoff, coupled to the server/selectServer
// commit and read only inside the container. The lifecycle field and the modal
// gates live in app/AppState/uiAtoms.ts.
export default interface AppStateLoaded {
  // change server helper
  newServer: ServerType;
  newSelectServer: SelectServerEnum | null;

  // to do scroll to top in history
  scrollToTop: boolean;

  // to do scroll to bottom in messages
  scrollToBottom: boolean;
}
