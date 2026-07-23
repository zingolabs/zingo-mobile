/**
 * One-off wallet utilities that don't require a running WalletBackend instance.
 *
 * These were originally static methods on the RPC class. They are standalone
 * named exports so components can import only what they need without depending
 * on the full WalletBackend.
 */
import { WalletType, GlobalConst } from '../../AppState';
import RPCModule from '../../RPCModule';
import { RPCZecPriceType } from '../types/RPCZecPriceType';
import { RPCSeedType } from '../types/RPCSeedType';

/**
 * Fetches the current ZEC/USD price from the zingolib price oracle.
 *
 * Price sentinel values from zingolib:
 *   0   — initial/default (no price data yet)
 *  -1   — error inside zingolib
 *  -2   — error in RPCModule or this function
 *  > 0  — real USD price
 */
export async function getZecPrice(): Promise<{
  price: number;
  error: string;
}> {
  try {
    // values:
    // 0   - initial/default value
    // -1  - error in zingolib.
    // -2  - error in RPCModule, likely.
    // > 0 - real value
    const start = Date.now();
    const resultStr: string = await RPCModule.zecPriceInfo();
    if (Date.now() - start > 4000) {
      console.log(
        '=========================================== > get ZEC price - ',
        Date.now() - start,
      );
    }

    if (resultStr) {
      if (resultStr.toLowerCase().startsWith(GlobalConst.error)) {
        console.log(`Error fetching price ${resultStr}`);
        return { price: -1, error: resultStr };
      } else {
        const resultJSON: RPCZecPriceType = await JSON.parse(resultStr);
        if (resultJSON.error) {
          console.log(`Error fetching price ${resultJSON.error}`);
          return { price: -1, error: resultJSON.error };
        }
        if (!resultJSON.current_price) {
          // if no exists the field or is empty
          return { price: 0, error: '' };
        }
        if (resultJSON.current_price && isNaN(resultJSON.current_price)) {
          console.log(`Error fetching price ${resultJSON.current_price}`);
          return {
            price: -1,
            error: `Error fetching price ${resultJSON.current_price}`,
          };
        } else {
          return { price: resultJSON.current_price, error: '' };
        }
      }
    } else {
      console.log('Internal Error fetching price');
      return { price: -2, error: 'Internal Error fetching price' };
    }
  } catch (error) {
    console.log(`Critical Error fetching price ${error}`);
    return { price: -2, error: `Critical Error fetching price ${error}` };
  }
}

// ---------------------------------------------------------------------------
// Wallet lifecycle — create / load / restore / save / delete
// ---------------------------------------------------------------------------

// True iff a wallet file is present on disk. zingolib reports the answer as
// the string "true"/"false"; collapsed to a real boolean here.
export async function walletExists(): Promise<boolean> {
  try {
    const result: string = await RPCModule.walletExists();
    return !!result && result !== GlobalConst.false;
  } catch (error) {
    console.log(`Critical Error walletExists ${error}`);
    return false;
  }
}

// Bootstraps a brand-new wallet for the given server/chain. Returns the raw
// JSON (parseable as RPCWalletInfoType) or an "error: ..." prefix.
//
// `birthday` is only used in Offline mode (empty serverUri), where there is no
// Indexer to ask for the chain tip; online it is ignored (pass "0").
export async function createNewWallet(
  serverUri: string,
  birthday: string,
  chainHint: string,
  performanceLevel: string,
  minConfirmations: string,
): Promise<string> {
  try {
    return await RPCModule.createNewWallet(
      serverUri,
      birthday,
      chainHint,
      performanceLevel,
      minConfirmations,
    );
  } catch (error) {
    console.log(`Critical Error createNewWallet ${error}`);
    return `Error: ${error}`;
  }
}

// Reconstructs a wallet from a 24-word seed + birthday block height.
export async function restoreWalletFromSeed(
  seed: string,
  birthday: string,
  serverUri: string,
  chainHint: string,
  performanceLevel: string,
  minConfirmations: string,
): Promise<string> {
  try {
    return await RPCModule.restoreWalletFromSeed(
      seed,
      birthday,
      serverUri,
      chainHint,
      performanceLevel,
      minConfirmations,
    );
  } catch (error) {
    console.log(`Critical Error restoreWalletFromSeed ${error}`);
    return `Error: ${error}`;
  }
}

