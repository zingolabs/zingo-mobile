import {
  TotalBalance,
  AddressBalance,
  Transaction,
  TxDetail,
  Info,
  SendJsonToType,
  WalletSeed,
  SendProgress,
  WalletSettings,
} from './AppState';
import RPCModule from '../components/RPCModule';
import Utils from './utils';
import SettingsFileImpl from '../components/SettingsFileImpl';

export default class RPC {
  fnSetInfo: (info: Info) => void;
  fnSetTotalBalance: (totalBalance: TotalBalance) => void;
  fnSetAddressesWithBalance: (addressBalances: AddressBalance[]) => void;
  fnSetTransactionsList: (txList: Transaction[]) => void;
  fnSetAllAddresses: (allAddresses: string[]) => void;
  fnSetZecPrice: (price: number | null) => void;
  fnRefreshUpdates: (inProgress: boolean, progress: number) => void;
  fnSetWalletSettings: (settings: WalletSettings) => void;
  refreshTimerID: NodeJS.Timeout | null;
  updateTimerId?: NodeJS.Timeout;

  updateDataLock: boolean;
  updateDataCtr: number;

  lastWalletBlockHeight: number;
  serverHeight: number;

  lastTxId?: string;

  inRefresh: boolean;

  constructor(
    fnSetTotalBalance: (totalBalance: TotalBalance) => void,
    fnSetAddressesWithBalance: (ab: AddressBalance[]) => void,
    fnSetTransactionsList: (txlist: Transaction[]) => void,
    fnSetAllAddresses: (addresses: string[]) => void,
    fnSetWalletSettings: (settings: WalletSettings) => void,
    fnSetInfo: (info: Info) => void,
    fnSetZecPrice: (price: number | null) => void,
    fnRefreshUpdates: (inProgress: boolean, progress: number) => void,
  ) {
    this.fnSetTotalBalance = fnSetTotalBalance;
    this.fnSetAddressesWithBalance = fnSetAddressesWithBalance;
    this.fnSetTransactionsList = fnSetTransactionsList;
    this.fnSetAllAddresses = fnSetAllAddresses;
    this.fnSetWalletSettings = fnSetWalletSettings;
    this.fnSetInfo = fnSetInfo;
    this.fnSetZecPrice = fnSetZecPrice;
    this.fnRefreshUpdates = fnRefreshUpdates;

    this.refreshTimerID = null;
    this.updateTimerId = undefined;

    this.updateDataLock = false;
    this.updateDataCtr = 0;
    this.lastWalletBlockHeight = 0;
    this.serverHeight = 0;

    this.inRefresh = false;
  }

