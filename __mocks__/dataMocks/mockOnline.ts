import { NetInfoStateType } from '@react-native-community/netinfo/src/index';

import { ChainNameEnum, remoteServer } from '@app/AppState';
import { SendPermitInputs } from '@app/walletBackend/transforms/sendPermit';
import { mixnetReady, mockInfo } from '../../.storybook/storyMocks';

/** The app state of a connected device on a remote server with a ready mixnet. */
export const mockOnline: SendPermitInputs = {
  netInfo: {
    isConnected: true,
    type: NetInfoStateType.wifi,
    isConnectionExpensive: false,
  },
  server: remoteServer(mockInfo.serverUri, ChainNameEnum.mainChainName),
  mixnetView: mixnetReady,
};
