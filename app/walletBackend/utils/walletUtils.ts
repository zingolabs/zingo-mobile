/**
 * One-off wallet utilities that don't require a running WalletBackend instance.
 *
 * These were originally static methods on the RPC class. They are standalone
 * named exports so components can import only what they need without depending
 * on the full WalletBackend.
 *
 * Every wrapper around a native method is pure: one native call, mapped
 * through callFfi into an FfiResult. Failures arrive only on the promise's
 * rejection channel (typed FFI errors); resolved values are data, never
 * inspected for an error sentinel.
 */
import { WalletType, GlobalConst } from '../../AppState';
import RPCModule from '../../RPCModule';
import { callFfi, FfiResult } from '../ffi';
import {
  COVERED_SURFACE_REFUSAL,
  coveredSurfacePermitted,
} from './mixnetGate';
import { RPCZecPriceType } from '../types/RPCZecPriceType';
import { RPCSeedType } from '../types/RPCSeedType';

/**
 * Fetches the current ZEC/USD price from the zingolib price oracle.
 *
 * Price sentinel values:
 *   0   — initial/default (no price data yet)
 *  -1   — error inside zingolib (a typed FFI rejection, or an oracle error)
 *  -2   — malformed/empty success payload
 *  > 0  — real USD price
 */
export async function getZecPrice(): Promise<{
  price: number;
  error: string;
}> {
  // The always-on flavors' fail-closed gate: the price fetch reaches a CEX
  // over HTTPS, so while the mixnet transport is not ready it must refuse
  // rather than hand the exchange an IP-to-wallet correlation.
  if (!coveredSurfacePermitted()) {
    return { price: -1, error: COVERED_SURFACE_REFUSAL };
  }
  const result = await callFfi(RPCModule.zecPriceInfo());
  if (!result.ok) {
    return { price: -1, error: result.error.message };
  }
  if (!result.value) {
    return { price: -2, error: 'Internal Error fetching price' };
  }
  try {
    const resultJSON: RPCZecPriceType = JSON.parse(result.value);
    if (resultJSON.error) {
      return { price: -1, error: resultJSON.error };
    }
    if (!resultJSON.current_price) {
      // if no exists the field or is empty
      return { price: 0, error: '' };
    }
    if (isNaN(resultJSON.current_price)) {
      return {
        price: -1,
        error: `Error fetching price ${resultJSON.current_price}`,
      };
    }
    return { price: resultJSON.current_price, error: '' };
  } catch (error) {
    return { price: -2, error: `Critical Error fetching price ${error}` };
  }
}

// ---------------------------------------------------------------------------
// Wallet lifecycle — create / load / restore / save / delete
// ---------------------------------------------------------------------------

/**
 * The native "true"/"false" resolution protocol collapsed to a boolean:
 * true only for a successful resolution whose value is truthy and not the
 * "false" sentinel. A rejection is false — the typed error never re-enters
 * the data channel as prose a caller could mistake for success
 * (zingo-mobile#1151; the backup-restore latent bug).
 */
export function resolvedTrue(result: FfiResult<string>): boolean {
  return result.ok && !!result.value && result.value !== GlobalConst.false;
}

// True iff a wallet file is present on disk. zingolib reports the answer as
// the string "true"/"false"; collapsed to a real boolean here.
export async function walletExists(): Promise<boolean> {
  return resolvedTrue(await callFfi(RPCModule.walletExists()));
}

// Bootstraps a brand-new wallet for the given server/chain. The success value
// is the raw JSON (parseable as RPCWalletInfoType).
//
// `birthday` is only used in Offline mode (empty serverUri), where there is no
// Indexer to ask for the chain tip; online it is ignored (pass "0").
export async function createNewWallet(
  serverUri: string,
  birthday: string,
  chainHint: string,
  performanceLevel: string,
  minConfirmations: string,
): Promise<FfiResult<string>> {
  return callFfi(
    RPCModule.createNewWallet(
      serverUri,
      birthday,
      chainHint,
      performanceLevel,
      minConfirmations,
    ),
  );
}

