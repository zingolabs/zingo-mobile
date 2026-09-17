/**
 * Handles the two-phase send flow: propose → confirm.
 *
 * sendTransaction clears the sync timer before sending (so sync can't race
 * with an in-flight transaction) and restarts it via SyncCoordinator.configure
 * when done. The inSend flag is exposed so the UI can gate actions that must
 * not run during a send.
 */
import { SendJsonToTypeType } from '@app/AppState';
import RPCModule from '@app/RPCModule';
import { RPCSendProposeType } from '@app/walletBackend/types/RPCSendProposeType';
import { RPCSendType } from '@app/walletBackend/types/RPCSendType';
import { WalletBackendConfig } from '@app/walletBackend/config/WalletBackendConfig';
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

  async sendTransaction(sendJson: Array<SendJsonToTypeType>): Promise<string> {
    const sendTxPromise = new Promise<string>(async (resolve, reject) => {
      await this.syncCoordinator.clearTimers();
      this.setInSend(true);
      this.config.keepAwake(true);

      let sendError: string = '';
      let sendTxids: string = '';
      try {
        // sendProcess and confirmProcess reject on failure (typed FFI
        // errors); the catch owns that path. Only an empty resolution — a
        // programming error — is classified here.
        const proposeStr: string = await RPCModule.sendProcess(
          JSON.stringify(sendJson),
        );
        if (!proposeStr) {
          console.log('Internal Error propose');
          sendError = 'Error: Internal RPC Error: propose';
        }
        if (!sendError) {
          const proposeJSON: RPCSendProposeType = await JSON.parse(proposeStr);
          if (proposeJSON.error) {
            console.log(`Error propose ${proposeJSON.error}`);
            sendError = proposeJSON.error;
          }
          if (!sendError) {
            const sendStr: string = await RPCModule.confirmProcess();
            if (!sendStr) {
              console.log('Internal Error confirm');
              sendError = 'Error: Internal RPC Error: confirm';
            }
            if (!sendError) {
              const sendJSON: RPCSendType = await JSON.parse(sendStr);
              if (sendJSON.error) {
                console.log(`Error confirm ${sendJSON.error}`);
                sendError = sendJSON.error;
              } else if (sendJSON.txids && sendJSON.txids.length > 0) {
                sendTxids = sendJSON.txids.join(', ');
              }
            }
          }
        }
      } catch (error) {
        console.log(`Critical Error send ${error}`);
        sendError = `Error: send ${error}`;
      }

      await this.syncCoordinator.refreshSync();
      await this.syncCoordinator.configure();
      this.setInSend(false);

      if (sendTxids) {
        resolve(sendTxids);
        return;
      }
      if (sendError) {
        reject(sendError);
        return;
      }
    });

    return sendTxPromise;
  }
}
