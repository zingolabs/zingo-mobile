/**
 * Drives the Mixnet Mode lifecycle: a persisted user opt-in starts the
 * platform transport and attaches the wallet to it, a deliberate disable is
 * the per-session clearnet consent, and a died or failed transport recovers
 * on an exponential backoff until the user disables it. Polling follows one
 * interval with a lock, and every publication goes through the pure view
 * transform.
 */
import { toFfiError } from '@app/walletBackend/ffi';
import { RPCMixnetIndicatorEnum } from '@app/walletBackend/enums/RPCMixnetIndicatorEnum';
import {
  ClearnetConsent,
  MixnetStatusReport,
  mixnetDetail,
  vetPolledStatus,
} from '@app/walletBackend/transforms/mixnetTransform';
import {
  MixnetView,
  deriveMixnetView,
} from '@app/walletBackend/transforms/mixnetView';
import {
  attachMixnet,
  disableMixnet,
  getMixnetStatus,
} from '@app/walletBackend/utils/mixnetUtils';

/** What a started platform transport reports back: its SOCKS5 address and the Exit Node it bound. */
export type MixnetTransportBinding = {
  socks5Addr: string;
  exitNode: string;
};

/** Starts the platform-hosted mixnet transport and yields its binding; rejections propagate. */
export type StartMixnetTransport = () => Promise<MixnetTransportBinding>;

/** Tears down the platform-hosted mixnet transport. */
export type StopMixnetTransport = () => Promise<void>;

const STARTING_REPORT: MixnetStatusReport = {
  kind: 'status',
  indicator: RPCMixnetIndicatorEnum.bootstrapping,
  socks5Addr: undefined,
  bootstrapDetail: '',
};

const OFF_REPORT: MixnetStatusReport = {
  kind: 'status',
  indicator: RPCMixnetIndicatorEnum.off,
  socks5Addr: undefined,
  bootstrapDetail: '',
};

/** How often the coordinator polls while the transport is bootstrapping. */
export const BOOTSTRAP_POLL_MILLIS = 2_000;

/** How often the coordinator polls outside of bootstrapping. */
export const STEADY_POLL_MILLIS = 30_000;

/** Delay before the first auto-reconnect attempt after the transport is lost. */
export const RECONNECT_BASE_MILLIS = 3_000;

/** Ceiling for the exponential auto-reconnect backoff. */
export const RECONNECT_MAX_MILLIS = 60_000;

export class MixnetCoordinator {
  private readonly startTransport: StartMixnetTransport;
  private readonly stopTransport: StopMixnetTransport;
  private readonly onChange: (view: MixnetView) => void;

  private pollTimerID: ReturnType<typeof setInterval> | undefined;
  private pollLock: boolean = false;
  private lastStatus: MixnetStatusReport | undefined;
  private reconnectTimerID: ReturnType<typeof setTimeout> | undefined;
  private reconnectDelayMillis: number = RECONNECT_BASE_MILLIS;
  private reconnecting: boolean = false;
  private reconnectActive: boolean = false;
  // The wallet reports `off` both for a deliberate disable and for a
  // never-attached session; only the former is consent.
  private consent: ClearnetConsent = 'none';
  private enableEpoch: number = 0;
  private stopped: boolean = false;

  constructor(
    startTransport: StartMixnetTransport,
    stopTransport: StopMixnetTransport,
    onChange: (view: MixnetView) => void,
  ) {
    this.startTransport = startTransport;
    this.stopTransport = stopTransport;
    this.onChange = onChange;
  }

  /**
   * Starts the platform transport, attaches the wallet to its address and
   * begins polling. A failure at either stage publishes the failure view:
   * sends stay blocked and the user is offered re-enable.
   */
  async ensureForConnectedSession(): Promise<void> {
    const epoch = ++this.enableEpoch;
    this.consent = 'none';
    this.clearPolling();
    this.clearReconnectTimer();
    this.publish(STARTING_REPORT);
    let binding: MixnetTransportBinding;
    try {
      binding = await this.startTransport();
    } catch (thrown: unknown) {
      if (this.enableEpoch === epoch) {
        this.publish({
          kind: 'failure',
          failure: { reason: 'nativeRejection', error: toFfiError(thrown) },
        });
        this.schedulePolling();
      }
      return;
    }
    if (this.enableEpoch !== epoch) {
      return;
    }
    const status = await attachMixnet(binding.socks5Addr, binding.exitNode);
    if (this.enableEpoch !== epoch) {
      return;
    }
    this.publish(status);
    this.schedulePolling();
  }

