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
  ClearnetConsent,
  MixnetStatusReport,
  describeRejection,
  vetPolledStatus,
} from '../transforms/mixnetTransform';
import {
  MixnetView,
  deriveMixnetView,
} from '../transforms/mixnetPresenter';
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

export class MixnetCoordinator {
  private readonly startTransport: StartMixnetTransport;
  private readonly onChange: (view: MixnetView) => void;

  private pollTimerID?: ReturnType<typeof setInterval>;
  private pollLock: boolean = false;
  private lastStatus: MixnetStatusReport | null = null;
  // The consent bit belongs to the coordinator, not the wallet: the wallet
  // reports `off` both for a deliberate disable and for a never-attached
  // session, and only the former is consent (#1226).
  private consent: ClearnetConsent = 'none';

  constructor(
    startTransport: StartMixnetTransport,
    onChange: (view: MixnetView) => void,
  ) {
    this.startTransport = startTransport;
    this.onChange = onChange;
  }

  /**
   * The forced-on policy for a connected session: start the platform
   * transport, attach the wallet to its address, and begin polling. A
   * failure at either stage is published as the typed failure view — the
   * session proceeds, sends stay blocked, and the user is offered
   * re-enable — never a silent fall-through to clearnet.
   */
  async ensureForConnectedSession(): Promise<void> {
    this.consent = 'none';
    try {
      const socks5Addr = await this.startTransport();
      this.publish(await attachMixnet(socks5Addr));
    } catch (thrown: unknown) {
      this.publish({ kind: 'failure', failure: describeRejection(thrown) });
    }
    this.schedulePolling();
  }

  /** The user's deliberate per-session consent to clearnet. */
  async disable(): Promise<void> {
    this.consent = 'disabledThisSession';
    this.publish(await disableMixnet());
  }

  /** Recover a died or failed transport by starting it afresh. */
  async reenable(): Promise<void> {
    await this.ensureForConnectedSession();
  }

  /** Stops polling; the coordinator publishes nothing further. */
  stop(): void {
    if (this.pollTimerID !== undefined) {
      clearInterval(this.pollTimerID);
      this.pollTimerID = undefined;
    }
  }

  private async pollOnce(): Promise<void> {
    if (this.pollLock) {
      return;
    }
    this.pollLock = true;
    try {
      this.publish(vetPolledStatus(await getMixnetStatus(), this.consent));
    } finally {
      this.pollLock = false;
    }
  }

  private schedulePolling(): void {
    this.stop();
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
    const wasBootstrapping = this.isBootstrapping();
    this.lastStatus = status;
    this.publishSeq += 1;
    this.publishView(status, this.publishSeq);
    if (this.pollTimerID !== undefined && wasBootstrapping !== this.isBootstrapping()) {
      this.schedulePolling();
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
    this.onChange(deriveMixnetView(status, narration));
  }
}
