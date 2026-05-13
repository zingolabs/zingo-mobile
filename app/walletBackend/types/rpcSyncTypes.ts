export enum RPCPerformanceLevelEnum {
  Low = 'Low',
  Medium = 'Medium',
  High = 'High',
  Maximum = 'Maximum',
}

export enum RPCSyncScanRangePriorityStatusEnum {
  Scanning = 'Scanning',
  Scanned = 'Scanned',
  ScannedWithoutMapping = 'ScannedWithoutMapping',
  Historic = 'Historic',
  OpenAdjacent = 'OpenAdjacent',
  FoundNote = 'FoundNote',
  ChainTip = 'ChainTip',
  Verify = 'Verify',
  RefetchingNullifiers = 'RefetchingNullifiers',
}

export type RPCSyncScanRangeStatusType = {
  priority: RPCSyncScanRangePriorityStatusEnum;
  start_block: number;
  end_block: number;
};

export type RPCSyncStatusType = {
  scan_ranges?: RPCSyncScanRangeStatusType[];
  sync_start_height?: number;
  session_blocks_scanned?: number;
  total_blocks_scanned?: number;
  percentage_session_blocks_scanned?: number;
  percentage_total_blocks_scanned?: number;
  session_sapling_outputs_scanned?: number;
  total_sapling_outputs_scanned?: number;
  session_orchard_outputs_scanned?: number;
  total_orchard_outputs_scanned?: number;
  percentage_session_outputs_scanned?: number;
  percentage_total_outputs_scanned?: number;
};

export type RPCSyncCompletePollType = {
  sync_start_height: number;
  sync_end_height: number;
  blocks_scanned: number;
  sapling_outputs_scanned: number;
  orchard_outputs_scanned: number;
  percentage_total_outputs_scanned?: number;
};

export type RPCSyncPollType = {
  sync_complete: RPCSyncCompletePollType;
};

export type RPCConfigWalletPerformanceType = {
  performance_level: RPCPerformanceLevelEnum;
};