  /** The user's deliberate per-session consent to clearnet. */
  async disable(): Promise<void> {
    this.enableEpoch += 1;
    this.consent = 'disabledThisSession';
    this.reconnectActive = false;
    this.clearReconnect();
    this.clearPolling();
    this.publish(OFF_REPORT);
    this.publish(await disableMixnet());
    await this.stopTransport().catch(() => undefined);
  }

  /** Recovers a died or failed transport by starting it afresh. */
  async reenable(): Promise<void> {
    await this.ensureForConnectedSession();
  }

  /** Stops polling and reconnecting; the coordinator publishes nothing further. */
  stop(): void {
    this.stopped = true;
    this.enableEpoch += 1;
    this.clearPolling();
    this.clearReconnect();
  }

  private clearPolling(): void {
    if (this.pollTimerID !== undefined) {
      clearInterval(this.pollTimerID);
      this.pollTimerID = undefined;
    }
  }

  // A transport is lost when it died or became unknowable while the user
  // has not dropped to clearnet.
  private isLost(status: MixnetStatusReport): boolean {
    if (this.consent === 'disabledThisSession') {
      return false;
    }
    return (
      status.kind === 'failure' ||
      status.indicator === RPCMixnetIndicatorEnum.died
    );
  }

  private scheduleReconnect(): void {
    if (this.reconnectTimerID !== undefined || this.reconnecting) {
      return;
    }
    this.reconnectTimerID = setTimeout(() => {
      this.reconnectTimerID = undefined;
      this.attemptReconnect();
    }, this.reconnectDelayMillis);
  }

  private clearReconnect(): void {
    this.clearReconnectTimer();
    this.reconnectDelayMillis = RECONNECT_BASE_MILLIS;
  }

  private clearReconnectTimer(): void {
    if (this.reconnectTimerID !== undefined) {
      clearTimeout(this.reconnectTimerID);
      this.reconnectTimerID = undefined;
    }
  }

  private async attemptReconnect(): Promise<void> {
    if (this.consent === 'disabledThisSession') {
      return;
    }
    this.reconnecting = true;
    try {
      await this.ensureForConnectedSession();
    } finally {
      this.reconnecting = false;
    }
    const recovered =
      this.lastStatus !== undefined &&
      this.lastStatus.kind === 'status' &&
      this.lastStatus.indicator === RPCMixnetIndicatorEnum.ready;
    if (!recovered) {
      this.reconnectDelayMillis = Math.min(
        this.reconnectDelayMillis * 2,
        RECONNECT_MAX_MILLIS,
      );
    }
    if (this.lastStatus !== undefined && this.isLost(this.lastStatus)) {
      this.scheduleReconnect();
    }
  }

  private async pollOnce(): Promise<void> {
    if (this.pollLock) {
      return;
    }
    this.pollLock = true;
    const epoch = this.enableEpoch;
    try {
      const status = vetPolledStatus(await getMixnetStatus(), this.consent);
      if (this.enableEpoch === epoch && !this.stopped) {
        this.publish(status);
      }
    } finally {
      this.pollLock = false;
    }
  }

  private schedulePolling(): void {
    if (this.stopped) {
      return;
    }
    this.clearPolling();
    const cadence = this.isBootstrapping()
      ? BOOTSTRAP_POLL_MILLIS
      : STEADY_POLL_MILLIS;
    this.pollTimerID = setInterval(() => {
      this.pollOnce();
    }, cadence);
  }

  private isBootstrapping(): boolean {
    return (
      this.lastStatus !== undefined &&
      this.lastStatus.kind === 'status' &&
      this.lastStatus.indicator === RPCMixnetIndicatorEnum.bootstrapping
    );
  }

  // A settled state (ready, or a consented off) ends the recovery cycle; a
  // lost status starts one; bootstrapping leaves it as-is.
  private publish(status: MixnetStatusReport): void {
    if (this.stopped) {
      return;
    }
    const wasBootstrapping = this.isBootstrapping();
    const settled =
      status.kind === 'status' &&
      (status.indicator === RPCMixnetIndicatorEnum.ready ||
        status.indicator === RPCMixnetIndicatorEnum.off);
    if (settled) {
      this.reconnectActive = false;
      this.reconnectDelayMillis = RECONNECT_BASE_MILLIS;
    } else if (this.isLost(status)) {
      this.reconnectActive = true;
    }
    this.lastStatus = status;
    this.onChange(
      deriveMixnetView(status, mixnetDetail(status), this.reconnectActive),
    );
    if (
      this.pollTimerID !== undefined &&
      wasBootstrapping !== this.isBootstrapping()
    ) {
      this.schedulePolling();
    }
    if (this.isLost(status)) {
      this.scheduleReconnect();
    } else {
      this.clearReconnectTimer();
    }
  }
}
