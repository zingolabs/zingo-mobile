import { RPCSyncStatusType } from '../types/RPCSyncStatusType';

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
