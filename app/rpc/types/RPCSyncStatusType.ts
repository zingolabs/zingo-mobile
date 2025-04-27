import { RPCSyncScanRangeStatusType } from './RPCSyncScanRangeStatusType';

export type RPCSyncStatusType = {
  scan_ranges: RPCSyncScanRangeStatusType[],
  sync_start_height: number,
  scanned_blocks: number,
  unscanned_blocks: number,
  percentage_blocks_scanned: number | null,
  scanned_sapling_outputs: number,
  unscanned_sapling_outputs: number,
  scanned_orchard_outputs: number,
  unscanned_orchard_outputs: number,
  percentage_outputs_scanned: number | null,
};
