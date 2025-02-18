import { NetInfoStateType } from '@react-native-community/netinfo/src/index';
import { NetInfoType } from '../../app/AppState';

export const mockNetInfo: NetInfoType = {
  isConnected: true,
  type: NetInfoStateType.wifi,
  isConnectionExpensive: false,
};
