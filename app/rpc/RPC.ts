import {
  TotalBalanceClass,
  AddressClass,
  TransactionType,
  TxDetailType,
  InfoType,
  SendJsonToTypeType,
  WalletType,
  SendProgressClass,
  WalletSettingsClass,
  TranslateType,
  SyncingStatusClass,
} from '../AppState';
import RPCModule from '../RPCModule';
import Utils from '../utils';
import { RPCAddressType } from './types/RPCAddressType';
import { RPCBalancesType } from './types/RPCBalancesType';
import { RPCNotesType } from './types/RPCNotesType';
import { RPCOrchardNoteType } from './types/RPCOrchardNoteType';
import { RPCSaplingNoteType } from './types/RPCSaplingNoteType';
import { RPCUtxoNoteType } from './types/RPCUtxoNoteType';
import { RPCInfoType } from './types/RPCInfoType';
import { RPCDefaultFeeType } from './types/RPCDefaultFeeType';
import { RPCWalletHeight } from './types/RPCWalletHeightType';
import { RPCSeedType } from './types/RPCSeedType';
import { RPCSyncStatusType } from './types/RPCSyncStatusType';
import { RPCGetOptionType } from './types/RPCGetOptionType';
import { RPCSendProgressType } from './types/RPCSendProgressType';
import { RPCSyncRescan } from './types/RPCSyncRescanType';
import { RPCUfvkType } from './types/RPCUfvkType';
import { RPCSummariesType } from './types/RPCSummariesType';

export default class RPC {
  fnSetInfo: (info: InfoType) => void;
  fnSetTotalBalance: (totalBalance: TotalBalanceClass) => void;
  fnSetTransactionsList: (txList: TransactionType[]) => void;
  fnSetAllAddresses: (allAddresses: AddressClass[]) => void;
  fnSetSyncingStatus: (syncingStatus: SyncingStatusClass) => void;
  fnSetWalletSettings: (settings: WalletSettingsClass) => void;
  translate: (key: string) => TranslateType;
  keepAwake: (keep: boolean) => void;

  refreshTimerID?: NodeJS.Timeout;
  updateTimerID?: NodeJS.Timeout;
  syncStatusTimerID?: NodeJS.Timeout;

  updateDataLock: boolean;
  updateDataCtr: number;

  lastWalletBlockHeight: number;
  lastServerBlockHeight: number;
  walletBirthday: number;

  inRefresh: boolean;
  inSend: boolean;
  blocksPerBatch: number;

  prev_batch_num: number;
  prev_sync_id: number;
  prev_current_block: number;
  seconds_batch: number;
  seconds_block: number;
  batches: number;
  latest_block: number;
  sync_id: number;

  timers: NodeJS.Timeout[];

  readOnly: boolean;

  constructor(
    fnSetTotalBalance: (totalBalance: TotalBalanceClass) => void,
    fnSetTransactionsList: (txlist: TransactionType[]) => void,
    fnSetAllAddresses: (addresses: AddressClass[]) => void,
    fnSetWalletSettings: (settings: WalletSettingsClass) => void,
    fnSetInfo: (info: InfoType) => void,
    fnSetSyncingStatus: (syncingStatus: SyncingStatusClass) => void,
    translate: (key: string) => TranslateType,
    keepAwake: (keep: boolean) => void,
    readOnly: boolean,
  ) {
    this.fnSetTotalBalance = fnSetTotalBalance;
    this.fnSetTransactionsList = fnSetTransactionsList;
    this.fnSetAllAddresses = fnSetAllAddresses;
    this.fnSetWalletSettings = fnSetWalletSettings;
    this.fnSetInfo = fnSetInfo;
    this.fnSetSyncingStatus = fnSetSyncingStatus;
    this.translate = translate;
    this.keepAwake = keepAwake;

    this.updateDataLock = false;
    this.updateDataCtr = 0;

    this.lastWalletBlockHeight = 0;
    this.lastServerBlockHeight = 0;
    this.walletBirthday = 0;

    this.inRefresh = false;
    this.inSend = false;
    this.blocksPerBatch = 100;

    this.prev_batch_num = -1;
    this.prev_sync_id = -1;
    this.prev_current_block = -1;
    this.seconds_batch = 0;
    this.seconds_block = 0;
    this.batches = 0;
    this.latest_block = -1;
    this.sync_id = -1;

    this.timers = [];

    this.readOnly = readOnly;
  }

  static async rpc_setInterruptSyncAfterBatch(value: string): Promise<void> {
    try {
      const resultStr: string = await RPCModule.execute('interrupt_sync_after_batch', value);

      if (resultStr) {
        if (resultStr.toLowerCase().startsWith('error')) {
          console.log(`Error setting interrupt_sync_after_batch ${resultStr}`);
        }
      } else {
        console.log('Internal Error setting interrupt_sync_after_batch');
      }
    } catch (error) {
      console.log(`Critical Error setting interrupt_sync_after_batch ${error}`);
    }
  }

  static async rpc_getZecPrice(): Promise<number> {
    try {
      // values:
      // 0   - initial/default value
      // -1  - error in Gemini/zingolib.
      // -2  - error in RPCModule, likely.
      // > 0 - real value
      const resultStr: string = await RPCModule.execute('updatecurrentprice', '');
      //console.log(resultStr);

      if (resultStr) {
        if (resultStr.toLowerCase().startsWith('error') || isNaN(parseFloat(resultStr))) {
          console.log(`Error fetching price ${resultStr}`);
          return -1;
        } else {
          return parseFloat(resultStr);
        }
      } else {
        console.log('Internal Error fetching price');
        return -2;
      }
    } catch (error) {
      console.log(`Critical Error fetching price ${error}`);
      return -2;
    }
  }

  static async rpc_setWalletSettingOption(name: string, value: string): Promise<string> {
    try {
      const resultStr: string = await RPCModule.execute('setoption', `${name}=${value}`);

      if (resultStr) {
        if (resultStr.toLowerCase().startsWith('error')) {
          console.log(`Error setting option ${resultStr}`);
          return resultStr;
        }
        await RPCModule.doSave();
        return resultStr;
      } else {
        console.log('Internal Error setting option');
        return '';
      }
    } catch (error) {
      console.log(`Critical Error setting option ${error}`);
      return '';
    }
  }

