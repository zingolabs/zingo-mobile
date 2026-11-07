import swapStorage from './swapStorage';

import { SwapRecordType } from './types/SwapRecordType';
import { swapAddressOf } from './shieldedPurchase';

/** Every record but the markers a removal leaves. */
const live = (records: SwapRecordType[]): SwapRecordType[] =>
  records.filter(r => r.removedAtMs === undefined);

/**
 * Clear a key by overwriting it with a valid but empty payload and then
 * removing it.
 *
 * The overwrite is what carries the guarantee. Each key is a file, and a
 * delete can fail for reasons that have nothing to do with this wallet: a
 * backup agent or a virus scanner holding a handle open is enough on Windows.
 * Writing `[]` first means the records are gone from disk either way, and a
 * key that survives the removal reads back as an empty bucket rather than as
 * the wallet's swap history.
 *
 * A failed removal is silent for that reason. A failed overwrite is not, since
 * that is the case where the records are still there.
 */
async function markKeyAsCleared(
  key: string,
  emptyPayload: string,
): Promise<void> {
  try {
    await swapStorage.setItem(key, emptyPayload);
  } catch (err) {
    // If we can't even overwrite, log and move on. Future reads will
    // return whatever was there (parseable or not); the read paths
    // tolerate both.
    const msg = err instanceof Error ? err.message : String(err);
    console.log(`SwapStore: markKeyAsCleared(${key}) setItem failed:`, msg);
    return;
  }
  try {
    await swapStorage.removeItem(key);
  } catch {
    // Removal is best-effort; the overwrite above is what actually
    // makes future reads harmless. Swallow silently — no log noise.
  }
}

/**
 * Parse a raw string as a JSON array of `SwapRecordType`. Returns `null` on
 * any failure so callers can distinguish "invalid data, discard" from
 * "empty array, keep". Used to validate a bucket before we act on it.
 */
function tryParseRecordsArray(raw: string): SwapRecordType[] | null {
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as SwapRecordType[]) : null;
  } catch {
    return null;
  }
}

/**
 * Persistent store for `SwapRecord`s.
 *
 * Backed by `swapStorage`, the app's key-value store. Records carry
 * swap-tracking metadata rather than seeds or keys.
 *
 * Storage layout — one key per wallet, holding a single JSON array:
 *   - One `swapStorage` entry under `storageKeyFor(fingerprint)` holding
 *     the whole `SwapRecord[]`. Writes are full-array overwrites.
 *
 * Why one key (vs one per record + an index):
 *   - The number of records per wallet is small (tens, maybe low hundreds over
 *     a wallet's lifetime). Loading the whole array into memory is fine and
 *     keeps the storage layout obvious.
 *   - A separate index file would need to be kept in sync with per-record
 *     entries; a single key eliminates that class of bug entirely.
 *
 * Concurrency — promise-chain mutex:
 *   - All public methods enqueue onto a single static promise chain so that
 *     read-modify-write operations cannot interleave. This rules out the
 *     classic race where two concurrent `upsert` calls both read `[A, B]`,
 *     each mutate locally, and the later `writeAll` clobbers the earlier
 *     one's change. Inside a queued operation we call the private `_readRaw`
 *     / `_writeRaw` helpers which bypass the queue to avoid self-deadlock.
 *   - Reads go through the queue too so the caller sees read-after-write
 *     consistency relative to in-flight mutations. The cost is a few ms of
 *     extra wait on the (rare) overlap; the benefit is one less class of
 *     subtle bugs to reason about.
 *   - Failures in one queued operation do not stop the chain. The original
 *     caller observes the rejection on the promise we returned; the queue
 *     itself stores the swallowed-error variant so subsequent enqueues run.
 *
 * No partial recovery: if `swapStorage` returns malformed JSON we treat
 * the store as empty rather than throwing — the activity list would still
 * show the unaffected records on next swap. Storage corruption of swap
 * tracking is not a wallet-fatal event.
 */
/**
 * Storage key for the current wallet's swap bucket. The suffix is the
 * wallet's UFVK-derived fingerprint (see `walletFingerprint.ts`). Different
 * wallets on the same device write to different keys; that is the privacy
 * boundary.
 */
export const SWAP_RECORDS_KEY_PREFIX = 'swap:records:';

function storageKeyFor(fingerprint: string): string {
  return SWAP_RECORDS_KEY_PREFIX + fingerprint;
}

/**
 * Module-level binding to the currently-loaded wallet. Set by
 * `SwapStore.bindToWallet`; read by every storage operation. While `null`,
 * read-paths return empty and write-paths no-op so the activity list never
 * surfaces records from a wallet that is not the current one.
 */
let currentWalletFingerprint: string | null = null;

/**
 * Callback fired after every mutation that successfully reaches storage.
 * The callback receives the post-mutation array so consumers don't have to
 * re-read. Listeners are notified after the write completes so a
 * crash between mutate and notify never leaves a subscriber thinking a swap
 * exists that wasn't persisted.
 */
