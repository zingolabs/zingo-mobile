import { RPCSyncScanRangePriorityStatusEnum } from '../../app/rpc/enums/RPCSyncScanRangePriorityStatusEnum';
import { RPCSyncStatusType } from '../../app/rpc/types/RPCSyncStatusType';

export const mockSyncingStatus: RPCSyncStatusType = {} as RPCSyncStatusType;

mockSyncingStatus.scan_ranges = [
  {
    priority: RPCSyncScanRangePriorityStatusEnum.Scanned,
    start_block: 2000000,
    end_block: 2500000,
  },
];
mockSyncingStatus.sync_start_height = 2000000;
mockSyncingStatus.scanned_blocks = 0;
mockSyncingStatus.unscanned_blocks = 0;
mockSyncingStatus.percentage_blocks_scanned = null;
mockSyncingStatus.scanned_sapling_outputs = 0;
mockSyncingStatus.unscanned_sapling_outputs = 0;
mockSyncingStatus.scanned_orchard_outputs = 0;
mockSyncingStatus.unscanned_orchard_outputs = 0;
mockSyncingStatus.percentage_outputs_scanned = 0;

export default mockSyncingStatus;
