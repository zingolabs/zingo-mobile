/**
 * One-off wallet operations for components that hold no WalletBackend:
 * each wrapper makes one typed call and returns an FfiResult, with every
 * zatoshi amount converted to a number at this seam.
 */
import {
  Balance,
  BatchReport,
  Connection,
  ParsedAddress,
  ReconcileAction,
  Receiver,
  ServerInfo,
  SplitOutcome,
  SplitStep,
  TransparentAddress,
  UnifiedAddress,
  UnifiedReceivers,
  Wallet,
  WalletAddress,
  WalletInterface,
  WalletKind_Tags,
  developerDonationAddress,
  installCryptoProvider as installProvider,
  parseAddress as parseAddressFfi,
  serverLatestBlock,
  setMigrationTransmissionUri,
  version,
  zenniesDonationAddress,
} from 'zingo-ffi';
import {
  ChainNameEnum,
  GlobalConst,
  SendJsonToTypeType,
  WalletType,
} from '@app/AppState';
import { PoolNameType } from '@app/AppState/types/ProposalPoolsType';
import RPCModule from '@app/RPCModule';
import { callFfi, callFfiSync, FfiResult, zats } from '@app/walletBackend/ffi';
import { callWallet, openWallet } from '@app/walletBackend/wallet';
import { RPCPerformanceLevelEnum } from '@app/walletBackend/enums/RPCPerformanceLevelEnum';
import {
  chainName,
  chainOf,
  performanceLevel,
  proposalPool,
} from '@app/walletBackend/transforms/enumTransform';
import {
  transformDrainPlan,
  transformMigrationPlan,
  transformMigrationStatus,
  transformWindowReport,
} from '@app/walletBackend/transforms/migrationTransform';
import {
  DrainPlanType,
  MigrationPlanType,
  MigrationStatusType,
  WindowReportType,
} from '@app/walletBackend/types/MigrationTypes';
import { serverUris } from '@app/uris';

const ok = <T>(value: T): FfiResult<T> => ({ ok: true, value });

/**
 * Fetches the current ZEC/USD price: `price` is the USD figure, 0 before any
 * feed answers, and -1 when the call rejects (with the detail in `error`).
 */
export async function getZecPrice(): Promise<{ price: number; error: string }> {
  const result = await callWallet(wallet => wallet.zecPrice());
  return result.ok
    ? { price: result.value, error: '' }
    : { price: -1, error: result.error.detail };
}

export async function walletExists(): Promise<boolean> {
  const result = await callFfi(RPCModule.walletExists());
  return result.ok && result.value;
}

export async function walletBackupExists(): Promise<boolean> {
  const result = await callFfi(RPCModule.walletBackupExists());
  return result.ok && result.value;
}

// A custom (off-registry) server pins migration transmission to itself. A
// registry server leaves it unset so the library's curated pool, which
// excludes the sync operator, routes instead.
function applyMigrationTransmission(serverUri: string, chainHint: string) {
  const chain = chainHint.split(':')[0];
  const registry = serverUris(() => '')
    .filter(s => (s.chainName as string) === chain && !s.obsolete)
    .map(s => s.uri);
  const strip = (uri: string) => uri.replace(/\/+$/, '');
  const isCustom =
    serverUri !== '' && !registry.some(uri => strip(uri) === strip(serverUri));
  setMigrationTransmissionUri(isCustom ? serverUri : undefined);
}

function toConnection(
  serverUri: string,
  chainHint: string,
  level: RPCPerformanceLevelEnum,
  minConfirmations: number,
): Connection {
  const { chain, regtestSchedule } = chainOf(chainHint);
  return {
    serverUri: serverUri || undefined,
    chain,
    regtestSchedule,
    performance: performanceLevel(level),
    minConfirmations,
  };
}

// Opens a wallet through one of the constructors and writes its file.
async function openAndSave(
  serverUri: string,
  chainHint: string,
  open: () => Promise<WalletInterface>,
): Promise<FfiResult<WalletInterface>> {
  applyMigrationTransmission(serverUri, chainHint);
  const opened = await callFfi(open());
  if (!opened.ok) {
    return opened;
  }
  const saved = await callFfi(RPCModule.saveWallet());
  return saved.ok ? opened : saved;
}