  // Special method to get the Info object. This is used both internally and by the Loading screen
  static async rpc_getInfoObject(): Promise<InfoType> {
    try {
      const infoStr: string = await RPCModule.execute('info', '');
      if (infoStr) {
        if (infoStr.toLowerCase().startsWith('error')) {
          console.log(`Error info ${infoStr}`);
          return {} as InfoType;
        }
      } else {
        console.log('Internal Error info');
        return {} as InfoType;
      }
      const infoJSON: RPCInfoType = await JSON.parse(infoStr);

      const defaultFeeStr: string = await RPCModule.execute('defaultfee', '');
      if (defaultFeeStr) {
        if (defaultFeeStr.toLowerCase().startsWith('error')) {
          console.log(`Error defaultfee ${defaultFeeStr}`);
          return {} as InfoType;
        }
      } else {
        console.log('Internal Error defaultfee');
        return {} as InfoType;
      }
      const defaultFeeJSON: RPCDefaultFeeType = await JSON.parse(defaultFeeStr);

      let zingolibStr: string = await RPCModule.execute('version', '');
      if (zingolibStr) {
        if (zingolibStr.toLowerCase().startsWith('error')) {
          console.log(`Error zingolib version ${zingolibStr}`);
          zingolibStr = '<error>';
        }
      } else {
        console.log('Internal Error zingolib version');
        zingolibStr = '<none>';
      }
      //const zingolibJSON = await JSON.parse(zingolibStr);

      const info: InfoType = {
        chain_name: infoJSON.chain_name,
        latestBlock: infoJSON.latest_block_height,
        serverUri: infoJSON.server_uri || '<none>',
        connections: 1,
        version: `${infoJSON.vendor}/${infoJSON.git_commit.substring(0, 6)}/${infoJSON.version}`,
        verificationProgress: 1,
        currencyName: infoJSON.chain_name === 'main' ? 'ZEC' : 'TAZ',
        solps: 0,
        defaultFee: defaultFeeJSON.defaultfee / 10 ** 8 || Utils.getFallbackDefaultFee(),
        zingolib: zingolibStr,
      };

      return info;
    } catch (error) {
      console.log(`Critical Error info and/or defaultfee ${error}`);
      return {} as InfoType;
    }
  }

  static async rpc_fetchServerHeight(): Promise<number> {
    const info = await RPC.rpc_getInfoObject();

    if (info) {
      return info.latestBlock;
    }

    return 0;
  }

  static async rpc_fetchWalletHeight(): Promise<number> {
    try {
      const heightStr: string = await RPCModule.execute('height', '');
      if (heightStr) {
        if (heightStr.toLowerCase().startsWith('error')) {
          console.log(`Error wallet height ${heightStr}`);
          return 0;
        }
      } else {
        console.log('Internal Error wallet height');
        return 0;
      }
      const heightJSON: RPCWalletHeight = await JSON.parse(heightStr);

      return heightJSON.height;
    } catch (error) {
      console.log(`Critical Error wallet height ${error}`);
      return 0;
    }
  }
  /*
  static async rpc_getPrivKeyAsString(address: string): Promise<string> {
    const privKeyStr = await RPCModule.execute('export', address);
    //console.log(privKeyStr);

    let privKeyJSON;
    try {
      privKeyJSON = await JSON.parse(privKeyStr);
    } catch (e) {}

    //console.log('sk', privKeyJSON);

    // 'o' - spending_key
    // 'z' and 't' - private_key
    if (privKeyJSON) {
      return privKeyJSON[0].spending_key || privKeyJSON[0].private_key;
    }

    return 'Error: ' + privKeyStr;
  }

  static async rpc_getViewKeyAsString(address: string): Promise<string> {
    const viewKeyStr = await RPCModule.execute('export', address);
    //console.log(viewKeyStr);

    let viewKeyJSON;
    try {
      viewKeyJSON = await JSON.parse(viewKeyStr);
    } catch (e) {}

    //console.log('vk', viewKeyJSON);

    // 'o' - full_viewing_key
    // 'z' and 't' - viewing_key
    if (viewKeyJSON) {
      return viewKeyJSON[0].full_viewing_key || viewKeyJSON[0].viewing_key;
    }

    return 'Error: ' + viewKeyStr;
  }

  static async rpc_createNewAddress(addressType: 'tzo'): Promise<string> {
    const addrStr = await RPCModule.execute('new', addressType);
    const addrJSON = await JSON.parse(addrStr);

    //console.log(addrJSON);

    if (addrJSON) {
      // Save
      await RPCModule.doSave();

      return addrJSON[0];
    }

    return '';
  }

  static async rpc_doImportPrivKey(key: string, birthday: string): Promise<string | string[]> {
    const args = { key, birthday: parseInt(birthday, 10), norescan: true };
    const address = await RPCModule.execute('import', JSON.stringify(args));

    if (address) {
      return address;
    }

    return '';
  }
  */
  static async rpc_shieldFunds(pools: string): Promise<string> {
    try {
      // using `all` or `transparent` or `sapling`...
      const shieldStr: string = await RPCModule.execute('shield', pools);
      if (shieldStr) {
        if (shieldStr.toLowerCase().startsWith('error')) {
          console.log(`Error shield ${pools} ${shieldStr}`);
          return shieldStr;
        }
      } else {
        console.log('Internal Error shield ' + pools);
        return 'Error: Internal RPC Error: shield ' + pools;
      }

      return shieldStr;
    } catch (error) {
      console.log(`Critical Error shield ${pools} ${error}`);
      return `Error: ${error}`;
    }
  }

  static async rpc_fetchWallet(readOnly: boolean): Promise<WalletType> {
    if (readOnly) {
      // viewing key
      try {
        const ufvkStr: string = await RPCModule.execute('exportufvk', '');
        if (ufvkStr) {
          if (ufvkStr.toLowerCase().startsWith('error')) {
            console.log(`Error ufvk ${ufvkStr}`);
            return {} as WalletType;
          }
        } else {
          console.log('Internal Error ufvk');
          return {} as WalletType;
        }
        const ufvk: WalletType = (await JSON.parse(ufvkStr)) as RPCUfvkType;

        return ufvk;
      } catch (error) {
        console.log(`Critical Error ufvk / get_birthday ${error}`);
        return {} as WalletType;
      }
    } else {
      // seed
      try {
        const seedStr: string = await RPCModule.execute('seed', '');
        if (seedStr) {
          if (seedStr.toLowerCase().startsWith('error')) {
            console.log(`Error seed ${seedStr}`);
            return {} as WalletType;
          }
        } else {
          console.log('Internal Error seed');
          return {} as WalletType;
        }
        const RPCseed: RPCSeedType = await JSON.parse(seedStr);
        const seed: WalletType = {} as WalletType;
        if (RPCseed.seed) {
          seed.seed = RPCseed.seed;
        }
        if (RPCseed.birthday) {
          seed.birthday = RPCseed.birthday;
        }

        return seed;
      } catch (error) {
        console.log(`Critical Error seed ${error}`);
        return {} as WalletType;
      }
    }
  }

