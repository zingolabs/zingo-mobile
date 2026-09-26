import { RPCMixnetIndicatorEnum } from '@app/walletBackend/enums/RPCMixnetIndicatorEnum';
import {
  MixnetStatusReport,
  describeRejection,
} from '@app/walletBackend/transforms/mixnetTransform';
import {
  MixnetView,
  deriveMixnetView,
} from '@app/walletBackend/transforms/mixnetView';
import {
  attachMixnet,
  disableMixnet,
  getMixnetBootstrapDetail,
  getMixnetStatus,
} from '@app/walletBackend/utils/mixnetUtils';

export type MixnetTransportBinding = {
  socks5Addr: string;
  exitNode: string;
};

export type StartMixnetTransport = () => Promise<MixnetTransportBinding>;

export type StopMixnetTransport = () => Promise<void>;

export function isCurrentPublication(seq: number, latest: number): boolean {
  return seq === latest;
}

// A status report for an indicator that carries no SOCKS5 address.
function statusReport(indicator: RPCMixnetIndicatorEnum): MixnetStatusReport {
  return { kind: 'status', indicator, socks5Addr: null };
}

// The failure report for a rejected transport act.
function failureReport(thrown: unknown): MixnetStatusReport {
  return { kind: 'failure', failure: describeRejection(thrown) };
}

const STARTING_REPORT = statusReport(RPCMixnetIndicatorEnum.bootstrapping);

const OFF_REPORT = statusReport(RPCMixnetIndicatorEnum.off);

export const BOOTSTRAP_POLL_MILLIS = 2_000;

export const STEADY_POLL_MILLIS = 30_000;

export const RECONNECT_BASE_MILLIS = 3_000;

export const RECONNECT_MAX_MILLIS = 60_000;

// How long one draw gets to prove itself before the app draws again.
//
// The wallet's readiness gate spends ATTACH_READINESS_BUDGET on a draw that
// never answers — two 30 s round trips plus a pause, 61 s — and it spends it
// on the SAME gateway and exit, because it retries the probe, never the
// draw. Field logs (2026-09-24) show roughly half the draws never answering
// at all, so a bad one costs a full minute before anything redraws: one
// measured Offline -> Online took 82 s, 61 of them a single dud.
//
// A healthy draw is listening in ~6 s and proven ~1 s later. Twenty seconds
// is generous for a good draw, including the tails that intermittently blow
// a 15 s bound, and a third of the wait for a bad one. Redrawing costs one
// birth, ~6 s.
export const BOOTSTRAP_DEADLINE_MILLIS = 20_000;

// Consecutive redraws before the app stops drawing and lets the transport
// settle into the ordinary lost-and-reconnect path with its backoff. Three
// bad draws is where luck stops being the explanation, and redrawing forever
// would re-fetch the whole node topology every ~26 s.
export const BOOTSTRAP_REDRAW_LIMIT = 3;

// Arms the mixnet transport for a connected session, polls its status,
// auto-recovers a lost transport, and tears the whole thing down when the
// session goes Offline.
export class MixnetCoordinator {
  private readonly startTransport: StartMixnetTransport;
  private readonly onChange: (view: MixnetView) => void;
  private readonly stopTransport: StopMixnetTransport;

  private pollTimerID?: ReturnType<typeof setInterval>;
  private pollLock: boolean = false;
  private lastStatus: MixnetStatusReport | null = null;
  private reconnectTimerID?: ReturnType<typeof setTimeout>;
  private bootstrapTimerID?: ReturnType<typeof setTimeout>;
  private redrawsSpent: number = 0;
  private reconnectDelayMillis: number = RECONNECT_BASE_MILLIS;
  private reconnecting: boolean = false;
  private reconnectActive: boolean = false;
  private enableEpoch: number = 0;
  private stopped: boolean = false;
  private sessionOffline: boolean = false;
  private startsInFlight: number = 0;

  constructor(
    startTransport: StartMixnetTransport,
    onChange: (view: MixnetView) => void,
    stopTransport: StopMixnetTransport,
  ) {
    this.startTransport = startTransport;
    this.onChange = onChange;
    this.stopTransport = stopTransport;
  }

  // Starts the transport, attaches the wallet, and polls; a failure publishes the typed failure view.
  async ensureForConnectedSession(): Promise<void> {
    this.sessionOffline = false;
    await this.draw();
  }

  private async draw(): Promise<void> {
    const epoch = ++this.enableEpoch;
    this.clearTimers();
    this.publishStarting();
    try {
      let binding: MixnetTransportBinding;
      this.startsInFlight += 1;
      try {
        binding = await this.startTransport();
      } finally {
        this.startsInFlight -= 1;
      }
      const { socks5Addr, exitNode } = binding;
      if (this.enableEpoch !== epoch) {
        return;
      }
      const status = await attachMixnet(socks5Addr, exitNode);
      if (this.enableEpoch !== epoch) {
        return;
      }
      this.publish(status);
    } catch (thrown: unknown) {
      if (this.enableEpoch !== epoch) {
        return;
      }
      this.publish(failureReport(thrown));
    }
    this.schedulePolling();
  }

  async reenable(): Promise<void> {
    this.redrawsSpent = 0;
    await this.ensureForConnectedSession();
  }