  async configure() {
    if (!this.refreshTimerID) {
      this.refreshTimerID = setInterval(() => this.refresh(false), 60 * 1000); // 1 min
    }

    if (!this.updateTimerId) {
      this.updateTimerId = setInterval(() => this.updateData(), 3 * 1000); // 3 secs
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

    if (this.updateTimerId) {
      clearInterval(this.updateTimerId);
      this.updateTimerId = undefined;
    }
  }

  static async doSync(): Promise<string> {
    const syncstr = await RPCModule.execute('sync', '');
    // console.log(`Sync exec result: ${syncstr}`);
    return syncstr;
  }

  static async doRescan() {
    const syncstr = await RPCModule.execute('rescan', '');
    // console.log(`rescan exec result: ${syncstr}`);
    return syncstr;
  }

  static async doSyncStatus(): Promise<string> {
    const syncstr = await RPCModule.execute('syncstatus', '');
    // console.log(`syncstatus: ${syncstr}`);
    return syncstr;
  }

  async loadWalletData() {
    this.fetchTotalBalance();
    this.fetchTandZandOTransactions();
    this.getZecPrice();
    this.fetchWalletSettings();
  }

  async rescan() {
    // console.log('RPC Rescan triggered');
    // Empty out the transactions list to start with.
    this.fnSetTransactionsList([]);

    this.refresh(false, true);
  }

  async updateData() {
    //console.log("Update data triggered");
    if (this.updateDataLock) {
      //console.log("Update lock, returning");
      return;
    }

    this.updateDataCtr += 1;
    if (this.inRefresh && this.updateDataCtr % 5 !== 0) {
      // We're refreshing, in which case update every 5th time
      return;
    }

    this.updateDataLock = true;
    const latest_txid = await RPC.getLastTxid();

    if (this.lastTxId !== latest_txid) {
      // console.log(`Latest: ${latest_txid}, prev = ${this.lastTxId}`);

      const walletHeight = await RPC.fetchWalletHeight();
      this.lastWalletBlockHeight = walletHeight;

      this.lastTxId = latest_txid;

      //console.log("Update data fetching new txns");

      // And fetch the rest of the data.
      this.loadWalletData();

      //console.log(`Finished update data at ${latestBlockHeight}`);
    }
    this.updateDataLock = false;
  }

  async refresh(fullRefresh: boolean, fullRescan?: boolean) {
    // If we're in refresh, we don't overlap
    if (this.inRefresh) {
      return;
    }

    const latestBlockHeight = await this.fetchInfoLatestBlockHeight();
    if (!latestBlockHeight) {
      return;
    }

    if (fullRefresh || fullRescan || !this.lastWalletBlockHeight || this.lastWalletBlockHeight < latestBlockHeight) {
      // If the latest block height has changed, make sure to sync. This will happen in a new thread
      this.inRefresh = true;
      this.prevProgress = 0;

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

      let prevBatchNum = -1;
      let prev_sync_id = -1;
      let seconds_batch = 0;
      let batches = 0;

      // We need to wait for the sync to finish. The sync is done when
      // inRefresh is set to false in the doSync().finally()
      let pollerID = setInterval(async () => {
        const ss = JSON.parse(await RPC.doSyncStatus());

        console.log('sync status', ss);

        // Post sync updates
        const synced_blocks = ss.synced_blocks || 0;
        const trial_decryptions_blocks = ss.trial_decryptions_blocks|| 0;
        const txn_scan_blocks = ss.txn_scan_blocks || 0;

        const total_blocks = ss.total_blocks || 0;

        const batch_total = ss.batch_total || 0;
        const batch_num = ss.batch_num || 0;

        const total_general_blocks = batch_total === 1 ? total_blocks : (1000 * (batch_total - 1)) + total_blocks;

        const progress_blocks = (synced_blocks + trial_decryptions_blocks + txn_scan_blocks) / 3;

        const total_progress_blocks = batch_total === 1 ? progress_blocks : (1000 * batch_num) + progress_blocks;

        let progress = (total_progress_blocks * 100) / total_general_blocks;

        // guessing 100 seconds for batch - Fake increment
        const increment = 100 / ((total_general_blocks  * 100) / 1000);

        console.log('prev', this.prevProgress, 'act', progress, 'incr', increment);

        if (this.prevProgress <= progress) {
          progress += increment;
        } else if (this.prevProgress > progress) {
          progress = this.prevProgress + increment;
        }

        if (progress >= 100) progress = 99.99;

        this.fnRefreshUpdates(ss.in_progress, progress, (ss.start_block - ss.end_block));

        this.prevProgress = progress;

        seconds_batch += 2;

        // if the sync_id change then reset the %
        if (prev_sync_id !== ss.sync_id) {
          if (prevBatchNum !== -1) {
            console.log(`new sync process id: ${ss.sync_id} and save the wallet, just in case.`);
            await RPCModule.doSave();
            this.prevProgress = 0;
            progress = 0;
          }
          prev_sync_id = ss.sync_id;
        }

        // Close the poll timer if the sync finished(checked via promise above)
        if (!this.inRefresh) {
          // We are synced. Cancel the poll timer
          clearInterval(pollerID);
          pollerID = undefined;

          // And fetch the rest of the data.
          this.loadWalletData();

          const walletHeight = await RPC.fetchWalletHeight();
          this.lastWalletBlockHeight = walletHeight;

          await RPCModule.doSave();
          this.prevProgress = 0;
          progress = 0;
          console.log(`Finished refresh at ${walletHeight} id: ${ss.sync_id}`);
        } else {
          // If we're doing a long sync, every time the batch_num changes, save the wallet
          if (prevBatchNum !== ss.batch_num) {
            if ((prevBatchNum !== -1 && seconds_batch > 10) || batches > 5) {
              console.log(`Saving because batch num changed ${prevBatchNum} - ${ss.batch_num}. seconds: ${seconds_batch}`);
              await RPCModule.doSave();
              batches = 0;
            }
            prevBatchNum = ss.batch_num;
            seconds_batch = 0;
            batches += 1;
          }
        }
      }, 2000);
    } else {
      // Already at the latest block
      // console.log('Already have latest block, waiting for next refresh');
    }
  }

  async fetchWalletSettings() {
    const download_memos_str = await RPCModule.execute('getoption', 'download_memos');
    const download_memos = JSON.parse(download_memos_str).download_memos;

    const transaction_filter_threshold_str = await RPCModule.execute('getoption', 'transaction_filter_threshold');
    const transaction_filter_threshold = JSON.parse(transaction_filter_threshold_str).transaction_filter_threshold;

    const settings = await SettingsFileImpl.readSettings();
    const server = settings.server;

    // console.log(transaction_filter_threshold_str);

    const wallet_settings = new WalletSettings();
    wallet_settings.download_memos = download_memos;
    wallet_settings.transaction_filter_threshold = transaction_filter_threshold;
    wallet_settings.server = server;

    this.fnSetWalletSettings(wallet_settings);
  }

  static async setWalletSettingOption(name: string, value: string): Promise<string> {
    const r = await RPCModule.execute('setoption', `${name}=${value}`);

    await RPCModule.doSave();
    // console.log(r);
    return r;
  }

  // Special method to get the Info object. This is used both internally and by the Loading screen
  static async getInfoObject(): Promise<Info | null> {
    try {
      const infostr = await RPCModule.execute('info', '');
      const infoJSON = JSON.parse(infostr);

      // console.log(infoJSON);

      const encStatus = await RPCModule.execute('encryptionstatus', '');
      const encJSON = JSON.parse(encStatus);

      // console.log(encJSON);

      const defaultFee = await RPCModule.execute('defaultfee', '');
      const defaultFeeJSON = JSON.parse(defaultFee);

      // console.log(defaultFeeJSON);

      const info: Info = {
        chain_name: infoJSON.chain_name,
        latestBlock: infoJSON.latest_block_height,
        serverUri: infoJSON.server_uri || '<none>',
        connections: 1,
        version: `${infoJSON.vendor}/${infoJSON.git_commit.substring(0, 6)}/${infoJSON.version}`,
        verificationProgress: 1,
        currencyName: infoJSON.chain_name === 'main' ? 'ZEC' : 'TAZ',
        solps: 0,
        encrypted: encJSON.encrypted,
        locked: encJSON.locked,
        zecPrice: null,
        defaultFee: defaultFeeJSON?.defaultfee / 10 ** 8 || Utils.getFallbackDefaultFee(),
      };

      return info;
    } catch (err) {
      //console.log('Failed to parse info', err);
      return null;
    }
  }

  async fetchInfo(): Promise<number | null> {
    const info = await RPC.getInfoObject();
    if (info) {
      this.fnSetInfo(info);
      this.serverHeight = info.latestBlock;
    }
  }

  async fetchInfoLatestBlockHeight(): Promise<number | null> {
    const info = await RPC.getInfoObject();
    if (info) {
      this.fnSetInfo(info);
      this.serverHeight = info.latestBlock;
      return info.latestBlock;
    }

    return null;
  }

  // This method will get the total balances
  async fetchTotalBalance() {
    const balanceStr = await RPCModule.execute('balance', '');
    const balanceJSON = JSON.parse(balanceStr);

    //console.log(balanceJSON);

    const orchardBal = (balanceJSON.orchard_balance || 0) / 10 ** 8;
    const privateBal = (balanceJSON.sapling_balance || 0) / 10 ** 8;
    const transparentBal = (balanceJSON.transparent_balance || 0) / 10 ** 8;

    // Total Balance
    const balance: TotalBalance = {
      orchardBal,
      privateBal,
      transparentBal,
      spendableOrchard: (balanceJSON.spendable_orchard_balance || 0) / 10 ** 8,
      spendablePrivate: (balanceJSON.spendable_sapling_balance || 0) / 10 ** 8,
      total: orchardBal + privateBal + transparentBal,
    };
    this.fnSetTotalBalance(balance);

    // Fetch pending notes and UTXOs
    const pendingNotes = await RPCModule.execute('notes', '');
    const pendingJSON = JSON.parse(pendingNotes);

    //console.log(pendingNotes);

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
    const oaddresses = balanceJSON.orchard_addresses
      .map((o: any) => {
        // If this has any unconfirmed txns, show that in the UI
        const ab = new AddressBalance(o.address, (o.orchard_balance || 0) / 10 ** 8);
        if (pendingAddressBalances.has(ab.address)) {
          ab.containsPending = true;
        }
        return ab;
      })
      .filter((ab: AddressBalance) => ab.balance > 0);

    const zaddresses = balanceJSON.sapling_addresses
      .map((z: any) => {
        // If this has any unconfirmed txns, show that in the UI
        const ab = new AddressBalance(z.address, (z.sapling_balance || 0) / 10 ** 8);
        if (pendingAddressBalances.has(ab.address)) {
          ab.containsPending = true;
        }
        return ab;
      })
      .filter((ab: AddressBalance) => ab.balance > 0);

    const taddresses = balanceJSON.transparent_addresses
      .map((t: any) => {
        // If this has any unconfirmed txns, show that in the UI
        const ab = new AddressBalance(t.address, (t.balance || 0) / 10 ** 8);
        if (pendingAddressBalances.has(ab.address)) {
          ab.containsPending = true;
        }
        return ab;
      })
      .filter((ab: AddressBalance) => ab.balance > 0);

    const addresses = [...oaddresses, ...zaddresses, ...taddresses];

    this.fnSetAddressesWithBalance(addresses);

    // Also set all addresses
    const allOAddresses = balanceJSON.orchard_addresses.map((o: any) => o.address);
    const allZAddresses = balanceJSON.sapling_addresses.map((o: any) => o.address);
    const allTAddresses = balanceJSON.transparent_addresses.map((o: any) => o.address);
    const allAddresses = [...allZAddresses, ...allTAddresses, ...allOAddresses];

    // console.log(`All addresses: ${allAddresses}`);

    this.fnSetAllAddresses(allAddresses);
  }

  static async getPrivKeyAsString(address: string): Promise<string> {
    const privKeyStr = await RPCModule.execute('export', address);
    const privKeyJSON = JSON.parse(privKeyStr);

    //console.log('sk', privKeyJSON);

    // 'o' - spending_key
    // 'z' and 't' - private_key
    return privKeyJSON[0].spending_key || privKeyJSON[0].private_key;
  }

  static async getViewKeyAsString(address: string): Promise<string> {
    const viewKeyStr = await RPCModule.execute('export', address);
    const viewKeyJSON = JSON.parse(viewKeyStr);

    //console.log('vk', viewKeyJSON);

    // 'o' - full_viewing_key
    // 'z' and 't' - viewing_key
    return viewKeyJSON[0].full_viewing_key || viewKeyJSON[0].viewing_key;
  }

  static async createNewAddress(addressType: 'z' | 't' | 'o'): Promise<string> {
    // 'z' 't' or 'o'
    const addrStr = await RPCModule.execute('new', addressType);
    const addrJSON = JSON.parse(addrStr);

    // console.log(addrJSON);

    // Save
    await RPCModule.doSave();

    return addrJSON[0];
  }

  static async doImportPrivKey(key: string, birthday: string): Promise<string | string[]> {
    if (isNaN(parseInt(birthday, 10))) {
      return `Error: Couldn't parse ${birthday} as a number`;
    }

    const args = {key, birthday: parseInt(birthday, 10), norescan: true};
    const address = await RPCModule.execute('import', JSON.stringify(args));

    return address;
  }

  static async shieldTransparent(): Promise<string> {
    const shieldStr = await RPCModule.execute('shield', '');

    // console.log(shieldStr);
    return shieldStr;
  }

  static async fetchSeed(): Promise<WalletSeed> {
    const seedStr = await RPCModule.execute('seed', '');
    const seedJSON = JSON.parse(seedStr);

    const seed: WalletSeed = {seed: seedJSON.seed, birthday: seedJSON.birthday};
    return seed;
  }

  static async getLastTxid(): Promise<string> {
    const lastTxIdStr = await RPCModule.execute('lasttxid', '');
    const lastTxidJSON = JSON.parse(lastTxIdStr);

    return lastTxidJSON.last_txid;
  }

  static async fetchWalletHeight(): Promise<number> {
    const heightStr = await RPCModule.execute('height', '');
    const heightJSON = JSON.parse(heightStr);

    return heightJSON.height;
  }

  // Fetch all T and Z and O transactions
  async fetchTandZandOTransactions() {
    const listStr = await RPCModule.execute('list', '');
    const listJSON = JSON.parse(listStr);
    const serverHeight = this.serverHeight || 0;

    //console.log(listJSON);

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
        confirmations: tx.unconfirmed ? 0 : serverHeight - tx.block_height + 1,
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

    //console.log(sendJson);

    try {
      // This is async, so fire and forget
      RPCModule.doSend(JSON.stringify(sendJson));
    } catch (err) {
      // TODO Show a modal with the error
      //console.log(`Error sending Tx: ${err}`);
      throw err;
    }

    const startTimeSeconds = new Date().getTime() / 1000;

    // The send command is async, so we need to poll to get the status
    const sendTxPromise = new Promise<string>((resolve, reject) => {
      const intervalID = setInterval(async () => {
        const progress = JSON.parse(await RPCModule.execute('sendprogress', ''));
        const sendId = progress.id;
        //console.log(progress);

        const updatedProgress = new SendProgress();
        if (sendId === prevSendId) {
          // Still not started, so wait for more time
          setSendProgress(updatedProgress);
          return;
        }

        // Calculate ETA.
        let secondsPerComputation = 3; // default
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
    await RPCModule.doSave();

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
    const resultStr: string = await RPCModule.execute('updatecurrentprice', '');
    if (resultStr.toLowerCase().startsWith('error')) {
      //console.log(`Error fetching price ${resultStr}`);
      return;
    }

    if (resultStr) {
      this.fnSetZecPrice(parseFloat(resultStr));
    }
  }

  async changeWallet() {
    const exists = await RPCModule.walletExists();

    //console.log('jc change wallet', exists);
    if (exists && exists !== 'false') {
      await RPCModule.doSaveBackup();
      await RPCModule.deleteExistingWallet();
    } else {
      return `Error: Couldn't find any wallet.`;
    }
    return "";
  }

  async changeWalletNoBackup() {
    const exists = await RPCModule.walletExists();

    //console.log('jc change wallet', exists);
    if (exists && exists !== 'false') {
      await RPCModule.deleteExistingWallet();
    } else {
      return `Error: Couldn't find any wallet.`;
    }
    return "";
  }

  async restoreBackup() {
    const existsBackup = await RPCModule.walletBackupExists();

    //console.log('jc restore backup', existsBackup);
    if (existsBackup && existsBackup !== 'false') {
      const existsWallet = await RPCModule.walletExists();

      //console.log('jc restore wallet', existsWallet);
      if (existsWallet && existsWallet !== 'false') {
        await RPCModule.RestoreExistingWalletBackup();
      } else {
        return `Error: Couldn't find any wallet.`;
      }
    } else {
      return `Error: Couldn't find any backup of any wallet.`;
    }
    return "";
  }

  async setInRefresh(value) {
    this.inRefresh = value;
  }
}