// Reconstructs a wallet from a 24-word seed + birthday block height.
export async function restoreWalletFromSeed(
  seed: string,
  birthday: string,
  serverUri: string,
  chainHint: string,
  performanceLevel: string,
  minConfirmations: string,
): Promise<FfiResult<string>> {
  return callFfi(
    RPCModule.restoreWalletFromSeed(
      seed,
      birthday,
      serverUri,
      chainHint,
      performanceLevel,
      minConfirmations,
    ),
  );
}

// Reconstructs a view-only wallet from a UFVK + birthday block height.
export async function restoreWalletFromUfvk(
  ufvk: string,
  birthday: string,
  serverUri: string,
  chainHint: string,
  performanceLevel: string,
  minConfirmations: string,
): Promise<FfiResult<string>> {
  return callFfi(
    RPCModule.restoreWalletFromUfvk(
      ufvk,
      birthday,
      serverUri,
      chainHint,
      performanceLevel,
      minConfirmations,
    ),
  );
}

// Loads the wallet file already on disk against the given server/chain.
export async function loadExistingWallet(
  serverUri: string,
  chainHint: string,
  performanceLevel: string,
  minConfirmations: string,
): Promise<FfiResult<string>> {
  return callFfi(
    RPCModule.loadExistingWallet(
      serverUri,
      chainHint,
      performanceLevel,
      minConfirmations,
    ),
  );
}

// Restores the wallet from its on-device backup file (the `.migrating`
// twin EncryptedFile manages). The success value is the native "true"/"false"
// data protocol.
export async function restoreExistingWalletBackup(): Promise<
  FfiResult<string>
> {
  return callFfi(RPCModule.restoreExistingWalletBackup());
}

/**
 * Whether a native save/backup resolution reports success. The bridges are
 * trimodal (zingo-mobile#1151): Android resolves boolean true/false, iOS
 * resolves "true"/"false", and both resolve "Error: ..." prose from their
 * catch blocks. Success is knowable only from the two success shapes; any
 * other value — including error prose — is a failure.
 */
export function nativeSaveSucceeded(result: boolean | string): boolean {
  return result === true || result === GlobalConst.true;
}

// Flushes the in-memory wallet state to disk. The native bridge's trimodal
// resolution is classified here, at the single seam (nativeSaveSucceeded),
// and a rejected native promise is contained as false — never re-encoded
// as "Error: ..." prose. Callers learn the outcome from the boolean alone
// (zingo-mobile#1151; audit Issue P).
export async function doSave(): Promise<boolean> {
  try {
    return nativeSaveSucceeded(await RPCModule.doSave());
  } catch (error) {
    console.log(`Critical Error doSave ${error}`);
    return false;
  }
}

// Snapshots the wallet file to its on-device backup twin. Same contract as
// doSave: the trimodal native resolution is classified at this seam and a
// rejection is contained as false, so no caller ever awaits doSaveBackup
// without failure handling (audit Issue P, scenario three).
export async function doSaveBackup(): Promise<boolean> {
  try {
    return nativeSaveSucceeded(await RPCModule.doSaveBackup());
  } catch (error) {
    console.log(`Critical Error doSaveBackup ${error}`);
    return false;
  }
}

// ---------------------------------------------------------------------------
// Server / network / config
// ---------------------------------------------------------------------------

// Points the running wallet at a different lightwalletd server. Caller is
// responsible for racing this against a timeout and reverting on failure.
export async function changeServer(
  serverUri: string,
): Promise<FfiResult<string>> {
  return callFfi(RPCModule.changeServerProcess(serverUri));
}

// Fetches lightwalletd / chain metadata. The success value is raw JSON
// (parseable as RPCInfoType).
export async function getServerInfo(): Promise<FfiResult<string>> {
  return callFfi(RPCModule.infoServerInfo());
}

// Persists the runtime performance level + min-confirmations into the
// wallet config so the next boot uses them.
export async function setConfigWalletToProd(
  performanceLevel: string,
  minConfirmations: string,
): Promise<FfiResult<string>> {
  return callFfi(
    RPCModule.setConfigWalletToProdProcess(performanceLevel, minConfirmations),
  );
}

// Tells zingolib which crypto provider (e.g. ring) to use. One-shot at boot.
export async function setCryptoDefaultProvider(): Promise<FfiResult<string>> {
  return callFfi(RPCModule.setCryptoDefaultProvider());
}

// ---------------------------------------------------------------------------
// Wallet metadata
// ---------------------------------------------------------------------------