  // We combine detailed transactions if they are sent to the same outgoing address in the same txid. This
  // is usually done to split long memos.
  // Remember to add up both amounts and combine memos
  static rpc_combineTxDetailsByAddress(txdetails: TxDetailType[]): TxDetailType[] {
    // First, group by outgoing address.
    const m = new Map<string, TxDetailType[]>();
    txdetails
      .filter(i => i.address !== undefined)
      .forEach(i => {
        const coll = m.get(i.address as string);
        if (!coll) {
          m.set(i.address as string, [i]);
        } else {
          coll.push(i);
        }
      });

    // Reduce the groups to a single TxDetail, combining memos and summing amounts
    const reducedDetailedTxns: TxDetailType[] = [];
    m.forEach((txns, toaddr) => {
      const totalAmount = txns.reduce((sum, i) => sum + i.amount, 0);

      const memos = txns
        .filter(i => i.memos && i.memos.length > 0)
        .map(i => {
          const combinedMemo = i.memos
            ?.filter(memo => memo)
            .map(memo => {
              const rex = /\((\d+)\/(\d+)\)((.|[\r\n])*)/;
              const tags = memo.match(rex);
              if (tags && tags.length >= 4) {
                return { num: parseInt(tags[1], 10), memo: tags[3] };
              }

              // Just return as is
              return { num: 0, memo };
            })
            .sort((a, b) => a.num - b.num)
            .map(a => a.memo);
          return combinedMemo && combinedMemo.length > 0 ? combinedMemo.join('') : undefined;
        })
        .map(a => a);

      const detail: TxDetailType = {
        address: toaddr,
        amount: totalAmount,
        memos: memos && memos.length > 0 ? [memos.join('')] : undefined,
      };

      reducedDetailedTxns.push(detail);
    });

    return reducedDetailedTxns;
  }

  // We combine detailed transactions if they are received to the same pool in the same txid. This
  // is usually done to split long memos.
  // Remember to add up both amounts and combine memos
  static rpc_combineTxDetailsByPool(txdetails: TxDetailType[]): TxDetailType[] {
    // First, group by pool.
    const m = new Map<'Orchard' | 'Sapling' | 'Transparent', TxDetailType[]>();
    txdetails
      .filter(i => i.pool !== undefined)
      .forEach(i => {
        const coll = m.get(i.pool as 'Orchard' | 'Sapling' | 'Transparent');
        if (!coll) {
          m.set(i.pool as 'Orchard' | 'Sapling' | 'Transparent', [i]);
        } else {
          coll.push(i);
        }
      });

    // Reduce the groups to a single TxDetail, combining memos and summing amounts
    const reducedDetailedTxns: TxDetailType[] = [];
    m.forEach((txns, pool) => {
      const totalAmount = txns.reduce((sum, i) => sum + i.amount, 0);

      const memos = txns
        .filter(i => i.memos && i.memos.length > 0)
        .map(i => {
          const combinedMemo = i.memos
            ?.filter(memo => memo)
            .map(memo => {
              const rex = /\((\d+)\/(\d+)\)((.|[\r\n])*)/;
              const tags = memo.match(rex);
              if (tags && tags.length >= 4) {
                return { num: parseInt(tags[1], 10), memo: tags[3] };
              }

              // Just return as is
              return { num: 0, memo };
            })
            .sort((a, b) => a.num - b.num)
            .map(a => a.memo);
          return combinedMemo && combinedMemo.length > 0 ? combinedMemo.join('') : undefined;
        })
        .map(a => a);

      const detail: TxDetailType = {
        address: '',
        amount: totalAmount,
        memos: memos && memos.length > 0 ? [memos.join('')] : undefined,
        pool: pool,
      };

      reducedDetailedTxns.push(detail);
    });

    return reducedDetailedTxns;
  }

  // this is only for the first time when the App is booting.
  async configure(): Promise<void> {
    // every 30 seconds the App try to Sync the new blocks.
    if (!this.refreshTimerID) {
      this.refreshTimerID = setInterval(() => {
        //console.log('interval refresh');
        this.refresh(false);
      }, 30 * 1000); // 30 seconds
      //console.log('create refresh timer', this.refreshTimerID);
      this.timers.push(this.refreshTimerID);
    }

    // every 5 seconds the App update all data
    if (!this.updateTimerID) {
      this.updateTimerID = setInterval(() => {
        //console.log('interval update', this.timers);
        this.sanitizeTimers();
        this.updateData();
      }, 5 * 1000); // 5 secs
      //console.log('create update timer', this.updateTimerID);
      this.timers.push(this.updateTimerID);
    }

    // and now the array of timers...
    let deleted: number[] = [];
    for (var i = 0; i < this.timers.length; i++) {
      if (this.timers[i] !== this.refreshTimerID && this.timers[i] !== this.updateTimerID) {
        clearInterval(this.timers[i]);
        deleted.push(i);
        //console.log('kill item array timers', this.timers[i]);
      }
    }
    // remove the cleared timers.
    for (var i = 0; i < deleted.length; i++) {
      this.timers.splice(deleted[i], 1);
    }

    // Load the current wallet data
    await this.loadWalletData();

    // Call the refresh after configure to update the UI. Do it in a timeout
    // to allow the UI to render first
    setTimeout(() => {
      this.refresh(true);
    }, 1000);
  }

  async clearTimers(): Promise<void> {
    if (this.refreshTimerID) {
      clearInterval(this.refreshTimerID);
      this.refreshTimerID = undefined;
      //console.log('kill refresh timer', this.refreshTimerID);
    }

    if (this.updateTimerID) {
      clearInterval(this.updateTimerID);
      this.updateTimerID = undefined;
      //console.log('kill update timer', this.updateTimerID);
    }

    if (this.syncStatusTimerID) {
      clearInterval(this.syncStatusTimerID);
      this.syncStatusTimerID = undefined;
      //console.log('kill syncstatus timer', this.syncStatusTimerID);
    }

    // and now the array of timers...
    while (this.timers.length > 0) {
      const inter = this.timers.pop();
      clearInterval(inter);
      //console.log('kill item array timers', inter);
    }
  }

  async sanitizeTimers(): Promise<void> {
    // and now the array of timers...
    let deleted: number[] = [];
    for (var i = 0; i < this.timers.length; i++) {
      if (
        this.timers[i] !== this.refreshTimerID &&
        this.timers[i] !== this.updateTimerID &&
        this.timers[i] !== this.syncStatusTimerID
      ) {
        clearInterval(this.timers[i]);
        deleted.push(i);
        //console.log('sanitize - kill item array timers', this.timers[i]);
      }
    }
    // remove the cleared timers.
    for (var i = 0; i < deleted.length; i++) {
      this.timers.splice(deleted[i], 1);
    }
  }

  async doRescan(): Promise<string> {
    try {
      const rescanStr: string = await RPCModule.execute('rescan', '');
      if (rescanStr) {
        if (rescanStr.toLowerCase().startsWith('error')) {
          console.log(`Error rescan ${rescanStr}`);
          return rescanStr;
        }
      } else {
        console.log('Internal Error rescan');
        return 'Error: Internal RPC Error: rescan';
      }

      return rescanStr;
    } catch (error) {
      console.log(`Critical Error rescan ${error}`);
      return `Error: ${error}`;
    }
  }

