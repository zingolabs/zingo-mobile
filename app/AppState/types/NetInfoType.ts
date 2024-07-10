import { NetInfoStateType } from '@react-native-community/netinfo';

export default interface NetInfoType {
  isConnected: boolean | null;
  type: NetInfoStateType;
  isConnectionExpensive: boolean | null;
  // eslint-disable-next-line semi
}
