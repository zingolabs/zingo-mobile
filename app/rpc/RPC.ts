import {
  TotalBalanceClass,
  AddressClass,
  InfoType,
  SendJsonToTypeType,
  WalletType,
  SendProgressClass,
  WalletSettingsClass,
  TranslateType,
  SyncingStatusClass,
  CommandEnum,
  ChainNameEnum,
  WalletOptionEnum,
  CurrencyNameEnum,
  AddressKindEnum,
  ReceiverEnum,
  GlobalConst,
  ValueTransferType,
} from '../AppState';
import RPCModule from '../RPCModule';
import { RPCAddressType } from './types/RPCAddressType';
import { RPCBalancesType } from './types/RPCBalancesType';
import { RPCNotesType } from './types/RPCNotesType';
import { RPCOrchardNoteType } from './types/RPCOrchardNoteType';
import { RPCSaplingNoteType } from './types/RPCSaplingNoteType';
import { RPCUtxoNoteType } from './types/RPCUtxoNoteType';
import { RPCInfoType } from './types/RPCInfoType';
import { RPCWalletHeight } from './types/RPCWalletHeightType';
import { RPCSeedType } from './types/RPCSeedType';
import { RPCSyncStatusType } from './types/RPCSyncStatusType';
import { RPCGetOptionType } from './types/RPCGetOptionType';
import { RPCSendProgressType } from './types/RPCSendProgressType';
import { RPCSyncRescan } from './types/RPCSyncRescanType';
import { RPCUfvkType } from './types/RPCUfvkType';
import { RPCSendType } from './types/RPCSendType';
import { RPCValueTransfersType } from './types/RPCValueTransfersType';
import { RPCValueTransfersKindEnum } from './enums/RPCValueTransfersKindEnum';
import { RPCValueTransferType } from './types/RPCValueTransferType';
import { ValueTransferKindEnum } from '../AppState/enums/ValueTransferKindEnum';
import { RPCValueTransfersStatusEnum } from './enums/RPCValueTransfersStatusEnum';

export default class RPC {
  fnSetInfo: (info: InfoType) => void;
  fnSetTotalBalance: (totalBalance: TotalBalanceClass) => void;
  fnSetValueTransfersList: (vtList: ValueTransferType[]) => void;
  fnSetAllAddresses: (allAddresses: AddressClass[]) => void;
  fnSetSyncingStatus: (syncingStatus: SyncingStatusClass) => void;
  fnSetWalletSettings: (settings: WalletSettingsClass) => void;
  translate: (key: string) => TranslateType;
  keepAwake: (keep: boolean) => void;

  refreshTimerID?: NodeJS.Timeout;
  updateTimerID?: NodeJS.Timeout;
  syncStatusTimerID?: NodeJS.Timeout;

  updateDataLock: boolean;

  lastWalletBlockHeight: number;
  lastServerBlockHeight: number;
  walletBirthday: number;

  inRefresh: boolean;
  inSend: boolean;
  blocksPerBatch: number;

  prevBatchNum: number;
  prevSyncId: number;
  prevCurrentBlock: number;
  secondsBatch: number;
  secondsBlock: number;
  batches: number;
  latestBlock: number;
  syncId: number;

  timers: NodeJS.Timeout[];

  readOnly: boolean;

  constructor(
    fnSetTotalBalance: (totalBalance: TotalBalanceClass) => void,
    fnSetValueTransfersList: (txlist: ValueTransferType[]) => void,
    fnSetAllAddresses: (addresses: AddressClass[]) => void,
    fnSetWalletSettings: (settings: WalletSettingsClass) => void,
    fnSetInfo: (info: InfoType) => void,
    fnSetSyncingStatus: (syncingStatus: SyncingStatusClass) => void,
    translate: (key: string) => TranslateType,
    keepAwake: (keep: boolean) => void,
    readOnly: boolean,
  ) {
    this.fnSetTotalBalance = fnSetTotalBalance;
    this.fnSetValueTransfersList = fnSetValueTransfersList;
    this.fnSetAllAddresses = fnSetAllAddresses;
    this.fnSetWalletSettings = fnSetWalletSettings;
    this.fnSetInfo = fnSetInfo;
    this.fnSetSyncingStatus = fnSetSyncingStatus;
    this.translate = translate;
    this.keepAwake = keepAwake;

    this.updateDataLock = false;
    this.lastWalletBlockHeight = 0;
    this.lastServerBlockHeight = 0;
    this.walletBirthday = 0;

    this.inRefresh = false;
    this.inSend = false;
    this.blocksPerBatch = GlobalConst.blocksPerBatch;

    this.prevBatchNum = -1;
    this.prevSyncId = -1;
    this.prevCurrentBlock = -1;
    this.secondsBatch = 0;
    this.secondsBlock = 0;
    this.batches = 0;
    this.latestBlock = -1;
    this.syncId = -1;

    this.timers = [];

    this.readOnly = readOnly;
  }

