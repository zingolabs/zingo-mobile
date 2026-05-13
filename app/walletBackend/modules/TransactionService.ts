import RPCModule from '../../RPCModule';
import { SendJsonToTypeType } from '../../AppState';
import { WalletBackendConfig } from '../config/WalletBackendConfig';
import { SyncCoordinator } from './SyncCoordinator';

export class TransactionService {
  inSend = false;

  constructor(
    private cfg: WalletBackendConfig,
    private sync: SyncCoordinator,
  ) {}

  setInSend(value: boolean): void {
    this.inSend = value;
  }

  getInSend(): boolean {
    return this.inSend;
  }

  async sendTransaction(sendJson: Array<SendJsonToTypeType>): Promise<string> {
    await this.sync.clearTimers();
    this.setInSend(true);
    this.cfg.keepAwake(true);
    try {
      await RPCModule.sendProcess(JSON.stringify(sendJson));
      const confirmInfo = await RPCModule.confirmProcess();
      return confirmInfo.txids.join(', ');
    } catch (error) {
      console.log(`Critical Error send ${error}`);
      throw error;
    } finally {
      await this.sync.refreshSync();
      await this.sync.configure();
      this.setInSend(false);
    }
  }
}
