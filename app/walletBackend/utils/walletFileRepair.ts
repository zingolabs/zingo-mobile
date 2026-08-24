import { Platform } from 'react-native';
import RPCModule from '../../RPCModule';
import { callFfi } from '../ffi';

// Android-only support tooling for the 2.0.21 double-wrap incident: the
// native migration re-encrypted an already encrypted wallet file, and
// zingolib then failed to read it. The bridge classifies each wallet file
// and can peel the extra envelope layers off.

export type WalletFileState =
  | 'missing'
  | 'plainLegacy'
  | 'undecryptable'
  | 'plainWallet'
  | 'doubleWrapped'
  | 'unknown';

export type WalletFileDiagnosis = {
  name: string;
  state: WalletFileState;
  size: number;
  depth: number;
  repairable: boolean;
};

export type WalletFileRepairOutcome = 'repaired' | 'skipped' | 'failed';

const WALLET_FILE_STATES: ReadonlySet<string> = new Set([
  'missing',
  'plainLegacy',
  'undecryptable',
  'plainWallet',
  'doubleWrapped',
  'unknown',
]);

function toDiagnosis(raw: unknown): WalletFileDiagnosis | undefined {
  if (typeof raw !== 'object' || raw === null) {
    return undefined;
  }
  const entry = raw as Record<string, unknown>;
  const state = typeof entry.state === 'string' ? entry.state : 'unknown';
  return {
    name: typeof entry.name === 'string' ? entry.name : '',
    state: WALLET_FILE_STATES.has(state)
      ? (state as WalletFileState)
      : 'unknown',
    size: typeof entry.size === 'number' ? entry.size : 0,
    depth: typeof entry.depth === 'number' ? entry.depth : 0,
    repairable: entry.repairable === true,
  };
}

// Empty on iOS and when the bridge call fails: the caller then falls back
// to the plain error dialog.
export async function walletFileDiagnosis(): Promise<WalletFileDiagnosis[]> {
  if (Platform.OS !== 'android') {
    return [];
  }
  const result = await callFfi(RPCModule.walletFileDiagnosisInfo());
  if (!result.ok) {
    return [];
  }
  try {
    const parsed: unknown = JSON.parse(result.value);
    const files =
      typeof parsed === 'object' && parsed !== null && 'files' in parsed
        ? (parsed as { files: unknown }).files
        : [];
    return Array.isArray(files)
      ? files.map(toDiagnosis).filter((d): d is WalletFileDiagnosis => !!d)
      : [];
  } catch {
    return [];
  }
}

export function hasRepairableWalletFile(
  diagnosis: WalletFileDiagnosis[],
): boolean {
  return diagnosis.some(d => d.state === 'doubleWrapped' && d.repairable);
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
