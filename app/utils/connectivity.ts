import NetInfoType from '@app/AppState/types/NetInfoType';

// No network, a network that doesn't reach the internet (a Wi-Fi that wants
// a sign-in, a network that blocks traffic), or fine. Unknown counts as
// fine, so a check still running never shows an alarm.
export type Connectivity = 'none' | 'noAccess' | 'ok';

export const connectivity = (netInfo: NetInfoType): Connectivity =>
  !netInfo.isConnected
    ? 'none'
    : netInfo.isInternetReachable === false
      ? 'noAccess'
      : 'ok';
