/**
 * Drives the Mixnet Mode lifecycle for the app (send-over-nym step 5).
 *
 * Policy (ADR 0011, zingolib): Mixnet Mode is forced on for every
 * connected session and never persisted — `ensureForConnectedSession`
 * runs at wallet load, starts the platform transport through the injected
 * seam, and attaches the wallet to its address. Turning it off is a
 * deliberate per-session consent (`disable`), and a `died` transport is
 * recovered only by an explicit re-enable (`reenable`), never silently.
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
  MixnetStatusReport,
  describeRejection,
} from '../transforms/mixnetTransform';
import {
  MixnetView,
  deriveMixnetView,
} from '../transforms/mixnetPresenter';
import {
  attachMixnet,
  disableMixnet,
  getMixnetBootstrapDetail,
  getMixnetDeathDetail,
  getMixnetStatus,
} from '../utils/mixnetUtils';
import { recordMixnetTransportReady } from '../utils/mixnetGate';

/**
 * Starts the platform-hosted mixnet transport and yields its local SOCKS5
 * address. Rejections propagate to the caller.
 */
export type StartMixnetTransport = () => Promise<string>;

/** How often the coordinator polls while the transport is bootstrapping. */
const BOOTSTRAP_POLL_MILLIS = 2_000;

/** How often the coordinator polls outside of bootstrapping. */
const STEADY_POLL_MILLIS = 30_000;

/**
 * How long an auto-recovering coordinator waits after a failure, `died`, or
 * unconsented `off` before starting the transport afresh.
 */
export const RECOVERY_RETRY_MILLIS = 60_000;

export class MixnetCoordinator {
  private readonly startTransport: StartMixnetTransport;
  private readonly onChange: (view: MixnetView) => void;
  private readonly autoRecover: boolean;

  private pollTimerID?: ReturnType<typeof setInterval>;
  private recoveryTimerID?: ReturnType<typeof setTimeout>;
  private pollLock: boolean = false;
  private lastStatus: MixnetStatusReport | null = null;

  /**
   * `autoRecover` is the always-on flavors' recovery path: with the mixnet
   * UI withheld there is no human re-enable, so a failure, a `died`
   * transport, or an unconsented `off` schedules a fresh
   * [`ensureForConnectedSession`] after [`RECOVERY_RETRY_MILLIS`]. Stock
   * builds leave it false: there, recovery is the user's deliberate act.
   */
  constructor(
    startTransport: StartMixnetTransport,
    onChange: (view: MixnetView) => void,
    autoRecover: boolean = false,
  ) {
    this.startTransport = startTransport;
    this.onChange = onChange;
    this.autoRecover = autoRecover;
  }

  /**
   * The forced-on policy for a connected session: start the platform
   * transport, attach the wallet to its address, and begin polling. A
   * failure at either stage is published as the typed failure view — the
   * session proceeds, sends stay blocked, and the user is offered
   * re-enable — never a silent fall-through to clearnet.
   */
  async ensureForConnectedSession(): Promise<void> {
    try {
      const socks5Addr = await this.startTransport();
      this.publish(await attachMixnet(socks5Addr));
    } catch (thrown: unknown) {
      // Dev diagnostic: the failure view the screens render carries no
      // detail, and the silent alpha flavors render nothing at all.
      console.log('mixnet enable failed:', thrown);
      this.publish({ kind: 'failure', failure: describeRejection(thrown) });
    }
    this.schedulePolling();
  }

  /** The user's deliberate per-session consent to clearnet. */
  async disable(): Promise<void> {
    this.publish(await disableMixnet());
  }

  /** Recover a died or failed transport by starting it afresh. */
  async reenable(): Promise<void> {
    await this.ensureForConnectedSession();
  }

  /** Stops polling and recovery; the coordinator publishes nothing further. */
  stop(): void {
    this.clearPollTimer();
    if (this.recoveryTimerID !== undefined) {
      clearTimeout(this.recoveryTimerID);
      this.recoveryTimerID = undefined;
    }
    // A stopped coordinator can vouch for nothing: fail closed.
    recordMixnetTransportReady(false);
  }

  /**
   * Clears only the poll interval. `schedulePolling` reschedules through
   * this rather than [`stop`]: a reschedule must not close the fail-closed
   * gate or cancel a pending recovery attempt.
   */
  private clearPollTimer(): void {
    if (this.pollTimerID !== undefined) {
      clearInterval(this.pollTimerID);
      this.pollTimerID = undefined;
    }
  }

  /**
   * Whether the last observed transport state permits a fail-closed send:
   * only a live `ready` report qualifies. The always-on send gate consults
   * this; the stock flavors gate through the view's `sendBlocked` instead.
   */
  isReady(): boolean {
    return (
      this.lastStatus !== null &&
      this.lastStatus.kind === 'status' &&
      this.lastStatus.mode === RPCMixnetModeEnum.ready
    );
  }

  private async pollOnce(): Promise<void> {
    if (this.pollLock) {
      return;
    }
    this.pollLock = true;
    try {
      this.publish(await getMixnetStatus());
    } finally {
      this.pollLock = false;
    }
  }

  private schedulePolling(): void {
    this.clearPollTimer();
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

  private publish(status: MixnetStatusReport): void {
    const wasBootstrapping = this.isBootstrapping();
    this.lastStatus = status;
    // Mirror readiness into the module gate for the detached price path.
    recordMixnetTransportReady(this.isReady());
    this.publishView(status);
    if (this.pollTimerID !== undefined && wasBootstrapping !== this.isBootstrapping()) {
      this.schedulePolling();
    }
    this.maybeScheduleRecovery();
  }

  /**
   * The always-on recovery loop: a failure report, a `died` transport, or
   * an unconsented `off` (an enable that never succeeded — always-on has
   * no consent path to `off`) schedules one fresh enable attempt. A failed
   * attempt publishes a failure and thereby schedules the next, so the
   * loop persists at [`RECOVERY_RETRY_MILLIS`] until the transport is up.
   */
  private maybeScheduleRecovery(): void {
    if (!this.autoRecover || this.recoveryTimerID !== undefined) {
      return;
    }
    const needsRecovery =
      this.lastStatus !== null &&
      (this.lastStatus.kind === 'failure' ||
        this.lastStatus.mode === RPCMixnetModeEnum.off ||
        this.lastStatus.mode === RPCMixnetModeEnum.died);
    if (!needsRecovery) {
      return;
    }
    this.recoveryTimerID = setTimeout(() => {
      this.recoveryTimerID = undefined;
      this.ensureForConnectedSession();
    }, RECOVERY_RETRY_MILLIS);
  }

  private async publishView(status: MixnetStatusReport): Promise<void> {
    const narration = this.isBootstrapping()
      ? await getMixnetBootstrapDetail()
      : null;
    const death =
      status.kind === 'status' && status.mode === RPCMixnetModeEnum.died
        ? await getMixnetDeathDetail()
        : null;
    this.onChange(deriveMixnetView(status, narration, death));
  }
}
