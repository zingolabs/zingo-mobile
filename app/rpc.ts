import {
  TotalBalance,
  AddressBalance,
  Transaction,
  TxDetail,
  Info,
  SendJsonToType,
  WalletSeed,
  SendProgress,
} from './AppState';
import RPCModule from '../components/RPCModule';
import Utils from './utils';

export default class RPC {
  fnSetInfo: (info: Info) => void;
  fnSetTotalBalance: (totalBalance: TotalBalance) => void;
  fnSetAddressesWithBalance: (addressBalances: AddressBalance[]) => void;
  fnSetTransactionsList: (txList: Transaction[]) => void;
  fnSetAllAddresses: (allAddresses: string[]) => void;
  fnSetZecPrice: (price: number | null) => void;
  fnRefreshUpdates: (blk: number, total: number) => void;
  refreshTimerID: NodeJS.Timeout | null;
  lastBlockHeight: number;

  inRefresh: boolean;

  constructor(
    fnSetTotalBalance: (totalBalance: TotalBalance) => void,
    fnSetAddressesWithBalance: (ab: AddressBalance[]) => void,
    fnSetTransactionsList: (txlist: Transaction[]) => void,
    fnSetAllAddresses: (addresses: string[]) => void,
    fnSetInfo: (info: Info) => void,
    fnSetZecPrice: (price: number | null) => void,
    fnRefreshUpdates: (blk: number, total: number) => void,
  ) {
    this.fnSetTotalBalance = fnSetTotalBalance;
    this.fnSetAddressesWithBalance = fnSetAddressesWithBalance;
    this.fnSetTransactionsList = fnSetTransactionsList;
    this.fnSetAllAddresses = fnSetAllAddresses;
    this.fnSetInfo = fnSetInfo;
    this.fnSetZecPrice = fnSetZecPrice;
    this.fnRefreshUpdates = fnRefreshUpdates;

    this.refreshTimerID = null;

    this.lastBlockHeight = 0;

    this.inRefresh = false;
  }

  async configure() {
    if (!this.refreshTimerID) {
      this.refreshTimerID = setInterval(() => this.refresh(false), 60 * 1000);
    }

    // Load the current wallet data
    this.loadWalletData();

    // Call the refresh after configure to update the UI. Do it in a timeout
    // to allow the UI to render first
    setTimeout(() => {
      this.refresh(true);
    }, 1000);
  }

  clearTimers() {
    if (this.refreshTimerID) {
      clearInterval(this.refreshTimerID);
      this.refreshTimerID = null;
    }
  }

  static async doSync(): Promise<string> {
    const syncstr = await RPCModule.execute('sync', '');
    console.log(`Sync exec result: ${syncstr}`);

    return syncstr;
  }

  static async doRescan() {
    const syncstr = await RPCModule.execute('rescan', '');
    console.log(`rescan exec result: ${syncstr}`);
  }

  static async doSyncStatus(): Promise<string> {
    const syncstr = await RPCModule.execute('syncstatus', '');
    console.log(`syncstatus: ${syncstr}`);
    return syncstr;
  }

  async loadWalletData(walletHeight?: number) {
    if (!walletHeight) {
      walletHeight = await RPC.fetchWalletHeight();
    }

    this.fetchTotalBalance();
    this.fetchTandZTransactions(walletHeight);
    this.getZecPrice();
  }

  async rescan() {
    console.log('RPC Rescan triggered');

    // Empty out the transactions list to start with.
    this.fnSetTransactionsList([]);

    this.refresh(false, true);
  }

  async refresh(fullRefresh: boolean, fullRescan?: boolean) {
    // If we're in refresh, we don't overlap
    if (this.inRefresh) {
      return;
    }

    const latestBlockHeight = await this.fetchInfo();
    if (!latestBlockHeight) {
      return;
    }

    if (fullRefresh || fullRescan || !this.lastBlockHeight || this.lastBlockHeight < latestBlockHeight) {
      // If the latest block height has changed, make sure to sync. This will happen in a new thread
      this.inRefresh = true;

      // This is async, so when it is done, we finish the refresh.
      if (fullRescan) {
        RPC.doRescan().finally(() => {
          this.inRefresh = false;
        });
      } else {
        RPC.doSync().finally(() => {
          this.inRefresh = false;
        });
      }

      const BLOCK_BATCH_SIZE = 10000;
      var nextIntermittentRefresh = 0;

      // If the sync is longer than 10000 blocks, then just update the UI first as well
      if (latestBlockHeight - this.lastBlockHeight > BLOCK_BATCH_SIZE) {
        this.loadWalletData(latestBlockHeight);

        nextIntermittentRefresh = this.lastBlockHeight + BLOCK_BATCH_SIZE;
      }

      // We need to wait for the sync to finish. The sync is done when
      // inRefresh is set to false in the doSync().finally()
      const pollerID = setInterval(async () => {
        const walletHeight = await RPC.fetchWalletHeight();

        // Post sync updates
        this.fnRefreshUpdates(walletHeight, latestBlockHeight);

        // Close the poll timer if the sync finished(checked via promise above)
        if (!this.inRefresh) {
          // We are synced. Cancel the poll timer
          clearInterval(pollerID);

          // And fetch the rest of the data.
          this.loadWalletData(latestBlockHeight);

          this.lastBlockHeight = walletHeight;

          console.log(`Finished full refresh at ${walletHeight}`);
        } else {
          // If we're doing a long sync, every 10,000 blocks, update the UI
          if (nextIntermittentRefresh && walletHeight > nextIntermittentRefresh) {
            // And save the wallet so we don't lose sync status.
            // The wallet has to be saved by the android/ios code
            RPCModule.doSave();

            nextIntermittentRefresh = walletHeight + BLOCK_BATCH_SIZE;
          }
        }
      }, 2000);
    } else {
      // Already at the latest block
      console.log('Already have latest block, waiting for next refresh');
    }
  }

