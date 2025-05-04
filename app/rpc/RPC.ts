import {
  TotalBalanceClass,
  AddressClass,
  InfoType,
  SendJsonToTypeType,
  WalletType,
  //WalletSettingsClass,
  TranslateType,
  CommandEnum,
  ChainNameEnum,
  //WalletOptionEnum,
  CurrencyNameEnum,
  AddressKindEnum,
  ReceiverEnum,
  GlobalConst,
  ValueTransferType,
} from '../AppState';
import RPCModule from '../RPCModule';
import { RPCAddressType } from './types/RPCAddressType';
import { RPCBalancesType } from './types/RPCBalancesType';
import { RPCInfoType } from './types/RPCInfoType';
import { RPCWalletHeight } from './types/RPCWalletHeightType';
import { RPCSeedType } from './types/RPCSeedType';
import { RPCSyncStatusType } from './types/RPCSyncStatusType';
//import { RPCGetOptionType } from './types/RPCGetOptionType';
import { RPCUfvkType } from './types/RPCUfvkType';
import { RPCSendType } from './types/RPCSendType';
import { RPCValueTransfersType } from './types/RPCValueTransfersType';
import { RPCValueTransfersKindEnum } from './enums/RPCValueTransfersKindEnum';
import { RPCValueTransferType } from './types/RPCValueTransferType';
import { ValueTransferKindEnum } from '../AppState/enums/ValueTransferKindEnum';
import { RPCValueTransfersStatusEnum } from './enums/RPCValueTransfersStatusEnum';
import { AddressesReceiversEnum } from '../AppState';
import { RPCSendProposeType } from './types/RPCSendProposeType';
import { RPCSyncPollType } from './types/RPCSyncPollType';

export default class RPC {
  fnSetInfo: (info: InfoType) => void;
  fnSetTotalBalance: (totalBalance: TotalBalanceClass) => void;
  fnSetValueTransfersList: (vtList: ValueTransferType[], total: number) => void;
  fnSetMessagesList: (mList: ValueTransferType[], total: number) => void;
  fnSetAllAddresses: (allAddresses: AddressClass[]) => void;
  fnSetSyncingStatus: (syncingStatus: RPCSyncStatusType) => void;
  //fnSetWalletSettings: (settings: WalletSettingsClass) => void;
  translate: (key: string) => TranslateType;
  keepAwake: (keep: boolean) => void;
  fnSetZingolib: (zingolib: string) => void;
  fnSetWallet: (wallet: WalletType) => void;

  updateTimerID?: NodeJS.Timeout;

  lastWalletBlockHeight: number;
  lastServerBlockHeight: number;
  walletBirthday: number;

  fetchWalletHeightLock: boolean;
  fetchWalletBirthdayLock: boolean;
  fetchInfoAndServerHeightLock: boolean;
  fetchTandZandOValueTransfersLock: boolean;
  fetchTandZandOMessagesLock: boolean;
  fetchTotalBalanceLock: boolean;
  //fetchWalletSettingsLock: boolean;
  fetchAddressesLock: boolean;
  refreshSyncLock: boolean;
  fetchSyncStatusLock: boolean;
  fetchSyncPollLock: boolean;
  fetchZingolibVersionLock: boolean;

  inRefresh: boolean;
  inSend: boolean;

  timers: NodeJS.Timeout[];

  readOnly: boolean;

  constructor(
    fnSetTotalBalance: (totalBalance: TotalBalanceClass) => void,
    fnSetValueTransfersList: (vtlist: ValueTransferType[], total: number) => void,
    fnSetMessagesList: (mlist: ValueTransferType[], total: number) => void,
    fnSetAllAddresses: (addresses: AddressClass[]) => void,
    //fnSetWalletSettings: (settings: WalletSettingsClass) => void,
    fnSetInfo: (info: InfoType) => void,
    fnSetSyncingStatus: (syncingStatus: RPCSyncStatusType) => void,
    translate: (key: string) => TranslateType,
    keepAwake: (keep: boolean) => void,
    fnSetZingolib: (zingolib: string) => void,
    fnSetWallet: (wallet: WalletType) => void,
    readOnly: boolean,
  ) {
    this.fnSetTotalBalance = fnSetTotalBalance;
    this.fnSetValueTransfersList = fnSetValueTransfersList;
    this.fnSetMessagesList = fnSetMessagesList;
    this.fnSetAllAddresses = fnSetAllAddresses;
    //this.fnSetWalletSettings = fnSetWalletSettings;
    this.fnSetInfo = fnSetInfo;
    this.fnSetSyncingStatus = fnSetSyncingStatus;
    this.translate = translate;
    this.keepAwake = keepAwake;
    this.fnSetZingolib = fnSetZingolib;
    this.fnSetWallet = fnSetWallet;

    this.lastWalletBlockHeight = 0;
    this.lastServerBlockHeight = 0;
    this.walletBirthday = 0;

    this.fetchWalletHeightLock = false;
    this.fetchWalletBirthdayLock = false;
    this.fetchInfoAndServerHeightLock = false;
    this.fetchTandZandOValueTransfersLock = false;
    this.fetchTandZandOMessagesLock = false;
    this.fetchTotalBalanceLock = false;
    //this.fetchWalletSettingsLock = false;
    this.fetchAddressesLock = false;
    this.refreshSyncLock = false;
    this.fetchSyncStatusLock = false;
    this.fetchSyncPollLock = false;
    this.fetchZingolibVersionLock = false;

    this.inRefresh = false;
    this.inSend = false;

    this.timers = [];

    this.readOnly = readOnly;
  }

