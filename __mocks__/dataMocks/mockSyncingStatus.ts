import { ScanPriority, SyncStatus } from 'zingo-ffi';

export const mockSyncingStatus: SyncStatus = {
  scanRanges: [
    {
      priority: ScanPriority.Scanned,
      startBlock: 2000000,
      endBlock: 2500000,
    },
  ],
  syncStartHeight: 2000000,
  sessionBlocksScanned: 0,
  totalBlocksScanned: 0,
  percentageSessionBlocksScanned: 0,
  percentageTotalBlocksScanned: 100,
  sessionSaplingOutputsScanned: 0,
  totalSaplingOutputsScanned: 0,
  sessionOrchardOutputsScanned: 0,
  totalOrchardOutputsScanned: 0,
  sessionIronwoodOutputsScanned: 0,
  totalIronwoodOutputsScanned: 0,
  percentageSessionOutputsScanned: 0,
  percentageTotalOutputsScanned: 100,
  totalOutputsScanned: 0n,
  totalOutputs: 0n,
};

export default mockSyncingStatus;
