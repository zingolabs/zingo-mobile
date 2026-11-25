import {
  TotalBalanceClass,
  InfoType,
  ValueTransferType,
  UnifiedAddressClass,
  TransparentAddressClass,
  ServerType,
} from '@app/AppState';
import { RPCSyncStatusType } from '@app/walletBackend/types/RPCSyncStatusType';
import { RPCPerformanceLevelEnum } from '@app/walletBackend/enums/RPCPerformanceLevelEnum';
import {
  StartMixnetTransport,
  StopMixnetTransport,
  TakeProxyDeathReason,
} from '@app/walletBackend/modules/MixnetCoordinator';
import { MixnetTransportView } from '@app/walletBackend/transforms/mixnetView';
import { ProbeAnswer, SyncLaunch } from '@app/services/serverHealth';

// Every sub-service shares one reference to this config.
export type WalletBackendConfig = {
  onBalanceChanged: (balance: TotalBalanceClass) => void;
  onValueTransfersChanged: (list: ValueTransferType[], total: number) => void;
  onMessagesChanged: (list: ValueTransferType[], total: number) => void;
  onAddressesChanged: (
    addresses: (UnifiedAddressClass | TransparentAddressClass)[],
  ) => void;
  onInfoChanged: (info: InfoType) => void;
  onSyncStatusChanged: (status: RPCSyncStatusType) => void;
  onZingolibVersionChanged: (version: string) => void;
  onBirthdayChanged: (birthday: number) => void;
  // Called once, with the height in use, when zingolib raised a birthday it
  // was given above 0 to Sapling activation.
  onBirthdayAdjusted: (height: number) => void;
  onError: (error: string) => void;
  /** Each sync launch, launched or failed. */
  onSyncLaunch?: (launch: SyncLaunch) => void;
  /** Each direct answer of the server, or its failure. */
  onServerAnswer?: (uri: string, answer: ProbeAnswer) => void;
  onMixnetViewChanged: (view: MixnetTransportView) => void;
  startMixnetTransport: StartMixnetTransport;
  stopMixnetTransport: StopMixnetTransport;
  takeMixnetProxyDeath: TakeProxyDeathReason;
  // Tests inject false to keep the coordinator unstarted.
  mixnetSupported: boolean;
  keepAwake: (keep: boolean) => void;
  readOnly: boolean;
  server: ServerType;
  performanceLevel: RPCPerformanceLevelEnum;
};

// Offline is the server choice with no indexer.
export function isOffline(config: WalletBackendConfig): boolean {
  return config.server.kind === 'offline';
}