// Returns the wallet balance breakdown (transparent / sapling / orchard,
// spendable / unconfirmed). The success value is raw JSON (parseable as
// RPCBalanceType).
export async function getBalanceInfo(): Promise<FfiResult<string>> {
  return callFfi(RPCModule.getBalanceInfo());
}

// Returns the zingolib version string used to compose About/Settings.
export async function getVersionInfo(): Promise<FfiResult<string>> {
  return callFfi(RPCModule.getVersionInfo());
}

// Returns the wallet kind (seed vs ufvk). The success value is raw JSON the
// caller parses.
export async function getWalletKind(): Promise<FfiResult<string>> {
  return callFfi(RPCModule.walletKindInfo());
}

// Returns the ZingoLabs donation unified address (mainnet only — caller
// must gate by chain). The bridge returns a freshly-generated UA every time.
export async function getDonationAddress(): Promise<FfiResult<string>> {
  return callFfi(RPCModule.getDonationAddress());
}

// Same as `getDonationAddress` but for the Zennies-for-Zingo wallet.
export async function getZenniesDonationAddress(): Promise<FfiResult<string>> {
  return callFfi(RPCModule.getZenniesDonationAddress());
}

// Pre-calculates the fee and validates a send without broadcasting. Mirrors
// the native `sendProcess` (propose phase). `proposeJson` is a stringified
// SendJson zingolib expects, with recipients/amounts/memos.
export async function sendPropose(
  proposeJson: string,
): Promise<FfiResult<string>> {
  return callFfi(RPCModule.sendProcess(proposeJson));
}

// Plans the immediate Orchard -> Ironwood drain without broadcasting. Mirrors
// the native `planOrchardDrainProcess` (propose/preview phase). The success
// value is raw JSON (parseable as RPCDrainPlanType).
export async function planOrchardDrain(): Promise<FfiResult<string>> {
  return callFfi(RPCModule.planOrchardDrainProcess());
}

// Executes the immediate Orchard -> Ironwood drain: builds and broadcasts every
// drain transaction at once. Mirrors the native `drainOrchardProcess`. The
// success value is raw JSON (parseable as RPCDrainType).
export async function drainOrchard(): Promise<FfiResult<string>> {
  return callFfi(RPCModule.drainOrchardProcess());
}

// Snapshot of the in-flight drain's progress, for rendering "Building i/N" then
// "Broadcasting i/N". Mirrors the native `drainStatusProcess`; safe to poll
// concurrently with a running `drainOrchard` (native reads a side channel, not
// the lightclient lock). The success value is raw JSON: `null` when no drain
// is running, otherwise `{ total, built, sent, phase }` (parseable as
// RPCDrainStatusType).
export async function drainStatus(): Promise<FfiResult<string>> {
  return callFfi(RPCModule.drainStatusProcess());
}

// Plans the private (ZIP 318 two-phase) Orchard -> Ironwood migration without
// signing or broadcasting anything. Mirrors the native
// `planIronwoodMigrationProcess`. The success value is raw JSON (parseable as
// RPCMigrationPlanType, including the consent `plan_hash`).
export async function planIronwoodMigration(): Promise<FfiResult<string>> {
  return callFfi(RPCModule.planIronwoodMigrationProcess());
}

// Records the user's consent to the exact plan they were shown (its
// `plan_hash` from planIronwoodMigration) and persists the migration state.
// Nothing is broadcast; continueNoteSplitting drives the rounds afterwards.
// The broadcast cadence is not a parameter: the ZIP 318 schedule draws every
// delay itself. The success value is `{ started: true }` JSON; a stale
// consent rejects with code MigrationConsentStale.
export async function startIronwoodMigration(
  planHashHex: string,
): Promise<FfiResult<string>> {
  return callFfi(RPCModule.startIronwoodMigrationProcess(planHashHex));
}

// Drives one step of note splitting: proves and broadcasts the next round of
// Orchard self-sends, or reports what the pending round is waiting on. Long-
// running like drainOrchard (Halo2 proving); the native side dispatches it on
// the concurrent pool. The success value is raw JSON (parseable as
// RPCSplitStepType).
export async function continueNoteSplitting(): Promise<FfiResult<string>> {
  return callFfi(RPCModule.continueNoteSplittingProcess());
}


