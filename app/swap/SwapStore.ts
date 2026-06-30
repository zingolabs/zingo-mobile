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
/**
 * Legacy global storage key — used by versions of the app that predated
 * per-wallet namespacing. Read once at boot via `bindToWallet` so existing
 * users' records are migrated into the current wallet's namespaced bucket,
 * then deleted from storage so the global key never serves as a future
 * leak vector between wallets.
 */
const LEGACY_STORAGE_KEY = 'swap:records';

/**
 * Storage key for the current wallet's swap bucket. The suffix is the
 * wallet's UFVK-derived fingerprint (see `walletFingerprint.ts`). Different
 * wallets on the same device write to different keys; that is the privacy
 * boundary.
 */
function storageKeyFor(fingerprint: string): string {
  return `swap:records:${fingerprint}`;
}

/**
 * Single-slot backup key. Mirrors the semantics of `wallet.backup.dat.txt`:
 * each `changeWallet` (with backup) overwrites it with the current wallet's
 * records (plus a `fp` marker so we know which wallet owns them). The marker
 * lets `bindToWallet` decide whether the next wallet to load is the one
 * that produced the backup and therefore eligible to restore from it.
 */
const BACKUP_STORAGE_KEY = 'swap:records:backup';

type BackupSlotPayload = {
  fp: string;
  records: SwapRecordType[];
};

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
   * Bind the store to the wallet identified by `fingerprint`. Must be called
   * before any read/write path returns useful data — until then `readAll`
   * yields `[]` and writes are no-ops (the activity list shows nothing
   * rather than risking exposure of records from a different wallet).
   *
   * One-shot legacy migration: on the first call ever, if the pre-namespace
   * global key `swap:records` exists, its contents are moved into the
   * current wallet's bucket (only if that bucket is empty — we never
   * silently merge across wallets) and the global key is deleted. Subsequent
   * calls find no legacy key and skip the migration cheaply.
   *
   * After binding, all current subscribers are notified with the freshly-
   * loaded bucket so any reader that called `readAll` before the bind
   * resolved gets the real data via the subscription rather than the
   * empty placeholder.
   */
  static async bindToWallet(fingerprint: string): Promise<void> {
    return this.enqueue(async () => {
      currentWalletFingerprint = fingerprint;
      try {
        const legacy = await EncryptedStorage.getItem(LEGACY_STORAGE_KEY);
        if (legacy !== null) {
          const targetKey = storageKeyFor(fingerprint);
          const existing = await EncryptedStorage.getItem(targetKey);
          if (existing === null) {
            await EncryptedStorage.setItem(targetKey, legacy);
          }
          // Delete the legacy key regardless of whether we wrote — once
          // namespacing is live, the global key must never persist or it
          // becomes a future leak vector when a different wallet binds.
          await EncryptedStorage.removeItem(LEGACY_STORAGE_KEY);
        }
      } catch (err) {
        console.log('SwapStore: legacy migration failed:', err);
      }
      // Phase 2: opportunistic restore from the single-slot backup. If the
      // last wallet that was saved-with-backup was THIS one (matching fp),
      // move the records back into the live bucket and clear the slot.
      // Different fp → leave the backup untouched; it may still be needed
      // by a future bind. No-op if the slot is empty (typical case).
      try {
        const raw = await EncryptedStorage.getItem(BACKUP_STORAGE_KEY);
        if (raw !== null) {
          let payload: BackupSlotPayload | null = null;
          try {
            const parsed = JSON.parse(raw) as Partial<BackupSlotPayload>;
            if (
              parsed &&
              typeof parsed.fp === 'string' &&
              Array.isArray(parsed.records)
            ) {
              payload = parsed as BackupSlotPayload;
            }
          } catch (parseErr) {
            console.log(
              'SwapStore: backup slot parse failed, discarding:',
              parseErr,
            );
            await EncryptedStorage.removeItem(BACKUP_STORAGE_KEY);
          }
          if (payload && payload.fp === fingerprint) {
            // Merge by recordId so a live bucket that already exists from
            // some other path (legacy migration, previous orphan) does not
            // get silently overwritten. Backup wins on collision because it
            // is the "more recent" snapshot — the one captured at the
            // moment of the wallet change.
            const liveKey = storageKeyFor(fingerprint);
            const liveRaw = await EncryptedStorage.getItem(liveKey);
            const liveRecords: SwapRecordType[] = liveRaw
              ? (() => {
                  try {
                    const p = JSON.parse(liveRaw);
                    return Array.isArray(p) ? (p as SwapRecordType[]) : [];
                  } catch {
                    return [];
                  }
                })()
              : [];
            const merged = mergeRecordsById(liveRecords, payload.records);
            await EncryptedStorage.setItem(liveKey, JSON.stringify(merged));
            await EncryptedStorage.removeItem(BACKUP_STORAGE_KEY);
          }
        }
      } catch (err) {
        console.log('SwapStore: backup restore failed:', err);
      }
      // Push the current bucket out to subscribers so anyone that read
      // before the bind sees the real records now.
      const fresh = await this._readRaw();
      SwapStore.notify(fresh);
    });
  }

  /**
   * Phase 2 — write the current wallet's swap records to the single-slot
   * backup key (overwriting whatever was there) and delete the live bucket.
   * Mirrors `RPCModule.doSaveBackup` for the wallet file: invoked from
   * `WalletLifecycleService.changeWallet` (the with-backup path) right
   * before the wallet file itself is replaced.
   *
   * Pre-condition: the store must be bound (the slot is keyed off the
   * current fingerprint). No-op if unbound; callers should pass through to
   * the existing wallet-backup flow rather than failing the whole change.
   */
  static async backupCurrentToSlot(): Promise<void> {
    return this.enqueue(async () => {
      const fp = currentWalletFingerprint;
      if (!fp) {
        console.log('SwapStore: backupCurrentToSlot — no wallet bound, skip');
        return;
      }
      try {
        const liveKey = storageKeyFor(fp);
        const liveRaw = await EncryptedStorage.getItem(liveKey);
        const records: SwapRecordType[] = liveRaw
          ? (() => {
              try {
                const p = JSON.parse(liveRaw);
                return Array.isArray(p) ? (p as SwapRecordType[]) : [];
              } catch {
                return [];
              }
            })()
          : [];
        const payload: BackupSlotPayload = { fp, records };
        await EncryptedStorage.setItem(
          BACKUP_STORAGE_KEY,
          JSON.stringify(payload),
        );
        await EncryptedStorage.removeItem(liveKey);
        SwapStore.notify([]);
      } catch (err) {
        console.log('SwapStore: backupCurrentToSlot failed:', err);
      }
    });
  }

  /**
   * Wipe the records for a specific wallet's bucket. Invoked from the
   * wallet-lifecycle hooks (e.g. `changeWalletNoBackup`) before the wallet
   * file itself is deleted, so the swap records of a wallet the user is
   * abandoning do not linger on disk.
   */
  static async clearForWallet(fingerprint: string): Promise<void> {
    return this.enqueue(async () => {
      try {
        await EncryptedStorage.removeItem(storageKeyFor(fingerprint));
        if (fingerprint === currentWalletFingerprint) {
          SwapStore.notify([]);
        }
      } catch (err) {
        console.log('SwapStore: clearForWallet failed:', err);
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
    let raw: string | null = null;
    try {
      raw = await EncryptedStorage.getItem(
        storageKeyFor(currentWalletFingerprint),
      );
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
    if (!currentWalletFingerprint) {
      console.log('SwapStore: write skipped — no wallet bound');
      return;
    }
    await EncryptedStorage.setItem(
      storageKeyFor(currentWalletFingerprint),
      JSON.stringify(records),
    );
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

/**
 * Merge two record lists by `recordId`, with entries from `winners` taking
 * precedence on collision. Order: every winning entry first (in its own
 * order), then any loser that has no winning counterpart, preserving
 * loser order. Used by `bindToWallet` when the backup slot for the
 * current wallet has to be merged into an already-existing live bucket.
 */
function mergeRecordsById(
  losers: SwapRecordType[],
  winners: SwapRecordType[],
): SwapRecordType[] {
  const winnerIds = new Set(winners.map(r => r.recordId));
  const survivingLosers = losers.filter(r => !winnerIds.has(r.recordId));
  return [...winners, ...survivingLosers];
}
