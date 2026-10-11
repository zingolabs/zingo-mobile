import NetInfoType from '@app/AppState/types/NetInfoType';
import ServerType from '@app/AppState/types/ServerType';

// No network, a network that doesn't reach the internet (a Wi-Fi that wants
// a sign-in, a network that blocks traffic), or fine. Unknown counts as
// fine, so a check still running never shows an alarm. In Offline mode no
// server is wanted, so only the lack of a network counts.
export type Connectivity = 'none' | 'noAccess' | 'ok';

export const connectivity = (
  netInfo: NetInfoType,
  server?: ServerType,
): Connectivity =>
  !netInfo.isConnected
    ? 'none'
    : server?.kind === 'offline'
      ? 'ok'
      : netInfo.isInternetReachable === false || netInfo.serversUnreachable
        ? 'noAccess'
        : 'ok';
