/**
 * The two-phase send: propose, then confirm. The sync subscription is
 * dropped for the send and restored afterwards, and `inSend` gates the UI
 * actions that must wait for it.
 */
import { SendJsonToTypeType } from '@app/AppState';
import { FfiResult } from '@app/walletBackend/ffi';
import { WalletBackendConfig } from '@app/walletBackend/config/WalletBackendConfig';
import { confirmSend, sendPropose } from '@app/walletBackend/utils/walletUtils';
import { SyncCoordinator } from './SyncCoordinator';

export class TransactionService {
  config: WalletBackendConfig;
  syncCoordinator: SyncCoordinator;
  inSend: boolean = false;

  constructor(config: WalletBackendConfig, syncCoordinator: SyncCoordinator) {
    this.config = config;
    this.syncCoordinator = syncCoordinator;
  }

  setInSend(value: boolean): void {
    this.inSend = value;
  }

  getInSend(): boolean {
    return this.inSend;
  }

  /** Sends to every receiver in `sendJson` and yields the txids. */
  async sendTransaction(
    sendJson: SendJsonToTypeType[],
  ): Promise<FfiResult<string[]>> {
    await this.syncCoordinator.clearTimers();
    this.setInSend(true);
    this.config.keepAwake(true);

    const proposed = await sendPropose(sendJson);
    const sent = proposed.ok ? await confirmSend() : proposed;

    await this.syncCoordinator.refreshSync();
    await this.syncCoordinator.configure();
    this.setInSend(false);
    return sent;
  }
}