  static async rpcGetZecPrice(): Promise<number> {
    try {
      // values:
      // 0   - initial/default value
      // -1  - error in Gemini/zingolib.
      // -2  - error in RPCModule, likely.
      // > 0 - real value
      //const start = Date.now();
      const resultStr: string = await RPCModule.zecPriceInfo();
      //console.log('=========================================== > get ZEC price - ', Date.now() - start);
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
      //const start = Date.now();
      const resultStr: string = await RPCModule.execute(CommandEnum.setoption, `${name}=${value}`);
      //console.log('=========================================== > set wallet setting - ', Date.now() - start);

      if (resultStr) {
        if (resultStr.toLowerCase().startsWith(GlobalConst.error)) {
          console.log(`Error setting option ${resultStr}`);
          return resultStr;
        }
        //const start2 = Date.now();
        await RPCModule.doSave();
        //console.log('=========================================== > save wallet - ', Date.now() - start2);
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
        const start = Date.now();
        const ufvkStr: string = await RPCModule.getUfvkInfo();
        console.log('=========================================== > get ufvk - ', Date.now() - start);
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
        const start2 = Date.now();
        const seedStr: string = await RPCModule.getSeedInfo();
        console.log('=========================================== > get seed - ', Date.now() - start2);
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

  runTaskPromises(): void {
    //console.log('++++++++++ interval update 5 secs ALL', this.timers);
    this.sanitizeTimers();

    const taskPromises: Promise<void>[] = [];

    taskPromises.push(
      new Promise<void>(async resolve => {
        //const s = Date.now();
        await this.fetchWalletHeight();
        //console.log('wallet height - ', Date.now() - s);
        resolve();
      }),
    );
    taskPromises.push(
      new Promise<void>(async resolve => {
        //const s = Date.now();
        await this.fetchWalletBirthdaySeedUfvk();
        //console.log('wallet birthday - ', Date.now() - s);
        resolve();
      }),
    );
    taskPromises.push(
      new Promise<void>(async resolve => {
        //const s = Date.now();
        await this.fetchInfoAndServerHeight();
        //console.log('info & server height - ', Date.now() - s);
        resolve();
      }),
    );
    taskPromises.push(
      new Promise<void>(async resolve => {
        //const s = Date.now();
        await this.fetchTandZandOValueTransfers();
        //console.log('value transfers - ', Date.now() - s);
        resolve();
      }),
    );
    taskPromises.push(
      new Promise<void>(async resolve => {
        //const s = Date.now();
        await this.fetchTandZandOMessages();
        //console.log('messages - ', Date.now() - s);
        resolve();
      }),
    );
    taskPromises.push(
      new Promise<void>(async resolve => {
        //const s = Date.now();
        await this.fetchTotalBalance();
        //console.log('balance - ', Date.now() - s);
        resolve();
      }),
    );
    // try to sync, no matter what.
    taskPromises.push(
      new Promise<void>(async resolve => {
        await this.refreshSync();
        //console.log('INTERVAL refresh sync');
        resolve();
      }),
    );
    taskPromises.push(
      new Promise<void>(async resolve => {
        await this.fetchSyncStatus();
        //console.log('INTERVAL status sync');
        resolve();
      }),
    );
    // do need this because of the sync process
    taskPromises.push(
      new Promise<void>(async resolve => {
        await this.fetchSyncPoll();
        //console.log('INTERVAL poll sync');
        resolve();
      }),
    );

    Promise.allSettled(taskPromises);
  }

  // this is only for the first time when the App is booting, but
  // there are more cases:
  // - LoadedApp mounting component.
  // - App go to Foreground.
  // - Internet from Not Connected to Connected.
  // - Cambio de Servidor.
  async configure(): Promise<void> {
    // I need to fetch this quickly.
    this.fetchZingolibVersion();

    // takes a while to start
    await this.refreshSync();

    // fetching only once
    await this.fetchAddresses();
    //await this.fetchWalletSettings();

    this.runTaskPromises();

    // every 5 seconds the App update part of the data
    if (!this.updateTimerID) {
      this.updateTimerID = setInterval(() => this.runTaskPromises(), 2 * 1000); // 2 secs
      //console.log('create update timer', this.updateVTTimerID);
      this.timers.push(this.updateTimerID);
    }

    await this.sanitizeTimers();
  }

  //sleep = (ms: number) => new Promise(r => setTimeout(r, ms));

  // this is not used for now...
  async stopSyncProcess(): Promise<void> {
    let returnStop: string = await RPCModule.stopSyncProcess();
    if (!returnStop || returnStop.toLowerCase().startsWith(GlobalConst.error)) {
      console.log('SYNC STOP ERROR', returnStop);
      return;
    } else {
      console.log('stop sync process. STOPPED', returnStop);
    }

    // deactivate the sync flag just in case.
    this.setInRefresh(false);
  }

  async pauseSyncProcess(): Promise<void> {
    let returnPause: string = await RPCModule.pauseSyncProcess();
    if (!returnPause || returnPause.toLowerCase().startsWith(GlobalConst.error)) {
      console.log('SYNC PAUSE ERROR', returnPause);
      return;
    } else {
      console.log('pause sync process. PAUSED', returnPause);
    }

    // deactivate the sync flag just in case.
    this.setInRefresh(false);
  }

  async clearTimers(): Promise<void> {
    if (this.updateTimerID) {
      clearInterval(this.updateTimerID);
      this.updateTimerID = undefined;
      //console.log('kill update timer', this.updateVTTimerID);
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
      if (this.updateTimerID && this.timers[i] === this.updateTimerID) {
        // do nothing
      } else {
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

  async refreshSync(fullRescan?: boolean) {
    //console.log('WALLET', this.lastWalletBlockHeight, 'SERVER', this.lastServerBlockHeight, 'in refresh', this.inRefresh);

    if (this.refreshSyncLock && !fullRescan) {
      //console.log('REFRESH ----> in execution already');
      return;
    }
    this.refreshSyncLock = true;

    // the App can called `sync run` no matter what
    // this is handy to have the wallet fully synced
    // anytime.
    this.keepAwake(true);
    this.setInRefresh(true);

    // This is async, so when it is done, we finish the refresh.
    if (fullRescan) {
      await this.clearTimers();
      // clean the ValueTransfer list before.
      this.fnSetValueTransfersList([], 0);
      this.fnSetMessagesList([], 0);
      this.fnSetTotalBalance({
        orchardBal: 0,
        privateBal: 0,
        transparentBal: 0,
        spendableOrchard: 0,
        spendablePrivate: 0,
        total: 0,
      } as TotalBalanceClass);
      this.fnSetSyncingStatus({} as RPCSyncStatusType);

      // the rescan in zingolib do two tasks:
      // 1. stop the sync.
      // 2. launch the rescan.
      const s = Date.now();
      const rescanStr: string = await RPCModule.runRescanProcess();
      console.log('=========================================== > rescan run command - ', Date.now() - s);
      //console.log('rescan RUN', rescanStr);
      if (!rescanStr || rescanStr.toLowerCase().startsWith(GlobalConst.error)) {
        console.log(`Error rescan ${rescanStr}`);
      }
      await this.configure();
    } else {
      const s = Date.now();
      const syncStr: string = await RPCModule.runSyncProcess();
      console.log('=========================================== > sync run command - ', Date.now() - s);
      //console.log('sync RUN', syncStr);
      if (!syncStr || syncStr.toLowerCase().startsWith(GlobalConst.error)) {
        console.log(`Error sync ${syncStr}`);
      }
    }

    this.refreshSyncLock = false;
  }

  async fetchSyncStatus(): Promise<void> {
    if (this.fetchSyncStatusLock) {
      //console.log('sync status locked');
      return;
    }
    this.fetchSyncStatusLock = true;
    const s = Date.now();
    const returnStatus: string = await RPCModule.statusSyncInfo();
    console.log('=========================================== > sync status command - ', Date.now() - s);
    if (!returnStatus || returnStatus.toLowerCase().startsWith(GlobalConst.error)) {
      console.log('SYNC STATUS ERROR', returnStatus);
      this.fetchSyncStatusLock = false;
      return;
    }
    let ss = {} as RPCSyncStatusType;
    try {
      ss = await JSON.parse(returnStatus);
    } catch (e) {
      console.log('SYNC STATUS ERROR - PARSE JSON', returnStatus);
      this.fetchSyncStatusLock = false;
      return;
    }

    //console.log('SYNC STATUS', ss);
    //console.log('SYNC STATUS', ss.scan_ranges?.length, ss.percentage_total_outputs_scanned);

    // synchronize status
    const inR: boolean = !!ss.scan_ranges && ss.scan_ranges.length > 0 && ss.percentage_total_outputs_scanned < 100;
    this.setInRefresh(inR);
    //console.log('SYNC STATUS IN-REFRESH', inR);

    //console.log('interval sync/rescan, secs', this.secondsBatch, 'timer', this.syncStatusTimerID);

    // store SyncStatus object for a new screen
    //const start = Date.now();
    this.fnSetSyncingStatus(ss as RPCSyncStatusType);
    //console.log('=========================================== > set sync status - ', Date.now() - start);

    // Close the poll timer if the sync finished(checked via promise above)
    if (!this.inRefresh) {
      // here we can release the screen...
      this.keepAwake(false);
    }
    const start2 = Date.now();
    await RPCModule.doSave();
    console.log('=========================================== > save wallet - ', Date.now() - start2);

    this.fetchSyncStatusLock = false;
  }

  // do not use it for now...
  async fetchSyncPoll(): Promise<void> {
    if (this.fetchSyncPollLock) {
      //console.log('sync poll locked');
      return;
    }
    this.fetchSyncPollLock = true;
    const s = Date.now();
    const returnPoll: string = await RPCModule.pollSyncInfo();
    console.log('=========================================== > sync poll command - ', Date.now() - s);
    if (!returnPoll || returnPoll.toLowerCase().startsWith(GlobalConst.error) || returnPoll.toLowerCase().startsWith('sync task')) {
      console.log('SYNC POLL ERROR', returnPoll);
      this.fetchSyncPollLock = false;
      return;
    }
    let sp = {} as RPCSyncPollType;
    try {
      sp = await JSON.parse(returnPoll);
    } catch (e) {
      console.log('SYNC POLL ERROR - PARSE JSON', returnPoll);
      this.fetchSyncPollLock = false;
      return;
    }

    console.log('SYNC POLL', sp);

    this.fetchSyncPollLock = false;
  }

  /*
  async fetchWalletSettings(): Promise<void> {
    try {
      if (this.fetchWalletSettingsLock) {
        return;
      }
      this.fetchWalletSettingsLock = true;
      //const start = Date.now();
      const downloadMemosStr: string = await RPCModule.execute(CommandEnum.getoption, WalletOptionEnum.downloadMemos);
      //console.log('=========================================== > dowload memos - ', Date.now() - start);
      if (downloadMemosStr) {
        if (downloadMemosStr.toLowerCase().startsWith(GlobalConst.error)) {
          console.log(`Error download memos ${downloadMemosStr}`);
          this.fetchWalletSettingsLock = false;
          return;
        }
      } else {
        console.log('Internal Error download memos');
        this.fetchWalletSettingsLock = false;
        return;
      }
      const downloadMemosJson: RPCGetOptionType = await JSON.parse(downloadMemosStr);

      //const start2 = Date.now();
      const transactionFilterThresholdStr: string = await RPCModule.execute(
        CommandEnum.getoption,
        WalletOptionEnum.transactionFilterThreshold,
      );
      //console.log('=========================================== > filter threshold - ', Date.now() - start2);
      if (transactionFilterThresholdStr) {
        if (transactionFilterThresholdStr.toLowerCase().startsWith(GlobalConst.error)) {
          console.log(`Error transaction filter threshold ${transactionFilterThresholdStr}`);
          this.fetchWalletSettingsLock = false;
          return;
        }
      } else {
        console.log('Internal Error transaction filter threshold');
        this.fetchWalletSettingsLock = false;
        return;
      }
      const transactionFilterThresholdJson: RPCGetOptionType = await JSON.parse(transactionFilterThresholdStr);

      const walletSettings = new WalletSettingsClass();
      walletSettings.downloadMemos = downloadMemosJson.download_memos || '';
      walletSettings.transactionFilterThreshold = transactionFilterThresholdJson.transaction_filter_threshold || '';

      //const start3 = Date.now();
      this.fnSetWalletSettings(walletSettings);
      //console.log('=========================================== > set wallet settings - ', Date.now() - start3);
      this.fetchWalletSettingsLock = false;
    } catch (error) {
      console.log(`Critical Error wallet settings ${error}`);
      this.fetchWalletSettingsLock = false;
      return;
    }
  }
  */

  async fetchInfoAndServerHeight(): Promise<void> {
    try {
      if (this.fetchInfoAndServerHeightLock) {
        return;
      }
      this.fetchInfoAndServerHeightLock = true;
      let infoError: boolean = false;
      const start = Date.now();
      const infoStr: string = await RPCModule.infoServerInfo();
      console.log('=========================================== > info - ', Date.now() - start);
      if (infoStr) {
        if (infoStr.toLowerCase().startsWith(GlobalConst.error)) {
          console.log(`Error info & server block height ${infoStr}`);
          infoError = true;
        }
      } else {
        console.log('Internal Error info & server block height');
        infoError = true;
      }

      if (infoError) {
        this.fnSetInfo({
          latestBlock: 0,
          serverUri: '',
          version: '',
        } as InfoType);
        this.lastServerBlockHeight = 0;
        this.fetchInfoAndServerHeightLock = false;
        return;
      }

      const infoJSON: RPCInfoType = await JSON.parse(infoStr);

      const info: InfoType = {
        chainName: infoJSON.chain_name,
        latestBlock: infoJSON.latest_block_height,
        serverUri: infoJSON.server_uri || '',
        version: `${infoJSON.vendor}/${infoJSON.git_commit ? infoJSON.git_commit.substring(0, 6) : ''}/${
          infoJSON.version
        }`,
        currencyName: infoJSON.chain_name === ChainNameEnum.mainChainName ? CurrencyNameEnum.ZEC : CurrencyNameEnum.TAZ,
        zingolib: '',
      };

      //const start3 = Date.now();
      this.fnSetInfo(info);
      //console.log('=========================================== > set info - ', Date.now() - start3);
      this.lastServerBlockHeight = info.latestBlock;
      this.fetchInfoAndServerHeightLock = false;
    } catch (error) {
      console.log(`Critical Error info & server block height ${error}`);
      // relaunch the interval tasks just in case they are aborted.
      this.setInRefresh(false);
      await this.clearTimers();
      await this.configure();
      this.fetchInfoAndServerHeightLock = false;
      return;
    }
  }

  async fetchZingolibVersion(): Promise<void> {
    try {
      if (this.fetchZingolibVersionLock) {
        return;
      }
      this.fetchZingolibVersionLock = true;
      const start = Date.now();
      let zingolibStr: string = await RPCModule.getVersionInfo();
      console.log('=========================================== > zingolib version - ', Date.now() - start);
      if (zingolibStr) {
        if (zingolibStr.toLowerCase().startsWith(GlobalConst.error)) {
          console.log(`Error zingolib version ${zingolibStr}`);
          zingolibStr = '<error>';
        }
      } else {
        console.log('Internal Error zingolib version');
        zingolibStr = '<none>';
      }

      //const start2 = Date.now();
      this.fnSetZingolib(zingolibStr);
      //console.log('=========================================== > set zingolib version - ', Date.now() - start2);
      this.fetchZingolibVersionLock = false;
    } catch (error) {
      console.log(`Critical Error info ${error}`);
      this.fetchZingolibVersionLock = false;
      return;
    }
  }

  // This method will get the total balances
  async fetchTotalBalance() {
    try {
      if (this.fetchTotalBalanceLock) {
        return;
      }
      this.fetchTotalBalanceLock = true;
      const start = Date.now();
      const balanceStr: string = await RPCModule.getBalanceInfo();
      console.log('=========================================== > balance - ', Date.now() - start);
      if (balanceStr) {
        if (balanceStr.toLowerCase().startsWith(GlobalConst.error)) {
          console.log(`Error balance ${balanceStr}`);
          this.fetchTotalBalanceLock = false;
          return;
        }
      } else {
        console.log('Internal Error balance');
        this.fetchTotalBalanceLock = false;
        return;
      }
      const balanceJSON: RPCBalancesType = await JSON.parse(balanceStr);

      const orchardBal: number = balanceJSON.orchard_balance || 0;
      const privateBal: number = balanceJSON.sapling_balance || 0;
      const transparentBal: number = balanceJSON.confirmed_transparent_balance || 0;

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
      //const start2 = Date.now();
      this.fnSetTotalBalance(balance);
      //console.log('=========================================== > set balance - ', Date.now() - start2);
      this.fetchTotalBalanceLock = false;
    } catch (error) {
      console.log(`Critical Error balances ${error}`);
      // relaunch the interval tasks just in case they are aborted.
      this.setInRefresh(false);
      await this.clearTimers();
      await this.configure();
      this.fetchTotalBalanceLock = false;
      return;
    }
  }

  // This method will get the total balances
  async fetchAddresses() {
    try {
      if (this.fetchAddressesLock) {
        return;
      }
      this.fetchAddressesLock = true;
      const start = Date.now();
      const addressesStr: string = await RPCModule.getAddressesInfo(AddressesReceiversEnum.full);
      console.log('=========================================== > addresses full - ', Date.now() - start);
      if (addressesStr) {
        if (addressesStr.toLowerCase().startsWith(GlobalConst.error)) {
          console.log(`Error addresses ${addressesStr}`);
          this.fetchAddressesLock = false;
          return;
        }
      } else {
        console.log('Internal Error addresses');
        this.fetchAddressesLock = false;
        return;
      }
      const addressesJSON: RPCAddressType[] = await JSON.parse(addressesStr) || [];

      const start2 = Date.now();
      const orchardAddressesStr: string = await RPCModule.getAddressesInfo(AddressesReceiversEnum.orchard);
      console.log('=========================================== > addresses orchard - ', Date.now() - start2);
      if (addressesStr) {
        if (addressesStr.toLowerCase().startsWith(GlobalConst.error)) {
          console.log(`Error addresses ${addressesStr}`);
          this.fetchAddressesLock = false;
          return;
        }
      } else {
        console.log('Internal Error addresses');
        this.fetchAddressesLock = false;
        return;
      }
      const orchardAddressesJSON: RPCAddressType[] = await JSON.parse(orchardAddressesStr) || [];
      const uOrchardAddress: string =
        orchardAddressesJSON && orchardAddressesJSON.length > 0 ? orchardAddressesJSON[0].address : '';

      let allAddresses: AddressClass[] = [];

      (addressesJSON || orchardAddressesJSON) &&
        [...addressesJSON, ...orchardAddressesJSON].forEach((u: RPCAddressType) => {
          // If this has any pending txns, show that in the UI
          const receivers: string =
            (u.receivers.orchard_exists ? ReceiverEnum.o : '') +
            (u.receivers.sapling ? ReceiverEnum.z : '') +
            (u.receivers.transparent ? ReceiverEnum.t : '');
          if (u.address) {
            const abu = new AddressClass(uOrchardAddress, u.address, AddressKindEnum.u, receivers);
            allAddresses.push(abu);
          }
          if (u.address && u.receivers.sapling) {
            const abz = new AddressClass(uOrchardAddress, u.receivers.sapling, AddressKindEnum.z, ReceiverEnum.z);
            allAddresses.push(abz);
          }
          if (u.address && u.receivers.transparent) {
            const abt = new AddressClass(uOrchardAddress, u.receivers.transparent, AddressKindEnum.t, ReceiverEnum.t);
            allAddresses.push(abt);
          }
        });

      //const start3 = Date.now();
      this.fnSetAllAddresses(allAddresses);
      //console.log('=========================================== > set addresses - ', Date.now() - start3);
      this.fetchAddressesLock = false;
    } catch (error) {
      console.log(`Critical Error addresses ${error}`);
      // relaunch the interval tasks just in case they are aborted.
      this.setInRefresh(false);
      await this.clearTimers();
      await this.configure();
      this.fetchAddressesLock = false;
      return;
    }
  }

  async fetchWalletHeight(): Promise<void> {
    try {
      if (this.fetchWalletHeightLock) {
        return;
      }
      this.fetchWalletHeightLock = true;
      const start = Date.now();
      const heightStr: string = await RPCModule.getLatestBlockWalletInfo();
      console.log('=========================================== > wallet height - ', Date.now() - start);
      if (heightStr) {
        if (heightStr.toLowerCase().startsWith(GlobalConst.error)) {
          console.log(`Error wallet height ${heightStr}`);
          this.fetchWalletHeightLock = false;
          return;
        }
      } else {
        console.log('Internal Error wallet height');
        this.fetchWalletHeightLock = false;
        return;
      }
      const heightJSON: RPCWalletHeight = await JSON.parse(heightStr);

      this.lastWalletBlockHeight = heightJSON.height;
      this.fetchWalletHeightLock = false;
    } catch (error) {
      console.log(`Critical Error wallet height ${error}`);
      // relaunch the interval tasks just in case they are aborted.
      this.setInRefresh(false);
      await this.clearTimers();
      await this.configure();
      this.fetchWalletHeightLock = false;
      return;
    }
  }

  async fetchWalletBirthdaySeedUfvk(): Promise<void> {
    try {
      if (this.fetchWalletBirthdayLock) {
        return;
      }
      this.fetchWalletBirthdayLock = true;
      const wallet = await RPC.rpcFetchWallet(this.readOnly);

      if (wallet) {
        this.walletBirthday = wallet.birthday;
        this.fnSetWallet(wallet);
      }
      this.fetchWalletBirthdayLock = false;
    } catch (error) {
      console.log(`Critical Error wallet birthday ${error}`);
      // relaunch the interval tasks just in case they are aborted.
      this.setInRefresh(false);
      await this.clearTimers();
      await this.configure();
      this.fetchWalletBirthdayLock = false;
      return;
    }
  }

  // Fetch all T and Z and O ValueTransfers
  async fetchTandZandOValueTransfers() {
    try {
      if (this.fetchTandZandOValueTransfersLock) {
        return;
      }
      this.fetchTandZandOValueTransfersLock = true;
      const start = Date.now();
      const valueTransfersStr: string = await RPCModule.getValueTransfersList();
      console.log('=========================================== > value transfers - ', Date.now() - start);
      //console.log(valueTransfersStr);
      if (valueTransfersStr) {
        if (valueTransfersStr.toLowerCase().startsWith(GlobalConst.error)) {
          console.log(`Error value transfers ${valueTransfersStr}`);
          this.fetchTandZandOValueTransfersLock = false;
          return;
        }
      } else {
        console.log('Internal Error value transfers');
        this.fetchTandZandOValueTransfersLock = false;
        return;
      }
      const valueTransfersJSON: RPCValueTransfersType = await JSON.parse(valueTransfersStr);

      //console.log(valueTransfersJSON);

      let vtList: ValueTransferType[] = [];

      // oscar idea and I think it is the correct way to build the history of
      // value transfers.
      valueTransfersJSON &&
        valueTransfersJSON.value_transfers &&
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
              : vt.kind === RPCValueTransfersKindEnum.rejection
              ? ValueTransferKindEnum.Rejection
              : vt.kind;
          currentValueTransferList.fee = (!vt.transaction_fee ? 0 : vt.transaction_fee) / 10 ** 8;
          currentValueTransferList.zecPrice = !vt.zec_price ? 0 : vt.zec_price;
          if (
            vt.status === RPCValueTransfersStatusEnum.calculated ||
            vt.status === RPCValueTransfersStatusEnum.transmitted ||
            vt.status === RPCValueTransfersStatusEnum.mempool
          ) {
            currentValueTransferList.confirmations = 0;
          } else if (vt.status === RPCValueTransfersStatusEnum.confirmed) {
            currentValueTransferList.confirmations =
              this.lastServerBlockHeight && this.lastServerBlockHeight >= this.lastWalletBlockHeight
                ? this.lastServerBlockHeight - vt.blockheight + 1
                : this.lastWalletBlockHeight - vt.blockheight + 1;
          } else {
            // impossible case... I guess.
            currentValueTransferList.confirmations = 0;
          }
          currentValueTransferList.status = vt.status;
          currentValueTransferList.address = !vt.recipient_address ? undefined : vt.recipient_address;
          currentValueTransferList.amount = (!vt.value ? 0 : vt.value) / 10 ** 8;
          currentValueTransferList.memos =
            !vt.memos || vt.memos.length === 0 || !vt.memos.join('') ? undefined : vt.memos;
          currentValueTransferList.poolType = !vt.pool_received ? undefined : vt.pool_received;

          if (vt.txid.startsWith('xxxxxxxxx')) {
            console.log('valuetransfer zingolib: ', vt);
            console.log('valuetransfer zingo', currentValueTransferList);
            console.log('--------------------------------------------------');
          }
          //if (vt.status === RPCValueTransfersStatusEnum.calculated) {
          //  console.log('CALCULATED ))))))))))))))))))))))))))))))))))');
          //  console.log(vt);
          //}
          //if (vt.status === RPCValueTransfersStatusEnum.transmitted) {
          //  console.log('TRANSMITTED ))))))))))))))))))))))))))))))))))');
          //  console.log(vt);
          //}

          //console.log(currentValueTransferList);
          vtList.push(currentValueTransferList);
        });

      //console.log(vtlist);

      //const start2 = Date.now();
      this.fnSetValueTransfersList(vtList, vtList.length);
      //console.log('=========================================== > set value transfers - ', Date.now() - start2);
      this.fetchTandZandOValueTransfersLock = false;
    } catch (error) {
      console.log(`Critical Error txs list value transfers ${error}`);
      // relaunch the interval tasks just in case they are aborted.
      this.setInRefresh(false);
      await this.clearTimers();
      await this.configure();
      this.fetchTandZandOValueTransfersLock = false;
      return;
    }
  }

  // Fetch all T and Z and O ValueTransfers as a Messages
  async fetchTandZandOMessages() {
    try {
      if (this.fetchTandZandOMessagesLock) {
        return;
      }
      this.fetchTandZandOMessagesLock = true;
      const start = Date.now();
      const messagesStr: string = await RPCModule.getMessagesInfo('');
      console.log('=========================================== > messages - ', Date.now() - start);
      //console.log(messagesStr);
      if (messagesStr) {
        if (messagesStr.toLowerCase().startsWith(GlobalConst.error)) {
          console.log(`Error value transfers messages ${messagesStr}`);
          this.fetchTandZandOMessagesLock = false;
          return;
        }
      } else {
        console.log('Internal Error value transfers messages');
        this.fetchTandZandOMessagesLock = false;
        return;
      }
      const messagesJSON: RPCValueTransfersType = await JSON.parse(messagesStr);

      //console.log(valueTransfersJSON);

      let mList: ValueTransferType[] = [];

      // oscar idea and I think it is the correct way to build the history of
      // value transfers.
      messagesJSON &&
        messagesJSON.value_transfers &&
        messagesJSON.value_transfers.forEach((m: RPCValueTransferType) => {
          const currentMessageList: ValueTransferType = {} as ValueTransferType;

          currentMessageList.txid = m.txid;
          currentMessageList.time = m.datetime;
          currentMessageList.kind =
            m.kind === RPCValueTransfersKindEnum.memoToSelf
              ? ValueTransferKindEnum.MemoToSelf
              : m.kind === RPCValueTransfersKindEnum.sendToSelf
              ? ValueTransferKindEnum.SendToSelf
              : m.kind === RPCValueTransfersKindEnum.received
              ? ValueTransferKindEnum.Received
              : m.kind === RPCValueTransfersKindEnum.sent
              ? ValueTransferKindEnum.Sent
              : m.kind === RPCValueTransfersKindEnum.shield
              ? ValueTransferKindEnum.Shield
              : m.kind === RPCValueTransfersKindEnum.rejection
              ? ValueTransferKindEnum.Rejection
              : m.kind;
          currentMessageList.fee = (!m.transaction_fee ? 0 : m.transaction_fee) / 10 ** 8;
          currentMessageList.zecPrice = !m.zec_price ? 0 : m.zec_price;
          if (
            m.status === RPCValueTransfersStatusEnum.calculated ||
            m.status === RPCValueTransfersStatusEnum.transmitted ||
            m.status === RPCValueTransfersStatusEnum.mempool
          ) {
            currentMessageList.confirmations = 0;
          } else if (m.status === RPCValueTransfersStatusEnum.confirmed) {
            currentMessageList.confirmations =
              this.lastServerBlockHeight && this.lastServerBlockHeight >= this.lastWalletBlockHeight
                ? this.lastServerBlockHeight - m.blockheight + 1
                : this.lastWalletBlockHeight - m.blockheight + 1;
          } else {
            // impossible case... I guess.
            currentMessageList.confirmations = 0;
          }
          currentMessageList.status = m.status;
          currentMessageList.address = !m.recipient_address ? undefined : m.recipient_address;
          currentMessageList.amount = (!m.value ? 0 : m.value) / 10 ** 8;
          currentMessageList.memos = !m.memos || m.memos.length === 0 || !m.memos.join('') ? undefined : m.memos;
          currentMessageList.poolType = !m.pool_received ? undefined : m.pool_received;

          if (m.txid.startsWith('xxxxxxxxx')) {
            console.log('valuetransfer messages zingolib: ', m);
            console.log('valuetransfer messages zingo', currentMessageList);
            console.log('--------------------------------------------------');
          }
          //if (m.status === RPCValueTransfersStatusEnum.calculated) {
          //  console.log('CALCULATED ))))))))))))))))))))))))))))))))))');
          //  console.log(m);
          //}
          //if (m.status === RPCValueTransfersStatusEnum.transmitted) {
          //  console.log('TRANSMITTED ))))))))))))))))))))))))))))))))))');
          //  console.log(m);
          //}

          //console.log(currentValueTransferList);
          mList.push(currentMessageList);
        });

      //console.log(mlist);

      //const start2 = Date.now();
      this.fnSetMessagesList(mList, mList.length);
      //console.log('=========================================== > set messages - ', Date.now() - start2);
      this.fetchTandZandOMessagesLock = false;
    } catch (error) {
      console.log(`Critical Error txs list value transfers messages ${error}`);
      // relaunch the interval tasks just in case they are aborted.
      this.setInRefresh(false);
      await this.clearTimers();
      await this.configure();
      this.fetchTandZandOMessagesLock = false;
      return;
    }
  }

  // Send a transaction using the already constructed sendJson structure
  async sendTransaction(sendJson: Array<SendJsonToTypeType>): Promise<string> {
    const sendTxPromise = new Promise<string>(async (resolve, reject) => {
      // clear the timers - Tasks.
      await this.clearTimers();
      // sending
      this.setInSend(true);
      // keep awake the screen/device while sending.
      this.keepAwake(true);
      // sometimes we need the result of send as well
      let sendError: string = '';
      let sendTxids: string = '';
      try {
        console.log('send JSON', sendJson);
        // creating the propose
        const proposeStr: string = await RPCModule.execute(CommandEnum.send, JSON.stringify(sendJson));
        if (proposeStr) {
          if (proposeStr.toLowerCase().startsWith(GlobalConst.error)) {
            console.log(`Error propose ${proposeStr}`);
            sendError = proposeStr;
          }
        } else {
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
            // creating the transaction
            const sendStr: string = await RPCModule.execute(CommandEnum.confirm, '');
            if (sendStr) {
              if (sendStr.toLowerCase().startsWith(GlobalConst.error)) {
                console.log(`Error confirm ${sendStr}`);
                sendError = sendStr;
              }
            } else {
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

      // create the tasks
      await this.configure();
      this.setInSend(false);
      if (!this.inRefresh) {
        // if not syncing, then not keep awake the screen/device when the send is finished.
        this.keepAwake(false);
      } else {
        this.keepAwake(true);
      }

      if (sendTxids) {
        // And refresh data (full refresh)
        await this.refreshSync();
        //console.log('00000000 RESOLVE send');
        resolve(sendTxids);
        return;
      }
      if (sendError) {
        //console.log('00000000 REJECT send');
        reject(sendError);
        return;
      }
    });

    return sendTxPromise;
  }

  async changeWallet() {
    const exists = await RPCModule.walletExists();

    //console.log('jc change wallet', exists);
    if (exists && exists !== GlobalConst.false) {
      await this.pauseSyncProcess();
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
      await this.pauseSyncProcess();
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
        await this.pauseSyncProcess();
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