  async doSync(): Promise<string> {
    try {
      const syncStr: string = await RPCModule.execute('sync', '');
      if (syncStr) {
        if (syncStr.toLowerCase().startsWith('error')) {
          console.log(`Error sync ${syncStr}`);
          return syncStr;
        }
      } else {
        console.log('Internal Error sync');
        return 'Error: Internal RPC Error: sync';
      }

      return syncStr;
    } catch (error) {
      console.log(`Critical Error sync ${error}`);
      return `Error: ${error}`;
    }
  }

  async doSyncStatus(): Promise<string> {
    try {
      const syncStatusStr: string = await RPCModule.execute('syncstatus', '');
      if (syncStatusStr) {
        if (syncStatusStr.toLowerCase().startsWith('error')) {
          console.log(`Error sync status ${syncStatusStr}`);
          return syncStatusStr;
        }
      } else {
        console.log('Internal Error sync status');
        return 'Error: Internal RPC Error: sync status';
      }

      return syncStatusStr;
    } catch (error) {
      console.log(`Critical Error sync status ${error}`);
      return `Error: ${error}`;
    }
  }

  async doSend(sendJSON: string): Promise<string> {
    try {
      const sendStr: string = await RPCModule.execute('send', sendJSON);
      if (sendStr) {
        if (sendStr.toLowerCase().startsWith('error')) {
          console.log(`Error send ${sendStr}`);
          return sendStr;
        }
      } else {
        console.log('Internal Error send');
        return 'Error: Internal RPC Error: send';
      }

      return sendStr;
    } catch (error) {
      console.log(`Critical Error send ${error}`);
      return `Error: ${error}`;
    }
  }

  async doSendProgress(): Promise<string> {
    try {
      const sendProgressStr: string = await RPCModule.execute('sendprogress', '');
      if (sendProgressStr) {
        if (sendProgressStr.toLowerCase().startsWith('error')) {
          console.log(`Error send progress ${sendProgressStr}`);
          return sendProgressStr;
        }
      } else {
        console.log('Internal Error send progress');
        return 'Error: Internal RPC Error: send progress';
      }

      return sendProgressStr;
    } catch (error) {
      console.log(`Critical Error send progress ${error}`);
      return `Error: ${error}`;
    }
  }

  async loadWalletData() {
    await this.fetchTotalBalance();
    //await this.fetchTandZandOTransactionsList();
    await this.fetchTandZandOTransactionsSummaries();
    await this.fetchWalletSettings();
    await this.fetchInfoAndServerHeight();
  }

  async updateData() {
    //console.log("Update data triggered");
    if (this.updateDataLock) {
      //console.log("Update lock, returning");
      return;
    }

    this.updateDataCtr += 1;
    if ((this.inRefresh || this.inSend) && this.updateDataCtr % 5 !== 0) {
      // We're refreshing, or sending, in which case update every 5th time
      return;
    }

    this.updateDataLock = true;

    await this.fetchWalletHeight();
    await this.fetchWalletBirthday();
    await this.fetchInfoAndServerHeight();

    // And fetch the rest of the data.
    await this.loadWalletData();

    //console.log(`Finished update data at ${lastServerBlockHeight}`);
    this.updateDataLock = false;
  }