// The private migration's progress, arranged for direct rendering (parseable
// as RPCMigrationStatusType). `phase` is null when no migration is in
// progress. ZIP 318 requires showing its `orchard_confirmed_spendable`
// figure while one is.
export async function migrationStatus(): Promise<FfiResult<string>> {
  return callFfi(RPCModule.migrationStatusProcess());
}

// Classifies every part against the local chain view, applies what is safe
// unattended and returns what needs the app (parseable as RPCReconcileType).
// Call on every launch; never syncs, offline-safe.
export async function reconcileMigration(): Promise<FfiResult<string>> {
  return callFfi(RPCModule.reconcileMigrationProcess());
}

// Phase-2 execute tap: sends the scheduled migration's due batch (the current
// window's parts plus any missed windows', folded in), sequencing sends
// `spacingMs` apart. Long-running (prove + broadcast) like drainOrchard; the
// native side dispatches it off the main queue. Mirrors the native
// `executeDuePartsProcess`. The success value is raw JSON (parseable as
// RPCBatchReportType).
export async function executeDueParts(
  spacingMs: number,
): Promise<FfiResult<string>> {
  return callFfi(RPCModule.executeDuePartsProcess(String(spacingMs)));
}

// Snapshot of the in-flight execute batch's progress, for rendering
// "Sending i/N". Mirrors the native `executeDuePartsStatusProcess`; safe to
// poll concurrently with a running `executeDueParts` (native reads a side
// channel, not the lightclient lock). The success value is raw JSON: `null`
// when no batch is running, otherwise `{ total, resolved, sent, phase }`
// (parseable as RPCBatchStatusType).
export async function executeDuePartsStatus(): Promise<FfiResult<string>> {
  return callFfi(RPCModule.executeDuePartsStatusProcess());
}

// Abandons the in-progress private migration: confirmed parts stand, pending
// ones are dropped and their notes released. The success value is
// `{ cancelled: true }` JSON.
export async function cancelIronwoodMigration(): Promise<FfiResult<string>> {
  return callFfi(RPCModule.cancelIronwoodMigrationProcess());
}

// Returns the spendable balance that could be sent to `address` right now,
// honoring privacy levels and donation flags. The success value is raw JSON
// (parseable as RPCSpendablebalanceType).
export async function getSpendableBalanceWithAddress(
  address: string,
  zennies: string,
): Promise<FfiResult<string>> {
  return callFfi(
    RPCModule.getSpendableBalanceWithAddressInfo(address, zennies),
  );
}

// Validates and classifies a Zcash address. The success value is raw JSON
// (parseable as RPCParseAddressType) — callers use it to decide whether
// the address is transparent, sapling, orchard, unified or TEX.
export async function parseAddress(
  address: string,
): Promise<FfiResult<string>> {
  return callFfi(RPCModule.parseAddressInfo(address));
}

// Aggregated lifetime spending metrics, used by the Insight pie chart.
// Each helper's success value is a raw JSON map keyed by recipient address;
// the caller parses it into { [address]: number }. The three flavors return:
//   value     — total ZEC sent (zats), plus a "fee" entry
//   spends    — number of transactions sent to each recipient
//   memobytes — total memo bytes sent to each recipient
export async function getTotalValueToAddress(): Promise<FfiResult<string>> {
  return callFfi(RPCModule.getTotalValueToAddressInfo());
}

export async function getTotalSpendsToAddress(): Promise<FfiResult<string>> {
  return callFfi(RPCModule.getTotalSpendsToAddressInfo());
}

export async function getTotalMemobytesToAddress(): Promise<
  FfiResult<string>
> {
  return callFfi(RPCModule.getTotalMemobytesToAddressInfo());
}

// Generates a fresh unified address. `receivers` is the concatenation of
// receiver tags zingolib understands (e.g. "o", "z", "oz"). The success value
// is raw JSON (parseable as RPCUnifiedAddressType).
export async function createNewUnifiedAddress(
  receivers: string,
): Promise<FfiResult<string>> {
  return callFfi(RPCModule.createNewUnifiedAddressProcess(receivers));
}

// Generates a fresh transparent (t-) address. The success value is raw JSON
// (parseable as RPCTransparentAddressType).
export async function createNewTransparentAddress(): Promise<
  FfiResult<string>
