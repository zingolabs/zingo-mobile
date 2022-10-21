import {
  SyncStatusReport,
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
  fnSetSyncStatusReport: (syncStatusReport: SyncStatusReport) => void;
  fnSetInfo: (info: Info) => void;
  fnSetTotalBalance: (totalBalance: TotalBalance) => void;
  fnSetAddressesWithBalance: (addressBalances: AddressBalance[]) => void;
  fnSetTransactionsList: (txList: Transaction[]) => void;
  fnSetAllAddresses: (allAddresses: string[]) => void;
  fnSetZecPrice: (price: number | null) => void;
  fnSetRefreshUpdates: (inProgress: boolean, progress: number, blocks: string) => void;
  fnSetWalletSettings: (settings: WalletSettings) => void;

  refreshTimerID: NodeJS.Timeout | null;
  updateTimerID?: NodeJS.Timeout;

  updateDataLock: boolean;
  updateDataCtr: number;

  lastWalletBlockHeight: number;
  lastServerBlockHeight: number;

  lastTxId?: string;

  inRefresh: boolean;

  constructor(
    fnSetSyncStatusReport: (syncStatusReport: SyncStatusReport) => void,
    fnSetTotalBalance: (totalBalance: TotalBalance) => void,
    fnSetAddressesWithBalance: (ab: AddressBalance[]) => void,
    fnSetTransactionsList: (txlist: Transaction[]) => void,
    fnSetAllAddresses: (addresses: string[]) => void,
    fnSetWalletSettings: (settings: WalletSettings) => void,
    fnSetInfo: (info: Info) => void,
    fnSetZecPrice: (price: number | null) => void,
    fnSetRefreshUpdates: (inProgress: boolean, progress: number, blocks: string) => void,
  ) {
    this.fnSetSyncStatusReport = fnSetSyncStatusReport;
    this.fnSetTotalBalance = fnSetTotalBalance;
    this.fnSetAddressesWithBalance = fnSetAddressesWithBalance;
    this.fnSetTransactionsList = fnSetTransactionsList;
    this.fnSetAllAddresses = fnSetAllAddresses;
    this.fnSetWalletSettings = fnSetWalletSettings;
    this.fnSetInfo = fnSetInfo;
    this.fnSetZecPrice = fnSetZecPrice;
    this.fnSetRefreshUpdates = fnSetRefreshUpdates;

    this.refreshTimerID = null;
    this.updateTimerID = undefined;

    this.updateDataLock = false;
    this.updateDataCtr = 0;

    this.lastWalletBlockHeight = 0;
    this.lastServerBlockHeight = 0;

    this.lastTxId = undefined;

    this.inRefresh = false;
  }

  static async rpc_setWalletSettingOption(name: string, value: string): Promise<string> {
    const r = await RPCModule.execute('setoption', `${name}=${value}`);

    await RPCModule.doSave();
    // console.log(r);
    return r;
  }

  // Special method to get the Info object. This is used both internally and by the Loading screen
  static async rpc_getInfoObject(): Promise<Info | null> {
    try {
      const infostr = await RPCModule.execute('info', '');
      const infoJSON = await JSON.parse(infostr);

      // console.log(infoJSON);

      const encStatus = await RPCModule.execute('encryptionstatus', '');
      const encJSON = await JSON.parse(encStatus);

      // console.log(encJSON);

      const defaultFee = await RPCModule.execute('defaultfee', '');
      const defaultFeeJSON = await JSON.parse(defaultFee);

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

  static async rpc_fetchServerHeight(): Promise<number | null> {
    const info = await RPC.rpc_getInfoObject();

    if (info) {
      return info.latestBlock;
    }

    return null;
  }

  static async rpc_fetchWalletHeight(): Promise<number> {
    const heightStr = await RPCModule.execute('height', '');
    const heightJSON = await JSON.parse(heightStr);

    if (heightJSON) {
      return heightJSON.height;
    }

    return null;
  }

  static async rpc_getPrivKeyAsString(address: string): Promise<string> {
    const privKeyStr = await RPCModule.execute('export', address);
    const privKeyJSON = await JSON.parse(privKeyStr);

    //console.log('sk', privKeyJSON);

    // 'o' - spending_key
    // 'z' and 't' - private_key
    if (privKeyJSON) {
      return privKeyJSON[0].spending_key || privKeyJSON[0].private_key;
    }

    return null;
  }

  static async rpc_getViewKeyAsString(address: string): Promise<string> {
    const viewKeyStr = await RPCModule.execute('export', address);
    const viewKeyJSON = await JSON.parse(viewKeyStr);

    //console.log('vk', viewKeyJSON);

    // 'o' - full_viewing_key
    // 'z' and 't' - viewing_key
    if (viewKeyJSON) {
      return viewKeyJSON[0].full_viewing_key || viewKeyJSON[0].viewing_key;
    }

    return null;
  }

  static async rpc_createNewAddress(addressType: 'z' | 't' | 'o'): Promise<string> {
    // 'z' 't' or 'o'
    const addrStr = await RPCModule.execute('new', addressType);
    const addrJSON = await JSON.parse(addrStr);

    // console.log(addrJSON);

    if (addrJSON) {
      // Save
      await RPCModule.doSave();

      return addrJSON[0];
    }

    return null;
  }

  static async rpc_doImportPrivKey(key: string, birthday: string): Promise<string | string[]> {
    if (isNaN(parseInt(birthday, 10))) {
      return `Error: Couldn't parse ${birthday} as a number`;
    }

    const args = {key, birthday: parseInt(birthday, 10), norescan: true};
    const address = await RPCModule.execute('import', JSON.stringify(args));

    if (address) {
      return address;
    }

    return null;
  }

  static async rpc_shieldTransparent(): Promise<string> {
    const shieldStr = await RPCModule.execute('shield', '');

    // console.log(shieldStr);

    if (shieldStr) {
      return shieldStr;
    }

    return null;
  }

  static async rpc_fetchSeed(): Promise<WalletSeed> {
    const seedStr = await RPCModule.execute('seed', '');
    const seedJSON = await JSON.parse(seedStr);

    if (seedJSON) {
      const seed: WalletSeed = {seed: seedJSON.seed, birthday: seedJSON.birthday};
      return seed;
    }

    return null;
  }

  static async rpc_getLastTxid(): Promise<string> {
    const lastTxIdStr = await RPCModule.execute('lasttxid', '');
    const lastTxidJSON = await JSON.parse(lastTxIdStr);

    if (lastTxidJSON) {
      return lastTxidJSON.last_txid;
    }

    return null;
  }

  // We combine detailed transactions if they are sent to the same outgoing address in the same txid. This
  // is usually done to split long memos.
  // Remember to add up both amounts and combine memos
  combineTxDetails(txdetails: TxDetail[]): TxDetail[] {
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

  // this is only for the first time when the App is booting.
  async configure() {
    // every minute the App try to Sync the new blocks.
    if (!this.refreshTimerID) {
      this.refreshTimerID = setInterval(() => this.refresh(false), 60 * 1000); // 1 min
    }

    // every 3 seconds the App update all data
    if (!this.updateTimerID) {
      this.updateTimerID = setInterval(() => this.updateData(), 3 * 1000); // 3 secs
    }

    // Load the current wallet data
    await this.loadWalletData();

    // Call the refresh after configure to update the UI. Do it in a timeout
    // to allow the UI to render first
    setTimeout(() => {
      this.refresh(true);
    }, 1000);
  }

  async clearTimers() {
    if (this.refreshTimerID) {
      await clearInterval(this.refreshTimerID);
      this.refreshTimerID = null;
    }

    if (this.updateTimerID) {
      await clearInterval(this.updateTimerID);
      this.updateTimerID = undefined;
    }
  }

  async doSync(): Promise<string> {
    const syncstr = await RPCModule.execute('sync', '');

    //console.log(`Sync exec result: ${syncstr}`);

    if (syncstr) {
      return syncstr;
    }

    return null;
  }

  async doRescan() {
    const syncstr = await RPCModule.execute('rescan', '');

    //console.log(`rescan exec result: ${syncstr}`);

    if (syncstr) {
      return syncstr;
    }

    return null;
  }

  async doSyncStatus(): Promise<string> {
    const syncstr = await RPCModule.execute('syncstatus', '');

    // console.log(`syncstatus: ${syncstr}`);

    if (syncstr) {
      return syncstr;
    }

    return null;
  }

  async loadWalletData() {
    await this.fetchTotalBalance();
    await this.fetchTandZandOTransactions();
    await this.getZecPrice();
    await this.fetchWalletSettings();
  }

  async rescan() {
    // console.log('RPC Rescan triggered');
    // Empty out the transactions list to start with.
    await this.fnSetTransactionsList([]);

    await this.refresh(false, true);
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
    const latest_txid = await RPC.rpc_getLastTxid();

    if (this.lastTxId !== latest_txid) {
      // console.log(`Latest: ${latest_txid}, prev = ${this.lastTxId}`);

      await this.fetchWalletHeight();
      await this.fetchServerHeight();

      this.lastTxId = latest_txid;

      //console.log("Update data fetching new txns");

      // And fetch the rest of the data.
      await this.loadWalletData();

      //console.log(`Finished update data at ${lastServerBlockHeight}`);
    }
    this.updateDataLock = false;
  }

  async refresh(fullRefresh: boolean, fullRescan?: boolean) {
    // If we're in refresh, we don't overlap
    if (this.inRefresh) {
      return;
    }

    await this.fetchWalletHeight();
    await this.fetchServerHeight();
    if (!this.lastServerBlockHeight) {
      return;
    }

    if (fullRefresh || fullRescan || !this.lastWalletBlockHeight || this.lastWalletBlockHeight < this.lastServerBlockHeight) {
      // If the latest block height has changed, make sure to sync. This will happen in a new thread
      this.inRefresh = true;

      this.prevProgress = 0;
      this.prevBatchNum = -1;
      this.prev_sync_id = -1;
      this.seconds_batch = 0;
      this.batches = 0;
      this.message = 'Sync process started';
      this.process_end_block = -1;

      // This is async, so when it is done, we finish the refresh.
      if (fullRescan) {
        this.doRescan()
          .then((r) => console.log('End Rescan OK: ' + r))
          .catch((e) => console.log('End Rescan ERROR: ' + e))
          .finally(() => {
            this.inRefresh = false;
          });
      } else {
        this.doSync()
          .then((r) => console.log('End Sync OK: ' + r))
          .catch((e) => console.log('End Sync ERROR: ' + e))
          .finally(() => {
            this.inRefresh = false;
          });
      }

      // if it's a rescan we need to save first the wallet
      if (fullRescan) {
        // And fetch the rest of the data.
        await this.loadWalletData();

        await this.fetchWalletHeight();
        await this.fetchServerHeight();

        await RPCModule.doSave();
      }

      // We need to wait for the sync to finish. The sync is done when
      let pollerID = setInterval(async () => {
        const s = await this.doSyncStatus();
        const ss = await JSON.parse(s);

        console.log('sync status', ss);

        // if in_progress is false change the value in the class
        if (!ss.in_progress) {
          this.inRefresh = false;
        }

        // if the sync_id change then reset the %
        if (this.prev_sync_id !== ss.sync_id) {
          if (this.prev_sync_id !== -1) {
            console.log(`new sync process id: ${ss.sync_id}.`);
            this.prevProgress = 0;
            this.prevBatchNum = -1;
            this.seconds_batch = 0;
            this.batches = 0;
            this.message = 'Sync process started';
            this.process_end_block = -1;
          }
          this.prev_sync_id = ss.sync_id;
        }

        // Post sync updates
        const synced_blocks: number = ss.synced_blocks || 0;
        const trial_decryptions_blocks: number = ss.trial_decryptions_blocks|| 0;
        const txn_scan_blocks: number = ss.txn_scan_blocks || 0;

        const total_blocks: number = ss.total_blocks || 0;

        const batch_total: number = ss.batch_total || 0;
        const batch_num: number = ss.batch_num || 0;

        const end_block: number = ss.end_block || 0; // lower

        if (batch_num === 0 && this.process_end_block === -1) {
          this.process_end_block = end_block; // this is the first block to sync
        }

        const total_general_blocks: number = this.lastServerBlockHeight - this.process_end_block;

        const progress_blocks: number = (synced_blocks + trial_decryptions_blocks + txn_scan_blocks) / 3;

        const total_progress_blocks: number = batch_total === 1 ? progress_blocks : (1000 * batch_num) + progress_blocks;

        let progress: number = (total_progress_blocks * 100) / total_general_blocks;

        // not using a fake increment. But could be a good idea.
        const increment: number = 0;

        console.log('prev', this.prevProgress, 'act', progress);

        if (this.prevProgress <= progress) {
          progress += increment;
        } else if (this.prevProgress > progress) {
          progress = this.prevProgress + increment;
        }

        // just in case.
        if (progress > 100) progress = 100;
        if (progress < 0) progress = 0;

        // And fetch the rest of the data.
        await this.loadWalletData();

        await this.fetchWalletHeight();
        await this.fetchServerHeight();

        await this.fnSetRefreshUpdates(ss.in_progress, '', (end_block + progress_blocks).toFixed(0).toString() + ' of ' + this.lastServerBlockHeight.toString());

        // store SyncStatusReport object for a new screen
        const status: SyncStatusReport = {
          syncID: ss.sync_id,
          totalBatches: batch_total,
          currentBatch: ss.in_progress ? batch_num + 1 : 0,
          lastBlockWallet: this.lastWalletBlockHeight,
          currentBlock: parseInt((end_block + progress_blocks).toFixed(0)),
          inProgress: ss.in_progress,
          lastError: ss.last_error,
          blocksPerBatch: 1000,
          secondsPerBatch: this.seconds_batch,
          percent: progress,
          message: this.message,
          process_end_block: this.process_end_block,
          lastBlockServer: this.lastServerBlockHeight,
        };
        await this.fnSetSyncStatusReport(status);

        this.prevProgress = progress;

        this.seconds_batch += 2;

        // Close the poll timer if the sync finished(checked via promise above)
        if (!this.inRefresh) {
          // We are synced. Cancel the poll timer
          clearInterval(pollerID);
          pollerID = undefined;

          // And fetch the rest of the data.
          await this.loadWalletData();

          await this.fetchWalletHeight();
          await this.fetchServerHeight();

          await RPCModule.doSave();
          this.prevProgress = 0;
          progress = 0;
          this.message = 'The sync process finished successfully.';

          await this.fnSetRefreshUpdates(ss.inRefresh, '', this.lastWalletBlockHeight.toString() + ' of ' + this.lastServerBlockHeight.toString());

          // store SyncStatusReport object for a new screen
          const status: SyncStatusReport = {
            syncID: ss.sync_id,
            totalBatches: 0,
            currentBatch: 0,
            lastBlockWallet: this.lastWalletBlockHeight,
            currentBlock: this.lastWalletBlockHeight,
            inProgress: this.inRefresh,
            lastError: ss.last_error,
            blocksPerBatch: 1000,
            secondsPerBatch: 0,
            percent: 0,
            message: this.message,
            process_end_block: this.process_end_block,
            lastBlockServer: this.lastServerBlockHeight,
          };
          await this.fnSetSyncStatusReport(status);

          console.log(`Finished refresh at ${this.lastWalletBlockHeight} id: ${ss.sync_id}`);
        } else {
          // If we're doing a long sync, every time the batch_num changes, save the wallet
          if (this.prevBatchNum !== batch_num) {
            if (this.prevBatchNum !== -1) {
              // And fetch the rest of the data.
              await this.loadWalletData();

              await this.fetchWalletHeight();
              await this.fetchServerHeight();

              await RPCModule.doSave();
              this.batches = 0;
              this.message = `Stored the wallet because batch: ${batch_num + 1} is finished.`;

              // store SyncStatusReport object for a new screen
              const status: SyncStatusReport = {
                syncID: ss.sync_id,
                totalBatches: batch_total,
                currentBatch: ss.in_progress ? batch_num + 1 : 0,
                lastBlockWallet: this.lastWalletBlockHeight,
                currentBlock: parseInt((end_block + progress_blocks).toFixed(0)),
                inProgress: ss.in_progress,
                lastError: ss.last_error,
                blocksPerBatch: 1000,
                secondsPerBatch: this.seconds_batch,
                percent: progress,
                message: this.message,
                process_end_block: this.process_end_block,
                lastBlockServer: this.lastServerBlockHeight,
              };
              await this.fnSetSyncStatusReport(status);

              console.log(`Saving because batch num changed ${this.prevBatchNum + 1} - ${batch_num + 1}. seconds: ${this.seconds_batch}`);
            }
            this.prevBatchNum = batch_num;
            this.seconds_batch = 0;
            this.batches += 1;
          }
          // save wallet every minute
          if (this.seconds_batch > 0 && this.seconds_batch % 60 === 0) {
            // And fetch the rest of the data.
            await this.loadWalletData();

            await this.fetchWalletHeight();
            await this.fetchServerHeight();

            await RPCModule.doSave();
            this.message = `Stored the wallet. ${this.seconds_batch} seconds.`;

            // store SyncStatusReport object for a new screen
            const status: SyncStatusReport = {
              syncID: ss.sync_id,
              totalBatches: batch_total,
              currentBatch: ss.in_progress ? batch_num + 1 : 0,
              lastBlockWallet: this.lastWalletBlockHeight,
              currentBlock: parseInt((end_block + progress_blocks).toFixed(0)),
              inProgress: ss.in_progress,
              lastError: ss.last_error,
              blocksPerBatch: 1000,
              secondsPerBatch: this.seconds_batch,
              percent: progress,
              message: this.message,
              process_end_block: this.process_end_block,
              lastBlockServer: this.lastServerBlockHeight,
            };
            await this.fnSetSyncStatusReport(status);

            console.log(`Saving wallet. seconds: ${this.seconds_batch}`);
          }
        }
      }, 2000);
    } else {
      // Already at the latest block
      console.log('Already have latest block, waiting for next refresh');
    }
  }

  async fetchWalletSettings() {
    const download_memos_str = await RPCModule.execute('getoption', 'download_memos');
    const download_memos_json = await JSON.parse(download_memos_str);

    const transaction_filter_threshold_str = await RPCModule.execute('getoption', 'transaction_filter_threshold');
    const transaction_filter_threshold_json = await JSON.parse(transaction_filter_threshold_str);

    const settings = await SettingsFileImpl.readSettings();

    //console.log(settings);

    const wallet_settings = new WalletSettings();
    if (download_memos_json) {
      wallet_settings.download_memos = download_memos_json.download_memos;
    }
    if (transaction_filter_threshold_json) {
      wallet_settings.transaction_filter_threshold = transaction_filter_threshold_json.transaction_filter_threshold;
    }
    if (settings) {
      wallet_settings.server = settings.server;
    }
    await this.fnSetWalletSettings(wallet_settings);
  }

  async fetchInfo(): Promise<number | null> {
    const info = await RPC.rpc_getInfoObject();

    if (info) {
      await this.fnSetInfo(info);
      this.lastServerBlockHeight = info.latestBlock;
    }
  }

  async fetchServerHeight(): Promise<number | null> {
    const info = await RPC.rpc_getInfoObject();

    if (info) {
      await this.fnSetInfo(info);
      this.lastServerBlockHeight = info.latestBlock;
    }
  }

  // This method will get the total balances
  async fetchTotalBalance() {
    const balanceStr = await RPCModule.execute('balance', '');
    const balanceJSON = await JSON.parse(balanceStr);

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
    await this.fnSetTotalBalance(balance);

    // Fetch pending notes and UTXOs
    const pendingNotes = await RPCModule.execute('notes', '');
    const pendingNotesJSON = await JSON.parse(pendingNotes);

    //console.log(pendingNotes);

    const pendingAddressBalances = new Map();

    // Process sapling notes
    if (!!pendingNotesJSON.pending_notes) {
      pendingNotesJSON.pending_notes.forEach((s: any) => {
        pendingAddressBalances.set(s.address, s.value);
      });
    }

    // Process UTXOs
    if (!!pendingNotesJSON.pending_utxos) {
      pendingNotesJSON.pending_utxos.forEach((s: any) => {
        pendingAddressBalances.set(s.address, s.value);
      });

    }

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

    await this.fnSetAddressesWithBalance(addresses);

    // Also set all addresses
    const allOAddresses = balanceJSON.orchard_addresses.map((o: any) => o.address);
    const allZAddresses = balanceJSON.sapling_addresses.map((o: any) => o.address);
    const allTAddresses = balanceJSON.transparent_addresses.map((o: any) => o.address);
    const allAddresses = [...allOAddresses, ...allZAddresses, ...allTAddresses];

    // console.log(`All addresses: ${allAddresses}`);

    await this.fnSetAllAddresses(allAddresses);
  }

  async fetchWalletHeight(): Promise<number> {
    const heightStr = await RPCModule.execute('height', '');
    const heightJSON = await JSON.parse(heightStr);

    if (heightJSON) {
      this.lastWalletBlockHeight = heightJSON.height;
    }
  }

  // Fetch all T and Z and O transactions
  async fetchTandZandOTransactions() {
    const listStr = await RPCModule.execute('list', '');
    const listJSON = await JSON.parse(listStr);

    await this.fetchServerHeight();

    //console.log('trans: ', listJSON);

    let txlist = listJSON.map(async (tx: any) => {
      const type = tx.outgoing_metadata ? 'sent' : 'receive';

      var txdetail: TxDetail[] = [];
      if (tx.outgoing_metadata) {
        const dts = tx.outgoing_metadata.map((o: any) => {
          const detail: TxDetail = {
            address: o.address || "",
            amount: (o.value || 0) / 10 ** 8,
            memo: o.memo || null,
          };

          return detail;
        });

        txdetail = await this.combineTxDetails(dts);
      } else {
        const detail: TxDetail = {
          address: tx.address || "",
          amount: (tx.amount || 0) / 10 ** 8,
          memo: tx.memo || null,
        };
        txdetail = [detail];
      }

      const transaction: Transaction = {
        type,
        address:
          type === 'sent' ? (tx.outgoing_metadata.length > 0 ? tx.outgoing_metadata[0].address : '') : tx.address,
        amount: tx.amount / 10 ** 8,
        confirmations: tx.unconfirmed
          ? 0
          : !!this.lastServerBlockHeight
            ? this.lastServerBlockHeight - tx.block_height + 1
            : '--',
        txid: tx.txid,
        zec_price: tx.zec_price,
        time: tx.datetime,
        position: tx.position,
        detailedTxns: txdetail,
      };

      return transaction;
    });

    //console.log(txlist);

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
    m.forEach(async (txns: Transaction[]) => {
      // Get all the txdetails and merge them

      // Clone the first tx into a new one
      const combinedTx = Object.assign({}, txns[0]);
      combinedTx.detailedTxns = await this.combineTxDetails(txns.flatMap(tx => tx.detailedTxns));

      combinedTxList.push(combinedTx);
    });

    // Sort the list by confirmations
    combinedTxList.sort((t1, t2) => t1.confirmations - t2.confirmations);

    await this.fnSetTransactionsList(combinedTxList);
  }

  // Send a transaction using the already constructed sendJson structure
  async sendTransaction(
    sendJson: Array<SendJsonToType>,
    setSendProgress: (arg0: SendProgress | null) => void,
  ): Promise<string> {
    // First, get the previous send progress id, so we know which ID to track
    const prevProg = await RPCModule.execute('sendprogress', '');
    const prevProgress = await JSON.parse(prevProg);
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
        const prog = await RPCModule.execute('sendprogress', '');
        const progress = await JSON.parse(prog);
        const sendId = progress.id;
        //console.log(progress);

        const updatedProgress = new SendProgress();
        if (sendId === prevSendId) {
          // Still not started, so wait for more time
          await setSendProgress(updatedProgress);
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
          await setSendProgress(updatedProgress);
          return;
        }

        // Finished processing
        clearInterval(intervalID);
        await setSendProgress(null);

        if (progress.txid) {
          // And refresh data (full refresh)
          await this.refresh(true);

          resolve(progress.txid);
        }

        if (progress.error) {
          reject(progress.error);
        }
      }, 2000); // Every 2 seconds
    });

    return sendTxPromise;
  }

  async encryptWallet(password: string): Promise<boolean> {
    const resultStr = await RPCModule.execute('encrypt', password);
    const resultJSON = await JSON.parse(resultStr);

    if (resultJSON) {
      // To update the wallet encryption status
      await this.fetchInfo();

      // And save the wallet
      await RPCModule.doSave();

      return resultJSON.result === 'success';
    }

    return false;
  }

  async decryptWallet(password: string): Promise<boolean> {
    const resultStr = await RPCModule.execute('decrypt', password);
    const resultJSON = await JSON.parse(resultStr);

    if (resultJSON) {
      // To update the wallet encryption status
      await this.fetchInfo();

      // And save the wallet
      await RPCModule.doSave();

      return resultJSON.result === 'success';
    }

    return false;
  }

  async lockWallet(): Promise<boolean> {
    const resultStr = await RPCModule.execute('lock', '');
    const resultJSON = await JSON.parse(resultStr);

    if (resultJSON) {
      // To update the wallet encryption status
      await this.fetchInfo();

      // And save the wallet
      await RPCModule.doSave();

      return resultJSON.result === 'success';
    }

    return false;
  }

  async unlockWallet(password: string): Promise<boolean> {
    const resultStr = await RPCModule.execute('unlock', password);
    const resultJSON = await JSON.parse(resultStr);

    if (resultJSON) {
      // To update the wallet encryption status
      await this.fetchInfo();

      // And save the wallet
      await RPCModule.doSave();

      return resultJSON.result === 'success';
    }

    return false;
  }

  async getZecPrice() {
    const resultStr: string = await RPCModule.execute('updatecurrentprice', '');

    if (resultStr) {
      if (resultStr.toLowerCase().startsWith('error')) {
        //console.log(`Error fetching price ${resultStr}`);
        return;
      }

      await this.fnSetZecPrice(parseFloat(resultStr));
    }

    return;
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
