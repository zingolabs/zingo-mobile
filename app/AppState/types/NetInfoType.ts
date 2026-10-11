import { NetInfoStateType } from '@react-native-community/netinfo/src/index';

export default interface NetInfoType {
  isConnected: boolean | null;
  // The system's own check that the network reaches the internet (Android
  // validates it, as for a captive portal); null or absent while unknown.
  isInternetReachable?: boolean | null;
  // Connected, yet no server answered Automatic's probes: the network most
  // likely doesn't reach the internet, or blocks these connections. Works
  // where the system has no reachability (iOS). Cleared when a server
  // answers or the network changes.
  serversUnreachable?: boolean;
  type: NetInfoStateType;
  isConnectionExpensive: boolean | null;
}
