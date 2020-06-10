import {TotalBalance, AddressBalance, Transaction, TxDetail, Info, SendJsonToType, WalletSeed} from './AppState';
import RPCModule from '../components/RPCModule';

export default class RPC {
  fnSetInfo: (info: Info) => void;
  fnSetTotalBalance: (totalBalance: TotalBalance) => void;
  fnSetAddressesWithBalance: (addressBalances: AddressBalance[]) => void;
  fnSetTransactionsList: (txList: Transaction[]) => void;
  fnSetAllAddresses: (allAddresses: string[]) => void;
  fnSetZecPrice: (price: number | null) => void;
  fnRefreshUpdates: (blk: number, total: number) => void;
  refreshTimerID: number | null;
  priceTimerID: number | null;
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
    this.priceTimerID = null;

    this.lastBlockHeight = 0;

    this.inRefresh = false;
  }

  async configure() {
    if (!this.refreshTimerID) {
      this.refreshTimerID = setInterval(() => this.refresh(false), 60 * 1000);
    }

    if (!this.priceTimerID) {
      this.priceTimerID = setTimeout(() => this.getZecPrice(0), 1000);
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

    if (this.priceTimerID) {
      clearTimeout(this.priceTimerID);
      this.priceTimerID = null;
    }
  }

  static async doSync(): Promise<string> {
    const syncstr = await RPCModule.doSync();
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
  }

  async refresh(fullRefresh: boolean) {
    // If we're in refresh, we don't overlap
    if (this.inRefresh) {
      return;
    }

    const latestBlockHeight = await this.fetchInfo();
    if (!latestBlockHeight) {
      return;
    }

    if (fullRefresh || !this.lastBlockHeight || this.lastBlockHeight < latestBlockHeight) {
      // If the latest block height has changed, make sure to sync. This will happen in a new thread
      this.inRefresh = true;

      // This is async, so when it is done, we finish the refresh.
      RPC.doSync().finally(() => {
        this.inRefresh = false;
      });

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

      const info: Info = {
        testnet: infoJSON.chain_name === 'test',
        latestBlock: infoJSON.latest_block_height,
        connections: 1,
        version: infoJSON.version,
        verificationProgress: 1,
        currencyName: infoJSON.chain_name === 'test' ? 'TAZ' : 'ZEC',
        solps: 0,
        encrypted: encJSON.encrypted,
        locked: encJSON.locked,
        zecPrice: null,
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
      combinedTx.detailedTxns = RPC.combineTxDetails(txns.flatMap((tx) => tx.detailedTxns));

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
    txdetails.forEach((i) => {
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
        .filter((i) => i.memo)
        .map((i) => {
          const rex = /\((\d+)\/(\d+)\)((.|[\r\n])*)/;
          const tags = i.memo ? i.memo.match(rex) : null;
          if (tags && tags.length >= 4) {
            return {num: parseInt(tags[1], 10), memo: tags[3]};
          }

          // Just return as is
          return {num: 0, memo: i.memo};
        })
        .sort((a, b) => a.num - b.num)
        .map((a) => a.memo);

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
  async sendTransaction(sendJson: Array<SendJsonToType>): Promise<string> {
    let sendStr;
    try {
      sendStr = await RPCModule.doSend(JSON.stringify(sendJson));
    } catch (err) {
      // TODO Show a modal with the error
      console.log(`Error sending Tx: ${err}`);
      throw err;
    }

    if (sendStr.startsWith('Error')) {
      // Throw the proper error
      throw sendStr.split(/[\r\n]+/)[0];
    }

    console.log(`Send response: ${sendStr}`);
    const sendJSON = JSON.parse(sendStr);
    const {txid, error} = sendJSON;

    if (error) {
      console.log(`Error sending Tx: ${error}`);
      throw error;
    } else {
      // And refresh data (full refresh)
      this.refresh(true);

      return txid;
    }
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

  setupNextZecPriceRefresh(retryCount: number, timeout: number) {
    // Every hour
    this.priceTimerID = setTimeout(() => this.getZecPrice(retryCount), timeout);
  }

  async getZecPrice(retryCount: number) {
    if (!retryCount) {
      retryCount = 0;
    }

    try {
      const response = await fetch('https://api.coincap.io/v2/rates/zcash');
      const zecData = (await response.json()).data;

      if (zecData) {
        this.fnSetZecPrice(zecData.rateUsd);
        this.setupNextZecPriceRefresh(0, 1000 * 60 * 60); // Every hour
      } else {
        this.fnSetZecPrice(null);
        let timeout = 1000 * 60; // 1 minute
        if (retryCount > 5) {
          timeout = 1000 * 60 * 60; // an hour later
        }
        this.setupNextZecPriceRefresh(retryCount + 1, timeout);
      }
    } catch (err) {
      console.log(err);
      this.fnSetZecPrice(null);
      let timeout = 1000 * 60; // 1 minute
      if (retryCount > 5) {
        timeout = 1000 * 60 * 60; // an hour later
      }
      this.setupNextZecPriceRefresh(retryCount + 1, timeout);
    }
  }
}