  async refresh(fullRefresh: boolean, fullRescan?: boolean) {
    // If we're in refresh, we don't overlap
    if (this.inRefresh) {
      //console.log('in refresh is true');
      return;
    }

    if (this.syncStatusTimerID) {
      //console.log('syncStatusTimerID exists already');
      return;
    }

    // And fetch the rest of the data.
    await this.loadWalletData();

    await this.fetchWalletHeight();
    await this.fetchWalletBirthday();
    await this.fetchInfoAndServerHeight();

    if (!this.lastServerBlockHeight) {
      //console.log('the last server block is zero');
      return;
    }

    // if it's sending now, don't fire the sync process.
    if (
      fullRefresh ||
      fullRescan ||
      !this.lastWalletBlockHeight ||
      this.lastWalletBlockHeight < this.lastServerBlockHeight
    ) {
      // If the latest block height has changed, make sure to sync. This will happen in a new thread
      this.setInRefresh(true);
      this.keepAwake(true);

      this.prev_batch_num = -1;
      this.prev_sync_id = -1;
      this.seconds_batch = 0;
      this.seconds_block = 0;
      this.batches = 0;
      this.latest_block = -1;
      this.prev_current_block = -1;

      // This is async, so when it is done, we finish the refresh.
      if (fullRescan) {
        this.doRescan()
          .then(result => {
            console.log('rescan finished', result);
            if (result && !result.toLowerCase().startsWith('error')) {
              const resultJSON: RPCSyncRescan = JSON.parse(result);
              if (resultJSON.result === 'success' && resultJSON.latest_block) {
                this.latest_block = resultJSON.latest_block;
              }
            }
          })
          .catch(error => console.log('rescan error', error));
        //.finally(() => {
        // with the new feature shardtree I can get an error here, but
        // doesn't mean the sync/rescan process is finished, I have to
        // rely on syncstatus finished instead
        //this.inRefresh = false;
        //this.keepAwake(false);
        //});
      } else {
        this.doSync()
          .then(result => {
            console.log('sync finished', result);
            if (result && !result.toLowerCase().startsWith('error')) {
              const resultJSON: RPCSyncRescan = JSON.parse(result);
              if (resultJSON.result === 'success' && resultJSON.latest_block) {
                this.latest_block = resultJSON.latest_block;
              }
            }
          })
          .catch(error => console.log('sync error', error));
        //.finally(() => {
        // with the new feature shardtree I can get an error here, but
        // doesn't mean the sync/rescan process is finished, I have to
        // rely on syncstatus finished instead
        //this.inRefresh = false;
        //this.keepAwake(false);
        //});
      }

      // We need to wait for the sync to finish. The sync is done when
      this.syncStatusTimerID = setInterval(async () => {
        const returnStatus = await this.doSyncStatus();
        if (returnStatus.toLowerCase().startsWith('error')) {
          return;
        }
        // TODO verify that JSON don't fail.
        const ss: RPCSyncStatusType = await JSON.parse(returnStatus);

        //console.log('sync wallet birthday', this.walletBirthday);
        //console.log('sync', this.syncStatusTimerID);
        console.log(
          'synced',
          ss.synced_blocks,
          'trial_decryptions',
          ss.trial_decryptions_blocks,
          'txn_scan',
          ss.txn_scan_blocks,
          'witnesses',
          ss.witnesses_updated,
          'TOTAL',
          ss.total_blocks,
          'batch_num',
          ss.batch_num,
          'batch_total',
          ss.batch_total,
          'end_block',
          ss.end_block,
          'start_block',
          ss.start_block,
        );
        //console.log('--------------------------------------');

        // synchronize status
        if (this.syncStatusTimerID) {
          this.setInRefresh(ss.in_progress);
        }

        this.sync_id = ss.sync_id;

        // if the sync_id change then reset the %
        if (this.prev_sync_id !== this.sync_id) {
          if (this.prev_sync_id !== -1) {
            // And fetch the rest of the data.
            await this.loadWalletData();

            await this.fetchWalletHeight();
            await this.fetchWalletBirthday();
            await this.fetchInfoAndServerHeight();

            await RPCModule.doSave();

            //console.log('sync status', ss);
            //console.log(`new sync process id: ${this.sync_id}. Save the wallet.`);
            this.prev_batch_num = -1;
            this.seconds_batch = 0;
            this.seconds_block = 0;
            this.batches = 0;
          }
          this.prev_sync_id = this.sync_id;
        }

        // Post sync updates
        let synced_blocks: number = ss.synced_blocks || 0;
        let trial_decryptions_blocks: number = ss.trial_decryptions_blocks || 0;
        let txn_scan_blocks: number = ss.txn_scan_blocks || 0;
        let witnesses_updated: number = ss.witnesses_updated || 0;

        // just in case
        if (synced_blocks < 0) {
          synced_blocks = 0;
        }
        if (synced_blocks > this.blocksPerBatch) {
          synced_blocks = this.blocksPerBatch;
        }
        if (trial_decryptions_blocks < 0) {
          trial_decryptions_blocks = 0;
        }
        if (trial_decryptions_blocks > this.blocksPerBatch) {
          trial_decryptions_blocks = this.blocksPerBatch;
        }
        if (txn_scan_blocks < 0) {
          txn_scan_blocks = 0;
        }
        if (txn_scan_blocks > this.blocksPerBatch) {
          txn_scan_blocks = this.blocksPerBatch;
        }
        if (witnesses_updated < 0) {
          witnesses_updated = 0;
        }
        if (witnesses_updated > this.blocksPerBatch) {
          witnesses_updated = this.blocksPerBatch;
        }

        const batch_total: number = ss.batch_total || 0;
        const batch_num: number = ss.batch_num || 0;

        const end_block: number = ss.end_block || 0; // lower

        // I want to know what was the first block of the current sync process
        let process_end_block: number = 0;
        // when the App is syncing the new blocks and sync finished really fast
        // the synstatus have almost all of the fields undefined.
        // if we have latest_block means that the sync process finished in that block
        if (end_block === 0 && batch_num === 0) {
          process_end_block = this.latest_block !== -1 ? this.latest_block : this.lastServerBlockHeight;
        } else {
          process_end_block = end_block - batch_num * this.blocksPerBatch;
        }

        //const progress_blocks: number = (synced_blocks + trial_decryptions_blocks + txn_scan_blocks) / 3;
        const progress_blocks: number = (synced_blocks + trial_decryptions_blocks + witnesses_updated) / 3;

        // And fetch the rest of the data.
        //await this.loadWalletData();

        //await this.fetchWalletHeight();
        //await this.fetchWalletBirthday();
        //await this.fetchServerHeight();

        let current_block = end_block + progress_blocks;
        if (current_block > this.lastServerBlockHeight) {
          current_block = this.lastServerBlockHeight;
        }
        current_block = parseInt(current_block.toFixed(0), 10);

        // if the current block is stalled I need to restart the App
        let syncProcessStalled = false;
        if (this.prev_current_block !== -1) {
          //console.log(
          //  'BEFORE prev current block',
          //  this.prev_current_block,
          //  'current block',
          //  current_block,
          //  'seconds',
          //  this.seconds_block,
          //  'blocks',
          //  current_block - this.prev_current_block,
          //);
          if (current_block > 0 && this.prev_current_block === current_block) {
            this.seconds_block += 5;
            // 5 minutes
            if (this.seconds_block >= 300) {
              this.seconds_block = 0;
              syncProcessStalled = true;
            }
          }
          if (current_block > 0 && this.prev_current_block !== current_block) {
            this.seconds_block = 0;
            syncProcessStalled = false;
          }
        }

        //console.log(
        //  'AFTER prev current block',
        //  this.prev_current_block,
        //  'current block',
        //  current_block,
        //  'seconds',
        //  this.seconds_block,
        //  'stalled',
        //  syncProcessStalled,
        //);

        // if current block is lower than the previous current block
        // The user need to see something not confusing.
        if (current_block > 0 && this.prev_current_block !== -1 && current_block < this.prev_current_block) {
          //console.log('blocks down', current_block - this.prev_current_block);
          // I decided to add only one fake block because otherwise could seems stalled
          // the user expect every 5 seconds the blocks change...
          current_block = this.prev_current_block + 1;
        }

        this.prev_current_block = current_block;

        this.seconds_batch += 5;

        //console.log('interval sync/rescan, secs', this.seconds_batch, 'timer', this.syncStatusTimerID);

        // store SyncStatus object for a new screen
        this.fnSetSyncingStatus({
          syncID: this.sync_id,
          totalBatches: batch_total,
          currentBatch: ss.in_progress ? batch_num + 1 : 0,
          lastBlockWallet: this.lastWalletBlockHeight,
          currentBlock: current_block,
          inProgress: ss.in_progress,
          lastError: ss.last_error,
          blocksPerBatch: this.blocksPerBatch,
          secondsPerBatch: this.seconds_batch,
          process_end_block: process_end_block,
          lastBlockServer: this.lastServerBlockHeight,
          syncProcessStalled: syncProcessStalled,
        } as SyncingStatusClass);

        // Close the poll timer if the sync finished(checked via promise above)
        if (!this.inRefresh) {
          // We are synced. Cancel the poll timer
          if (this.syncStatusTimerID) {
            clearInterval(this.syncStatusTimerID);
            this.syncStatusTimerID = undefined;
          }

          // here we can release the screen...
          this.keepAwake(false);

          // And fetch the rest of the data.
          await this.loadWalletData();

          await this.fetchWalletHeight();
          await this.fetchWalletBirthday();
          await this.fetchInfoAndServerHeight();

          await RPCModule.doSave();

          // store SyncStatus object for a new screen
          this.fnSetSyncingStatus({
            syncID: this.sync_id,
            totalBatches: 0,
            currentBatch: 0,
            lastBlockWallet: this.lastWalletBlockHeight,
            currentBlock: current_block,
            inProgress: false,
            lastError: ss.last_error,
            blocksPerBatch: this.blocksPerBatch,
            secondsPerBatch: 0,
            process_end_block: process_end_block,
            lastBlockServer: this.lastServerBlockHeight,
            syncProcessStalled: false,
          } as SyncingStatusClass);

          //console.log('sync status', ss);
          //console.log(`Finished refresh at ${this.lastWalletBlockHeight} id: ${this.sync_id}`);
        } else {
          // If we're doing a long sync, every time the batch_num changes, save the wallet
          if (this.prev_batch_num !== batch_num) {
            // if finished batches really fast, the App have to save the wallet delayed.
            if (this.prev_batch_num !== -1 && this.batches >= 1) {
              // And fetch the rest of the data.
              await this.loadWalletData();

              await this.fetchWalletHeight();
              await this.fetchWalletBirthday();
              await this.fetchInfoAndServerHeight();

              await RPCModule.doSave();
              this.batches = 0;

              // store SyncStatus object for a new screen
              this.fnSetSyncingStatus({
                syncID: this.sync_id,
                totalBatches: batch_total,
                currentBatch: ss.in_progress ? batch_num + 1 : 0,
                lastBlockWallet: this.lastWalletBlockHeight,
                currentBlock: current_block,
                inProgress: ss.in_progress,
                lastError: ss.last_error,
                blocksPerBatch: this.blocksPerBatch,
                secondsPerBatch: this.seconds_batch,
                process_end_block: process_end_block,
                lastBlockServer: this.lastServerBlockHeight,
                syncProcessStalled: false,
              } as SyncingStatusClass);

              //console.log('sync status', ss);
              //console.log(
              //  `@@@@@@@@@@@ Saving because batch num changed ${this.prevBatchNum} - ${batch_num}. seconds: ${this.seconds_batch}`,
              //);
            }
            this.batches += batch_num - this.prev_batch_num;
            this.prev_batch_num = batch_num;
            this.seconds_batch = 0;
          }
          // save wallet every 15 seconds in the same batch.
          if (this.seconds_batch > 0 && this.seconds_batch % 15 === 0) {
            // And fetch the rest of the data.
            await this.loadWalletData();

            await this.fetchWalletHeight();
            await this.fetchWalletBirthday();
            await this.fetchInfoAndServerHeight();

            await RPCModule.doSave();

            // store SyncStatus object for a new screen
            this.fnSetSyncingStatus({
              syncID: this.sync_id,
              totalBatches: batch_total,
              currentBatch: ss.in_progress ? batch_num + 1 : 0,
              lastBlockWallet: this.lastWalletBlockHeight,
              currentBlock: current_block,
              inProgress: ss.in_progress,
              lastError: ss.last_error,
              blocksPerBatch: this.blocksPerBatch,
              secondsPerBatch: this.seconds_batch,
              process_end_block: process_end_block,
              lastBlockServer: this.lastServerBlockHeight,
              syncProcessStalled: false,
            } as SyncingStatusClass);

            //console.log('sync status', ss);
            //console.log(`@@@@@@@@@@@Saving wallet. seconds: ${this.seconds_batch}`);
          }
        }
      }, 5000);
      //console.log('create sync/rescan timer', this.syncStatusTimerID);
      this.timers.push(this.syncStatusTimerID);
    } else {
      // Already at the latest block
      //console.log('Already have latest block, waiting for next refresh');
      // Here I know the sync process is over, I need to inform to the UI.
      this.fnSetSyncingStatus({
        syncID: this.sync_id,
        totalBatches: 0,
        currentBatch: 0,
        lastBlockWallet: this.lastWalletBlockHeight,
        currentBlock: this.lastWalletBlockHeight,
        inProgress: false,
        lastError: '',
        blocksPerBatch: this.blocksPerBatch,
        secondsPerBatch: 0,
        process_end_block: this.lastServerBlockHeight,
        lastBlockServer: this.lastServerBlockHeight,
        syncProcessStalled: false,
      } as SyncingStatusClass);
    }
  }