// Bootstraps a brand-new wallet. `birthday` matters only Offline (empty
// serverUri), where there is no Indexer to ask for the chain tip.
export function createNewWallet(
  serverUri: string,
  birthday: number,
  chainHint: string,
  level: RPCPerformanceLevelEnum,
  minConfirmations: number,
): Promise<FfiResult<WalletInterface>> {
  const connection = toConnection(serverUri, chainHint, level, minConfirmations);
  return openAndSave(serverUri, chainHint, () =>
    Wallet.openNew(connection, birthday),
  );
}

export function restoreWalletFromSeed(
  seed: string,
  birthday: number,
  serverUri: string,
  chainHint: string,
  level: RPCPerformanceLevelEnum,
  minConfirmations: number,
): Promise<FfiResult<WalletInterface>> {
  const connection = toConnection(serverUri, chainHint, level, minConfirmations);
  return openAndSave(serverUri, chainHint, () =>
    Wallet.openFromSeed(connection, seed, birthday),
  );
}

export function restoreWalletFromUfvk(
  ufvk: string,
  birthday: number,
  serverUri: string,
  chainHint: string,
  level: RPCPerformanceLevelEnum,
  minConfirmations: number,
): Promise<FfiResult<WalletInterface>> {
  const connection = toConnection(serverUri, chainHint, level, minConfirmations);
  return openAndSave(serverUri, chainHint, () =>
    Wallet.openFromUfvk(connection, ufvk, birthday),
  );
}

// Loads the wallet file on disk against the given server/chain.
export async function loadExistingWallet(
  serverUri: string,
  chainHint: string,
  level: RPCPerformanceLevelEnum,
  minConfirmations: number,
): Promise<FfiResult<WalletInterface>> {
  applyMigrationTransmission(serverUri, chainHint);
  const loaded = await callFfi(
    RPCModule.loadExistingWallet(serverUri, chainHint, level, minConfirmations),
  );
  return loaded.ok ? openWallet() : loaded;
}

export function restoreExistingWalletBackup(): Promise<FfiResult<void>> {
  return callFfi(RPCModule.restoreExistingWalletBackup());
}

/** Flushes the wallet to disk; true when the file was written. */
export async function doSave(): Promise<boolean> {
  return (await callFfi(RPCModule.saveWallet())).ok;
}

/** Snapshots the wallet file to its backup twin; true when written. */
export async function doSaveBackup(): Promise<boolean> {
  return (await callFfi(RPCModule.saveWalletBackup())).ok;
}

export type WalletProfile = {
  readOnly: boolean;
  orchardPool: boolean;
  saplingPool: boolean;
  transparentPool: boolean;
  chainName: ChainNameEnum;
};

/** What the open wallet can do, and the chain it belongs to. */
export async function walletProfile(): Promise<FfiResult<WalletProfile>> {
  const kind = await callWallet(wallet => wallet.walletKind());
  if (!kind.ok) {
    return kind;
  }
  const chain = await callWallet(wallet => wallet.chain());
  if (!chain.ok) {
    return chain;
  }
  const pools =
    kind.value.tag === WalletKind_Tags.ViewingKey
      ? kind.value.inner
      : kind.value.tag === WalletKind_Tags.NoKeys
        ? { orchard: false, sapling: false, transparent: false }
        : { orchard: true, sapling: true, transparent: true };
  return ok({
    readOnly:
      kind.value.tag === WalletKind_Tags.ViewingKey ||
      kind.value.tag === WalletKind_Tags.NoKeys,
    orchardPool: pools.orchard,
    saplingPool: pools.sapling,
    transparentPool: pools.transparent,
    chainName: chainName(chain.value),
  });
}

// Points the running wallet at a different server; an empty uri is Offline.
export function changeServer(serverUri: string): Promise<FfiResult<void>> {
  return callWallet(wallet => wallet.changeServer(serverUri || undefined));
}

export function getServerInfo(): Promise<FfiResult<ServerInfo>> {
  return callWallet(wallet => wallet.serverInfo());
}

