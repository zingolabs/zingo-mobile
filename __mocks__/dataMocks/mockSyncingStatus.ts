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
mockSyncingStatus.session_blocks_scanned = 0;
mockSyncingStatus.total_blocks_scanned = 0;
mockSyncingStatus.percentage_session_blocks_scanned = 0;
mockSyncingStatus.percentage_total_blocks_scanned = 100;
mockSyncingStatus.session_sapling_outputs_scanned = 0;
mockSyncingStatus.total_sapling_outputs_scanned = 0;
mockSyncingStatus.session_orchard_outputs_scanned = 0;
mockSyncingStatus.total_orchard_outputs_scanned = 0;
mockSyncingStatus.percentage_session_outputs_scanned = 0;
mockSyncingStatus.percentage_total_outputs_scanned = 100;

export default mockSyncingStatus;