> {
  return callFfi(RPCModule.createNewTransparentAddressProcess());
}

// Requests zingolib to forget about a transaction. The success value is a
// human-readable status message the caller is expected to surface in an
// alert. zingolib does not return structured data here.
export async function removeTransaction(
  txid: string,
): Promise<FfiResult<string>> {
  return callFfi(RPCModule.removeTransactionProcess(txid));
}

// Asks zingolib whether the given address belongs to the loaded wallet.
// The success value is raw JSON (parseable as RPCCheckAddressType). Callers
// that only need the boolean answer should use `isWalletAddress` instead —
// it builds on this helper.
export async function checkMyAddress(
  address: string,
): Promise<FfiResult<string>> {
  return callFfi(RPCModule.checkMyAddressInfo(address));
}

// True iff the given Zcash address belongs to the loaded wallet. Used by
// the address book to flag own-vs-external entries. On any failure (FFI
// error, parse error) we conservatively return false — better to show an
// external address as external than mislabel a stranger's as own.
export async function isWalletAddress(address: string): Promise<boolean> {
  const check = await checkMyAddress(address);
  if (!check.ok || !check.value) {
    return false;
  }
  try {
    const parsed: { is_wallet_address?: boolean } = JSON.parse(check.value);
    return parsed.is_wallet_address === true;
  } catch (error) {
    return false;
  }
}

// True iff a wallet backup file exists on disk. zingolib reports the answer
// as the string "true"/"false"; we collapse it to a real boolean here so
// callers don't have to repeat the GlobalConst.false comparison.
export async function walletBackupExists(): Promise<boolean> {
  return resolvedTrue(await callFfi(RPCModule.walletBackupExists()));
}

// Returns the latest block height the given server reports; the success
// value is a plain string (zingolib serializes it as a stringified integer).
// Callers measure wall-clock time around this to compute server latency.
export async function getLatestBlockServerInfo(
  serverUri: string,
): Promise<FfiResult<string>> {
  return callFfi(RPCModule.getLatestBlockServerInfo(serverUri));
}

// Pre-calculates the shielding fee and shieldable amount without broadcasting.
// Mirrors the native `shieldProcess` (propose phase). Pair with `shieldConfirm`
// to actually execute the shield.
export async function shieldPropose(): Promise<FfiResult<string>> {
  return callFfi(RPCModule.shieldProcess());
}

// Executes the shielding transaction proposed by `shieldPropose`. Mirrors the
// native `confirmProcess` (confirm phase). Must be called after a successful
// propose with a still-valid balance.
export async function shieldConfirm(): Promise<FfiResult<string>> {
  return callFfi(RPCModule.confirmProcess());
}

/**
 * Returns the wallet's secret material for the backup/seed display screens.
 *
 * readOnly = true  → returns { birthday, ufvk } (viewing-key wallets only)
 * readOnly = false → returns { birthday, seed } (full wallet)
 * Returns null on any error.
 */
export async function fetchWallet(
  readOnly: boolean,
): Promise<WalletType | null> {
  if (readOnly) {
    // only viewing key & birthday
    const result = await callFfi(RPCModule.getUfvkInfo());
    if (!result.ok || !result.value) {
      return null;
    }
    try {
      const RPCufvk: WalletType = JSON.parse(result.value);

      const wallet: WalletType = {} as WalletType;
      if (RPCufvk.birthday) {
        wallet.birthday = RPCufvk.birthday;
      }
      if (RPCufvk.ufvk) {
        wallet.ufvk = RPCufvk.ufvk;
      }

      return wallet;
    } catch (error) {
      return null;
    }
  } else {
    // only seed & birthday
    const result = await callFfi(RPCModule.getSeedInfo());
    if (!result.ok || !result.value) {
      return null;
    }
    try {
      const RPCseed: RPCSeedType = JSON.parse(result.value);

      const wallet: WalletType = {} as WalletType;
      if (RPCseed.seed_phrase) {
        wallet.seed = RPCseed.seed_phrase;
      }
      if (RPCseed.birthday) {
        wallet.birthday = RPCseed.birthday;
      }

      return wallet;
    } catch (error) {
      return null;
    }
  }
}
