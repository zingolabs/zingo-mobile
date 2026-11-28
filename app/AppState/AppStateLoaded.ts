import { AppStateStatus } from 'react-native';

export default interface AppStateLoaded {
  appStateStatus: AppStateStatus;

  // change server helper
  // to do scroll to top in history
  scrollToTop: boolean;

  // to do scroll to bottom in messages
  scrollToNewest: boolean;
}