  // The transport half of the go-offline moment: an Offline session holds no
  // tunnel, so the shim dies here and the mode rests at `off`. Idempotent —
  // a session that never armed anything still lands the published `off` view,
  // which is what the header reports.
  //
  // Order matters: the wallet's slot is vacated BEFORE the shim is stopped.
  // The other way round, the standing watchdog sees a live slot lose its
  // endpoint, calls it an unconsented death, and the app chases a reconnect
  // it caused itself.
  async goOffline(): Promise<void> {
    const epoch = ++this.enableEpoch;
    this.sessionOffline = true;
    this.clearTimers();
    this.resetReconnectBackoff();
    this.reconnectActive = false;
    this.redrawsSpent = 0;
    const disabled = await disableMixnet();
    try {
      await this.stopTransport();
    } catch (thrown: unknown) {
      if (this.enableEpoch !== epoch) {
        return;
      }
      // A tunnel we failed to stop is the one thing that must not read as
      // off: it may still be carrying traffic, so it reports as trouble.
      this.publish(failureReport(thrown));
      return;
    }
    if (this.enableEpoch !== epoch) {
      return;
    }
    // The tunnel is down, so the mode is off — whatever the wallet's own
    // bookkeeping managed to answer.
    this.publish(disabled.kind === 'status' ? disabled : OFF_REPORT);
  }

  stop(): void {
    this.stopped = true;
    this.enableEpoch += 1;
    this.clearTimers();
    this.resetReconnectBackoff();
  }

  // Cancels the poll, the reconnect, and the bootstrap deadline.
  private clearTimers(): void {
    this.clearPolling();
    this.clearReconnectTimer();
    this.clearBootstrapDeadline();
  }

  private clearPolling(): void {
    if (this.pollTimerID !== undefined) {
      clearInterval(this.pollTimerID);
      this.pollTimerID = undefined;
    }
  }

  private clearBootstrapDeadline(): void {
    if (this.bootstrapTimerID !== undefined) {
      clearTimeout(this.bootstrapTimerID);
      this.bootstrapTimerID = undefined;
    }
  }

  // Armed while a draw is still bootstrapping, disarmed the moment it
  // settles either way. Past the redraw limit it is never armed again, so
  // the last draw runs its full course into the wallet's own gate and the
  // reconnect backoff takes it from there.
  private armBootstrapDeadline(): void {
    if (
      this.stopped ||
      this.bootstrapTimerID !== undefined ||
      this.redrawsSpent >= BOOTSTRAP_REDRAW_LIMIT
    ) {
      return;
    }
    this.bootstrapTimerID = setTimeout(() => {
      this.bootstrapTimerID = undefined;
      this.redraw();
    }, BOOTSTRAP_DEADLINE_MILLIS);
  }

  // The draw had its time and never proved itself, so the app draws again:
  // a fresh gateway and exit, which is the one thing the wallet's readiness
  // gate cannot do for itself. `startTransport` releases the standing proxy
  // before it starts the next one, so this replaces the draw rather than
  // stacking a second one behind it.
  private async redraw(): Promise<void> {
    if (
      this.stopped ||
      !this.isBootstrapping() ||
      this.startsInFlight > 0
    ) {
      return;
    }
    this.redrawsSpent += 1;
    await this.draw();
  }

  private isLost(status: MixnetStatusReport): boolean {
    return (
      status.kind === 'failure' ||
      status.indicator === RPCMixnetIndicatorEnum.died
    );
  }

  private scheduleReconnect(): void {
    if (
      this.reconnectTimerID !== undefined ||
      this.reconnecting ||
      this.sessionOffline
    ) {
      return;
    }
    this.reconnectTimerID = setTimeout(() => {
      this.reconnectTimerID = undefined;
      this.attemptReconnect();
    }, this.reconnectDelayMillis);
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
    this.reconnecting = true;
    try {
      await this.draw();
    } finally {
      this.reconnecting = false;
    }
    const recovered =
      this.lastStatus !== null &&
      this.lastStatus.kind === 'status' &&
      this.lastStatus.indicator === RPCMixnetIndicatorEnum.ready;
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
      const status = await getMixnetStatus();
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
      this.lastStatus.indicator === RPCMixnetIndicatorEnum.bootstrapping
    );
  }

  private publishSeq: number = 0;

  private publish(status: MixnetStatusReport): void {
    if (this.stopped) {
      return;
    }
    const wasBootstrapping = this.isBootstrapping();
    const settled =
      status.kind === 'status' &&
      status.indicator === RPCMixnetIndicatorEnum.ready;
    if (settled) {
      this.reconnectActive = false;
      this.resetReconnectBackoff();
      // A proven draw ends the streak: the next bad one starts from zero.
      this.redrawsSpent = 0;
    } else if (this.isLost(status) && !this.sessionOffline) {
      this.reconnectActive = true;
    }
    this.lastStatus = status;
    if (this.isBootstrapping()) {
      this.armBootstrapDeadline();
    } else {
      this.clearBootstrapDeadline();
    }
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

  private publishStarting(): void {
    if (this.stopped) {
      return;
    }
    this.lastStatus = STARTING_REPORT;
    // The clock starts at the attempt, not at its first status: the ~6 s
    // birth is part of what a draw is given.
    this.armBootstrapDeadline();
    this.publishSeq += 1;
    this.onChange(
      deriveMixnetView(STARTING_REPORT, null, this.reconnectActive),
    );
  }

  // A publication superseded during the narration await never reaches the screen.
  private async publishView(
    status: MixnetStatusReport,
    seq: number,
  ): Promise<void> {
    const narration = this.isBootstrapping()
      ? await getMixnetBootstrapDetail()
      : null;
    if (!isCurrentPublication(seq, this.publishSeq)) {
      return;
    }
    this.onChange(deriveMixnetView(status, narration, this.reconnectActive));
  }
}
