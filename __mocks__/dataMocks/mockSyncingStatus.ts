import { SyncingStatusClass } from '../../app/AppState';

export const mockSyncingStatus: SyncingStatusClass = new SyncingStatusClass();

mockSyncingStatus.syncID = 1;
mockSyncingStatus.inProgress = true;
mockSyncingStatus.currentBatch = 5;
mockSyncingStatus.totalBatches = 50;
mockSyncingStatus.currentBlock = 1800100;
mockSyncingStatus.lastBlockWallet = 1800000;
mockSyncingStatus.lastBlockServer = 1900100;
mockSyncingStatus.secondsPerBatch = 122;
mockSyncingStatus.processEndBlock = 1600100;

export default mockSyncingStatus;
