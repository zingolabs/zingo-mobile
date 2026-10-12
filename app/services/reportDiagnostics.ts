import NetInfo from '@react-native-community/netinfo';
import DeviceInfo from 'react-native-device-info';
import Url from 'url-parse';
import { defaultTo, isBoolean, sortedIndex, sumBy } from 'lodash';

import {
  ChainNameEnum,
  SelectServerEnum,
  ServerType,
  TranslateType,
} from '@app/AppState';
import { serverUris } from '@app/uris';
import { RPCSyncStatusType } from '@app/walletBackend/types/RPCSyncStatusType';
import { RPCSyncScanRangePriorityStatusEnum } from '@app/walletBackend/enums/RPCSyncScanRangePriorityStatusEnum';
import { MixnetView } from '@app/walletBackend/transforms/mixnetView';
import { priceFetcherStore } from '@ui/widgets/priceFetcherStore';

export type Served =
  | { kind: 'unknown' }
  | { kind: 'chosen'; server: ServerType; selectServer: SelectServerEnum };

export type Session =
  | { kind: 'closed' }
  | {
      kind: 'open';
      chain: ChainNameEnum;
      readOnly: boolean;
      sync: RPCSyncStatusType;
      lastError: string;
      mixnetView: MixnetView;
    };

export type ReportState = { served: Served; session: Session };

type Translate = (key: string) => TranslateType;

type Named =
  | { kind: 'unknown' }
  | { kind: 'offline'; chainName: ChainNameEnum }
  | { kind: 'hidden'; uri: string; url: Url<string>; chainName: ChainNameEnum }
  | { kind: 'shown'; uri: string; chainName: ChainNameEnum; mode: string };

export const INITIAL: ReportState = {
  served: { kind: 'unknown' },
  session: { kind: 'closed' },
};

let state: ReportState = INITIAL;

export const reportState = (): ReportState => state;

export const publishReport = (patch: Partial<ReportState>): void => {
  state = { ...state, ...patch };
};

const flag =
  (on: string, off: string) =>
  (value: unknown): string =>
    isBoolean(value) ? (value ? on : off) : 'unknown';

const yesNo: (value: unknown) => string = flag('yes', 'no');
const onOff: (value: unknown) => string = flag('on', 'off');

const [MB, GB]: number[] = [1024 ** 2, 1024 ** 3];

const bucket =
  (edges: number[], labels: string[]) =>
  (bytes: number): string =>
    labels[sortedIndex(edges, bytes)];

export const diskBucket: (bytes: number) => string = bucket(
  [1, GB, 5 * GB],
  ['unknown', '< 1 GB', '1-5 GB', '> 5 GB'],
);

export const memoryBucket: (bytes: number) => string = bucket(
  [1, 256 * MB, 512 * MB],
  ['unknown', '< 256 MB', '256-512 MB', '> 512 MB'],
);

export const named = (served: Served, translate: Translate): Named => {
  if (served.kind === 'unknown') {
    return served;
  }
  const { server, selectServer: mode } = served;
  if (server.kind === 'offline') {
    return server;
  }
  const { uri, chainName } = server;
  const listed: boolean = serverUris(translate).some(s => s.uri === uri);
  return mode === SelectServerEnum.custom && !listed
    ? { kind: 'hidden', uri, url: new Url(uri), chainName }
    : { kind: 'shown', uri, chainName, mode };
};

export const privateHosts = (
  served: Served,
  translate: Translate,
): string[] => {
  const name: Named = named(served, translate);
  return name.kind === 'hidden' ? [name.uri, name.url.hostname] : [];
};

export const serverLine = (served: Served, translate: Translate): string => {
  const name: Named = named(served, translate);
  switch (name.kind) {
    case 'unknown':
      return 'unknown';
    case 'offline':
      return `offline (${name.chainName})`;
    case 'hidden':
      return `custom, ${name.url.protocol.replace(':', '')}, onion: ${yesNo(
        name.url.hostname.endsWith('.onion'),
      )} (${name.chainName})`;
    case 'shown':
      return `${name.uri} (${name.chainName}, ${name.mode})`;
  }
};

export const syncLine = (sync: RPCSyncStatusType): string => {
  if (!sync.scan_ranges) {
    return 'no status';
  }
  const percent: number = defaultTo(
    sync.percentage_total_outputs_scanned,
    defaultTo(sync.percentage_total_blocks_scanned, 0),
  );
  const left: number = sumBy(sync.scan_ranges, r =>
    r.priority === RPCSyncScanRangePriorityStatusEnum.Scanned ||
    r.priority === RPCSyncScanRangePriorityStatusEnum.ScannedWithoutMapping
      ? 0
      : Math.max(r.end_block - r.start_block, 0),
  );
  return `${percent.toFixed(1)}%, ${left} blocks left`;
};

export const sessionLines = ({ served, session }: ReportState): string[] => {
  if (session.kind === 'closed') {
    return ['Wallet: not open'];
  }
  const { chain, readOnly, mixnetView, sync, lastError } = session;
  const match: string =
    served.kind === 'chosen'
      ? yesNo(served.server.chainName === chain)
      : 'unknown';
  return [
    `Wallet: ${readOnly ? 'view-only' : 'seed'}, ${chain}, matches server: ${match}`,
    `Mixnet: ${mixnetView.kind === 'transport' ? mixnetView.statusKey : 'absent'}`,
    `Sync: ${syncLine(sync)}`,
    `Last error: ${lastError || 'none'}`,
  ];
};

const settle = <T>(
  ask: () => Promise<T>,
  render: (read: T) => string,
  fallback: string,
): Promise<string> => ask().then(render, () => fallback);

export const reportDiagnostics = async (
  translate: Translate,
): Promise<string> => {
  const [network, power, disk, memory]: string[] = await Promise.all([
    settle(
      () => NetInfo.fetch(),
      net => `${net.type}, internet: ${yesNo(net.isInternetReachable)}`,
      'unknown, internet: unknown',
    ),
    settle(
      () => DeviceInfo.getPowerState(),
      p => onOff(p.lowPowerMode),
      'unknown',
    ),
    settle(() => DeviceInfo.getFreeDiskStorage(), diskBucket, 'unknown'),
    settle(() => DeviceInfo.getUsedMemory(), memoryBucket, 'unknown'),
  ]);
  return [
    '--- Diagnostics ---',
    `Time (UTC): ${new Date().toISOString()}`,
    `Server: ${serverLine(state.served, translate)}`,
    ...sessionLines(state),
    `Network: ${network}`,
    `Price: ${priceFetcherStore.snapshot().failed ? 'last fetch failed' : 'ok'}`,
    `Power saving: ${power}`,
    `Free disk: ${disk}, app memory: ${memory}`,
  ].join('\n');
};
