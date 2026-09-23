import { RPCMixnetIndicatorEnum } from '@app/walletBackend/enums/RPCMixnetIndicatorEnum';
import {
  MixnetStatusReport,
  describeRejection,
  vetPolledStatus,
} from '@app/walletBackend/transforms/mixnetTransform';
import {
  MixnetView,
  deriveMixnetView,
} from '@app/walletBackend/transforms/mixnetView';
import {
  attachMixnet,
  getMixnetBootstrapDetail,
  getMixnetStatus,
} from '@app/walletBackend/utils/mixnetUtils';

export type MixnetTransportBinding = {
  socks5Addr: string;
  exitNode: string;
};

export type StartMixnetTransport = () => Promise<MixnetTransportBinding>;

export function isCurrentPublication(seq: number, latest: number): boolean {
  return seq === latest;
}

const STARTING_REPORT: MixnetStatusReport = {
  kind: 'status',
  indicator: RPCMixnetIndicatorEnum.bootstrapping,
  socks5Addr: null,
};

export const BOOTSTRAP_POLL_MILLIS = 2_000;

export const STEADY_POLL_MILLIS = 30_000;

export const RECONNECT_BASE_MILLIS = 3_000;

export const RECONNECT_MAX_MILLIS = 60_000;

// Arms the mixnet transport at wallet load, polls its status, and auto-recovers a lost transport.
export class MixnetCoordinator {
  private readonly startTransport: StartMixnetTransport;
  private readonly onChange: (view: MixnetView) => void;

  private pollTimerID?: ReturnType<typeof setInterval>;
  private pollLock: boolean = false;
  private lastStatus: MixnetStatusReport | null = null;
  private reconnectTimerID?: ReturnType<typeof setTimeout>;
  private reconnectDelayMillis: number = RECONNECT_BASE_MILLIS;
  private reconnecting: boolean = false;
  private reconnectActive: boolean = false;
  private enableEpoch: number = 0;
  private stopped: boolean = false;

  constructor(
    startTransport: StartMixnetTransport,
    onChange: (view: MixnetView) => void,
  ) {
    this.startTransport = startTransport;
    this.onChange = onChange;
  }

  // Starts the transport, attaches the wallet, and polls; a failure publishes the typed failure view.
  async ensureForConnectedSession(): Promise<void> {
    const epoch = ++this.enableEpoch;
    this.clearPolling();
    this.clearReconnectTimer();
    this.publishStarting();
    try {
      const { socks5Addr, exitNode } = await this.startTransport();
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
      this.publish({ kind: 'failure', failure: describeRejection(thrown) });
    }
    this.schedulePolling();
  }

  async reenable(): Promise<void> {
    await this.ensureForConnectedSession();
  }

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

  private isLost(status: MixnetStatusReport): boolean {
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
    this.reconnecting = true;
    try {
      await this.ensureForConnectedSession();
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
      const status = vetPolledStatus(await getMixnetStatus());
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

  private publishStarting(): void {
    if (this.stopped) {
      return;
    }
    this.lastStatus = STARTING_REPORT;
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
