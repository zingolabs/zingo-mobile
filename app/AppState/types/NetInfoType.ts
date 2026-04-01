import { NetInfoStateType } from '@react-native-community/netinfo/src/index';

export default interface NetInfoType {
  isConnected: boolean | null;
  type: NetInfoStateType;
  isConnectionExpensive: boolean | null;
}
