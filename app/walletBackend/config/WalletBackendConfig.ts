import {
  TotalBalanceClass,
  InfoType,
  ValueTransferType,
  UnifiedAddressClass,
  TransparentAddressClass,
  ServerType,
} from '../../AppState';
import { RPCSyncStatusType } from '../types/RPCSyncStatusType';
import { RPCPerformanceLevelEnum } from '../enums/RPCPerformanceLevelEnum';
import { StartMixnetTransport } from '../modules/MixnetCoordinator';
import { MixnetView } from '../transforms/mixnetPresenter';

/**
 * All callbacks and settings required by WalletBackend and its sub-services.
 *
 * Pass an instance of this type to the WalletBackend constructor. Every
 * sub-service receives the same config reference — add new callbacks here
 * rather than threading parameters through individual constructors.
 */
export type WalletBackendConfig = {
  /** Called whenever balances are refreshed from the native layer. */
  onBalanceChanged: (balance: TotalBalanceClass) => void;
  /** Called with the full list of value transfers (transactions). */
  onValueTransfersChanged: (list: ValueTransferType[], total: number) => void;
  /** Called with the filtered list of memo-bearing transfers (messages). */
  onMessagesChanged: (list: ValueTransferType[], total: number) => void;
  /** Called with the combined unified + transparent address list. */
  onAddressesChanged: (
    addresses: (UnifiedAddressClass | TransparentAddressClass)[],
  ) => void;
  /** Called with server/chain info including latest block height. */
  onInfoChanged: (info: InfoType) => void;
  /** Called every poll cycle with current sync progress. */
  onSyncStatusChanged: (status: RPCSyncStatusType) => void;
  onZingolibVersionChanged: (version: string) => void;
  /** Called with the wallet birthday block height after each fetch. */
  onBirthdayChanged: (birthday: number) => void;
  /** Called on any non-fatal RPC error; display or log in the consumer. */
  onError: (error: string) => void;
  /**
   * Called after several consecutive sync-launch failures. The consumer owns
   * the policy (e.g. silently activating a working server); the coordinator
   * only reports the streak and resets its count.
   */
  onPersistentSyncFailure?: () => void;
  /** Called with each new screen-facing Mixnet Mode projection. */
  onMixnetViewChanged: (view: MixnetView) => void;
  /**
   * Starts the platform-hosted mixnet transport (the UniFFI proxy shim on
   * Android) and yields its local SOCKS5 address. Injected because the
   * platform owns the transport; tests supply a stub.
   */
  startMixnetTransport: StartMixnetTransport;
  /**
   * Whether this platform runs the Mixnet Mode policy. Android and iOS both
   * host the native transport, so it is on for each; tests inject false to
   * keep the coordinator unstarted and publish no mixnet view.
   */
  mixnetSupported: boolean;
  /**
   * The persisted user setting (default false, sticky). When true, the
   * coordinator auto-starts Mixnet Mode at wallet load; the runtime toggle
   * (setNymOption) drives enable/disable thereafter.
   */
  nymEnabled: boolean;
  /** i18n helper — must be bound to the active locale in the consumer. */
  translate: (key: string) => TranslateType;
  /** Prevent device sleep while true (e.g. during active sync/send). */
  keepAwake: (keep: boolean) => void;
  /** When true, only the UFVK is available; no seed phrase operations. */
  readOnly: boolean;
  server: ServerType;
  performanceLevel: RPCPerformanceLevelEnum;
};