// Reconstructs a view-only wallet from a UFVK + birthday block height.
export async function restoreWalletFromUfvk(
  ufvk: string,
  birthday: string,
  serverUri: string,
  chainHint: string,
  performanceLevel: string,
  minConfirmations: string,
): Promise<string> {
  try {
    return await RPCModule.restoreWalletFromUfvk(
      ufvk,
      birthday,
      serverUri,
      chainHint,
      performanceLevel,
      minConfirmations,
    );
  } catch (error) {
    console.log(`Critical Error restoreWalletFromUfvk ${error}`);
    return `Error: ${error}`;
  }
}

// Loads the wallet file already on disk against the given server/chain.
export async function loadExistingWallet(
  serverUri: string,
  chainHint: string,
  performanceLevel: string,
  minConfirmations: string,
): Promise<string> {
  try {
    return await RPCModule.loadExistingWallet(
      serverUri,
      chainHint,
      performanceLevel,
      minConfirmations,
    );
  } catch (error) {
    console.log(`Critical Error loadExistingWallet ${error}`);
    return `Error: ${error}`;
  }
}

// Restores the wallet from its on-device backup file (the `.migrating`
// twin EncryptedFile manages). Returns the raw response.
export async function restoreExistingWalletBackup(): Promise<string> {
  try {
    return await RPCModule.restoreExistingWalletBackup();
  } catch (error) {
    console.log(`Critical Error restoreExistingWalletBackup ${error}`);
    return `Error: ${error}`;
  }
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
export async function changeServer(serverUri: string): Promise<string> {
  try {
    return await RPCModule.changeServerProcess(serverUri);
  } catch (error) {
    console.log(`Critical Error changeServer ${error}`);
    return `Error: ${error}`;
  }
}

// Fetches lightwalletd / chain metadata. Returns raw JSON (parseable as
// RPCInfoType).
export async function getServerInfo(): Promise<string> {
  try {
    return await RPCModule.infoServerInfo();
  } catch (error) {
    console.log(`Critical Error getServerInfo ${error}`);
    return `Error: ${error}`;
  }
}

// Persists the runtime performance level + min-confirmations into the
// wallet config so the next boot uses them.
export async function setConfigWalletToProd(
  performanceLevel: string,
  minConfirmations: string,
): Promise<string> {
  try {
    return await RPCModule.setConfigWalletToProdProcess(
      performanceLevel,
      minConfirmations,
    );
  } catch (error) {
    console.log(`Critical Error setConfigWalletToProd ${error}`);
    return `Error: ${error}`;
  }
}

// Tells zingolib which crypto provider (e.g. ring) to use. One-shot at boot.
export async function setCryptoDefaultProvider(): Promise<string> {
  try {
    return await RPCModule.setCryptoDefaultProvider();
  } catch (error) {
    console.log(`Critical Error setCryptoDefaultProvider ${error}`);
    return `Error: ${error}`;
  }
}

// ---------------------------------------------------------------------------
// Wallet metadata
// ---------------------------------------------------------------------------

// Returns the wallet balance breakdown (transparent / sapling / orchard,
// spendable / unconfirmed). Raw JSON (parseable as RPCBalanceType).
export async function getBalanceInfo(): Promise<string> {
  try {
    return await RPCModule.getBalanceInfo();
  } catch (error) {
    console.log(`Critical Error getBalanceInfo ${error}`);
    return `Error: ${error}`;
  }
}

// Returns the zingolib version string used to compose About/Settings.
export async function getVersionInfo(): Promise<string> {
  try {
    return await RPCModule.getVersionInfo();
  } catch (error) {
    console.log(`Critical Error getVersionInfo ${error}`);
    return `Error: ${error}`;
  }
}

// Returns the wallet kind (seed vs ufvk). Raw JSON the caller parses.
export async function getWalletKind(): Promise<string> {
  try {
    return await RPCModule.walletKindInfo();
  } catch (error) {
    console.log(`Critical Error getWalletKind ${error}`);
    return `Error: ${error}`;
  }
}

// Returns the ZingoLabs donation unified address (mainnet only — caller
// must gate by chain). The bridge returns a freshly-generated UA every
// time. On exception we return the raw "Error: ..." string for the caller
// to surface — same pattern as the other one-shots in this file.
export async function getDonationAddress(): Promise<string> {
  try {
    return await RPCModule.getDonationAddress();
  } catch (error) {
    console.log(`Critical Error getDonationAddress ${error}`);
    return `Error: ${error}`;
  }
}

// Same as `getDonationAddress` but for the Zennies-for-Zingo wallet.
export async function getZenniesDonationAddress(): Promise<string> {
  try {
    return await RPCModule.getZenniesDonationAddress();
  } catch (error) {
    console.log(`Critical Error getZenniesDonationAddress ${error}`);
    return `Error: ${error}`;
  }
}

// Pre-calculates the fee and validates a send without broadcasting. Mirrors
// the native `sendProcess` (propose phase). `proposeJson` is a stringified
// SendJson zingolib expects, with recipients/amounts/memos.
export async function sendPropose(proposeJson: string): Promise<string> {
  try {
    const proposeStr: string = await RPCModule.sendProcess(proposeJson);
    if (proposeStr) {
      if (proposeStr.toLowerCase().startsWith(GlobalConst.error)) {
        console.log(`Error propose ${proposeStr}`);
        return proposeStr;
      }
    } else {
      console.log('Internal Error propose');
      return 'Error: Internal RPC Error: propose';
    }
    return proposeStr;
  } catch (error) {
    console.log(`Critical Error propose ${error}`);
    return `Error: ${error}`;
  }
}

// Plans the immediate Orchard -> Ironwood drain without broadcasting. Mirrors
// the native `planOrchardDrainProcess` (propose/preview phase). Returns the raw
// JSON (parseable as RPCDrainPlanType); the caller checks for an `error`
// prefix / field before parsing.
export async function planOrchardDrain(): Promise<string> {
  try {
    const planStr: string = await RPCModule.planOrchardDrainProcess();
    if (planStr) {
      if (planStr.toLowerCase().startsWith(GlobalConst.error)) {
        console.log(`Error planOrchardDrain ${planStr}`);
        return planStr;
      }
    } else {
      console.log('Internal Error planOrchardDrain');
      return 'Error: Internal RPC Error: planOrchardDrain';
    }
    return planStr;
  } catch (error) {
    console.log(`Critical Error planOrchardDrain ${error}`);
    return `Error: ${error}`;
  }
}

// Executes the immediate Orchard -> Ironwood drain: builds and broadcasts every
// drain transaction at once. Mirrors the native `drainOrchardProcess`. Returns
// the raw JSON (parseable as RPCDrainType); the caller checks for an `error`
// prefix / field before parsing.
export async function drainOrchard(): Promise<string> {
  try {
    const drainStr: string = await RPCModule.drainOrchardProcess();
    if (drainStr) {
      if (drainStr.toLowerCase().startsWith(GlobalConst.error)) {
        console.log(`Error drainOrchard ${drainStr}`);
        return drainStr;
      }
    } else {
      console.log('Internal Error drainOrchard');
      return 'Error: Internal RPC Error: drainOrchard';
    }
    return drainStr;
  } catch (error) {
    console.log(`Critical Error drainOrchard ${error}`);
    return `Error: ${error}`;
  }
}

// Snapshot of the in-flight drain's progress, for rendering "Building i/N" then
// "Broadcasting i/N". Mirrors the native `drainStatusProcess`; safe to poll
// concurrently with a running `drainOrchard` (native reads a side channel, not
// the lightclient lock). Returns the raw JSON: `null` when no drain is running,
// otherwise `{ total, built, sent, phase }` (parseable as RPCDrainStatusType).
// The caller checks for an `error` prefix before parsing.
export async function drainStatus(): Promise<string> {
  try {
    const statusStr: string = await RPCModule.drainStatusProcess();
    if (statusStr && statusStr.toLowerCase().startsWith(GlobalConst.error)) {
      console.log(`Error drainStatus ${statusStr}`);
      return statusStr;
    }
    return statusStr;
  } catch (error) {
    console.log(`Critical Error drainStatus ${error}`);
    return `Error: ${error}`;
  }
}

// Plans the private (ZIP 318 two-phase) Orchard -> Ironwood migration without
// signing or broadcasting anything. Mirrors the native
// `planIronwoodMigrationProcess`. Returns the raw JSON (parseable as
// RPCMigrationPlanType, including the consent `plan_hash`); the caller checks
// for an `error` prefix / field before parsing.
export async function planIronwoodMigration(): Promise<string> {
  try {
    const planStr: string = await RPCModule.planIronwoodMigrationProcess();
    if (planStr) {
      if (planStr.toLowerCase().startsWith(GlobalConst.error)) {
        console.log(`Error planIronwoodMigration ${planStr}`);
        return planStr;
      }
    } else {
      console.log('Internal Error planIronwoodMigration');
      return 'Error: Internal RPC Error: planIronwoodMigration';
    }
    return planStr;
  } catch (error) {
    console.log(`Critical Error planIronwoodMigration ${error}`);
    return `Error: ${error}`;
  }
}

// Records the user's consent to the exact plan they were shown (its
// `plan_hash` from planIronwoodMigration) and persists the migration state.
// Nothing is broadcast; continueNoteSplitting drives the rounds afterwards.
// `perBucket` null keeps zingolib's default cadence (changeable later via
// rescheduleParts, until the first part is signed). Returns the raw JSON
// (`{ started: true }` or `{ error }` — notably ConsentStale when the notes
// changed since planning).
export async function startIronwoodMigration(
  planHashHex: string,
  perBucket: number | null,
): Promise<string> {
  try {
    const startStr: string = await RPCModule.startIronwoodMigrationProcess(
      planHashHex,
      perBucket === null ? '' : String(perBucket),
    );
    if (startStr) {
      if (startStr.toLowerCase().startsWith(GlobalConst.error)) {
        console.log(`Error startIronwoodMigration ${startStr}`);
        return startStr;
      }
    } else {
      console.log('Internal Error startIronwoodMigration');
      return 'Error: Internal RPC Error: startIronwoodMigration';
    }
    return startStr;
  } catch (error) {
    console.log(`Critical Error startIronwoodMigration ${error}`);
    return `Error: ${error}`;
  }
}

// Drives one step of note splitting: proves and broadcasts the next round of
// Orchard self-sends, or reports what the pending round is waiting on. Long-
// running like drainOrchard (Halo2 proving); the native side dispatches it on
// the concurrent pool. Returns the raw JSON (parseable as RPCSplitStepType).
export async function continueNoteSplitting(): Promise<string> {
  try {
    const stepStr: string = await RPCModule.continueNoteSplittingProcess();
    if (stepStr) {
      if (stepStr.toLowerCase().startsWith(GlobalConst.error)) {
        console.log(`Error continueNoteSplitting ${stepStr}`);
        return stepStr;
      }
    } else {
      console.log('Internal Error continueNoteSplitting');
      return 'Error: Internal RPC Error: continueNoteSplitting';
    }
    return stepStr;
  } catch (error) {
    console.log(`Critical Error continueNoteSplitting ${error}`);
    return `Error: ${error}`;
  }
}

// Sets the Phase 2 cadence (parts per broadcast window) and re-buckets every
// part with fresh randomization. Callable any time between consent and the
// first signed part; afterwards fails with CadenceFixed. After success the
// old schedule is void: re-read migrationStatus and re-arm the reminders.
// Returns the raw JSON (`{ rescheduled: true }` or `{ error }`).
export async function rescheduleParts(perBucket: number): Promise<string> {
  try {
    const rescheduleStr: string = await RPCModule.reschedulePartsProcess(
      String(perBucket),
    );
    if (rescheduleStr) {
      if (rescheduleStr.toLowerCase().startsWith(GlobalConst.error)) {
        console.log(`Error rescheduleParts ${rescheduleStr}`);
        return rescheduleStr;
      }
    } else {
      console.log('Internal Error rescheduleParts');
      return 'Error: Internal RPC Error: rescheduleParts';
    }
    return rescheduleStr;
  } catch (error) {
    console.log(`Critical Error rescheduleParts ${error}`);
    return `Error: ${error}`;
  }
}

// The private migration's progress, arranged for direct rendering (parseable
// as RPCMigrationStatusType). `phase` is null when no migration is in
// progress. ZIP 318 requires showing its `orchard_confirmed_spendable`
// figure while one is.
export async function migrationStatus(): Promise<string> {
  try {
    const statusStr: string = await RPCModule.migrationStatusProcess();
    if (statusStr) {
      if (statusStr.toLowerCase().startsWith(GlobalConst.error)) {
        console.log(`Error migrationStatus ${statusStr}`);
        return statusStr;
      }
    } else {
      console.log('Internal Error migrationStatus');
      return 'Error: Internal RPC Error: migrationStatus';
    }
    return statusStr;
  } catch (error) {
    console.log(`Critical Error migrationStatus ${error}`);
    return `Error: ${error}`;
  }
}

// Classifies every part against the local chain view, applies what is safe
// unattended and returns what needs the app (parseable as RPCReconcileType).
// Call on every launch; never syncs, offline-safe.
export async function reconcileMigration(): Promise<string> {
  try {
    const reportStr: string = await RPCModule.reconcileMigrationProcess();
    if (reportStr) {
      if (reportStr.toLowerCase().startsWith(GlobalConst.error)) {
        console.log(`Error reconcileMigration ${reportStr}`);
        return reportStr;
      }
    } else {
      console.log('Internal Error reconcileMigration');
      return 'Error: Internal RPC Error: reconcileMigration';
    }
    return reportStr;
  } catch (error) {
    console.log(`Critical Error reconcileMigration ${error}`);
    return `Error: ${error}`;
  }
}

// Phase-2 execute tap: sends the scheduled migration's due batch (the current
// window's parts plus any missed windows', folded in), sequencing sends
// `spacingMs` apart. Long-running (prove + broadcast) like drainOrchard; the
// native side dispatches it off the main queue. Mirrors the native
// `executeDuePartsProcess`. Returns the raw JSON (parseable as
// RPCBatchReportType); the caller checks for an `error` prefix / field before
// parsing.
export async function executeDueParts(spacingMs: number): Promise<string> {
  try {
    const reportStr: string = await RPCModule.executeDuePartsProcess(
      String(spacingMs),
    );
    if (reportStr) {
      if (reportStr.toLowerCase().startsWith(GlobalConst.error)) {
        console.log(`Error executeDueParts ${reportStr}`);
        return reportStr;
      }
    } else {
      console.log('Internal Error executeDueParts');
      return 'Error: Internal RPC Error: executeDueParts';
    }
    return reportStr;
  } catch (error) {
    console.log(`Critical Error executeDueParts ${error}`);
    return `Error: ${error}`;
  }
}

// Snapshot of the in-flight execute batch's progress, for rendering
// "Sending i/N". Mirrors the native `executeDuePartsStatusProcess`; safe to
// poll concurrently with a running `executeDueParts` (native reads a side
// channel, not the lightclient lock). Returns the raw JSON: `null` when no
// batch is running, otherwise `{ total, resolved, sent, phase }` (parseable as
// RPCBatchStatusType). The caller checks for an `error` prefix before parsing.
export async function executeDuePartsStatus(): Promise<string> {
  try {
    const statusStr: string = await RPCModule.executeDuePartsStatusProcess();
    if (statusStr && statusStr.toLowerCase().startsWith(GlobalConst.error)) {
      console.log(`Error executeDuePartsStatus ${statusStr}`);
      return statusStr;
    }
    return statusStr;
  } catch (error) {
    console.log(`Critical Error executeDuePartsStatus ${error}`);
    return `Error: ${error}`;
  }
}

// Abandons the in-progress private migration: confirmed parts stand, pending
// ones are dropped and their notes released. Returns the raw JSON
// (`{ cancelled: true }` or `{ error }`).
export async function cancelIronwoodMigration(): Promise<string> {
  try {
    const cancelStr: string = await RPCModule.cancelIronwoodMigrationProcess();
    if (cancelStr) {
      if (cancelStr.toLowerCase().startsWith(GlobalConst.error)) {
        console.log(`Error cancelIronwoodMigration ${cancelStr}`);
        return cancelStr;
      }
    } else {
      console.log('Internal Error cancelIronwoodMigration');
      return 'Error: Internal RPC Error: cancelIronwoodMigration';
    }
    return cancelStr;
  } catch (error) {
    console.log(`Critical Error cancelIronwoodMigration ${error}`);
    return `Error: ${error}`;
  }
}

// Returns the spendable balance that could be sent to `address` right now,
// honoring privacy levels and donation flags. Returns the raw JSON
// (parseable as RPCSpendablebalanceType).
export async function getSpendableBalanceWithAddress(
  address: string,
  zennies: string,
): Promise<string> {
  try {
    return await RPCModule.getSpendableBalanceWithAddressInfo(address, zennies);
  } catch (error) {
    console.log(`Critical Error getSpendableBalanceWithAddress ${error}`);
    return `Error: ${error}`;
  }
}

// Validates and classifies a Zcash address. Returns the raw JSON
// (parseable as RPCParseAddressType) — callers use it to decide whether
// the address is transparent, sapling, orchard, unified or TEX.
export async function parseAddress(address: string): Promise<string> {
  try {
    return await RPCModule.parseAddressInfo(address);
  } catch (error) {
    console.log(`Critical Error parseAddress ${error}`);
    return `Error: ${error}`;
  }
}

// Aggregated lifetime spending metrics, used by the Insight pie chart.
// Each helper returns a raw JSON map keyed by recipient address; the caller
// parses it into { [address]: number }. The three flavors return:
//   value     — total ZEC sent (zats), plus a "fee" entry
//   spends    — number of transactions sent to each recipient
//   memobytes — total memo bytes sent to each recipient
export async function getTotalValueToAddress(): Promise<string> {
  try {
    return await RPCModule.getTotalValueToAddressInfo();
  } catch (error) {
    console.log(`Critical Error getTotalValueToAddress ${error}`);
    return `Error: ${error}`;
  }
}

export async function getTotalSpendsToAddress(): Promise<string> {
  try {
    return await RPCModule.getTotalSpendsToAddressInfo();
  } catch (error) {
    console.log(`Critical Error getTotalSpendsToAddress ${error}`);
    return `Error: ${error}`;
  }
}

export async function getTotalMemobytesToAddress(): Promise<string> {
  try {
    return await RPCModule.getTotalMemobytesToAddressInfo();
  } catch (error) {
    console.log(`Critical Error getTotalMemobytesToAddress ${error}`);
    return `Error: ${error}`;
  }
}

// Generates a fresh unified address. `receivers` is the concatenation of
// receiver tags zingolib understands (e.g. "o", "z", "oz"). Returns the raw
// JSON response — the caller is expected to parse it as RPCUnifiedAddressType.
export async function createNewUnifiedAddress(
  receivers: string,
): Promise<string> {
  try {
    return await RPCModule.createNewUnifiedAddressProcess(receivers);
  } catch (error) {
    console.log(`Critical Error createNewUnifiedAddress ${error}`);
    return `Error: ${error}`;
  }
}

// Generates a fresh transparent (t-) address. Returns the raw JSON response;
// the caller is expected to parse it as RPCTransparentAddressType.
export async function createNewTransparentAddress(): Promise<string> {
  try {
    return await RPCModule.createNewTransparentAddressProcess();
  } catch (error) {
    console.log(`Critical Error createNewTransparentAddress ${error}`);
    return `Error: ${error}`;
  }
}

// Requests zingolib to forget about a transaction. Returns the raw response
// from the bridge — either an "error: ..." prefix on failure or a
// human-readable status message on success, which the caller is expected to
// surface in an alert. zingolib does not return structured data here.
export async function removeTransaction(txid: string): Promise<string> {
  try {
    return await RPCModule.removeTransactionProcess(txid);
  } catch (error) {
    console.log(`Critical Error removeTransaction ${error}`);
    return `Error: ${error}`;
  }
}

// Asks zingolib whether the given address belongs to the loaded wallet.
// Returns the raw JSON response (parseable as RPCCheckAddressType) or the
// "error: ..." prefix. Callers that only need the boolean answer should use
// `isWalletAddress` instead — it builds on this helper.
export async function checkMyAddress(address: string): Promise<string> {
  try {
    return await RPCModule.checkMyAddressInfo(address);
  } catch (error) {
    console.log(`Critical Error checkMyAddress ${error}`);
    return `Error: ${error}`;
  }
}

// True iff the given Zcash address belongs to the loaded wallet. Used by
// the address book to flag own-vs-external entries. On any failure (RPC
// error, parse error, exception) we conservatively return false — better to
// show an external address as external than mislabel a stranger's as own.
export async function isWalletAddress(address: string): Promise<boolean> {
  const checkStr = await checkMyAddress(address);
  if (!checkStr || checkStr.toLowerCase().startsWith(GlobalConst.error)) {
    return false;
  }
  try {
    const parsed: { is_wallet_address?: boolean } = JSON.parse(checkStr);
    return parsed.is_wallet_address === true;
  } catch (error) {
    console.log(`Critical Error isWalletAddress parse ${error}`);
    return false;
  }
}

// True iff a wallet backup file exists on disk. zingolib reports the answer
// as the string "true"/"false"; we collapse it to a real boolean here so
// callers don't have to repeat the GlobalConst.false comparison.
export async function walletBackupExists(): Promise<boolean> {
  try {
    const result: string = await RPCModule.walletBackupExists();
    return !!result && result !== GlobalConst.false;
  } catch (error) {
    console.log(`Critical Error walletBackupExists ${error}`);
    return false;
  }
}

// Returns the latest block height the given server reports as a plain string
// (zingolib serializes it as a stringified integer). Callers measure wall-clock
// time around this to compute server latency.
export async function getLatestBlockServerInfo(
  serverUri: string,
): Promise<string> {
  try {
    const heightStr: string =
      await RPCModule.getLatestBlockServerInfo(serverUri);
    if (!heightStr) {
      console.log('Internal Error server height');
      return 'Error: Internal RPC Error: server height';
    }
    return heightStr;
  } catch (error) {
    console.log(`Critical Error server height ${error}`);
    return `Error: ${error}`;
  }
}

// Pre-calculates the shielding fee and shieldable amount without broadcasting.
// Mirrors the native `shieldProcess` (propose phase). Pair with `shieldConfirm`
// to actually execute the shield.
export async function shieldPropose(): Promise<string> {
  try {
    const proposeStr: string = await RPCModule.shieldProcess();
    if (proposeStr) {
      if (proposeStr.toLowerCase().startsWith(GlobalConst.error)) {
        console.log(`Error propose ${proposeStr}`);
        return proposeStr;
      }
    } else {
      console.log('Internal Error propose');
      return 'Error: Internal RPC Error: propose';
    }
    return proposeStr;
  } catch (error) {
    console.log(`Critical Error propose ${error}`);
    return `Error: ${error}`;
  }
}

// Executes the shielding transaction proposed by `shieldPropose`. Mirrors the
// native `confirmProcess` (confirm phase). Must be called after a successful
// propose with a still-valid balance.
export async function shieldConfirm(): Promise<string> {
  try {
    const shieldStr: string = await RPCModule.confirmProcess();
    if (shieldStr) {
      if (shieldStr.toLowerCase().startsWith(GlobalConst.error)) {
        console.log(`Error shield ${shieldStr}`);
        return shieldStr;
      }
    } else {
      console.log('Internal Error shield ');
      return 'Error: Internal RPC Error: shield ';
    }

    return shieldStr;
  } catch (error) {
    console.log(`Critical Error shield ${error}`);
    return `Error: ${error}`;
  }
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
    try {
      const start = Date.now();
      const ufvkStr: string = await RPCModule.getUfvkInfo();
      if (Date.now() - start > 4000) {
        console.log(
          '=========================================== > get ufvk - ',
          Date.now() - start,
        );
      }
      if (ufvkStr) {
        if (ufvkStr.toLowerCase().startsWith(GlobalConst.error)) {
          console.log(`Error ufvk ${ufvkStr}`);
          return null;
        }
      } else {
        console.log('Internal Error ufvk');
        return null;
      }
      const RPCufvk: WalletType = await JSON.parse(ufvkStr);

      const wallet: WalletType = {} as WalletType;
      if (RPCufvk.birthday) {
        wallet.birthday = RPCufvk.birthday;
      }
      if (RPCufvk.ufvk) {
        wallet.ufvk = RPCufvk.ufvk;
      }

      return wallet;
    } catch (error) {
      console.log(`Critical Error ufvk ${error}`);
      return null;
    }
  } else {
    // only seed & birthday
    try {
      const start2 = Date.now();
      const seedStr: string = await RPCModule.getSeedInfo();
      if (Date.now() - start2 > 4000) {
        console.log(
          '=========================================== > get seed - ',
          Date.now() - start2,
        );
      }
      if (seedStr) {
        if (seedStr.toLowerCase().startsWith(GlobalConst.error)) {
          console.log(`Error seed ${seedStr}`);
          return null;
        }
      } else {
        console.log('Internal Error seed');
        return null;
      }
      const RPCseed: RPCSeedType = await JSON.parse(seedStr);

      const wallet: WalletType = {} as WalletType;
      if (RPCseed.seed_phrase) {
        wallet.seed = RPCseed.seed_phrase;
      }
      if (RPCseed.birthday) {
        wallet.birthday = RPCseed.birthday;
      }

      return wallet;
    } catch (error) {
      console.log(`Critical Error seed ${error}`);
      return null;
    }
  }
}
