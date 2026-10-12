import NetInfo from '@react-native-community/netinfo';
import DeviceInfo from 'react-native-device-info';

import {
  ChainNameEnum,
  SelectServerEnum,
  ServerType,
  TranslateType,
} from '@app/AppState';
import { serverUris } from '@app/uris';
import { RPCSyncStatusType } from '@app/walletBackend/types/RPCSyncStatusType';
import { RPCSyncScanRangePriorityStatusEnum } from '@app/walletBackend/enums/RPCSyncScanRangePriorityStatusEnum';
import { priceFetcherStore } from '@ui/widgets/priceFetcherStore';

// What the app knows about its situation, kept current by LoadingApp and
// LoadedApp so any report can read it, even from the crash screen.
export type ReportState = {
  server?: ServerType;
  selectServer?: SelectServerEnum;
  walletChain?: ChainNameEnum;
  readOnly?: boolean;
  syncingStatus?: RPCSyncStatusType;
  lastError?: string;
  mixnetStatus?: string;
};

let state: ReportState = {};

export const updateReportState = (patch: ReportState): void => {
  state = { ...state, ...patch };
};

export const reportState = (): ReportState => state;

export const resetReportStateForTests = (): void => {
  state = {};
};

type Translate = (key: string) => TranslateType;

// A custom server can be the person's own node: its uri names them.
const privateServer = (translate: Translate): string | null => {
  const server = state.server;
  if (!server || server.kind !== 'remote') {
    return null;
  }
  const known = serverUris(translate).some(s => s.uri === server.uri);
  return state.selectServer === SelectServerEnum.custom && !known
    ? server.uri
    : null;
};

/** The uri and host of a private server, for the redaction of the report. */
export const privateHosts = (translate: Translate): string[] => {
  const uri = privateServer(translate);
  if (!uri) {
    return [];
  }
  const host = uri.replace(/^[a-z]+:\/\//i, '').replace(/[:/].*$/, '');
  return [uri, host];
};

const serverLine = (translate: Translate): string => {
  const server = state.server;
  if (!server) {
    return 'unknown';
  }
  if (server.kind === 'offline') {
    return `offline (${server.chainName})`;
  }
  const mode = state.selectServer ?? 'unknown';
  const hidden = privateServer(translate);
  if (hidden) {
    const tls = /^https:/i.test(hidden) ? 'https' : 'http';
    const onion = /\.onion(:|\/|$)/i.test(hidden) ? 'yes' : 'no';
    return `custom, ${tls}, onion: ${onion} (${server.chainName})`;
  }
  return `${server.uri} (${server.chainName}, ${mode})`;
};

const walletLine = (): string => {
  if (!state.walletChain) {
    return 'not open';
  }
  const kind = state.readOnly ? 'view-only' : 'seed';
  const serverChain = state.server?.chainName;
  const match =
    serverChain === undefined
      ? 'unknown'
      : serverChain === state.walletChain
        ? 'yes'
        : 'no';
  return `${kind}, ${state.walletChain}, matches server: ${match}`;
};

const pending = (ss: RPCSyncStatusType): number =>
  (ss.scan_ranges ?? [])
    .filter(
      r =>
        r.priority !== RPCSyncScanRangePriorityStatusEnum.Scanned &&
        r.priority !== RPCSyncScanRangePriorityStatusEnum.ScannedWithoutMapping,
    )
    .reduce((sum, r) => sum + Math.max(r.end_block - r.start_block, 0), 0);

const syncLine = (): string => {
  const ss = state.syncingStatus;
  if (!ss || !ss.scan_ranges) {
    return 'no status';
  }
  const pct =
    ss.percentage_total_outputs_scanned ??
    ss.percentage_total_blocks_scanned ??
    0;
  return `${pct.toFixed(1)}%, ${pending(ss)} blocks left`;
};

const GB = 1024 * 1024 * 1024;
const MB = 1024 * 1024;

// Ranges, not figures: an exact amount helps tell one device from another.
export const diskBucket = (bytes: number): string =>
  bytes < 0
    ? 'unknown'
    : bytes < GB
      ? '< 1 GB'
      : bytes < 5 * GB
        ? '1-5 GB'
        : '> 5 GB';

export const memoryBucket = (bytes: number): string =>
  bytes <= 0
    ? 'unknown'
    : bytes < 256 * MB
      ? '< 256 MB'
      : bytes < 512 * MB
        ? '256-512 MB'
        : '> 512 MB';

// A probe that throws or rejects reads as unknown; the report still goes.
const settle = async <T>(probe: () => Promise<T>, fallback: T): Promise<T> => {
  try {
    return await probe();
  } catch {
    return fallback;
  }
};

/**
 * The diagnostics block of a report: the situation of the app and the
 * device, with nothing that names the person (no addresses, balances,
 * keys, birthday, history, region or custom server).
 */
export const reportDiagnostics = async (
  translate: Translate,
): Promise<string> => {
  const [net, disk, memory, power] = await Promise.all([
    settle(() => NetInfo.fetch(), null),
    settle(() => DeviceInfo.getFreeDiskStorage(), -1),
    settle(() => DeviceInfo.getUsedMemory(), -1),
    settle(() => DeviceInfo.getPowerState(), null),
  ]);
  const reach =
    net?.isInternetReachable === true
      ? 'yes'
      : net?.isInternetReachable === false
        ? 'no'
        : 'unknown';
  const price = priceFetcherStore.snapshot().failed
    ? 'last fetch failed'
    : 'ok';
  const lines = [
    '--- Diagnostics ---',
    `Time (UTC): ${new Date().toISOString()}`,
    `Server: ${serverLine(translate)}`,
    `Wallet: ${walletLine()}`,
    `Network: ${net?.type ?? 'unknown'}, internet: ${reach}`,
    `Mixnet: ${state.mixnetStatus ?? 'unknown'}`,
    `Sync: ${syncLine()}`,
    `Last error: ${state.lastError || 'none'}`,
    `Price: ${price}`,
    `Power saving: ${
      power?.lowPowerMode === undefined
        ? 'unknown'
        : power.lowPowerMode
          ? 'on'
          : 'off'
    }`,
    `Free disk: ${diskBucket(disk)}, app memory: ${memoryBucket(memory)}`,
  ];
  return lines.join('\n');
};
