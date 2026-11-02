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
import {
  WalletType,
  GlobalConst,
  ErrorKeyed,
  errorKeyed,
  ChainNameEnum,
} from '@app/AppState';
import { isNumber } from 'lodash';
import RPCModule from '@app/RPCModule';
import { callFfi, FfiResult } from '@app/walletBackend/ffi';
import { withSyncStopped } from './syncBracket';
import { RPCZecPriceType } from '@app/walletBackend/types/RPCZecPriceType';
import { RPCSeedType } from '@app/walletBackend/types/RPCSeedType';
import { RPCUfvkType } from '@app/walletBackend/types/RPCUfvkType';
import { RPCMigrationStatusType } from '@app/walletBackend/types/RPCMigrationStatusType';

export type ZecPriceErrorKey =
  'info.error-price-fetch' | 'info.error-price-payload';

export type ZecPriceOutcome =
  { kind: 'zecPrice'; usd: number } | ErrorKeyed<ZecPriceErrorKey>;

/** Reads a price body as a quote only when its current_price is a positive, finite number. */
export function parseZecQuote(body: string): ZecPriceOutcome {
  let usd: unknown;
  try {
    usd = (JSON.parse(body) as RPCZecPriceType).current_price;
  } catch (error: unknown) {
    return errorKeyed('info.error-price-payload', String(error));
  }
  return typeof usd === 'number' && Number.isFinite(usd) && usd > 0
    ? { kind: 'zecPrice', usd }
    : errorKeyed('info.error-price-payload', String(usd));
}

