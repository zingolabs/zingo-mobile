import { SyncStatus } from 'zingo-ffi';

/** The status before the first progress event: no ranges, nothing scanned. */
export const IDLE_SYNC_STATUS: SyncStatus = {
  scanRanges: [],
  syncStartHeight: 0,
  sessionBlocksScanned: 0,
  totalBlocksScanned: 0,
  percentageSessionBlocksScanned: 0,
  percentageTotalBlocksScanned: 0,
  sessionSaplingOutputsScanned: 0,
  totalSaplingOutputsScanned: 0,
  sessionOrchardOutputsScanned: 0,
  totalOrchardOutputsScanned: 0,
  sessionIronwoodOutputsScanned: 0,
  totalIronwoodOutputsScanned: 0,
  percentageSessionOutputsScanned: 0,
  percentageTotalOutputsScanned: 0,
  totalOutputsScanned: 0n,
  totalOutputs: 0n,
};

/** Whether the status carries any scan at all. */
export function hasSyncStatus(ss: SyncStatus): boolean {
  return ss.scanRanges.length > 0;
}

// True while a scan is running and short of the chain tip. A note only
// becomes spendable once the scan reaches the tip, so spend-dependent work
// gates on this. No open scan range means no active scan and reads as false.
export function scanInProgress(ss: SyncStatus): boolean {
  return hasSyncStatus(ss) && ss.percentageTotalOutputsScanned < 100;
}

// Keeps a percentage inside (0.01, 99.99] until the scan is really done,
// rounded to two decimals.
export function clampPercentage(percentage: number): number {
  if (percentage > 0 && percentage < 0.01) {
    return 0.01;
  }
  if (percentage > 99.99 && percentage < 100) {
    return 99.99;
  }
  return Number(percentage.toFixed(2));
}
