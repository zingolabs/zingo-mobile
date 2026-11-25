import { ServerType } from '@app/AppState';
import {
  INITIAL_SERVER_HEALTH,
  ProbeAnswer,
  ServerHealthLevel,
  ServerHealthState,
  SyncLaunch,
  isSettled,
  upToDate,
  recordAnswer,
  recordSyncLaunch,
} from './serverHealth';

/** Probes every this often while something is wrong, and only then. */
export const ACTIVE_PROBE_MS = 15_000;
/** Asks the default server this often while the wallet is on another one in Automatic. */
export const RETURN_PROBE_MS = 10 * 60_000;
/** Counters stay frozen this long after the app comes back or the network changes. */
export const GRACE_MS = 10_000;
/** Answers in a row the default server gives before it counts as back. */
export const RETURN_RUN = 2;

export type ServerHealthView = {
  level: ServerHealthLevel;
  /** The open wallet's server, '' when it has none. */
  uri: string;
  lastError: string;
  lastLatencyMs: number | null;
  /** The highest block the open wallet's server gave, 0 when none. */
  height: number;
  /** The default server answers again, up to date, while the wallet is on another in Automatic. */
  defaultBack: boolean;
  /** The default server watched for, '' when none is. */
  defaultUri: string;
};

export const INITIAL_SERVER_HEALTH_VIEW: ServerHealthView = {
  level: 'ok',
  uri: '',
  lastError: '',
  lastLatencyMs: null,
  height: 0,
  defaultBack: false,
  defaultUri: '',
};

export type Probe = (
  uri: string,
) => Promise<{ latency: number | null; height: string }>;

export type Conditions = {
  online: boolean;
  foreground: boolean;
  /** The kind of network, so a switch between Wi-Fi and data opens a grace. */
  network: string;
};

type MonitorDeps = {
  probe: Probe;
  onChange: (view: ServerHealthView) => void;
  /** A send, shield, migration or swap deposit is on its way. */
  spending: () => boolean;
  now?: () => number;
};

/**
 * Watches the open wallet's server. It never switches servers: it publishes
 * a view and the user acts on it.
 */
export class ServerHealthMonitor {
  private deps: MonitorDeps;
  private state: ServerHealthState = INITIAL_SERVER_HEALTH;
  private server: ServerType | null = null;
  private returnTo: string | null = null;
  private conditions: Conditions = {
    online: false,
    foreground: true,
    network: '',
  };
  private graceUntil = 0;
  private activeTimer: ReturnType<typeof setInterval> | null = null;
  private returnTimer: ReturnType<typeof setInterval> | null = null;
  private probing = false;
  private returnRun = 0;
  private defaultBack = false;
  private declined = false;

  constructor(deps: MonitorDeps) {
    this.deps = deps;
  }

  private now(): number {
    return (this.deps.now ?? Date.now)();
  }

  /**
   * Starts over on `server`. `returnTo` is the default server to watch for
   * while the wallet is elsewhere in Automatic, null otherwise.
   */
  watch(server: ServerType, returnTo: string | null): void {
    this.stopTimers();
    this.state = INITIAL_SERVER_HEALTH;
    this.server = server;
    this.returnTo =
      server.kind === 'remote' && returnTo && returnTo !== server.uri
        ? returnTo
        : null;
    this.returnRun = 0;
    this.defaultBack = false;
    if (this.returnTo && !this.declined) {
      this.returnTimer = setInterval(() => this.returnTick(), RETURN_PROBE_MS);
    }
    this.emit();
  }

  setConditions(next: Conditions): void {
    const prev = this.conditions;
    this.conditions = next;
    const usable = next.online && next.foreground;
    const changed =
      prev.online !== next.online ||
      prev.foreground !== next.foreground ||
      prev.network !== next.network;
    if (usable && changed) {
      this.graceUntil = this.now() + GRACE_MS;
    }
  }

  private frozen(): boolean {
    return (
      this.server?.kind !== 'remote' ||
      !this.conditions.online ||
      !this.conditions.foreground ||
      this.now() < this.graceUntil
    );
  }

  /** A direct answer of `uri`, kept only while it is the open wallet's server. */
  answer(uri: string, answer: ProbeAnswer): void {
    if (
      this.frozen() ||
      this.server?.kind !== 'remote' ||
      this.server.uri !== uri
    ) {
      return;
    }
    this.state = recordAnswer(this.state, answer);
    this.followState();
    this.emit();
  }

  syncLaunch(launch: SyncLaunch): void {
    if (this.frozen()) {
      return;
    }
    this.state = recordSyncLaunch(this.state, launch);
    this.followState();
    this.emit();
  }

  /** Probing runs while something is wrong or pending, and stops once all is fine. */
  private followState(): void {
    if (isSettled(this.state)) {
      this.stopActive();
    } else {
      this.startActive();
    }
  }

  /** The user stays on the server they are on: the default is not offered again this session. */
  decline(): void {
    this.declined = true;
    this.defaultBack = false;
    this.stopReturn();
    this.emit();
  }

  stop(): void {
    this.stopTimers();
  }

  view(): ServerHealthView {
    return {
      level: this.state.level,
      uri: this.server?.kind === 'remote' ? this.server.uri : '',
      lastError: this.state.lastError,
      lastLatencyMs: this.state.lastLatencyMs,
      height: this.state.height,
      defaultBack: this.defaultBack,
      defaultUri: this.returnTo ?? '',
    };
  }

  private emit(): void {
    this.deps.onChange(this.view());
  }

  private startActive(): void {
    if (this.activeTimer) {
      return;
    }
    this.activeTimer = setInterval(() => this.activeTick(), ACTIVE_PROBE_MS);
    this.activeTick();
  }

  private async activeTick(): Promise<void> {
    const server = this.server;
    if (this.probing || this.frozen() || server?.kind !== 'remote') {
      return;
    }
    this.probing = true;
    try {
      const probe = await this.deps.probe(server.uri);
      if (this.server !== server) {
        return;
      }
      this.answer(
        server.uri,
        probe.latency === null
          ? { kind: 'failed', error: `${server.uri} did not answer` }
          : {
              kind: 'answered',
              latencyMs: probe.latency,
              height: Number(probe.height) || 0,
            },
      );
    } finally {
      this.probing = false;
    }
  }

  private async returnTick(): Promise<void> {
    const server = this.server;
    const target = this.returnTo;
    if (
      !target ||
      this.defaultBack ||
      this.declined ||
      this.frozen() ||
      this.deps.spending()
    ) {
      return;
    }
    const probe = await this.deps.probe(target);
    if (this.server !== server || this.declined) {
      return;
    }
    const back =
      probe.latency !== null &&
      upToDate(Number(probe.height) || 0, this.state.height);
    this.returnRun = back ? this.returnRun + 1 : 0;
    if (this.returnRun >= RETURN_RUN) {
      this.defaultBack = true;
      this.stopReturn();
      this.emit();
    }
  }

  private stopActive(): void {
    if (this.activeTimer) {
      clearInterval(this.activeTimer);
      this.activeTimer = null;
    }
  }

  private stopReturn(): void {
    if (this.returnTimer) {
      clearInterval(this.returnTimer);
      this.returnTimer = null;
    }
  }

  private stopTimers(): void {
    this.stopActive();
    this.stopReturn();
  }
}
