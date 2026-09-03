import { RPCSyncScanRangePriorityStatusEnum } from '@app/walletBackend/enums/RPCSyncScanRangePriorityStatusEnum';

export type RPCSyncScanRangeStatusType = {
  priority: RPCSyncScanRangePriorityStatusEnum;
  start_block: number;
  end_block: number;
};
