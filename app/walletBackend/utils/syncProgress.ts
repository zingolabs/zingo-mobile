import { RPCSyncStatusType } from '@app/walletBackend/types/RPCSyncStatusType';

// True while a scan is running and short of the chain tip. A note only becomes spendable once the scan
// reaches the tip, so spend-dependent work gates on this. An absent or empty
// scan range means no active scan (idle/startup) and reads as false. Callers
// that want to treat startup as busy wrap this themselves (see useSyncStatus).
export function scanInProgress(ss: RPCSyncStatusType): boolean {
  return (
    !!ss.scan_ranges &&
    ss.scan_ranges.length > 0 &&
    (ss.percentage_total_outputs_scanned ??
      ss.percentage_total_blocks_scanned ??
      0) < 100
  );
}

export type ScanProgress =
  { kind: 'scanning'; percent: number } | { kind: 'settled'; percent: number };

// Projects a snapshot onto the sync state every consumer reports, with a blank snapshot read as a scan starting at 0%.
export function scanProgress(ss: RPCSyncStatusType): ScanProgress {
  if (
    Object.keys(ss).length === 0 ||
    ss.scan_ranges?.length === 0 ||
    ss.percentage_total_outputs_scanned === 0
  ) {
    return { kind: 'scanning', percent: 0 };
  }
  const percent =
    ss.percentage_total_outputs_scanned ??
    ss.percentage_total_blocks_scanned ??
    0;
  return scanInProgress(ss)
    ? { kind: 'scanning', percent }
    : { kind: 'settled', percent };
}
