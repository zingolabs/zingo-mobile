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

export type RescanState = 'none' | 'started' | 'scanning';

/**
 * Moves a user rescan on with each sync status. It ends only after a status
 * has shown its sync running, so a finished status of the sync the rescan
 * replaced, still in flight, cannot end it at once.
 */
export function rescanStep(
  state: RescanState,
  ss: RPCSyncStatusType,
): RescanState {
  if (state === 'started' && scanInProgress(ss)) {
    return 'scanning';
  }
  if (state === 'scanning' && !!ss.scan_ranges?.length && !scanInProgress(ss)) {
    return 'none';
  }
  return state;
}
