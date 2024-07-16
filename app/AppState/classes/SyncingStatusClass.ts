import { GlobalConst } from '../const/GlobalConst';

export default class SyncingStatusClass {
  // sync ID
  syncID: number;

  // total of batches to process (usually 1000 or 100 blocks per batch)
  totalBatches: number;

  // batch that is processing now
  currentBatch: number;

  // total blocks per batch
  blocksPerBatch: number;

  // last block of the wallet
  lastBlockWallet: number;

  // block that is processing
  currentBlock: number;

  inProgress: boolean;

  lastError: string;

  secondsPerBatch: number;

  processEndBlock: number;

  lastBlockServer: number;

  syncProcessStalled: boolean;

  constructor() {
    this.syncID = -1;
    this.totalBatches = 0;
    this.currentBatch = 0;
    this.blocksPerBatch = GlobalConst.blocksPerBatch;
    this.lastBlockWallet = 0;
    this.currentBlock = 0;
    this.inProgress = false;
    this.lastError = '';
    this.secondsPerBatch = 0;
    this.processEndBlock = 0;
    this.lastBlockServer = 0;
    this.syncProcessStalled = false;
  }
}
