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
import { depositSpendsSourceAddress } from '@app/swap/depositRouting';
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

  // `sendAll` routes the propose phase through the native `sendAllProcess`
  // (zingolib's `propose_send_all`) instead of `sendProcess`. The amount the
  // Send screen shows as the maximum is sized by a send-max proposal, and an
  // ordinary send request for it can be refused by the input selector, so the
  // whole balance only goes out this way. The confirm phase is the same for
  // both: the proposal is already stored.
  async sendTransaction(
    sendJson: Array<SendJsonToTypeType>,
    sendAll: boolean = false,
  ): Promise<string> {
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
        const proposeStr: string = sendAll
          ? await RPCModule.sendAllProcess(
              sendJson[0].address,
              sendJson[0].memo ?? '',
            )
          : await RPCModule.sendProcess(JSON.stringify(sendJson));
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

  // Pays a swap deposit, answering every txid in order, the vault payment
  // last. A memo rides in an OP_RETURN, which a shielded spend cannot carry:
  // a memo-bearing deposit is a deshield to a wallet-owned transparent
  // address and that address paying the vault, through its own native entry
  // point. The same pair, carrying no memo, serves a provider that checks the
  // deposit came from the declared source address. Otherwise it is one
  // ordinary send, with Maya's shielded memo as a 0 ZEC note beside it.
  async sendSwapDeposit(args: {
    depositAddress: string;
    amountAtomic: number;
    memoBytes?: Uint8Array;
    viaSourceAddress?: boolean;
    shieldedMemoAddress?: string;
  }): Promise<string[]> {
    const carriesMemo = !!args.memoBytes && args.memoBytes.length > 0;
    if (!depositSpendsSourceAddress(args)) {
      const sendJson: Array<SendJsonToTypeType> = [
        { address: args.depositAddress, amount: args.amountAtomic },
      ];
      if (args.shieldedMemoAddress && args.memoBytes && carriesMemo) {
        sendJson.push({
          address: args.shieldedMemoAddress,
          amount: 0,
          memo: utf8Text(args.memoBytes),
        });
      }
      const joined = await this.sendTransaction(sendJson);
      return joined
        .split(',')
        .map(s => s.trim())
        .filter(s => s.length > 0);
    }

    await this.syncCoordinator.clearTimers();
    this.setInSend(true);
    this.config.keepAwake(true);
    try {
      const answer = await RPCModule.sendSwapDepositProcess(
        args.depositAddress,
        String(args.amountAtomic),
        args.memoBytes && carriesMemo ? bytesToHex(args.memoBytes) : '',
      );
      const parsed: RPCSendType = JSON.parse(answer);
      if (parsed.error) {
        throw new Error(parsed.error);
      }
      return parsed.txids ?? [];
    } finally {
      await this.syncCoordinator.refreshSync();
      await this.syncCoordinator.configure();
      this.setInSend(false);
    }
  }
}

function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes, b => b.toString(16).padStart(2, '0')).join('');
}

function utf8Text(bytes: Uint8Array): string {
  return new TextDecoder().decode(bytes);
}
