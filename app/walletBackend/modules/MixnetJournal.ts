import { filter, takeRight } from 'lodash';

export type MixnetJournalKind =
  | 'draw'
  | 'bound'
  | 'refused'
  | 'status'
  | 'redraw'
  | 'retry'
  | 'offline'
  | 'proxy-death';

export type MixnetJournalEntry = {
  readonly atMillis: number;
  readonly kind: MixnetJournalKind;
  readonly text: string;
};

/** A night of retries at the 60 s ceiling, each writing a few lines. */
export const MIXNET_JOURNAL_LIMIT = 1000;

const LOSS_WINDOW_MILLIS = 10 * 60 * 1000;

/**
 * What happened to the transport this session, read by the Mixnet Doctor.
 *
 * The evidence does not wait for anyone: the causes used to go to a system log
 * that rotates within minutes, and by the time the screen is opened the backoff
 * has replaced the proxy that gave them. Held in memory only, because it is a
 * record of when this wallet was active, and it reaches a disk only if the user
 * pastes the report somewhere.
 */
export class MixnetJournal {
  private entries: readonly MixnetJournalEntry[] = [];

  note(kind: MixnetJournalKind, text: string): void {
    this.entries = takeRight(
      [...this.entries, { atMillis: Date.now(), kind, text }],
      MIXNET_JOURNAL_LIMIT,
    );
  }

  list(): readonly MixnetJournalEntry[] {
    return this.entries;
  }

  count(kind: MixnetJournalKind): number {
    return filter(this.entries, entry => entry.kind === kind).length;
  }

  recentLosses(nowMillis: number): number {
    return filter(
      this.entries,
      entry =>
        entry.kind === 'retry' &&
        nowMillis - entry.atMillis <= LOSS_WINDOW_MILLIS,
    ).length;
  }

  clear(): void {
    this.entries = [];
  }
}

export const mixnetJournal = new MixnetJournal();

/** Exit identities run to a hundred characters; the start tells them apart. */
export function shortExit(exit: string): string {
  return exit.length > 12 ? `${exit.slice(0, 12)}…` : exit;
}
