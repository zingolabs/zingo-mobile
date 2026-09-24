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
import { StartMixnetTransport } from '@app/walletBackend/modules/MixnetCoordinator';
import { MixnetView } from '@app/walletBackend/transforms/mixnetView';

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
  onError: (error: string) => void;
  // Called after several consecutive sync-launch failures.
  onPersistentSyncFailure?: () => void;
  onMixnetViewChanged: (view: MixnetView) => void;
  startMixnetTransport: StartMixnetTransport;
  // Tests inject false to keep the coordinator unstarted.
  mixnetSupported: boolean;
  keepAwake: (keep: boolean) => void;
  readOnly: boolean;
  server: ServerType;
  performanceLevel: RPCPerformanceLevelEnum;
};
