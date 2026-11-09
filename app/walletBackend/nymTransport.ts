import { NativeModules } from 'react-native';

import {
  MixnetTransportBinding,
  StartMixnetTransport,
  StopMixnetTransport,
  TakeProxyDeathReason,
} from '@app/walletBackend/MixnetCoordinator';

// Mirror of the native NymTransportModule, which hosts the proxy shim in-process.
interface NymTransportModuleAPI {
  startMixnetTransport(): Promise<MixnetTransportBinding>;
  stopMixnetTransport(): Promise<void>;
  takeProxyDeathReason(): Promise<string>;
}

const NymTransportModule =
  NativeModules.NymTransportModule as NymTransportModuleAPI;

export const startMixnetTransport: StartMixnetTransport = () =>
  NymTransportModule.startMixnetTransport();

export const stopMixnetTransport: StopMixnetTransport = () =>
  NymTransportModule.stopMixnetTransport();

export const takeMixnetProxyDeath: TakeProxyDeathReason = () =>
  NymTransportModule.takeProxyDeathReason();