  async fetchWalletSettings(): Promise<void> {
    try {
      const download_memos_str: string = await RPCModule.execute('getoption', 'download_memos');
      if (download_memos_str) {
        if (download_memos_str.toLowerCase().startsWith('error')) {
          console.log(`Error download memos ${download_memos_str}`);
          return;
        }
      } else {
        console.log('Internal Error download memos');
        return;
      }
      const download_memos_json: RPCGetOptionType = await JSON.parse(download_memos_str);

      const transaction_filter_threshold_str: string = await RPCModule.execute(
        'getoption',
        'transaction_filter_threshold',
      );
      if (transaction_filter_threshold_str) {
        if (transaction_filter_threshold_str.toLowerCase().startsWith('error')) {
          console.log(`Error transaction filter threshold ${transaction_filter_threshold_str}`);
          return;
        }
      } else {
        console.log('Internal Error transaction filter threshold');
        return;
      }
      const transaction_filter_threshold_json: RPCGetOptionType = await JSON.parse(transaction_filter_threshold_str);

      const walletSettings = new WalletSettingsClass();
      walletSettings.download_memos = download_memos_json.download_memos || '';
      walletSettings.transaction_filter_threshold =
        transaction_filter_threshold_json.transaction_filter_threshold || '';

      this.fnSetWalletSettings(walletSettings);
    } catch (error) {
      console.log(`Critical Error transaction filter threshold ${error}`);
      return;
    }
  }

  async fetchInfoAndServerHeight(): Promise<void> {
    const info = await RPC.rpc_getInfoObject();

    if (info) {
      this.fnSetInfo(info);
      this.lastServerBlockHeight = info.latestBlock;
    }
  }