  static async rpcSetInterruptSyncAfterBatch(value: string): Promise<void> {
    try {
      const resultStr: string = await RPCModule.execute(CommandEnum.interruptSyncAfterBatch, value);

      if (resultStr) {
        if (resultStr.toLowerCase().startsWith(GlobalConst.error)) {
          console.log(`Error setting interruptSyncAfterBatch ${resultStr}`);
        }
      } else {
        console.log('Internal Error setting interruptSyncAfterBatch');
      }
    } catch (error) {
      console.log(`Critical Error setting interruptSyncAfterBatch ${error}`);
    }
  }

  static async rpcGetZecPrice(): Promise<number> {
    try {
      // values:
      // 0   - initial/default value
      // -1  - error in Gemini/zingolib.
      // -2  - error in RPCModule, likely.
      // > 0 - real value
      const resultStr: string = await RPCModule.execute(CommandEnum.updatecurrentprice, '');
      //console.log(resultStr);

      if (resultStr) {
        if (resultStr.toLowerCase().startsWith(GlobalConst.error) || isNaN(parseFloat(resultStr))) {
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

  static async rpcSetWalletSettingOption(name: string, value: string): Promise<string> {
    try {
      const resultStr: string = await RPCModule.execute(CommandEnum.setoption, `${name}=${value}`);

      if (resultStr) {
        if (resultStr.toLowerCase().startsWith(GlobalConst.error)) {
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
  static async rpcGetInfoObject(): Promise<InfoType> {
    try {
      const infoStr: string = await RPCModule.execute(CommandEnum.info, '');
      if (infoStr) {
        if (infoStr.toLowerCase().startsWith(GlobalConst.error)) {
          console.log(`Error info ${infoStr}`);
          return {} as InfoType;
        }
      } else {
        console.log('Internal Error info');
        return {} as InfoType;
      }
      const infoJSON: RPCInfoType = await JSON.parse(infoStr);

      let zingolibStr: string = await RPCModule.execute(CommandEnum.version, '');
      if (zingolibStr) {
        if (zingolibStr.toLowerCase().startsWith(GlobalConst.error)) {
          console.log(`Error zingolib version ${zingolibStr}`);
          zingolibStr = '<error>';
        }
      } else {
        console.log('Internal Error zingolib version');
        zingolibStr = '<none>';
      }
      //const zingolibJSON = await JSON.parse(zingolibStr);

      const info: InfoType = {
        chainName: infoJSON.chain_name,
        latestBlock: infoJSON.latest_block_height,
        serverUri: infoJSON.server_uri || '<none>',
        connections: 1,
        version: `${infoJSON.vendor}/${infoJSON.git_commit ? infoJSON.git_commit.substring(0, 6) : ''}/${
          infoJSON.version
        }`,
        verificationProgress: 1,
        currencyName: infoJSON.chain_name === ChainNameEnum.mainChainName ? CurrencyNameEnum.ZEC : CurrencyNameEnum.TAZ,
        solps: 0,
        zingolib: zingolibStr,
      };

      return info;
    } catch (error) {
      console.log(`Critical Error info ${error}`);
      return {} as InfoType;
    }
  }

  static async rpcFetchServerHeight(): Promise<number> {
    try {
      const info = await RPC.rpcGetInfoObject();

      if (info) {
        return info.latestBlock;
      }

      return 0;
    } catch (error) {
      console.log(`Critical Error server block height ${error}`);
      return 0;
    }
  }

  static async rpcFetchWalletHeight(): Promise<number> {
    try {
      const heightStr: string = await RPCModule.execute(CommandEnum.height, '');
      if (heightStr) {
        if (heightStr.toLowerCase().startsWith(GlobalConst.error)) {
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

  static async rpcShieldFunds(): Promise<string> {
    try {
      const shieldStr: string = await RPCModule.execute(CommandEnum.confirm, '');
      //console.log(shieldStr);
      if (shieldStr) {
        if (shieldStr.toLowerCase().startsWith(GlobalConst.error)) {
          console.log(`Error shield ${shieldStr}`);
          return shieldStr;
        }
      } else {
        console.log('Internal Error shield ');
        return 'Error: Internal RPC Error: shield ';
      }

      return shieldStr;
    } catch (error) {
      console.log(`Critical Error shield ${error}`);
      return `Error: ${error}`;
    }
  }

  static async rpcFetchWallet(readOnly: boolean): Promise<WalletType> {
    if (readOnly) {
      // only viewing key & birthday
      try {
        const ufvkStr: string = await RPCModule.execute(CommandEnum.exportufvk, '');
        if (ufvkStr) {
          if (ufvkStr.toLowerCase().startsWith(GlobalConst.error)) {
            console.log(`Error ufvk ${ufvkStr}`);
            return {} as WalletType;
          }
        } else {
          console.log('Internal Error ufvk');
          return {} as WalletType;
        }
        const RPCufvk: WalletType = (await JSON.parse(ufvkStr)) as RPCUfvkType;

        const wallet: WalletType = {} as WalletType;
        if (RPCufvk.birthday) {
          wallet.birthday = RPCufvk.birthday;
        }
        if (RPCufvk.ufvk) {
          wallet.ufvk = RPCufvk.ufvk;
        }

        return wallet;
      } catch (error) {
        console.log(`Critical Error ufvk ${error}`);
        return {} as WalletType;
      }
    } else {
      // only seed & birthday
      try {
        const seedStr: string = await RPCModule.execute(CommandEnum.seed, '');
        if (seedStr) {
          if (seedStr.toLowerCase().startsWith(GlobalConst.error)) {
            console.log(`Error seed ${seedStr}`);
            return {} as WalletType;
          }
        } else {
          console.log('Internal Error seed');
          return {} as WalletType;
        }
        const RPCseed: RPCSeedType = await JSON.parse(seedStr);

        const wallet: WalletType = {} as WalletType;
        if (RPCseed.seed) {
          wallet.seed = RPCseed.seed;
        }
        if (RPCseed.birthday) {
          wallet.birthday = RPCseed.birthday;
        }

        return wallet;
      } catch (error) {
        console.log(`Critical Error seed ${error}`);
        return {} as WalletType;
      }
    }
  }

  // this is only for the first time when the App is booting, but
  // there are more cases:
  // - LoadedApp mounting component.
  // - App go to Foreground.
  // - Internet from Not Connected to Connected.
  // - Cambio de Servidor.
  async configure(): Promise<void> {
    // First things first, I need to stop an existing sync process (if any)
    // clean start.
    await this.stopSyncProcess();

    // every 15 seconds the App try to Sync the new blocks.
    if (!this.refreshTimerID) {
      this.refreshTimerID = setInterval(() => {
        console.log('++++++++++ interval try refresh 15 secs');
        this.refresh(false);
      }, 15 * 1000); // 15 seconds
      //console.log('create refresh timer', this.refreshTimerID);
      this.timers.push(this.refreshTimerID);
    }

    // every 5 seconds the App update all data
    if (!this.updateTimerID) {
      this.updateTimerID = setInterval(() => {
        console.log('++++++++++ interval update 5 secs', this.timers);
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

    await this.updateData();

    // Call the refresh after configure to update the UI. Do it in a timeout
    // to allow the UI to render first
    setTimeout(() => {
      this.refresh(true);
    }, 1000);
  }

  sleep = (ms: number) => new Promise(r => setTimeout(r, ms));

  async stopSyncProcess(): Promise<void> {
    let returnStatus = await this.doSyncStatus();
    if (returnStatus.toLowerCase().startsWith(GlobalConst.error)) {
      return;
    }
    let ss = {} as RPCSyncStatusType;
    try {
      ss = await JSON.parse(returnStatus);
    } catch (e) {
      return;
    }

    //console.log('stop sync process. in progress', ss.in_progress);

    while (ss.in_progress) {
      // interrupting sync process
      await RPC.rpcSetInterruptSyncAfterBatch(GlobalConst.true);

      // sleep for half second
      await this.sleep(500);

      returnStatus = await this.doSyncStatus();
      ss = await JSON.parse(returnStatus);

      //console.log('stop sync process. in progress', ss.in_progress);
    }
    console.log('stop sync process. STOPPED');

    // NOT interrupting sync process
    await RPC.rpcSetInterruptSyncAfterBatch(GlobalConst.false);
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
      const rescanStr: string = await RPCModule.execute(CommandEnum.rescan, '');
      if (rescanStr) {
        if (rescanStr.toLowerCase().startsWith(GlobalConst.error)) {
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
      return `Error: rescan ${error}`;
    }
  }

  async doSync(): Promise<string> {
    try {
      const syncStr: string = await RPCModule.execute(CommandEnum.sync, '');
      if (syncStr) {
        if (syncStr.toLowerCase().startsWith(GlobalConst.error)) {
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
      return `Error: sync ${error}`;
    }
  }

  async doSyncStatus(): Promise<string> {
    try {
      const syncStatusStr: string = await RPCModule.execute(CommandEnum.syncstatus, '');
      if (syncStatusStr) {
        if (syncStatusStr.toLowerCase().startsWith(GlobalConst.error)) {
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
      return `Error: sync status ${error}`;
    }
  }

  async doSend(sendJSON: string): Promise<string> {
    try {
      console.log('send JSON', sendJSON);
      await RPCModule.execute(CommandEnum.send, sendJSON);
      const sendStr: string = await RPCModule.execute(CommandEnum.confirm, '');
      if (sendStr) {
        if (sendStr.toLowerCase().startsWith(GlobalConst.error)) {
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
      return `Error: send ${error}`;
    }
  }

  async doSendProgress(): Promise<string> {
    try {
      const sendProgressStr: string = await RPCModule.execute(CommandEnum.sendprogress, '');
      if (sendProgressStr) {
        if (sendProgressStr.toLowerCase().startsWith(GlobalConst.error)) {
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
      return `Error: send progress ${error}`;
    }
  }

  async loadWalletData() {
    await this.fetchTandZandOValueTransfers();
    console.log('RPC - 3.1 - fetch value transfers');
    await this.fetchAddresses();
    console.log('RPC - 3.2 - fetch addresses');
    await this.fetchTotalBalance();
    console.log('RPC - 3.3 - fetch total balance');
    await this.fetchInfoAndServerHeight();
    console.log('RPC - 3.4 - fetch info & server height');
    await this.fetchWalletSettings();
    console.log('RPC - 3.5 - fetch wallet settings');
  }

  async updateData() {
    //console.log('Update data triggered');
    if (this.updateDataLock) {
      console.log('RPC - Update Data lock, returning *****************************');
      return;
    }

    // if the App have an error here
    // this try-catch prevent to have true in updateDataLock.
    try {
      this.updateDataLock = true;

      await this.fetchWalletHeight();
      console.log('RPC - 1 - fetch wallet height');
      await this.fetchWalletBirthday();
      console.log('RPC - 2 - fetch wallet birthday');

      // And fetch the rest of the data.
      await this.loadWalletData();
      console.log('RPC - 3 - fetch wallet Data');

      //console.log(`Finished update data at ${lastServerBlockHeight}`);
      this.updateDataLock = false;
    } catch (error) {
      console.log('Internal error update data', error);
      this.updateDataLock = false;
      // relaunch the interval tasks just in case they are aborted.
      this.configure();
    }
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

    await this.updateData();

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

      this.prevBatchNum = -1;
      this.prevSyncId = -1;
      this.secondsBatch = 0;
      this.secondsBlock = 0;
      this.batches = 0;
      this.latestBlock = -1;
      this.prevCurrentBlock = -1;

      // This is async, so when it is done, we finish the refresh.
      if (fullRescan) {
        // clean the ValueTransfer list before.
        this.fnSetValueTransfersList([]);
        this.fnSetTotalBalance({
          orchardBal: 0,
          privateBal: 0,
          transparentBal: 0,
          spendableOrchard: 0,
          spendablePrivate: 0,
          total: 0,
        } as TotalBalanceClass);
        this.doRescan()
          .then(result => {
            console.log('rescan finished', result);
            if (result && !result.toLowerCase().startsWith(GlobalConst.error)) {
              const resultJSON: RPCSyncRescan = JSON.parse(result);
              if (resultJSON.result === GlobalConst.success && resultJSON.latest_block) {
                this.latestBlock = resultJSON.latest_block;
              }
            }
          })
          .catch(error => console.log('rescan error', error));
      } else {
        this.doSync()
          .then(result => {
            console.log('sync finished', result);
            if (result && !result.toLowerCase().startsWith(GlobalConst.error)) {
              const resultJSON: RPCSyncRescan = JSON.parse(result);
              if (resultJSON.result === GlobalConst.success && resultJSON.latest_block) {
                this.latestBlock = resultJSON.latest_block;
              }
            }
          })
          .catch(error => console.log('sync error', error));
      }

      // We need to wait for the sync to finish. The sync is done when
      this.syncStatusTimerID = setInterval(async () => {
        console.log('++++++++++ interval syncing 5 secs');
        const returnStatus = await this.doSyncStatus();
        if (returnStatus.toLowerCase().startsWith(GlobalConst.error)) {
          return;
        }
        let ss = {} as RPCSyncStatusType;
        try {
          ss = await JSON.parse(returnStatus);
        } catch (e) {
          return;
        }

        //console.log('sync wallet birthday', this.walletBirthday);
        //console.log('sync', this.syncStatusTimerID);
        console.log(
          'synced',
          ss.synced_blocks,
          'trialDecryptions',
          ss.trial_decryptions_blocks,
          'txnScan',
          ss.txn_scan_blocks,
          'witnesses',
          ss.witnesses_updated,
          'TOTAL',
          ss.total_blocks,
          'batchNum',
          ss.batch_num,
          'batchTotal',
          ss.batch_total,
          'endBlock',
          ss.end_block,
          'startBlock',
          ss.start_block,
        );
        //console.log('--------------------------------------');

        // synchronize status
        if (this.syncStatusTimerID) {
          this.setInRefresh(ss.in_progress);
        }

        this.syncId = ss.sync_id;

        // if the syncId change then reset the %
        if (this.prevSyncId !== this.syncId) {
          if (this.prevSyncId !== -1) {
            await this.updateData();

            await RPCModule.doSave();

            //console.log('sync status', ss);
            //console.log(`new sync process id: ${this.syncId}. Save the wallet.`);
            this.prevBatchNum = -1;
            this.secondsBatch = 0;
            this.secondsBlock = 0;
            this.batches = 0;
          }
          this.prevSyncId = this.syncId;
        }

        // Post sync updates
        let syncedBlocks: number = ss.synced_blocks || 0;
        let trialDecryptionsBlocks: number = ss.trial_decryptions_blocks || 0;
        let txnScanBlocks: number = ss.txn_scan_blocks || 0;
        let witnessesUpdated: number = ss.witnesses_updated || 0;

        // just in case
        if (syncedBlocks < 0) {
          syncedBlocks = 0;
        }
        if (syncedBlocks > this.blocksPerBatch) {
          syncedBlocks = this.blocksPerBatch;
        }
        if (trialDecryptionsBlocks < 0) {
          trialDecryptionsBlocks = 0;
        }
        if (trialDecryptionsBlocks > this.blocksPerBatch) {
          trialDecryptionsBlocks = this.blocksPerBatch;
        }
        if (txnScanBlocks < 0) {
          txnScanBlocks = 0;
        }
        if (txnScanBlocks > this.blocksPerBatch) {
          txnScanBlocks = this.blocksPerBatch;
        }
        if (witnessesUpdated < 0) {
          witnessesUpdated = 0;
        }
        if (witnessesUpdated > this.blocksPerBatch) {
          witnessesUpdated = this.blocksPerBatch;
        }

        const batchTotal: number = ss.batch_total || 0;
        const batchNum: number = ss.batch_num || 0;

        const endBlock: number = ss.end_block || 0; // lower

        // I want to know what was the first block of the current sync process
        let processEndBlock: number = 0;
        // when the App is syncing the new blocks and sync finished really fast
        // the synstatus have almost all of the fields undefined.
        // if we have latestBlock means that the sync process finished in that block
        if (endBlock === 0 && batchNum === 0) {
          processEndBlock = this.latestBlock !== -1 ? this.latestBlock : this.lastServerBlockHeight;
        } else {
          processEndBlock = endBlock - batchNum * this.blocksPerBatch;
        }

        const progressBlocks: number = (syncedBlocks + trialDecryptionsBlocks + witnessesUpdated) / 3;

        let currentBlock = endBlock + progressBlocks;
        if (currentBlock > this.lastServerBlockHeight) {
          currentBlock = this.lastServerBlockHeight;
        }
        currentBlock = Number(currentBlock.toFixed(0));

        // if the current block is stalled I need to restart the App
        let syncProcessStalled = false;
        if (this.prevCurrentBlock !== -1) {
          if (currentBlock > 0 && this.prevCurrentBlock === currentBlock) {
            this.secondsBlock += 5;
            // 5 minutes
            if (this.secondsBlock >= 300) {
              this.secondsBlock = 0;
              syncProcessStalled = true;
            }
          }
          if (currentBlock > 0 && this.prevCurrentBlock !== currentBlock) {
            this.secondsBlock = 0;
            syncProcessStalled = false;
          }
        }

        // if current block is lower than the previous current block
        // The user need to see something not confusing.
        if (currentBlock > 0 && this.prevCurrentBlock !== -1 && currentBlock < this.prevCurrentBlock) {
          // I decided to add only one fake block because otherwise could seems stalled
          // the user expect every 5 seconds the blocks change...
          currentBlock = this.prevCurrentBlock + 1;
        }

        this.prevCurrentBlock = currentBlock;

        this.secondsBatch += 5;

        //console.log('interval sync/rescan, secs', this.secondsBatch, 'timer', this.syncStatusTimerID);

        // store SyncStatus object for a new screen
        this.fnSetSyncingStatus({
          syncID: this.syncId,
          totalBatches: batchTotal,
          currentBatch: ss.in_progress ? batchNum + 1 : 0,
          lastBlockWallet: this.lastWalletBlockHeight,
          currentBlock: currentBlock,
          inProgress: ss.in_progress,
          lastError: ss.last_error,
          blocksPerBatch: this.blocksPerBatch,
          secondsPerBatch: this.secondsBatch,
          processEndBlock: processEndBlock,
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

          await this.updateData();

          await RPCModule.doSave();

          // store SyncStatus object for a new screen
          this.fnSetSyncingStatus({
            syncID: this.syncId,
            totalBatches: 0,
            currentBatch: 0,
            lastBlockWallet: this.lastWalletBlockHeight,
            currentBlock: currentBlock,
            inProgress: false,
            lastError: ss.last_error,
            blocksPerBatch: this.blocksPerBatch,
            secondsPerBatch: 0,
            processEndBlock: processEndBlock,
            lastBlockServer: this.lastServerBlockHeight,
            syncProcessStalled: false,
          } as SyncingStatusClass);

          //console.log('sync status', ss);
          //console.log(`Finished refresh at ${this.lastWalletBlockHeight} id: ${this.syncId}`);
        } else {
          // If we're doing a long sync, every time the batchNum changes, save the wallet
          if (this.prevBatchNum !== batchNum) {
            // if finished batches really fast, the App have to save the wallet delayed.
            if (this.prevBatchNum !== -1 && this.batches >= 1) {
              await this.updateData();

              await RPCModule.doSave();
              this.batches = 0;

              //console.log('sync status', ss);
              //console.log(
              //  `@@@@@@@@@@@ Saving because batch num changed ${this.prevBatchNum} - ${batchNum}. seconds: ${this.secondsBatch}`,
              //);
            }
            this.batches += batchNum - this.prevBatchNum;
            this.prevBatchNum = batchNum;
            this.secondsBatch = 0;
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
        syncID: this.syncId,
        totalBatches: 0,
        currentBatch: 0,
        lastBlockWallet: this.lastWalletBlockHeight,
        currentBlock: this.lastWalletBlockHeight,
        inProgress: false,
        lastError: '',
        blocksPerBatch: this.blocksPerBatch,
        secondsPerBatch: 0,
        processEndBlock: this.lastServerBlockHeight,
        lastBlockServer: this.lastServerBlockHeight,
        syncProcessStalled: false,
      } as SyncingStatusClass);
    }
  }

  async fetchWalletSettings(): Promise<void> {
    try {
      const downloadMemosStr: string = await RPCModule.execute(CommandEnum.getoption, WalletOptionEnum.downloadMemos);
      if (downloadMemosStr) {
        if (downloadMemosStr.toLowerCase().startsWith(GlobalConst.error)) {
          console.log(`Error download memos ${downloadMemosStr}`);
          return;
        }
      } else {
        console.log('Internal Error download memos');
        return;
      }
      const downloadMemosJson: RPCGetOptionType = await JSON.parse(downloadMemosStr);

      const transactionFilterThresholdStr: string = await RPCModule.execute(
        CommandEnum.getoption,
        WalletOptionEnum.transactionFilterThreshold,
      );
      if (transactionFilterThresholdStr) {
        if (transactionFilterThresholdStr.toLowerCase().startsWith(GlobalConst.error)) {
          console.log(`Error transaction filter threshold ${transactionFilterThresholdStr}`);
          return;
        }
      } else {
        console.log('Internal Error transaction filter threshold');
        return;
      }
      const transactionFilterThresholdJson: RPCGetOptionType = await JSON.parse(transactionFilterThresholdStr);

      const walletSettings = new WalletSettingsClass();
      walletSettings.downloadMemos = downloadMemosJson.download_memos || '';
      walletSettings.transactionFilterThreshold = transactionFilterThresholdJson.transaction_filter_threshold || '';

      this.fnSetWalletSettings(walletSettings);
    } catch (error) {
      console.log(`Critical Error wallet settings ${error}`);
      return;
    }
  }

  async fetchInfoAndServerHeight(): Promise<void> {
    try {
      const info = await RPC.rpcGetInfoObject();

      if (info) {
        this.fnSetInfo(info);
        this.lastServerBlockHeight = info.latestBlock;
      }
    } catch (error) {
      console.log(`Critical Error info & server block height ${error}`);
      // relaunch the interval tasks just in case they are aborted.
      this.configure();
      return;
    }
  }

  // This method will get the total balances
  async fetchTotalBalance() {
    try {
      const addressesStr: string = await RPCModule.execute(CommandEnum.addresses, '');
      if (addressesStr) {
        if (addressesStr.toLowerCase().startsWith(GlobalConst.error)) {
          console.log(`Error addresses ${addressesStr}`);
          return;
        }
      } else {
        console.log('Internal Error addresses');
        return;
      }
      const addressesJSON: RPCAddressType[] = await JSON.parse(addressesStr);

      const balanceStr: string = await RPCModule.execute(CommandEnum.balance, '');
      if (balanceStr) {
        if (balanceStr.toLowerCase().startsWith(GlobalConst.error)) {
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
      const pendingNotes: string = await RPCModule.execute(CommandEnum.notes, '');
      if (pendingNotes) {
        if (pendingNotes.toLowerCase().startsWith(GlobalConst.error)) {
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
        // If this has any pending txns, show that in the UI
        const receivers: string =
          (u.receivers.orchard_exists ? ReceiverEnum.o : '') +
          (u.receivers.sapling ? ReceiverEnum.z : '') +
          (u.receivers.transparent ? ReceiverEnum.t : '');
        if (u.address) {
          const abu = new AddressClass(u.address, u.address, AddressKindEnum.u, receivers);
          if (pendingAddress.has(abu.address)) {
            abu.containsPending = true;
          }
          allAddresses.push(abu);
        }
        if (u.receivers.sapling) {
          const abz = new AddressClass(u.address, u.receivers.sapling, AddressKindEnum.z, receivers);
          if (pendingAddress.has(abz.address)) {
            abz.containsPending = true;
          }
          allAddresses.push(abz);
        }
        if (u.receivers.transparent) {
          const abt = new AddressClass(u.address, u.receivers.transparent, AddressKindEnum.t, receivers);
          if (pendingAddress.has(abt.address)) {
            abt.containsPending = true;
          }
          allAddresses.push(abt);
        }
      });

      this.fnSetAllAddresses(allAddresses);
    } catch (error) {
      console.log(`Critical Error addresses balances notes ${error}`);
      // relaunch the interval tasks just in case they are aborted.
      this.configure();
      return;
    }
  }

  // This method will get the total balances
  async fetchAddresses() {
    try {
      const addressesStr: string = await RPCModule.execute(CommandEnum.addresses, '');
      if (addressesStr) {
        if (addressesStr.toLowerCase().startsWith(GlobalConst.error)) {
          console.log(`Error addresses ${addressesStr}`);
          return;
        }
      } else {
        console.log('Internal Error addresses');
        return;
      }
      const addressesJSON: RPCAddressType[] = await JSON.parse(addressesStr);

      let allAddresses: AddressClass[] = [];

      addressesJSON.forEach((u: RPCAddressType) => {
        // If this has any pending txns, show that in the UI
        const receivers: string =
          (u.receivers.orchard_exists ? ReceiverEnum.o : '') +
          (u.receivers.sapling ? ReceiverEnum.z : '') +
          (u.receivers.transparent ? ReceiverEnum.t : '');
        if (u.address) {
          const abu = new AddressClass(u.address, u.address, AddressKindEnum.u, receivers);
          allAddresses.push(abu);
        }
        if (u.address && u.receivers.sapling) {
          const abz = new AddressClass(u.address, u.receivers.sapling, AddressKindEnum.z, receivers);
          allAddresses.push(abz);
        }
        if (u.address && u.receivers.transparent) {
          const abt = new AddressClass(u.address, u.receivers.transparent, AddressKindEnum.t, receivers);
          allAddresses.push(abt);
        }
      });

      this.fnSetAllAddresses(allAddresses);
    } catch (error) {
      console.log(`Critical Error addresses ${error}`);
      // relaunch the interval tasks just in case they are aborted.
      this.configure();
      return;
    }
  }

  async fetchWalletHeight(): Promise<void> {
    try {
      const heightStr: string = await RPCModule.execute(CommandEnum.height, '');
      if (heightStr) {
        if (heightStr.toLowerCase().startsWith(GlobalConst.error)) {
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
      // relaunch the interval tasks just in case they are aborted.
      this.configure();
      return;
    }
  }

  async fetchWalletBirthday(): Promise<void> {
    try {
      const wallet = await RPC.rpcFetchWallet(this.readOnly);

      if (wallet) {
        this.walletBirthday = wallet.birthday;
      }
    } catch (error) {
      console.log(`Critical Error wallet birthday ${error}`);
      // relaunch the interval tasks just in case they are aborted.
      this.configure();
      return;
    }
  }

  // Fetch all T and Z and O ValueTransfers
  async fetchTandZandOValueTransfers() {
    try {
      const valueTransfersStr: string = await RPCModule.getValueTransfersList();
      //console.log(valueTransfersStr);
      if (valueTransfersStr) {
        if (valueTransfersStr.toLowerCase().startsWith(GlobalConst.error)) {
          console.log(`Error value transfers ${valueTransfersStr}`);
          return;
        }
      } else {
        console.log('Internal Error value transfers');
        return;
      }
      const valueTransfersJSON: RPCValueTransfersType = await JSON.parse(valueTransfersStr);

      //console.log(valueTransfersJSON);

      await this.fetchWalletHeight();
      await this.fetchWalletBirthday();
      await this.fetchInfoAndServerHeight();

      let vtList: ValueTransferType[] = [];

      // oscar idea and I think it is the correct way to build the history of
      // value transfers.
      valueTransfersJSON.value_transfers.forEach((vt: RPCValueTransferType) => {
        const currentValueTransferList: ValueTransferType = {} as ValueTransferType;

        currentValueTransferList.txid = vt.txid;
        currentValueTransferList.time = vt.datetime;
        currentValueTransferList.kind =
          vt.kind === RPCValueTransfersKindEnum.memoToSelf
            ? ValueTransferKindEnum.MemoToSelf
            : vt.kind === RPCValueTransfersKindEnum.sendToSelf
            ? ValueTransferKindEnum.SendToSelf
            : vt.kind === RPCValueTransfersKindEnum.received
            ? ValueTransferKindEnum.Received
            : vt.kind === RPCValueTransfersKindEnum.sent
            ? ValueTransferKindEnum.Sent
            : vt.kind === RPCValueTransfersKindEnum.shield
            ? ValueTransferKindEnum.Shield
            : undefined;
        currentValueTransferList.fee = (!vt.transaction_fee ? 0 : vt.transaction_fee) / 10 ** 8;
        currentValueTransferList.zecPrice = !vt.zec_price ? 0 : vt.zec_price;
        if (
          vt.status === RPCValueTransfersStatusEnum.transmitted ||
          vt.status === RPCValueTransfersStatusEnum.mempool
        ) {
          currentValueTransferList.confirmations = 0;
        } else if (vt.status === RPCValueTransfersStatusEnum.confirmed) {
          currentValueTransferList.confirmations = this.lastServerBlockHeight
            ? this.lastServerBlockHeight - vt.blockheight + 1
            : this.lastWalletBlockHeight - vt.blockheight + 1;
        } else {
          // impossible case... I guess.
          currentValueTransferList.confirmations = 0;
        }
        currentValueTransferList.status = vt.status;
        currentValueTransferList.address = !vt.recipient_address ? undefined : vt.recipient_address;
        currentValueTransferList.amount = (!vt.value ? 0 : vt.value) / 10 ** 8;
        currentValueTransferList.memos = !vt.memos || vt.memos.length === 0 ? undefined : vt.memos;
        currentValueTransferList.poolType = !vt.pool_received ? undefined : vt.pool_received;

        if (vt.txid.startsWith('xxxxxxxxx')) {
          console.log('valuetranfer: ', vt);
          console.log('--------------------------------------------------');
        }
        if (vt.status === RPCValueTransfersStatusEnum.transmitted) {
          console.log('TRANSMITTED ))))))))))))))))))))))))))))))))))');
        }

        //console.log(currentValueTransferList);
        vtList.push(currentValueTransferList);
      });

      //console.log(txlist);

      this.fnSetValueTransfersList(vtList);
    } catch (error) {
      console.log(`Critical Error txs list value transfers ${error}`);
      // relaunch the interval tasks just in case they are aborted.
      this.configure();
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
    if (prev && !prev.toLowerCase().startsWith(GlobalConst.error)) {
      let prevProgress = {} as RPCSendProgressType;
      try {
        prevProgress = await JSON.parse(prev);
        prevSendId = prevProgress.id;
      } catch (e) {}
    }

    console.log('prev progress id', prevSendId);

    // sometimes we need the result of send as well
    let sendError: string = '';
    let sendTxid: string = '';

    // This is async, so fire and forget
    this.doSend(JSON.stringify(sendJson))
      .then(r => {
        try {
          const rJson: RPCSendType = JSON.parse(r);
          if (rJson.error) {
            sendError = rJson.error;
          } else if (rJson.txids) {
            sendTxid = rJson.txids.join(', ');
          }
        } catch (e) {
          sendError = r;
        }
        console.log('End Send OK: ' + r);
      })
      .catch(e => {
        if (e && e.message) {
          sendError = e.message;
        }
        console.log('End Send ERROR: ' + e);
      })
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
        console.log('send progress', pro);
        if (pro && pro.toLowerCase().startsWith(GlobalConst.error) && !sendTxid && !sendError) {
          return;
        }
        let progress = {} as RPCSendProgressType;
        let sendId = -1;
        try {
          progress = await JSON.parse(pro);
          sendId = progress.id;
        } catch (e) {
          console.log('Error parsing status send progress', e);
          if (!sendTxid && !sendError) {
            return;
          }
        }

        // because I don't know what the user are doing, I force every 2 seconds
        // the interrupt flag to true if the sync_interrupt is false
        if (!progress.sync_interrupt) {
          await RPC.rpcSetInterruptSyncAfterBatch(GlobalConst.true);
        }

        const updatedProgress = new SendProgressClass(0, 0, 0);
        // if the send command fails really fast then the sendID never change.
        // In this case I need to finish this promise right away.
        if (sendId === prevSendId && !sendTxid && !sendError) {
          console.log('progress id', sendId);
          // Still not started, so wait for more time
          return;
        }

        console.log('progress', progress);

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
        updatedProgress.total = 3; // until sendprogress give me a good value... 3 is better.
        updatedProgress.sendInProgress = progress.sending;
        updatedProgress.etaSeconds = progress.progress === 0 ? '...' : eta;

        // exists a possible problem:
        // if the send process is really fast (likely an error) and sendprogress is over
        // in this moment.

        // sometimes the progress.sending is false and txid and error are null
        // in this moment I can use the values from the command send

        if (!progress.txid && !progress.error && !sendTxid && !sendError) {
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
          // send process is about to finish - reactivate the syncing flag
          if (progress.sync_interrupt) {
            await RPC.rpcSetInterruptSyncAfterBatch(GlobalConst.false);
          }
          resolve(progress.txid);
        }

        if (progress.error) {
          // send process is about to finish - reactivate the syncing flag
          if (progress.sync_interrupt) {
            await RPC.rpcSetInterruptSyncAfterBatch(GlobalConst.false);
          }
          reject(progress.error);
        }

        if (sendTxid) {
          // And refresh data (full refresh)
          this.refresh(true);
          // send process is about to finish - reactivate the syncing flag
          if (progress.sync_interrupt) {
            await RPC.rpcSetInterruptSyncAfterBatch(GlobalConst.false);
          }
          resolve(sendTxid);
        }

        if (sendError) {
          // send process is about to finish - reactivate the syncing flag
          if (progress.sync_interrupt) {
            await RPC.rpcSetInterruptSyncAfterBatch(GlobalConst.false);
          }
          reject(sendError);
        }
      }, 2000); // Every 2 seconds
    });

    return sendTxPromise;
  }

  async changeWallet() {
    const exists = await RPCModule.walletExists();

    //console.log('jc change wallet', exists);
    if (exists && exists !== GlobalConst.false) {
      await this.stopSyncProcess();
      await RPCModule.doSaveBackup();
      const result = await RPCModule.deleteExistingWallet();

      if (!(result && result !== GlobalConst.false)) {
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
    if (exists && exists !== GlobalConst.false) {
      await this.stopSyncProcess();
      const result = await RPCModule.deleteExistingWallet();

      if (!(result && result !== GlobalConst.false)) {
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
    if (existsBackup && existsBackup !== GlobalConst.false) {
      const existsWallet = await RPCModule.walletExists();

      //console.log('jc restore wallet', existsWallet);
      if (existsWallet && existsWallet !== GlobalConst.false) {
        await this.stopSyncProcess();
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
