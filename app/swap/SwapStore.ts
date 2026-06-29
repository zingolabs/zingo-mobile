import EncryptedStorage from 'react-native-encrypted-storage';

import { SwapRecordType } from './types/SwapRecordType';

/**
 * Persistent store for `SwapRecord`s.
 *
 * Backed by `react-native-encrypted-storage` (Android Keystore-backed
 * EncryptedSharedPreferences, iOS Keychain), the same primitive that
 * `SettingsFileImpl` uses for app settings. Records contain swap-tracking
 * metadata, not seeds or keys, so the encryption is precautionary rather than
 * strictly required.
 *
 * Storage layout — single key, single JSON array:
 *   - One `EncryptedStorage` entry under `STORAGE_KEY` holding the whole
 *     `SwapRecord[]`. Writes are full-array overwrites.
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
 * No partial recovery: if `EncryptedStorage` returns malformed JSON we treat
 * the store as empty rather than throwing — the activity list would still
 * show the unaffected records on next swap. Storage corruption of swap
 * tracking is not a wallet-fatal event.
 */
const STORAGE_KEY = 'swap:records';

/**
 * Callback fired after every mutation that successfully reaches storage.
 * The callback receives the post-mutation array so consumers don't have to
 * re-read. Listeners are notified after the encrypted write completes so a
 * crash between mutate and notify never leaves a subscriber thinking a swap
 * exists that wasn't persisted.
 */
export type SwapStoreChangeListener = (records: SwapRecordType[]) => void;

export class SwapStore {
  /** Serialises all public read/write operations against EncryptedStorage. */
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
    for (const listener of SwapStore.listeners) {
      try {
        listener(records);
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
    return this.enqueue(() => this._readRaw());
  }

  /** Replace the entire record list. Callers should rarely use this directly. */
  static async writeAll(records: SwapRecordType[]): Promise<void> {
    return this.enqueue(async () => {
      await this._writeRaw(records);
      SwapStore.notify(records);
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

  /** Look up a single record by its locally-minted primary key. */
  static async getByRecordId(
    recordId: string,
  ): Promise<SwapRecordType | undefined> {
    return this.enqueue(async () => {
      const all = await this._readRaw();
      return all.find(r => r.recordId === recordId);
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
      return all.filter(r => r.depositAddress === depositAddress);
    });
  }

  /** Remove a record by its primary key. No-op if not present. */
  static async deleteByRecordId(recordId: string): Promise<void> {
    return this.enqueue(async () => {
      const all = await this._readRaw();
      const next = all.filter(r => r.recordId !== recordId);
      if (next.length === all.length) return;
      await this._writeRaw(next);
      SwapStore.notify(next);
    });
  }

  /**
   * Wipe all swap records. Called from the account-deletion flow once the
   * guard has confirmed no records have in-flight broadcasts.
   */
  static async clear(): Promise<void> {
    return this.enqueue(async () => {
      try {
        await EncryptedStorage.removeItem(STORAGE_KEY);
        SwapStore.notify([]);
      } catch (err) {
        console.log('SwapStore: clear failed:', err);
      }
    });
  }

  /** Bypasses the queue — only call from within an `enqueue` callback. */
  private static async _readRaw(): Promise<SwapRecordType[]> {
    let raw: string | null = null;
    try {
      raw = await EncryptedStorage.getItem(STORAGE_KEY);
    } catch (err) {
      console.log('SwapStore: encrypted read failed, returning empty:', err);
      return [];
    }
    if (raw === null) return [];
    try {
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) {
        console.log(
          'SwapStore: stored value is not an array, treating as empty',
        );
        return [];
      }
      return (parsed as SwapRecordType[])
        .map(migrateBroadcastTxIds)
        .map(migrateRecordId);
    } catch (err) {
      console.log('SwapStore: JSON parse failed, treating as empty:', err);
      return [];
    }
  }

  /** Bypasses the queue — only call from within an `enqueue` callback. */
  private static async _writeRaw(records: SwapRecordType[]): Promise<void> {
    await EncryptedStorage.setItem(STORAGE_KEY, JSON.stringify(records));
  }
}

/**
 * Forward-migration for records persisted BEFORE the multi-step txid split.
 *
 * The old `WalletBackend.sendSwapDeposit` returned a `", "`-joined string of
 * txids and `ReviewSheet.onConfirm` stored it verbatim as `broadcast.txId`.
 * The current code splits, takes the last (deposit) txid, and populates
 * `allTxIds`. Records written under the old code still carry the joined
 * blob, which causes the poller to send a 130-character "hash" to SwapKit
 * `/track` and fail with `Invalid transaction hash format`.
 *
 * We normalise on every read instead of running a one-shot startup migration
 * because the cost is negligible (tens of records, a single string split)
 * and the in-memory fix takes effect immediately for the poller, with no
 * extra plumbing required. The persisted form gets rewritten the next time
 * something upserts the record (poller status update, manual edit, etc.).
 */
function migrateBroadcastTxIds(record: SwapRecordType): SwapRecordType {
  const b = record.broadcast;
  if (!b || !b.txId || !b.txId.includes(',')) return record;
  const parts = b.txId
    .split(',')
    .map(s => s.trim())
    .filter(s => s.length > 0);
  if (parts.length <= 1) return record;
  return {
    ...record,
    broadcast: {
      ...b,
      txId: parts[parts.length - 1],
      allTxIds: b.allTxIds && b.allTxIds.length > 0 ? b.allTxIds : parts,
    },
  };
}

/**
 * Forward-migration for records persisted BEFORE the `recordId` field
 * existed. Records were originally keyed by `depositAddress`; we promote
 * that to `recordId` so existing lookups (`getByRecordId(legacyDepositAddr)`)
 * continue to work for the lifetime of the legacy record. New records minted
 * in `SwapService.commitRoute` always carry a fresh recordId, so this
 * branch only fires for the bootstrap window after the upgrade.
 *
 * Collision is not a concern at migration time: each legacy record has a
 * single depositAddress, so promoting them produces a one-to-one mapping
 * from the old store shape to the new one. The collision-avoidance loop in
 * `SwapService.mintUniqueRecordId` guarantees future-minted ids do not
 * clash with these promoted ones either.
 */
function migrateRecordId(record: SwapRecordType): SwapRecordType {
  if (record.recordId && record.recordId.length > 0) return record;
  return { ...record, recordId: record.depositAddress };
}