  // This method will get the total balances
  async fetchTotalBalance() {
    try {
      const addressesStr: string = await RPCModule.execute('addresses', '');
      if (addressesStr) {
        if (addressesStr.toLowerCase().startsWith('error')) {
          console.log(`Error addresses ${addressesStr}`);
          return;
        }
      } else {
        console.log('Internal Error addresses');
        return;
      }
      const addressesJSON: RPCAddressType[] = await JSON.parse(addressesStr);

      const balanceStr: string = await RPCModule.execute('balance', '');
      if (balanceStr) {
        if (balanceStr.toLowerCase().startsWith('error')) {
          console.log(`Error balance ${balanceStr}`);
          return;
        }
      } else {
        console.log('Internal Error balance');
        return;
      }
      const balanceJSON: RPCBalancesType = await JSON.parse(balanceStr);

      const orchardBal: number = balanceJSON.orchard_balance || 0;
      const privateBal: number = balanceJSON.sapling_balance || 0;
      const transparentBal: number = balanceJSON.transparent_balance || 0;

      const total = orchardBal + privateBal + transparentBal;

      // Total Balance
      const balance: TotalBalanceClass = {
        orchardBal: orchardBal / 10 ** 8,
        privateBal: privateBal / 10 ** 8,
        transparentBal: transparentBal / 10 ** 8,
        spendableOrchard: (balanceJSON.spendable_orchard_balance || 0) / 10 ** 8,
        spendablePrivate: (balanceJSON.spendable_sapling_balance || 0) / 10 ** 8,
        total: total / 10 ** 8,
      };
      this.fnSetTotalBalance(balance);

      // Fetch pending notes and UTXOs
      const pendingNotes: string = await RPCModule.execute('notes', '');
      if (pendingNotes) {
        if (pendingNotes.toLowerCase().startsWith('error')) {
          console.log(`Error notes ${pendingNotes}`);
          return;
        }
      } else {
        console.log('Internal Error notes');
        return;
      }
      const pendingNotesJSON: RPCNotesType = await JSON.parse(pendingNotes);

      const pendingAddress = new Map();

      // Process orchard notes
      if (pendingNotesJSON.pending_orchard_notes) {
        pendingNotesJSON.pending_orchard_notes.forEach((s: RPCOrchardNoteType) => {
          pendingAddress.set(s.address, s.value);
        });
      } else {
        console.log('ERROR: notes.pending_orchard_notes no exists');
      }

      // Process sapling notes
      if (pendingNotesJSON.pending_sapling_notes) {
        pendingNotesJSON.pending_sapling_notes.forEach((s: RPCSaplingNoteType) => {
          pendingAddress.set(s.address, s.value);
        });
      } else {
        console.log('ERROR: notes.pending_sapling_notes no exists');
      }

      // Process UTXOs
      if (pendingNotesJSON.pending_utxos) {
        pendingNotesJSON.pending_utxos.forEach((s: RPCUtxoNoteType) => {
          pendingAddress.set(s.address, s.value);
        });
      } else {
        console.log('ERROR: notes.pending_utxos no exists');
      }

      let allAddresses: AddressClass[] = [];

      addressesJSON.forEach((u: RPCAddressType) => {
        // If this has any unconfirmed txns, show that in the UI
        const receivers: string =
          (u.receivers.orchard_exists ? 'o' : '') +
          (u.receivers.sapling ? 'z' : '') +
          (u.receivers.transparent ? 't' : '');
        if (u.address) {
          const abu = new AddressClass(u.address, u.address, 'u', receivers);
          if (pendingAddress.has(abu.address)) {
            abu.containsPending = true;
          }
          allAddresses.push(abu);
        }
        if (u.receivers.sapling) {
          const abz = new AddressClass(u.address, u.receivers.sapling, 'z', receivers);
          if (pendingAddress.has(abz.address)) {
            abz.containsPending = true;
          }
          allAddresses.push(abz);
        }
        if (u.receivers.transparent) {
          const abt = new AddressClass(u.address, u.receivers.transparent, 't', receivers);
          if (pendingAddress.has(abt.address)) {
            abt.containsPending = true;
          }
          allAddresses.push(abt);
        }
      });

      this.fnSetAllAddresses(allAddresses);
    } catch (error) {
      console.log(`Critical Error notes ${error}`);
      return;
    }
  }

  async fetchWalletHeight(): Promise<void> {
    try {
      const heightStr: string = await RPCModule.execute('height', '');
      if (heightStr) {
        if (heightStr.toLowerCase().startsWith('error')) {
          console.log(`Error wallet height ${heightStr}`);
          return;
        }
      } else {
        console.log('Internal Error wallet height');
        return;
      }
      const heightJSON: RPCWalletHeight = await JSON.parse(heightStr);

      this.lastWalletBlockHeight = heightJSON.height;
    } catch (error) {
      console.log(`Critical Error wallet height ${error}`);
      return;
    }
  }

  async fetchWalletBirthday(): Promise<void> {
    const wallet = await RPC.rpc_fetchWallet(this.readOnly);

    if (wallet) {
      this.walletBirthday = wallet.birthday;
    }
  }

  // Fetch all T and Z and O transactions
  async fetchTandZandOTransactionsSummaries() {
    try {
      const summariesStr: string = await RPCModule.execute('summaries', '');
      //console.log(summariesStr);
      if (summariesStr) {
        if (summariesStr.toLowerCase().startsWith('error')) {
          console.log(`Error txs summaries ${summariesStr}`);
          return;
        }
      } else {
        console.log('Internal Error txs summaries');
        return;
      }
      const summariesJSON: RPCSummariesType[] = await JSON.parse(summariesStr);

      await this.fetchInfoAndServerHeight();

      let txList: TransactionType[] = [];

      summariesJSON
        //.filter(tx => tx.kind !== 'Fee')
        .forEach((tx: RPCSummariesType) => {
          let currentTxList: TransactionType[] = txList.filter(t => t.txid === tx.txid);
          if (currentTxList.length === 0) {
            currentTxList = [{} as TransactionType];
            currentTxList[0].txDetails = [];
          }
          let restTxList: TransactionType[] = txList.filter(t => t.txid !== tx.txid);

          const type = tx.kind === 'Fee' ? 'Sent' : tx.kind;
          if (!currentTxList[0].type && !!type) {
            currentTxList[0].type = type;
          }
          if (tx.unconfirmed) {
            currentTxList[0].confirmations = null;
          } else if (!currentTxList[0].confirmations) {
            currentTxList[0].confirmations = this.lastServerBlockHeight
              ? this.lastServerBlockHeight - tx.block_height + 1
              : 0;
          }
          if (!currentTxList[0].txid && !!tx.txid) {
            currentTxList[0].txid = tx.txid;
          }
          if (!currentTxList[0].time && !!tx.datetime) {
            currentTxList[0].time = tx.datetime;
          }
          if (!currentTxList[0].zec_price && !!tx.price && tx.price !== 'None') {
            currentTxList[0].zec_price = tx.price;
          }

          //if (tx.txid.startsWith('426e')) {
          //  console.log('tran: ', tx);
          //  console.log('--------------------------------------------------');
          //}

          let currenttxdetails: TxDetailType = {} as TxDetailType;
          if (tx.kind === 'Fee') {
            currentTxList[0].fee = (currentTxList[0].fee ? currentTxList[0].fee : 0) + tx.amount / 10 ** 8;
            if (currentTxList[0].txDetails.length === 0) {
              // when only have 1 item with `Fee`, we assume this tx is `SendToSelf`.
              currentTxList[0].type = 'SendToSelf';
              currenttxdetails.address = '';
              currenttxdetails.amount = 0;
              currentTxList[0].txDetails.push(currenttxdetails);
            }
          } else {
            currenttxdetails.address = !tx.to_address || tx.to_address === 'None' ? '' : tx.to_address;
            currenttxdetails.amount = tx.amount / 10 ** 8;
            currenttxdetails.memos = !tx.memos ? undefined : tx.memos;
            currenttxdetails.pool = !tx.pool || tx.pool === 'None' ? undefined : tx.pool;
            currentTxList[0].txDetails.push(currenttxdetails);
          }

          //currentTxList[0].txDetails.forEach(det => console.log(det.memos));
          //console.log(currentTxList[0]);
          txList = [...currentTxList, ...restTxList];
        });

      //console.log(txlist);

      // Now, combine the amounts and memos
      const combinedTxList: TransactionType[] = [];
      txList.forEach((txns: TransactionType) => {
        const combinedTx = txns;
        if (txns.type === 'Sent' || txns.type === 'SendToSelf') {
          // using address for `Sent` & `SendToSelf`
          combinedTx.txDetails = RPC.rpc_combineTxDetailsByAddress(txns.txDetails);
        } else {
          // using pool for `Received`
          combinedTx.txDetails = RPC.rpc_combineTxDetailsByPool(txns.txDetails);
        }

        //combinedTx.txDetails.forEach(det => console.log(det.memos));
        //console.log(combinedTx);
        combinedTxList.push(combinedTx);
      });

      //console.log(combinedTxList);

      this.fnSetTransactionsList(combinedTxList);
    } catch (error) {
      console.log(`Critical Error txs list ${error}`);
      return;
    }
  }