export function setWalletSettings(
  level: RPCPerformanceLevelEnum,
  minConfirmations: number,
): Promise<FfiResult<void>> {
  return callWallet(wallet =>
    wallet.setSettings({
      performance: performanceLevel(level),
      minConfirmations,
    }),
  );
}

export function installCryptoProvider(): FfiResult<void> {
  return callFfiSync(installProvider);
}

export function getBalanceInfo(): Promise<FfiResult<Balance>> {
  return callWallet(wallet => wallet.balance());
}

/** The library version for the About and Settings screens. */
export function getVersionInfo(): string {
  const result = callFfiSync(version);
  if (!result.ok) {
    return GlobalConst.zingolibError;
  }
  return result.value || GlobalConst.zingolibNone;
}

export function getDonationAddress(): FfiResult<string> {
  return callFfiSync(developerDonationAddress);
}

export function getZenniesDonationAddress(): FfiResult<string> {
  return callFfiSync(zenniesDonationAddress);
}

export type SendProposalType = {
  fee: number;
  sourcePools: PoolNameType[];
  destinationPools: PoolNameType[];
};

export function toReceivers(sendJson: SendJsonToTypeType[]): Receiver[] {
  return sendJson.map(to => ({
    address: to.address,
    amount: BigInt(to.amount),
    memo: to.memo,
  }));
}

/** Plans a send without broadcasting; `confirmSend` then executes it. */
export function sendPropose(
  sendJson: SendJsonToTypeType[],
): Promise<FfiResult<SendProposalType>> {
  const receivers = toReceivers(sendJson);
  return callWallet(async wallet => {
    const proposal = await wallet.proposeSend(receivers);
    return {
      fee: zats(proposal.fee),
      sourcePools: proposal.sourcePools.map(proposalPool),
      destinationPools: proposal.destinationPools.map(proposalPool),
    };
  });
}

/** Broadcasts the stored proposal and yields its txids. */
export function confirmSend(): Promise<FfiResult<string[]>> {
  return callWallet(wallet => wallet.confirm());
}

export type ShieldProposalType = { fee: number; valueToShield: number };

export function shieldPropose(): Promise<FfiResult<ShieldProposalType>> {
  return callWallet(async wallet => {
    const proposal = await wallet.proposeShield();
    return { fee: zats(proposal.fee), valueToShield: zats(proposal.valueToShield) };
  });
}

export const shieldConfirm = confirmSend;

export function planOrchardDrain(): Promise<FfiResult<DrainPlanType>> {
  return callWallet(async wallet => transformDrainPlan(await wallet.planDrain()));
}

export type DrainReportType = {
  txids: string[];
  migrated: number;
  fee: number;
  residual: number;
};

/** Builds and broadcasts every drain transaction at once. */
export function drainOrchard(): Promise<FfiResult<DrainReportType>> {
  return callWallet(async wallet => {
    const report = await wallet.drain();
    return {
      txids: report.txids,
      migrated: zats(report.migrated),
      fee: zats(report.fee),
      residual: zats(report.residual),
    };
  });
}

export function planIronwoodMigration(): Promise<FfiResult<MigrationPlanType>> {
  return callWallet(async wallet =>
    transformMigrationPlan(await wallet.planMigration()),
  );
}

// Phase 2 consent: binds the parts to their split notes and schedules them.
// `perBucket` undefined keeps the library's default cadence.
export function startIronwoodMigration(
  planHash: string,
  perBucket: number | undefined,
): Promise<FfiResult<void>> {
  return callWallet(wallet => wallet.startMigration(planHash, perBucket));
}

export function continueNoteSplitting(): Promise<FfiResult<SplitStep>> {
  return callWallet(wallet => wallet.continueNoteSplitting());
}

/** One stateless splitting round; loop until the outcome is Complete. */
export function quickSplit(): Promise<FfiResult<SplitOutcome>> {
  return callWallet(wallet => wallet.splitRound());
}

export function rescheduleParts(perBucket: number): Promise<FfiResult<void>> {
  return callWallet(wallet => wallet.rescheduleParts(perBucket));
}