export type SwapStoreChangeListener = (records: SwapRecordType[]) => void;

export class SwapStore {
  /** Serialises all public read/write operations against swapStorage. */
  private static queue: Promise<unknown> = Promise.resolve();

  /** Live change-subscription set. The poller and the React context layer
   *  both register here so a single upsert (from a poller tick, a fresh
   *  commit, etc.) fans out to every consumer. */
  private static listeners: Set<SwapStoreChangeListener> = new Set();

  /**
   * Register a listener for record mutations. The returned function removes
   * the listener on call — typical pattern is to register in a React effect
   * and return the unsubscribe so React invokes it on unmount.
   *
   * The listener is invoked synchronously after each successful mutation,
   * with the freshly-persisted record list. Errors thrown by listeners are
   * caught and logged so a bad subscriber cannot break sibling subscribers
   * or the writing operation.
   */
  static subscribe(listener: SwapStoreChangeListener): () => void {
    SwapStore.listeners.add(listener);
    return () => {
      SwapStore.listeners.delete(listener);
    };
  }

  private static notify(records: SwapRecordType[]): void {
    const shown = live(records);
    for (const listener of SwapStore.listeners) {
      try {
        listener(shown);
      } catch (err) {
        console.log('SwapStore: listener threw, swallowing:', err);
      }
    }
  }

  private static enqueue<T>(op: () => Promise<T>): Promise<T> {
    const previous = SwapStore.queue;
    const next = (async () => {
      try {
        await previous;
      } catch {
        // Swallow prior operation's error — the original caller already saw
        // it on the promise we returned to them. We just want the chain to
        // keep moving so later enqueues are not blocked by a single failure.
      }
      return op();
    })();
    SwapStore.queue = next.catch(() => undefined);
    return next;
  }

  /** Read all records. Returns an empty array on first install or storage error. */
  static async readAll(): Promise<SwapRecordType[]> {
    return this.enqueue(async () => live(await this._readRaw()));
  }

  /**
   * The swaps the user removed that had made an address of the wallet, kept
   * as markers without their swap ID so the address still reads as a swap's.
   * Nothing else sees them: readAll and every lookup leave them out.
   */
  static async readRemoved(): Promise<SwapRecordType[]> {
    return this.enqueue(async () =>
      (await this._readRaw()).filter(r => r.removedAtMs !== undefined),
    );
  }

  /** Replace the entire record list. Callers should rarely use this directly. */
  static async writeAll(records: SwapRecordType[]): Promise<void> {
    return this.enqueue(async () => {
      const markers = (await this._readRaw()).filter(
        r => r.removedAtMs !== undefined,
      );
      const all = [
        ...records,
        ...markers.filter(m => !records.some(r => r.recordId === m.recordId)),
      ];
      await this._writeRaw(all);
      SwapStore.notify(all);
    });
  }

  /**
   * Insert or replace the record identified by `recordId`. Matches by the
   * primary key (`recordId`) and rewrites the whole array. `depositAddress`
   * is intentionally NOT used as the lookup key here — Maya/THORChain
   * inbound swaps reuse the same rotating vault address across concurrent
   * commits, so depositAddress collisions are expected and would silently
   * overwrite distinct swaps. `recordId` is the locally-minted random id
   * that disambiguates.
   */
  static async upsert(record: SwapRecordType): Promise<void> {
    return this.enqueue(async () => {
      const all = await this._readRaw();
      const idx = all.findIndex(r => r.recordId === record.recordId);
      if (idx >= 0) {
        all[idx] = record;
      } else {
        all.push(record);
      }
      await this._writeRaw(all);
      SwapStore.notify(all);
    });
  }

  /**
   * Rewrites one record from what is stored at this moment, inside the queue.
   * A write worked out from a copy read earlier undoes whatever reached the
   * record since: a broadcast marked while `/track` was answering, or a delete
   * brought back. Resolves to the record now stored, or undefined when it is
   * gone. Handing back the same object writes nothing.
   */
  static async update(
    recordId: string,
    change: (current: SwapRecordType) => SwapRecordType,
  ): Promise<SwapRecordType | undefined> {
    return this.enqueue(async () => {
      const all = await this._readRaw();
      const idx = all.findIndex(r => r.recordId === recordId);
      if (idx < 0) return undefined;
      const next = change(all[idx]);
      if (next === all[idx]) return next;
      all[idx] = next;
      await this._writeRaw(all);
      SwapStore.notify(all);
      return next;
    });
  }

  /** Look up a single record by its locally-minted primary key. */
  static async getByRecordId(
    recordId: string,
  ): Promise<SwapRecordType | undefined> {
    return this.enqueue(async () => {
      const all = await this._readRaw();
      return live(all).find(r => r.recordId === recordId);
    });
  }