  // Send a transaction using the already constructed sendJson structure
  async sendTransaction(
    sendJson: Array<SendJsonToTypeType>,
    setSendProgress: (arg0: SendProgressClass) => void,
  ): Promise<string> {
    // sending
    this.setInSend(true);
    // keep awake the screen/device while sending.
    this.keepAwake(true);
    // First, get the previous send progress id, so we know which ID to track
    const prev: string = await this.doSendProgress();
    let prevSendId = -1;
    if (prev && !prev.toLowerCase().startsWith('error')) {
      // TODO verify that JSON don't fail.
      const prevProgress: RPCSendProgressType = await JSON.parse(prev);
      prevSendId = prevProgress.id;
    }

    //console.log('prev progress id', prevSendId);

    // This is async, so fire and forget
    this.doSend(JSON.stringify(sendJson))
      .then(r => console.log('End Send OK: ' + r))
      .catch(e => console.log('End Send ERROR: ' + e))
      .finally(() => {
        // sending is over
        this.setInSend(false);
        if (!this.inRefresh) {
          // if not syncing, then not keep awake the screen/device when the send is finished.
          this.keepAwake(false);
        } else {
          this.keepAwake(true);
        }
      });

    const startTimeSeconds = new Date().getTime() / 1000;

    // The send command is async, so we need to poll to get the status
    const sendTxPromise = new Promise<string>((resolve, reject) => {
      const intervalID = setInterval(async () => {
        const pro: string = await this.doSendProgress();
        if (pro) {
          if (pro.toLowerCase().startsWith('error')) {
            return;
          }
        } else {
          return;
        }
        // TODO verify that JSON don't fail.
        const progress: RPCSendProgressType = await JSON.parse(pro);
        const sendId = progress.id;

        // because I don't know what the user are doing, I force every 2 seconds
        // the interrupt flag to true if the sync_interrupt is false
        if (!progress.sync_interrupt) {
          await RPC.rpc_setInterruptSyncAfterBatch('true');
        }

        const updatedProgress = new SendProgressClass(0, 0, 0);
        if (sendId === prevSendId) {
          //console.log('progress id', sendId);
          // Still not started, so wait for more time
          //setSendProgress(updatedProgress);
          return;
        }

        //console.log('progress', progress);

        // Calculate ETA.
        let secondsPerComputation = 3; // default
        if (progress.progress > 0) {
          const currentTimeSeconds = new Date().getTime() / 1000;
          secondsPerComputation = (currentTimeSeconds - startTimeSeconds) / progress.progress;
        }
        //console.log(`Seconds Per compute = ${secondsPerComputation}`);

        //let eta = Math.round((progress.total - progress.progress) * secondsPerComputation);
        let eta = Math.round((4 - progress.progress) * secondsPerComputation);
        //console.log(`ETA = ${eta}`);
        if (eta <= 0) {
          eta = 1;
        }

        //console.log(`ETA calculated = ${eta}`);

        // synchronize status with inSend
        this.setInSend(progress.sending);

        updatedProgress.progress = progress.progress;
        //updatedProgress.total = Math.max(progress.total, progress.progress); // sometimes, due to change, the total can be off by 1
        updatedProgress.total = 3; // until sendprogress give me a good value... 3 is better.
        updatedProgress.sendInProgress = progress.sending;
        updatedProgress.etaSeconds = progress.progress === 0 ? '...' : eta;

        if (!progress.txid && !progress.error) {
          // Still processing
          setSendProgress(updatedProgress);
          return;
        }

        // Finished processing
        clearInterval(intervalID);
        setSendProgress({} as SendProgressClass);

        if (progress.txid) {
          // And refresh data (full refresh)
          this.refresh(true);

          resolve(progress.txid);
        }

        if (progress.error) {
          reject(progress.error);
        }
      }, 2000); // Every 2 seconds
    });

    return sendTxPromise;
  }

  async changeWallet() {
    const exists = await RPCModule.walletExists();

    //console.log('jc change wallet', exists);
    if (exists && exists !== 'false') {
      await RPCModule.doSaveBackup();
      const result = await RPCModule.deleteExistingWallet();

      if (!(result && result !== 'false')) {
        return this.translate('rpc.deletewallet-error');
      }
    } else {
      return this.translate('rpc.walletnotfound-error');
    }
    return '';
  }

  async changeWalletNoBackup() {
    const exists = await RPCModule.walletExists();

    //console.log('jc change wallet', exists);
    if (exists && exists !== 'false') {
      const result = await RPCModule.deleteExistingWallet();

      if (!(result && result !== 'false')) {
        return this.translate('rpc.deletewallet-error');
      }
    } else {
      return this.translate('rpc.walletnotfound-error');
    }
    return '';
  }

  async restoreBackup() {
    const existsBackup = await RPCModule.walletBackupExists();

    //console.log('jc restore backup', existsBackup);
    if (existsBackup && existsBackup !== 'false') {
      const existsWallet = await RPCModule.walletExists();

      //console.log('jc restore wallet', existsWallet);
      if (existsWallet && existsWallet !== 'false') {
        await RPCModule.restoreExistingWalletBackup();
      } else {
        return this.translate('rpc.walletnotfound-error');
      }
    } else {
      return this.translate('rpc.backupnotfound-error');
    }
    return '';
  }

  setInRefresh(value: boolean): void {
    this.inRefresh = value;
  }

  getInRefresh(): boolean {
    return this.inRefresh;
  }

  setInSend(value: boolean): void {
    this.inSend = value;
  }

  getInSend(): boolean {
    return this.inSend;
  }

  setReadOnly(value: boolean): void {
    this.readOnly = value;
  }

  getReadOnly(): boolean {
    return this.readOnly;
  }
}