  // Special method to get the Info object. This is used both internally and by the Loading screen
  static async getInfoObject(): Promise<Info | null> {
    try {
      const infostr = await RPCModule.execute('info', '');
      const infoJSON = JSON.parse(infostr);

      const encStatus = await RPCModule.execute('encryptionstatus', '');
      const encJSON = JSON.parse(encStatus);

      const defaultFee = await RPCModule.execute('defaultfee', '');
      const defaultFeeJSON = JSON.parse(defaultFee);

      const info: Info = {
        testnet: infoJSON.chain_name === 'test',
        latestBlock: infoJSON.latest_block_height,
        serverUri: infoJSON.server_uri || '<none>',
        connections: 1,
        version: `${infoJSON.vendor}/${infoJSON.git_commit.substring(0, 6)}/${infoJSON.version}`,
        verificationProgress: 1,
        currencyName: infoJSON.chain_name === 'test' ? 'TAZ' : 'ZEC',
        solps: 0,
        encrypted: encJSON.encrypted,
        locked: encJSON.locked,
        zecPrice: null,
        defaultFee: defaultFeeJSON?.defaultfee / 10 ** 8 || Utils.getFallbackDefaultFee(),
      };

      return info;
    } catch (err) {
      console.log('Failed to parse info', err);
      return null;
    }
  }

  async fetchInfo(): Promise<number | null> {
    const info = await RPC.getInfoObject();
    if (info) {
      this.fnSetInfo(info);
      return info.latestBlock;
    }

    return null;
  }

  // This method will get the total balances
  async fetchTotalBalance() {
    const balanceStr = await RPCModule.execute('balance', '');
    const balanceJSON = JSON.parse(balanceStr);

    console.log(`Num of z addrs ${balanceJSON.z_addresses.length} and t addrs ${balanceJSON.t_addresses.length}`);

    const privateBal = balanceJSON.zbalance / 10 ** 8;
    const transparentBal = balanceJSON.tbalance / 10 ** 8;

    // Total Balance
    const balance: TotalBalance = {
      privateBal,
      transparentBal,
      verifiedPrivate: balanceJSON.verified_zbalance / 10 ** 8,
      total: privateBal + transparentBal,
    };
    this.fnSetTotalBalance(balance);

    // Fetch pending notes and UTXOs
    const pendingNotes = await RPCModule.execute('notes', '');
    const pendingJSON = JSON.parse(pendingNotes);

    const pendingAddressBalances = new Map();

    // Process sapling notes
    pendingJSON.pending_notes.forEach((s: any) => {
      pendingAddressBalances.set(s.address, s.value);
    });

    // Process UTXOs
    pendingJSON.pending_utxos.forEach((s: any) => {
      pendingAddressBalances.set(s.address, s.value);
    });

    // Addresses with Balance. The lite client reports balances in zatoshi, so divide by 10^8;
    const zaddresses = balanceJSON.z_addresses
      .map((o: any) => {
        // If this has any unconfirmed txns, show that in the UI
        const ab = new AddressBalance(o.address, o.zbalance / 10 ** 8);
        if (pendingAddressBalances.has(ab.address)) {
          ab.containsPending = true;
        }
        return ab;
      })
      .filter((ab: AddressBalance) => ab.balance > 0);

    const taddresses = balanceJSON.t_addresses
      .map((o: any) => {
        // If this has any unconfirmed txns, show that in the UI
        const ab = new AddressBalance(o.address, o.balance / 10 ** 8);
        if (pendingAddressBalances.has(ab.address)) {
          ab.containsPending = true;
        }
        return ab;
      })
      .filter((ab: AddressBalance) => ab.balance > 0);

    const addresses = zaddresses.concat(taddresses);

    this.fnSetAddressesWithBalance(addresses);

    // Also set all addresses
    const allZAddresses = balanceJSON.z_addresses.map((o: any) => o.address);
    const allTAddresses = balanceJSON.t_addresses.map((o: any) => o.address);
    const allAddresses = allZAddresses.concat(allTAddresses);

    this.fnSetAllAddresses(allAddresses);
  }

