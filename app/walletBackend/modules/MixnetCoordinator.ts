/**
 * Drives the Mixnet Mode lifecycle for the app (send-over-nym step 5).
 *
 * Policy: Mixnet Mode is a persisted user opt-in, default off and sticky.
 * When enabled, `ensureForConnectedSession` starts the platform transport
 * through the injected seam and attaches the wallet to its address. Turning
 * it off is a deliberate per-session consent (`disable`). A died or failed
 * transport auto-recovers on an exponential backoff and never drops to
 * clearnet on its own. `reenable` is the manual trigger for that recovery,
 * and only a deliberate disable stops the reconnect loop.
 *
 * The transport start is an injected seam (`StartMixnetTransport`) because
 * the platform owns it: on Android the UniFFI proxy shim (step 3 of the
 * critical path) supplies it; tests supply a stub. This coordinator owns
 * cadence and policy only — every payload decision lives in the pure
 * transforms, and every screen projection in the pure presenter.
 *
 * Cadence follows the SyncCoordinator idiom: one interval, a lock flag so
 * a slow poll is never enqueued twice, and an onChange callback that
 * publishes the latest view to the context layer.
 */
import { RPCMixnetModeEnum } from '../enums/RPCMixnetModeEnum';
import {
  ClearnetConsent,
  MixnetStatusReport,
  describeRejection,
  vetPolledStatus,
} from '../transforms/mixnetTransform';
import { MixnetView, deriveMixnetView } from '../transforms/mixnetPresenter';
import {
  attachMixnet,
  disableMixnet,
  getMixnetBootstrapDetail,
  getMixnetStatus,
} from '../utils/mixnetUtils';

/**
 * Starts the platform-hosted mixnet transport and yields its local SOCKS5
 * address. Rejections propagate to the caller.
 */
export type StartMixnetTransport = () => Promise<string>;

/** Tears down the platform-hosted mixnet transport. */
export type StopMixnetTransport = () => Promise<void>;

/**
 * Whether a publication is still the latest one issued. Pure. A
 * publication that awaited a native narration fetch may resolve after a
 * newer immediate one; only the latest may reach the screen (#1228).
 */
export function isCurrentPublication(seq: number, latest: number): boolean {
  return seq === latest;
}

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

  private pollTimerID?: ReturnType<typeof setInterval>;
  private pollLock: boolean = false;
  private lastStatus: MixnetStatusReport | null = null;
  private reconnectTimerID?: ReturnType<typeof setTimeout>;
  private reconnectDelayMillis: number = RECONNECT_BASE_MILLIS;
  private reconnecting: boolean = false;
  private reconnectActive: boolean = false;
  // The consent bit belongs to the coordinator, not the wallet: the wallet
  // reports `off` both for a deliberate disable and for a never-attached
  // session, and only the former is consent (#1226).
  private consent: ClearnetConsent = 'none';
  /** Marks the active enable attempt. */
  private enableEpoch: number = 0;
  /** Set by `stop`; suppresses any later publish or poll. */
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
   * Enable Mixnet Mode for the session: start the platform transport,
   * attach the wallet to its address, and begin polling. A failure at
   * either stage is published as the typed failure view. The session
   * proceeds, sends stay blocked, and the user is offered re-enable,
   * never a silent fall-through to clearnet.
   */
  async ensureForConnectedSession(): Promise<void> {
    const epoch = ++this.enableEpoch;
    this.consent = 'none';
    try {
      const socks5Addr = await this.startTransport();
      if (this.enableEpoch !== epoch) {
        return;
      }
      const status = await attachMixnet(socks5Addr);
      if (this.enableEpoch !== epoch) {
        return;
      }
      this.publish(status);
    } catch (thrown: unknown) {
      if (this.enableEpoch !== epoch) {
        return;
      }
      this.publish({ kind: 'failure', failure: describeRejection(thrown) });
    }
    this.schedulePolling();
  }

  /** The user's deliberate per-session consent to clearnet. */
  async disable(): Promise<void> {
    this.enableEpoch += 1;
    this.consent = 'disabledThisSession';
    this.reconnectActive = false;
    this.clearReconnect();
    this.clearPolling();
    this.publish(await disableMixnet());
    // Best-effort proxy teardown: consent is already recorded and the off view
    // published, so a stop failure must not surface as a disable error.
    await this.stopTransport().catch(() => undefined);
  }

  /** Recover a died or failed transport by starting it afresh. */
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

  // A transport is lost when it died or became unknowable while the user has
  // not deliberately dropped to clearnet. Lost transports are auto-recovered;
  // a consented `off` is not.
  private isLost(status: MixnetStatusReport): boolean {
    if (this.consent === 'disabledThisSession') {
      return false;
    }
    return status.kind === 'failure' || status.mode === RPCMixnetModeEnum.died;
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
    this.resetReconnectBackoff();
  }

  private clearReconnectTimer(): void {
    if (this.reconnectTimerID !== undefined) {
      clearTimeout(this.reconnectTimerID);
      this.reconnectTimerID = undefined;
    }
  }

  private resetReconnectBackoff(): void {
    this.reconnectDelayMillis = RECONNECT_BASE_MILLIS;
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
      this.lastStatus !== null &&
      this.lastStatus.kind === 'status' &&
      this.lastStatus.mode === RPCMixnetModeEnum.ready;
    if (!recovered) {
      this.reconnectDelayMillis = Math.min(
        this.reconnectDelayMillis * 2,
        RECONNECT_MAX_MILLIS,
      );
    }
    if (this.lastStatus !== null && this.isLost(this.lastStatus)) {
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
      this.lastStatus !== null &&
      this.lastStatus.kind === 'status' &&
      this.lastStatus.mode === RPCMixnetModeEnum.bootstrapping
    );
  }

  private publishSeq: number = 0;

  private publish(status: MixnetStatusReport): void {
    if (this.stopped) {
      return;
    }
    const wasBootstrapping = this.isBootstrapping();
    // Maintain the sticky recovery flag before publishing, so the view carries
    // it. A settled state (ready, or a consented off) ends the cycle; a lost
    // status starts one; bootstrapping leaves it as-is so a reconnect attempt
    // stays flagged as it comes back up.
    const settled =
      status.kind === 'status' &&
      (status.mode === RPCMixnetModeEnum.ready ||
        status.mode === RPCMixnetModeEnum.off);
    if (settled) {
      this.reconnectActive = false;
      this.resetReconnectBackoff();
    } else if (this.isLost(status)) {
      this.reconnectActive = true;
    }
    this.lastStatus = status;
    this.publishSeq += 1;
    this.publishView(status, this.publishSeq);
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

  private async publishView(
    status: MixnetStatusReport,
    seq: number,
  ): Promise<void> {
    const narration = this.isBootstrapping()
      ? await getMixnetBootstrapDetail()
      : null;
    // The narration await opened a gap; a newer publication may have
    // superseded this one meanwhile, and stale state must not reach the
    // screen (#1228).
    if (!isCurrentPublication(seq, this.publishSeq)) {
      return;
    }
    this.onChange(deriveMixnetView(status, narration, this.reconnectActive));
  }
}