/** Fetches the current ZEC/USD price, which zingolib carries over the mixnet. */
export async function getZecPrice(): Promise<ZecPriceOutcome> {
  const result = await callFfi(RPCModule.zecPriceInfo());
  return result.ok
    ? parseZecQuote(result.value)
    : errorKeyed('info.error-price-fetch', result.error.message);
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

// Removes the wallet file from the device; the keys stay in the Keychain.
export async function deleteExistingWallet(): Promise<FfiResult<string>> {
  return callFfi(RPCModule.deleteExistingWallet());
}

/**
 * Whether a native save resolution reports success. The bridges are
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

// The fee and validation of a send, without broadcasting, storing a proposal
// or pausing sync (#3104). `proposeJson` is a stringified SendJson zingolib
// expects, with recipients/amounts/memos. The send itself proposes again.
export async function sendPreview(
  proposeJson: string,
): Promise<FfiResult<string>> {
  return callFfi(RPCModule.previewSendProcess(proposeJson));
}

// The same read for a MAX send. The amount `getSpendableBalanceWithAddress`
// reports is sized by zingolib's send-max proposal, which an ordinary send
// request can be refused for, so the whole balance is read (and sent) this
// way. The success value is raw JSON (parseable as RPCSendProposeType) and
// carries `amount`: what the recipient really receives, for the caller to
// show. `memo` is '' when none.
export async function sendAllPreview(
  address: string,
  memo: string,
): Promise<FfiResult<string>> {
  return callFfi(RPCModule.previewSendAllProcess(address, memo));
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
  return withSyncStopped(() => callFfi(RPCModule.drainOrchardProcess()));
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

// Where an old private migration stands (parseable as RPCMigrationStatusType):
// `phase` is null when none is in progress. Builds that offered the private
// path could leave one in the wallet file; launch cancels it.
export async function migrationStatus(): Promise<FfiResult<string>> {
  return callFfi(RPCModule.migrationStatusProcess());
}

// Records what an old private migration got confirmed before it is
// cancelled. Never syncs, offline-safe.
export async function reconcileMigration(): Promise<FfiResult<string>> {
  return callFfi(RPCModule.reconcileMigrationProcess());
}

// Abandons an old private migration: confirmed parts stand, pending ones are
// dropped and their notes released. The success value is
// `{ cancelled: true }` JSON.
export async function cancelIronwoodMigration(): Promise<FfiResult<string>> {
  return callFfi(RPCModule.cancelIronwoodMigrationProcess());
}

// Cancels a private migration an older build left in flight, so its notes
// are free for the drain: what confirmed is recorded first. Silent, and a
// no-op without one; a failure retries on the next launch.
export async function cancelOldPrivateMigration(): Promise<void> {
  await reconcileMigration();
  const status = await migrationStatus();
  if (!status.ok) {
    return;
  }
  try {
    const { phase } = JSON.parse(status.value) as RPCMigrationStatusType;
    if (!phase || phase.kind === 'complete') {
      return;
    }
  } catch {
    return;
  }
  await cancelIronwoodMigration();
}

// Returns the spendable balance that could be sent to `address` right now,
// honoring privacy levels. The success value is raw JSON (parseable as
// RPCSpendablebalanceType). The bridge still takes the Zennies-for-Zingo flag
// that zingolib has not dropped yet; the App no longer sends donations, so it
// is always off.
export async function getSpendableBalanceWithAddress(
  address: string,
): Promise<FfiResult<string>> {
  return callFfi(RPCModule.getSpendableBalanceWithAddressInfo(address));
}

// Validates and classifies a Zcash address. The success value is raw JSON
// (parseable as RPCParseAddressType) — callers use it to decide whether
// the address is transparent, sapling, orchard, unified or TEX.
export async function parseAddress(
  address: string,
): Promise<FfiResult<string>> {
  return callFfi(RPCModule.parseAddressInfo(address));
}

export type UfvkCheck =
  | { kind: 'ufvk'; chainName: ChainNameEnum }
  | { kind: 'invalid' }
  | { kind: 'unknown' };

const KEY_CHAINS: readonly string[] = [
  ChainNameEnum.mainChainName,
  ChainNameEnum.testChainName,
  ChainNameEnum.regtestChainName,
];

// The chain the wallet file on this device was written for.
export async function readWalletChain(): Promise<FfiResult<ChainNameEnum>> {
  const result = await callFfi(RPCModule.walletChainInfo());
  if (!result.ok) {
    return result;
  }
  return KEY_CHAINS.includes(result.value)
    ? { ok: true, value: result.value as ChainNameEnum }
    : {
        ok: false,
        error: {
          code: 'Unknown',
          message: `unexpected wallet chain: ${result.value}`,
        },
      };
}

// Decodes a viewing key on the device, checksum included: a key with its
// network, text that is not a key, or unknown when the native call failed.
export async function checkUfvk(ufvk: string): Promise<UfvkCheck> {
  const result = await callFfi(RPCModule.parseUfvkInfo(ufvk));
  if (!result.ok) {
    return { kind: 'unknown' };
  }
  try {
    const info = JSON.parse(result.value);
    if (info.status === 'success' && KEY_CHAINS.includes(info.chain_name)) {
      return { kind: 'ufvk', chainName: info.chain_name as ChainNameEnum };
    }
    return { kind: 'invalid' };
  } catch {
    return { kind: 'unknown' };
  }
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

export async function getTotalMemobytesToAddress(): Promise<FfiResult<string>> {
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

// Reserves the next refund-scope transparent address, the one a swap provider
// refunds a deposit to. Same JSON shape as createNewTransparentAddress.
export async function reserveRefundAddress(): Promise<FfiResult<string>> {
  return callFfi(RPCModule.reserveRefundAddressProcess());
}

// The same address without reserving it, for a quote to name while the swap
// is still being chosen.
export async function deriveRefundAddress(): Promise<FfiResult<string>> {
  return callFfi(RPCModule.deriveRefundAddressProcess());
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
  } catch {
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

// Where a probe sent its requests: the host as typed, the port, and the
// addresses it resolved to (the host itself when it is an IP literal).
export type ProbeTarget = {
  host: string;
  port: number;
  resolved: string[];
  literal: boolean;
};

// How far a wallet-less check of a server got (zingolib probe_server).
export type ServerProbe =
  | (ProbeTarget & {
      outcome: 'verified';
      latencyMs: number;
      chainName: string;
      blockHeight: number;
      // The whole LightdInfo the server answered, for the Details view.
      details: string;
    })
  | { outcome: 'unresolved'; host: string; port: number; cause: string }
  | (ProbeTarget & { outcome: 'unreachable'; cause: string })
  | (ProbeTarget & { outcome: 'noAnswer'; afterSeconds: number })
  | (ProbeTarget & { outcome: 'refused'; cause: string });

function probeTarget(report: Record<string, unknown>): ProbeTarget {
  return {
    host: String(report.host ?? ''),
    port: Number(report.port ?? 0),
    resolved: Array.isArray(report.resolved) ? report.resolved.map(String) : [],
    literal: report.literal === true,
  };
}

/** zingolib reports the LightdInfo as a JSON object; String() of it read "[object Object]". */
function detailsText(details: unknown): string {
  if (details === undefined || details === null) {
    return '';
  }
  return typeof details === 'string'
    ? details
    : JSON.stringify(details, null, 2);
}

function toServerProbe(report: Record<string, unknown>): ServerProbe | null {
  const cause = String(report.cause ?? '');
  switch (report.outcome) {
    case 'verified':
      return {
        ...probeTarget(report),
        outcome: 'verified',
        latencyMs: Number(report.latency_ms ?? 0),
        chainName: String(report.chain_name ?? ''),
        blockHeight: Number(report.block_height ?? 0),
        details: detailsText(report.details),
      };
    case 'unresolved':
      return {
        outcome: 'unresolved',
        host: String(report.host ?? ''),
        port: Number(report.port ?? 0),
        cause,
      };
    case 'unreachable':
      return { ...probeTarget(report), outcome: 'unreachable', cause };
    case 'noAnswer':
      return {
        ...probeTarget(report),
        outcome: 'noAnswer',
        afterSeconds: Number(report.after_seconds ?? 0),
      };
    case 'refused':
      return { ...probeTarget(report), outcome: 'refused', cause };
    default:
      return null;
  }
}

// Checks a server without a wallet: resolves its host, connects and asks for
// its LightdInfo. A URI zingolib cannot use arrives as an InvalidInput error.
export async function probeServer(
  serverUri: string,
): Promise<FfiResult<ServerProbe>> {
  const result = await callFfi(RPCModule.probeServerInfo(serverUri));
  if (!result.ok) {
    return result;
  }
  try {
    const probe = toServerProbe(JSON.parse(result.value));
    if (probe) {
      return { ok: true, value: probe };
    }
  } catch {}
  return {
    ok: false,
    error: {
      code: 'Unknown',
      message: `unexpected probe report: ${result.value}`,
    },
  };
}

// The shielding fee and shieldable amount, storing no proposal and pausing no
// sync (#3104): for showing them whenever transparent funds confirm.
export async function shieldPreview(): Promise<FfiResult<string>> {
  return callFfi(RPCModule.previewShieldProcess());
}

// Proposes the shield for `shieldConfirm` to execute. The stored proposal
// pauses sync until it is confirmed or declined.
export async function shieldPropose(): Promise<FfiResult<string>> {
  return callFfi(RPCModule.shieldProcess());
}

// Executes the shielding transaction proposed by `shieldPropose`. Mirrors the
// native `confirmProcess` (confirm phase). Must be called after a successful
// propose with a still-valid balance.
export async function shieldConfirm(): Promise<FfiResult<string>> {
  return callFfi(RPCModule.confirmProcess());
}

// The keys and birthday a wallet reports, with the height zingolib was given
// when it raised the birthday to Sapling activation in this process.
export type FetchedWallet = WalletType & { birthdayAdjustedFrom?: number };

/**
 * Returns the wallet's secret material for the backup/seed display screens.
 *
 * readOnly = true  → returns { birthday, ufvk } (viewing-key wallets only)
 * readOnly = false → returns { birthday, seed } (full wallet)
 * Returns null on any error.
 */
export async function fetchWallet(
  readOnly: boolean,
): Promise<FetchedWallet | null> {
  if (readOnly) {
    // only viewing key & birthday
    const result = await callFfi(RPCModule.getUfvkInfo());
    if (!result.ok || !result.value) {
      return null;
    }
    try {
      const RPCufvk: RPCUfvkType = JSON.parse(result.value);

      const wallet: FetchedWallet = {} as FetchedWallet;
      if (isNumber(RPCufvk.birthday)) {
        wallet.birthday = RPCufvk.birthday;
      }
      if (isNumber(RPCufvk.birthday_adjusted_from)) {
        wallet.birthdayAdjustedFrom = RPCufvk.birthday_adjusted_from;
      }
      if (RPCufvk.ufvk) {
        wallet.ufvk = RPCufvk.ufvk;
      }

      return wallet;
    } catch {
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

      const wallet: FetchedWallet = {} as FetchedWallet;
      if (RPCseed.seed_phrase) {
        wallet.seed = RPCseed.seed_phrase;
      }
      if (isNumber(RPCseed.birthday)) {
        wallet.birthday = RPCseed.birthday;
      }
      if (isNumber(RPCseed.birthday_adjusted_from)) {
        wallet.birthdayAdjustedFrom = RPCseed.birthday_adjusted_from;
      }

      return wallet;
    } catch {
      return null;
    }
  }
}