  static async getPrivKeyAsString(address: string): Promise<string> {
    const privKeyStr = await RPCModule.execute('export', address);
    const privKeyJSON = JSON.parse(privKeyStr);

    return privKeyJSON[0].private_key;
  }

  static async createNewAddress(zaddress: boolean) {
    const addrStr = await RPCModule.execute('new', zaddress ? 'z' : 't');
    const addrJSON = JSON.parse(addrStr);

    return addrJSON[0];
  }

  static async fetchSeed(): Promise<WalletSeed> {
    const seedStr = await RPCModule.execute('seed', '');
    const seedJSON = JSON.parse(seedStr);

    const seed: WalletSeed = {seed: seedJSON.seed, birthday: seedJSON.birthday};
    return seed;
  }

  static async fetchWalletHeight(): Promise<number> {
    const heightStr = await RPCModule.execute('height', '');
    const heightJSON = JSON.parse(heightStr);

    return heightJSON.height;
  }

  // Fetch all T and Z transactions
  async fetchTandZTransactions(latestBlockHeight: number) {
    const listStr = await RPCModule.execute('list', '');
    const listJSON = JSON.parse(listStr);

    let txlist = listJSON.map((tx: any) => {
      const type = tx.outgoing_metadata ? 'sent' : 'receive';

      var txdetail: TxDetail[] = [];
      if (tx.outgoing_metadata) {
        const dts = tx.outgoing_metadata.map((o: any) => {
          const detail: TxDetail = {
            address: o.address,
            amount: o.value / 10 ** 8,
            memo: o.memo,
          };

          return detail;
        });

        txdetail = RPC.combineTxDetails(dts);
      } else {
        const detail: TxDetail = {
          address: tx.address,
          amount: tx.amount / 10 ** 8,
          memo: tx.memo,
        };
        txdetail = [detail];
      }

      const transaction: Transaction = {
        type,
        address:
          type === 'sent' ? (tx.outgoing_metadata.length > 0 ? tx.outgoing_metadata[0].address : '') : tx.address,
        amount: tx.amount / 10 ** 8,
        confirmations: tx.unconfirmed ? 0 : latestBlockHeight - tx.block_height + 1,
        txid: tx.txid,
        zec_price: tx.zec_price,
        time: tx.datetime,
        position: tx.position,
        detailedTxns: txdetail,
      };

      return transaction;
    });

    // If you send yourself transactions, the underlying SDK doesn't handle it very well, so
    // we suppress these in the UI to make things a bit clearer.
    txlist = txlist.filter((tx: Transaction) => !(tx.type === 'sent' && tx.amount < 0 && tx.detailedTxns.length === 0));

    // We need to group transactions that have the same (txid and send/receive), for multi-part memos
    const m = new Map();
    txlist.forEach((tx: Transaction) => {
      const key = tx.txid + tx.type;
      const coll = m.get(key);
      if (!coll) {
        m.set(key, [tx]);
      } else {
        coll.push(tx);
      }
    });

    // Now, combine the amounts and memos
    const combinedTxList: Transaction[] = [];
    m.forEach((txns: Transaction[]) => {
      // Get all the txdetails and merge them

      // Clone the first tx into a new one
      const combinedTx = Object.assign({}, txns[0]);
      combinedTx.detailedTxns = RPC.combineTxDetails(txns.flatMap(tx => tx.detailedTxns));

      combinedTxList.push(combinedTx);
    });

    // Sort the list by confirmations
    combinedTxList.sort((t1, t2) => t1.confirmations - t2.confirmations);

    this.fnSetTransactionsList(combinedTxList);
  }

