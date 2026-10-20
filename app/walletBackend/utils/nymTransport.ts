import { NativeModules } from 'react-native';

import {
  MixnetTransportBinding,
  StartMixnetTransport,
  StopMixnetTransport,
} from '@app/walletBackend/modules/MixnetCoordinator';

// Mirror of the native NymTransportModule, which hosts the proxy shim in-process.
interface NymTransportModuleAPI {
  startMixnetTransport(): Promise<MixnetTransportBinding>;
  stopMixnetTransport(): Promise<void>;
}

const NymTransportModule =
  NativeModules.NymTransportModule as NymTransportModuleAPI;

export const startMixnetTransport: StartMixnetTransport = () =>
  NymTransportModule.startMixnetTransport();

export const stopMixnetTransport: StopMixnetTransport = () =>
  NymTransportModule.stopMixnetTransport();