  /**
   * Look up records by `depositAddress`. With the recordId-keyed store this
   * is a scan, and may return multiple matches when Maya/THORChain rotates
   * the vault slowly enough that several commits share an inbound address.
   * Callers that need a single record should disambiguate by recordId
   * before calling — this helper is mostly here for diagnostics and for the
   * narrow legacy path that only ever has a depositAddress in hand.
   */
  static async findByDepositAddress(
    depositAddress: string,
  ): Promise<SwapRecordType[]> {
    return this.enqueue(async () => {
      const all = await this._readRaw();
      return live(all).filter(r => r.depositAddress === depositAddress);
    });
  }

  /** Remove a record by its primary key. No-op if not present. */
  static async deleteByRecordId(recordId: string): Promise<void> {
    return this.enqueue(async () => {
      const all = await this._readRaw();
      const removed = all.find(
        r => r.recordId === recordId && r.removedAtMs === undefined,
      );
      if (!removed) return;
      const next = swapAddressOf(removed)
        ? all.map(r =>
            r.recordId === recordId
              ? { ...r, swapKitInternalId: undefined, removedAtMs: Date.now() }
              : r,
          )
        : all.filter(r => r.recordId !== recordId);
      await this._writeRaw(next);
      SwapStore.notify(next);
    });
  }

  /**
   * Bind the store to the wallet identified by `fingerprint`. Must be called
   * before any read/write path returns useful data — until then `readAll`
   * yields `[]` and writes are no-ops (the activity list shows nothing
   * rather than risking exposure of records from a different wallet).
   *
   * After binding, all current subscribers are notified with the freshly-
   * loaded bucket so any reader that called `readAll` before the bind
   * resolved gets the real data via the subscription rather than the
   * empty placeholder.
   */
  static async bindToWallet(fingerprint: string): Promise<void> {
    return this.enqueue(async () => {
      currentWalletFingerprint = fingerprint;
      // Push the current bucket out to subscribers so anyone that read
      // before the bind sees the real records now.
      const fresh = await this._readRaw();
      SwapStore.notify(fresh);
    });
  }

  /**
   * Release the binding, so read paths return empty and writes no-op again.
   *
   * The binding is module state that outlives any one screen, so without this
   * it keeps naming the previous wallet's bucket from the moment a wallet is
   * closed until the next `bindToWallet` resolves. That gap is short, but a
   * read landing inside it answers with records belonging to a wallet that is
   * no longer open — the exact cross-wallet exposure the namespacing exists to
   * prevent.
   *
   * Queued like every other operation, so it cannot cut in front of a write
   * that is still finishing against the wallet being left.
   */
  static async unbind(): Promise<void> {
    return this.enqueue(async () => {
      currentWalletFingerprint = null;
      SwapStore.notify([]);
    });
  }

  /**
   * Wipe the records for a specific wallet's bucket. Called through
   * `WalletLocalData` on every path that deletes or replaces the wallet
   * file, so its swap records do not outlive it.
   */
  static async clearForWallet(fingerprint: string): Promise<void> {
    return this.enqueue(async () => {
      // Overwrite to `[]` (and best-effort remove) so future binds see a
      // clean empty bucket even if the platform rejects the removal.
      await markKeyAsCleared(storageKeyFor(fingerprint), '[]');
      if (fingerprint === currentWalletFingerprint) {
        SwapStore.notify([]);
      }
    });
  }

  /**
   * Wipe the current wallet's records. No-op if no wallet is bound (we
   * cannot know which bucket to target). Callers that hold an explicit
   * fingerprint should prefer `clearForWallet`.
   */
  static async clear(): Promise<void> {
    if (!currentWalletFingerprint) return;
    return this.clearForWallet(currentWalletFingerprint);
  }

  /** Bypasses the queue — only call from within an `enqueue` callback. */
  private static async _readRaw(): Promise<SwapRecordType[]> {
    if (!currentWalletFingerprint) return [];
    const key = storageKeyFor(currentWalletFingerprint);
    let raw: string | null = null;
    try {
      raw = await swapStorage.getItem(key);
    } catch (err) {
      console.log('SwapStore: read failed, returning empty:', err);
      return [];
    }
    if (raw === null) return [];
    const parsed = tryParseRecordsArray(raw);
    if (parsed === null) {
      // Corrupt or non-array data. Self-heal by overwriting with `[]` so
      // future reads succeed cleanly and we don't log the same parse
      // failure every time the poller or a subscriber tick reads the
      // bucket. Log once, then move on.
      console.log('SwapStore: live bucket unparseable, healing with []');
      try {
        await swapStorage.setItem(key, '[]');
      } catch {
        // Best-effort. If setItem also fails we still return empty —
        // the app keeps working; only the log noise persists.
      }
      return [];
    }
    return parsed;
  }

  /** Bypasses the queue — only call from within an `enqueue` callback. */
  private static async _writeRaw(records: SwapRecordType[]): Promise<void> {
    if (!currentWalletFingerprint) {
      console.log('SwapStore: write skipped — no wallet bound');
      return;
    }
    await swapStorage.setItem(
      storageKeyFor(currentWalletFingerprint),
      JSON.stringify(records),
    );
  }
}