  // We combine detailed transactions if they are sent to the same outgoing address in the same txid. This
  // is usually done to split long memos.
  // Remember to add up both amounts and combine memos
  static combineTxDetails(txdetails: TxDetail[]): TxDetail[] {
    // First, group by outgoing address.
    const m = new Map<string, TxDetail[]>();
    txdetails.forEach(i => {
      const coll = m.get(i.address);
      if (!coll) {
        m.set(i.address, [i]);
      } else {
        coll.push(i);
      }
    });

    // Reduce the groups to a single TxDetail, combining memos and summing amounts
    const reducedDetailedTxns: TxDetail[] = [];
    m.forEach((txns, toaddr) => {
      const totalAmount = txns.reduce((sum, i) => sum + i.amount, 0);

      const memos = txns
        .filter(i => i.memo)
        .map(i => {
          const rex = /\((\d+)\/(\d+)\)((.|[\r\n])*)/;
          const tags = i.memo ? i.memo.match(rex) : null;
          if (tags && tags.length >= 4) {
            return {num: parseInt(tags[1], 10), memo: tags[3]};
          }

          // Just return as is
          return {num: 0, memo: i.memo};
        })
        .sort((a, b) => a.num - b.num)
        .map(a => a.memo);

      const detail: TxDetail = {
        address: toaddr,
        amount: totalAmount,
        memo: memos.length > 0 ? memos.join('') : null,
      };

      reducedDetailedTxns.push(detail);
    });

    return reducedDetailedTxns;
  }

  // Send a transaction using the already constructed sendJson structure
  async sendTransaction(
    sendJson: Array<SendJsonToType>,
    setSendProgress: (arg0: SendProgress | null) => void,
  ): Promise<string> {
    // First, get the previous send progress id, so we know which ID to track
    const prevProgress = JSON.parse(await RPCModule.execute('sendprogress', ''));
    const prevSendId = prevProgress.id;

    try {
      // This is async, so fire and forget
      RPCModule.doSend(JSON.stringify(sendJson));
    } catch (err) {
      // TODO Show a modal with the error
      console.log(`Error sending Tx: ${err}`);
      throw err;
    }

    const startTimeSeconds = new Date().getTime() / 1000;

    // The send command is async, so we need to poll to get the status
    const sendTxPromise = new Promise<string>((resolve, reject) => {
      const intervalID = setInterval(async () => {
        const progress = JSON.parse(await RPCModule.execute('sendprogress', ''));
        console.log(progress);

        const updatedProgress = new SendProgress();
        if (progress.id === prevSendId) {
          // Still not started, so wait for more time
          setSendProgress(updatedProgress);
          return;
        }

        // Calculate ETA.
        let secondsPerComputation = 3; // defalt
        if (progress.progress > 0) {
          const currentTimeSeconds = new Date().getTime() / 1000;
          secondsPerComputation = (currentTimeSeconds - startTimeSeconds) / progress.progress;
        }
        // console.log(`Seconds Per compute = ${secondsPerComputation}`);

        let eta = Math.round((progress.total - progress.progress) * secondsPerComputation);
        if (eta <= 0) {
          eta = 1;
        }

        updatedProgress.progress = progress.progress;
        updatedProgress.total = Math.max(progress.total, progress.progress); // sometimes, due to change, the total can be off by 1
        updatedProgress.sendInProgress = true;
        updatedProgress.etaSeconds = eta;

        if (!progress.txid && !progress.error) {
          // Still processing
          setSendProgress(updatedProgress);
          return;
        }

        // Finished processing
        clearInterval(intervalID);
        setSendProgress(null);

        if (progress.txid) {
          // And refresh data (full refresh)
          this.refresh(true);

          resolve(progress.txid);
        }

        if (progress.error) {
          reject(progress.error);
        }
      }, 2 * 1000); // Every 2 seconds
    });

    return sendTxPromise;
  }

  async encryptWallet(password: string): Promise<boolean> {
    const resultStr = await RPCModule.execute('encrypt', password);
    const resultJSON = JSON.parse(resultStr);

    // To update the wallet encryption status
    this.fetchInfo();

    // And save the wallet
    RPCModule.doSave();

    return resultJSON.result === 'success';
  }

  async decryptWallet(password: string): Promise<boolean> {
    const resultStr = await RPCModule.execute('decrypt', password);
    const resultJSON = JSON.parse(resultStr);

    // To update the wallet encryption status
    this.fetchInfo();

    // And save the wallet
    await RPCModule.doSave();

    return resultJSON.result === 'success';
  }

  async lockWallet(): Promise<boolean> {
    const resultStr = await RPCModule.execute('lock', '');
    const resultJSON = JSON.parse(resultStr);

    // To update the wallet encryption status
    this.fetchInfo();

    return resultJSON.result === 'success';
  }

  async unlockWallet(password: string): Promise<boolean> {
    const resultStr = await RPCModule.execute('unlock', password);
    const resultJSON = JSON.parse(resultStr);

    // To update the wallet encryption status
    this.fetchInfo();

    return resultJSON.result === 'success';
  }

  async getZecPrice() {
    const resultStr: string = await RPCModule.execute('zecprice', '');
    if (resultStr.toLowerCase().startsWith('error')) {
      console.log(`Error fetching price ${resultStr}`);
      return;
    }

    const resultJSON = JSON.parse(resultStr);
    if (resultJSON.zec_price) {
      this.fnSetZecPrice(resultJSON.zec_price);
    }
  }
}
