import { Platform } from 'react-native';
import RPCModule from '@app/RPCModule';
import { callFfi } from '@app/walletBackend/ffi';
import { ErrorKeyed } from '@app/AppState/types/Result';

// Support tooling for damaged wallet files: both platforms classify their
// wallet files for the recovery dialog, and Android additionally repairs
// the 2.0.21 double-wrap incident by peeling the extra envelope layers.

// Mirror of Constants.kt and Constants.swift wallet file names. The
// optional chain tolerates partial react-native test mocks at module
// load.
export const WALLET_FILE_NAME =
  Platform?.OS === 'ios' ? 'wallet.dat.txt' : 'wallet.dat';
export const WALLET_BACKUP_FILE_NAME =
  Platform?.OS === 'ios' ? 'wallet.backup.dat.txt' : 'wallet.backup.dat';

export type WalletFileState =
  | 'missing'
  | 'plainWallet'
  | 'encryptedLegacy'
  | 'undecryptable'
  | 'doubleWrapped'
  | 'unknown';

export type WalletFileDiagnosis = {
  name: string;
  state: WalletFileState;
  size: number;
  mtime: number;
  depth: number;
  repairable: boolean;
  head?: string;
  readError?: string;
  unwrapErrors: string[];
};

export type WalletFileDiagnosisReport = {
  files: WalletFileDiagnosis[];
};

export type WalletFileRepairOutcome = 'repaired' | 'skipped' | 'failed';

const WALLET_FILE_STATES: ReadonlySet<string> = new Set([
  'missing',
  'plainWallet',
  'encryptedLegacy',
  'undecryptable',
  'doubleWrapped',
  'unknown',
]);

function toDiagnosis(raw: unknown): WalletFileDiagnosis | undefined {
  if (typeof raw !== 'object' || raw === null) {
    return undefined;
  }
  const entry = raw as Record<string, unknown>;
  const state = typeof entry.state === 'string' ? entry.state : 'unknown';
  const diagnosis: WalletFileDiagnosis = {
    name: typeof entry.name === 'string' ? entry.name : '',
    state: WALLET_FILE_STATES.has(state)
      ? (state as WalletFileState)
      : 'unknown',
    size: typeof entry.size === 'number' ? entry.size : 0,
    mtime: typeof entry.mtime === 'number' ? entry.mtime : 0,
    depth: typeof entry.depth === 'number' ? entry.depth : 0,
    repairable: entry.repairable === true,
    unwrapErrors: Array.isArray(entry.unwrapErrors)
      ? entry.unwrapErrors.filter((e): e is string => typeof e === 'string')
      : [],
  };
  if (typeof entry.head === 'string') {
    diagnosis.head = entry.head;
  }
  if (typeof entry.readError === 'string') {
    diagnosis.readError = entry.readError;
  }
  return diagnosis;
}

// Empty when the bridge call fails: the caller then falls back to the
// plain error dialog.
export async function walletFileDiagnosis(): Promise<WalletFileDiagnosisReport> {
  const result = await callFfi(RPCModule.walletFileDiagnosisInfo());
  if (!result.ok) {
    return { files: [] };
  }
  try {
    const parsed: unknown = JSON.parse(result.value);
    if (typeof parsed !== 'object' || parsed === null) {
      return { files: [] };
    }
    const entry = parsed as Record<string, unknown>;
    const files = Array.isArray(entry.files)
      ? entry.files
          .map(toDiagnosis)
          .filter((d): d is WalletFileDiagnosis => !!d)
      : [];
    return { files };
  } catch {
    return { files: [] };
  }
}

// The two files the native repair rewrites; a repairable twin must not trigger auto-repair.
const REPAIR_TARGET_NAMES: ReadonlySet<string> = new Set([
  WALLET_FILE_NAME,
  WALLET_BACKUP_FILE_NAME,
]);

export function hasRepairableWalletFile(
  diagnosis: WalletFileDiagnosis[],
): boolean {
  return diagnosis.some(
    d =>
      REPAIR_TARGET_NAMES.has(d.name) &&
      d.state === 'doubleWrapped' &&
      d.repairable,
  );
}

// Outcome per file name; an empty record means the bridge call failed.
export async function repairDoubleWrappedWallet(): Promise<
  Record<string, WalletFileRepairOutcome>
> {
  const result = await callFfi(RPCModule.repairDoubleWrappedWalletProcess());
  if (!result.ok) {
    return {};
  }
  try {
    const parsed: unknown = JSON.parse(result.value);
    if (typeof parsed !== 'object' || parsed === null) {
      return {};
    }
    const outcomes: Record<string, WalletFileRepairOutcome> = {};
    for (const [name, outcome] of Object.entries(parsed)) {
      outcomes[name] =
        outcome === 'repaired' || outcome === 'skipped' ? outcome : 'failed';
    }
    return outcomes;
  } catch {
    return {};
  }
}

// True when every file that needed a repair got one.
export function repairSucceeded(
  outcomes: Record<string, WalletFileRepairOutcome>,
): boolean {
  const values = Object.values(outcomes);
  return values.length > 0 && values.every(o => o !== 'failed');
}

export type WalletSeedSalvage =
  | { kind: 'salvagedSeed'; seedPhrase: string; birthday: number }
  | ErrorKeyed<'loadingapp.walletsalvage-failed'>;

// Salvages seed and birthday from the stable prefix of a wallet file that
// cannot open; the native side keeps the damaged bytes at `.broken`.
export async function walletSeedSalvage(): Promise<WalletSeedSalvage> {
  const failed: WalletSeedSalvage = {
    kind: 'error',
    errorKey: 'loadingapp.walletsalvage-failed',
  };
  const result = await callFfi(RPCModule.walletFileRecoveryInfo());
  if (!result.ok) {
    return failed;
  }
  try {
    const parsed: unknown = JSON.parse(result.value);
    if (typeof parsed !== 'object' || parsed === null) {
      return failed;
    }
    const entry = parsed as Record<string, unknown>;
    if (
      typeof entry.seed_phrase !== 'string' ||
      typeof entry.birthday !== 'number'
    ) {
      return failed;
    }
    return {
      kind: 'salvagedSeed',
      seedPhrase: entry.seed_phrase,
      birthday: entry.birthday,
    };
  } catch {
    return failed;
  }
}
