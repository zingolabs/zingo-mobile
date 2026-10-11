import { NetInfoStateType } from '@react-native-community/netinfo/src/index';

export default interface NetInfoType {
  isConnected: boolean | null;
  // The system's own check that the network reaches the internet (Android
  // validates it, as for a captive portal); null or absent while unknown.
  isInternetReachable?: boolean | null;
  type: NetInfoStateType;
  isConnectionExpensive: boolean | null;
}