export function migrationStatus(): Promise<FfiResult<MigrationStatusType>> {
  return callWallet(async wallet =>
    transformMigrationStatus(await wallet.migrationStatus()),
  );
}

/** The window calendar, or undefined before the wallet has ever synced. */
export function windowTimeline(): Promise<
  FfiResult<WindowReportType[] | undefined>
> {
  return callWallet(async wallet =>
    (await wallet.windowTimeline())?.map(transformWindowReport),
  );
}

export function reconcileMigration(): Promise<FfiResult<ReconcileAction[]>> {
  return callWallet(wallet => wallet.reconcileMigration());
}

/** Sends the open window's due batch, spacing the sends `spacingMs` apart. */
export function executeDueParts(
  spacingMs: number,
): Promise<FfiResult<BatchReport>> {
  return callWallet(wallet => wallet.executeDueParts(BigInt(spacingMs)));
}

export function cancelIronwoodMigration(): Promise<FfiResult<void>> {
  return callWallet(wallet => wallet.cancelMigration());
}

/** The zatoshis spendable to `address` right now. */
export function getSpendableBalanceWithAddress(
  address: string,
  zennies: boolean,
): Promise<FfiResult<number>> {
  return callWallet(async wallet =>
    zats(await wallet.spendableBalanceTo(address, zennies)),
  );
}

export function parseAddress(address: string): FfiResult<ParsedAddress> {
  return callFfiSync(() => parseAddressFfi(address));
}

const totalsByAddress = (totals: Map<string, bigint>): Record<string, number> =>
  Object.fromEntries(
    Array.from(totals, ([address, total]) => [address, zats(total)]),
  );

export function getTotalValueToAddress(): Promise<
  FfiResult<Record<string, number>>
> {
  return callWallet(async wallet =>
    totalsByAddress((await wallet.totalValueToAddress()).totals),
  );
}

export function getTotalSpendsToAddress(): Promise<
  FfiResult<Record<string, number>>
> {
  return callWallet(async wallet =>
    totalsByAddress((await wallet.totalSpendsToAddress()).totals),
  );
}

export function getTotalMemobytesToAddress(): Promise<
  FfiResult<Record<string, number>>
> {
  return callWallet(async wallet =>
    totalsByAddress((await wallet.totalMemobytesToAddress()).totals),
  );
}

export function createNewUnifiedAddress(
  receivers: UnifiedReceivers,
): Promise<FfiResult<UnifiedAddress>> {
  return callWallet(wallet => wallet.newUnifiedAddress(receivers));
}

export function createNewTransparentAddress(): Promise<
  FfiResult<TransparentAddress>
> {
  return callWallet(wallet => wallet.newTransparentAddress());
}

export function removeTransaction(txid: string): Promise<FfiResult<void>> {
  return callWallet(wallet => wallet.removeTransaction(txid));
}

/** The wallet's own description of `address`, or undefined for a foreign one. */
export function checkMyAddress(
  address: string,
): Promise<FfiResult<WalletAddress | undefined>> {
  return callWallet(wallet => wallet.checkAddress(address));
}

// A failed check reads as external: showing an own address as external
// beats labelling a foreign one as own.
export async function isWalletAddress(address: string): Promise<boolean> {
  const check = await checkMyAddress(address);
  return check.ok && check.value !== undefined;
}

/** The latest block height `serverUri` reports, read without a wallet. */
export function getLatestBlockServerInfo(
  serverUri: string,
): Promise<FfiResult<number>> {
  return callFfi(serverLatestBlock(serverUri));
}

/**
 * The wallet's secret material for the backup screens: the viewing key and
 * birthday when `readOnly`, the seed and birthday otherwise. Undefined when
 * the wallet refuses.
 */
export async function fetchWallet(
  readOnly: boolean,
): Promise<WalletType | undefined> {
  if (readOnly) {
    const key = await callWallet(wallet => wallet.viewingKey());
    return key.ok
      ? { ufvk: key.value.ufvk, birthday: key.value.birthday }
      : undefined;
  }
  const seed = await callWallet(wallet => wallet.seed());
  return seed.ok
    ? { seed: seed.value.seedPhrase, birthday: seed.value.birthday }
    : undefined;
}
