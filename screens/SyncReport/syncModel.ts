import { RPCSyncStatusType } from '@app/walletBackend/types/RPCSyncStatusType';
import { RPCSyncScanRangeStatusType } from '@app/walletBackend/types/RPCSyncScanRangeStatusType';
import { RPCSyncScanRangePriorityStatusEnum as Priority } from '@app/walletBackend/enums/RPCSyncScanRangePriorityStatusEnum';

export const MAP_ROWS = 6;
export const MAP_COLS = 30;
export const MAP_CELLS = MAP_ROWS * MAP_COLS;

export type CellState = 'scanned' | 'scanning' | 'refetching' | 'high' | 'low';

export type Phase = 'done' | 'verifying' | 'tip' | 'notes' | 'historic';

export type Heights = {
  server: number;
  wallet: number;
  behind: number;
  scanned: number;
};

const SCANNED: Priority[] = [Priority.Scanned];
const REFETCHING: Priority[] = [
  Priority.ScannedWithoutMapping,
  Priority.RefetchingNullifiers,
];
const HIGH: Priority[] = [
  Priority.Verify,
  Priority.ChainTip,
  Priority.FoundNote,
  Priority.OpenAdjacent,
];

/** The state a scan range shows on the map. */
export const cellState = (priority: Priority): CellState =>
  SCANNED.includes(priority)
    ? 'scanned'
    : REFETCHING.includes(priority)
      ? 'refetching'
      : priority === Priority.Scanning
        ? 'scanning'
        : HIGH.includes(priority)
          ? 'high'
          : 'low';

const ranges = (status: RPCSyncStatusType): RPCSyncScanRangeStatusType[] =>
  status.scan_ranges ?? [];

/** Server tip, wallet height and the blocks between them; the wallet height counts the blocks scanned since the birthday. */
export const heights = (
  status: RPCSyncStatusType,
  birthday: number,
  tip: number,
  synced: boolean,
): Heights => {
  const scanned = ranges(status)
    .filter(r => ['scanned', 'refetching'].includes(cellState(r.priority)))
    .reduce((sum, r) => sum + (r.end_block - r.start_block), 0);
  const span = Math.max(0, tip - birthday);
  const done = synced ? span : Math.min(span, scanned);
  const wallet = birthday + done;
  return {
    server: tip,
    wallet,
    behind: Math.max(0, tip - wallet),
    scanned: done,
  };
};

/** The scan phase named by the most urgent range still waiting. */
export const phase = (status: RPCSyncStatusType, synced: boolean): Phase => {
  if (synced) {
    return 'done';
  }
  const waiting = ranges(status).map(r => r.priority);
  return waiting.includes(Priority.Verify)
    ? 'verifying'
    : waiting.includes(Priority.ChainTip)
      ? 'tip'
      : waiting.includes(Priority.FoundNote) ||
          waiting.includes(Priority.OpenAdjacent)
        ? 'notes'
        : 'historic';
};

/** One state per map cell, birthday on the left and tip on the right, filled column by column. */
export const mapCells = (
  status: RPCSyncStatusType,
  birthday: number,
  tip: number,
  synced: boolean,
): CellState[] => {
  const span = Math.max(1, tip - birthday);
  const all = ranges(status);
  return Array.from({ length: MAP_CELLS }, (_, i) => {
    if (synced) {
      return 'scanned';
    }
    const block = birthday + ((i + 0.5) * span) / MAP_CELLS;
    const hit = all.find(r => block >= r.start_block && block < r.end_block);
    return hit ? cellState(hit.priority) : 'low';
  });
};

/** The timeline's right edge: the tip plus a little room, rounded up to 100k blocks. */
export const scaleMax = (tip: number): number =>
  Math.max(100_000, Math.ceil((tip * 1.02) / 100_000) * 100_000);
