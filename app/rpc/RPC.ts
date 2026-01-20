import {
  TotalBalanceClass,
  InfoType,
  SendJsonToTypeType,
  WalletType,
  TranslateType,
  ChainNameEnum,
  CurrencyNameEnum,
  AddressKindEnum,
  GlobalConst,
  ValueTransferType,
  UnifiedAddressClass,
  TransparentAddressClass,
  ValueTransferKindEnum,
  ServerType,
  StakeType,
} from '../AppState';
import RPCModule from '../RPCModule';
import { RPCUnifiedAddressType } from './types/RPCUnifiedAddressType';
import { RPCBalancesType } from './types/RPCBalancesType';
import { RPCInfoType } from './types/RPCInfoType';
import { RPCWalletHeight } from './types/RPCWalletHeightType';
import { RPCSeedType } from './types/RPCSeedType';
import { RPCSyncStatusType } from './types/RPCSyncStatusType';
import { RPCSendType } from './types/RPCSendType';
import { RPCValueTransfersType } from './types/RPCValueTransfersType';
import { RPCValueTransfersKindEnum } from './enums/RPCValueTransfersKindEnum';
import { RPCValueTransferType } from './types/RPCValueTransferType';
import { RPCValueTransfersStatusEnum } from './enums/RPCValueTransfersStatusEnum';
import { RPCSendProposeType } from './types/RPCSendProposeType';
import { RPCSyncPollType } from './types/RPCSyncPollType';
import { RPCZecPriceType } from './types/RPCZecPriceType';
import { RPCTransparentAddressType } from './types/RPCTransparentAddressType';
import { RPCSpendablebalanceType } from './types/RPCSpendablebalanceType';
import { RPCWalletSaveRequiredType } from './types/RPCWalletSaveRequiredType';
import { RPCConfigWalletPerformanceType } from './types/RPCConfigWalletPerformanceType';
import { RPCPerformanceLevelEnum } from './enums/RPCPerformanceLevelEnum';
import { RPCWalletVersionType } from './types/RPCWalletVersionType';
import { LoadingAppNavigationState } from '../types';
import { StakeJsonToTypeType } from '../AppState/types/ValueTransferType';

interface StakingActionType {
  kind: 'add' | 'sub' | 'clear' | 'move' | 'move_clear';
  val: number;
  target: string;
  source: string;
  insecureTargetName: string;
  insecureSourceName: string;
}

export default class RPC {
  fnSetInfo: (info: InfoType) => void;
  fnSetTotalBalance: (totalBalance: TotalBalanceClass) => void;
  fnSetStaked: (staked: StakeType[]) => void;
  fnSetGlobalStaked: (GlobalStaked: StakeType[]) => void;
  fnSetValueTransfersList: (vtList: ValueTransferType[], total: number) => void;
  fnSetMessagesList: (mList: ValueTransferType[], total: number) => void;
  fnSetAllAddresses: (
    allAddresses: (UnifiedAddressClass | TransparentAddressClass)[],
  ) => void;
  fnSetSyncingStatus: (syncingStatus: RPCSyncStatusType) => void;
  translate: (key: string) => TranslateType;
  keepAwake: (keep: boolean) => void;
  fnSetZingolib: (zingolib: string) => void;
  fnSetWallet: (wallet: WalletType) => void;
  fnSetLastError: (error: string) => void;
  fnOnClickOKChangeWallet: (state: LoadingAppNavigationState) => Promise<void>;

  updateTimerID?: NodeJS.Timeout;

  lastWalletBlockHeight: number;
  lastServerBlockHeight: number;
  walletBirthday: number;
  walletSeed: string;

  fetchWalletHeightLock: boolean;
  fetchWalletBirthdaySeedUfvkLock: boolean;
  fetchInfoAndServerHeightLock: boolean;
  fetchTandZandOValueTransfersLock: boolean;
  fetchTandZandOMessagesLock: boolean;
  fetchTotalBalanceLock: boolean;
  fetchStakedLock: boolean;
  fetchAddressesLock: boolean;
  refreshSyncLock: boolean;
  fetchSyncStatusLock: boolean;
  fetchSyncPollLock: boolean;
  fetchZingolibVersionLock: boolean;
  getWalletSaveRequiredLock: boolean;

  inSend: boolean;

  timers: NodeJS.Timeout[];

  readOnly: boolean;
  indexerServer: ServerType;
  performanceLevel: RPCPerformanceLevelEnum;

  walletConfigPerformanceLevel: RPCPerformanceLevelEnum | undefined;

  constructor(
    fnSetTotalBalance: (totalBalance: TotalBalanceClass) => void,
    fnSetStaked: (staked: StakeType[]) => void,
    fnSetGlobalStaked: (GlobalStaked: StakeType[]) => void,
    fnSetValueTransfersList: (
      vtlist: ValueTransferType[],
      total: number,
    ) => void,
    fnSetMessagesList: (mlist: ValueTransferType[], total: number) => void,
    fnSetAllAddresses: (
      addresses: (UnifiedAddressClass | TransparentAddressClass)[],
    ) => void,
    fnSetInfo: (info: InfoType) => void,
    fnSetSyncingStatus: (syncingStatus: RPCSyncStatusType) => void,
    translate: (key: string) => TranslateType,
    keepAwake: (keep: boolean) => void,
    fnSetZingolib: (zingolib: string) => void,
    fnSetWallet: (wallet: WalletType) => void,
    fnSetLastError: (error: string) => void,
    fnOnClickOKChangeWallet: (
      state: LoadingAppNavigationState,
    ) => Promise<void>,
    readOnly: boolean,
    indexerServer: ServerType,
    performanceLevel: RPCPerformanceLevelEnum,
  ) {
    this.fnSetTotalBalance = fnSetTotalBalance;
    this.fnSetStaked = fnSetStaked;
    this.fnSetGlobalStaked = fnSetGlobalStaked;
    this.fnSetValueTransfersList = fnSetValueTransfersList;
    this.fnSetMessagesList = fnSetMessagesList;
    this.fnSetAllAddresses = fnSetAllAddresses;
    this.fnSetInfo = fnSetInfo;
    this.fnSetSyncingStatus = fnSetSyncingStatus;
    this.translate = translate;
    this.keepAwake = keepAwake;
    this.fnSetZingolib = fnSetZingolib;
    this.fnSetWallet = fnSetWallet;
    this.fnSetLastError = fnSetLastError;
    this.fnOnClickOKChangeWallet = fnOnClickOKChangeWallet;

    this.lastWalletBlockHeight = 0;
    this.lastServerBlockHeight = 0;
    this.walletBirthday = 0;
    this.walletSeed = '';

    this.fetchWalletHeightLock = false;
    this.fetchWalletBirthdaySeedUfvkLock = false;
    this.fetchInfoAndServerHeightLock = false;
    this.fetchTandZandOValueTransfersLock = false;
    this.fetchTandZandOMessagesLock = false;
    this.fetchTotalBalanceLock = false;
    this.fetchStakedLock = false;
    this.fetchAddressesLock = false;
    this.refreshSyncLock = false;
    this.fetchSyncStatusLock = false;
    this.fetchSyncPollLock = false;
    this.fetchZingolibVersionLock = false;
    this.getWalletSaveRequiredLock = false;

    this.inSend = false;

    this.timers = [];

    this.readOnly = readOnly;
    this.indexerServer = indexerServer;
    this.performanceLevel = performanceLevel;
  }

  static async rpcGetZecPrice(
    withTOR: boolean,
  ): Promise<{ price: number; error: string }> {
    try {
      // create the tor client if needed
      if (withTOR) {
        const result: string = await RPCModule.createTorClientProcess();
        if (result && result.toLowerCase().startsWith(GlobalConst.error)) {
          console.log(`Create Tor client error: ${result}`);
        }
      }
      // values:
      // 0   - initial/default value
      // -1  - error in zingolib.
      // -2  - error in RPCModule, likely.
      // > 0 - real value
      const start = Date.now();
      const resultStr: string = await RPCModule.zecPriceInfo(
        withTOR ? GlobalConst.true : GlobalConst.false,
      );
      if (Date.now() - start > 4000) {
        console.log(
          '=========================================== > get ZEC price - ',
          Date.now() - start,
        );
      }
      //console.log(resultStr);

      if (resultStr) {
        if (resultStr.toLowerCase().startsWith(GlobalConst.error)) {
          console.log(`Error fetching price ${resultStr}`);
          return { price: -1, error: resultStr };
        } else {
          const resultJSON: RPCZecPriceType = await JSON.parse(resultStr);
          if (resultJSON.error) {
            console.log(`Error fetching price ${resultJSON.error}`);
            return { price: -1, error: resultJSON.error };
          }
          if (!resultJSON.current_price) {
            // if no exists the field or is empty
            return { price: 0, error: '' };
          }
          if (resultJSON.current_price && isNaN(resultJSON.current_price)) {
            console.log(`Error fetching price ${resultJSON.current_price}`);
            return {
              price: -1,
              error: `Error fetching price ${resultJSON.current_price}`,
            };
          } else {
            return { price: resultJSON.current_price, error: '' };
          }
        }
      } else {
        console.log('Internal Error fetching price');
        return { price: -2, error: 'Internal Error fetching price' };
      }
    } catch (error) {
      console.log(`Critical Error fetching price ${error}`);
      return { price: -2, error: `Critical Error fetching price ${error}` };
    }
  }

  static async rpcShieldFunds(): Promise<string> {
    try {
      const shieldStr: string = await RPCModule.confirmProcess();
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
        if (Date.now() - start > 4000) {
          console.log(
            '=========================================== > get ufvk - ',
            Date.now() - start,
          );
        }
        if (ufvkStr) {
          if (ufvkStr.toLowerCase().startsWith(GlobalConst.error)) {
            console.log(`Error ufvk ${ufvkStr}`);
            return {} as WalletType;
          }
        } else {
          console.log('Internal Error ufvk');
          return {} as WalletType;
        }
        const RPCufvk: WalletType = await JSON.parse(ufvkStr);

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
        if (Date.now() - start2 > 4000) {
          console.log(
            '=========================================== > get seed - ',
            Date.now() - start2,
          );
        }
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
        if (RPCseed.seed_phrase) {
          wallet.seed = RPCseed.seed_phrase;
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

  async runTaskPromises(): Promise<void> {
    //console.log('+++++++++++++++++ interval update 5 secs ALL', this.timers);
    this.sanitizeTimers();

    // this run only once.
    if (this.walletConfigPerformanceLevel !== this.performanceLevel) {
      const performance = await this.getConfigWalletPerformance();
      this.walletConfigPerformanceLevel = performance;
      console.log(
        '^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^ PERFORMANCE LEVEL',
        performance,
      );
      if (performance !== this.performanceLevel) {
        const setConfigWallet = await RPCModule.setConfigWalletToProdProcess(
          this.performanceLevel,
          GlobalConst.minConfirmations.toString(),
        );
        console.log(
          '^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^ SET CONFIG WALLET',
          setConfigWallet,
        );
        if (
          setConfigWallet &&
          setConfigWallet.toLowerCase().startsWith(GlobalConst.error)
        ) {
          this.fnSetLastError(`Set wallet to prod error: ${setConfigWallet}`);
        }
        // I need to be sure in this point that the performance level is the selected setting
        await RPCModule.doSave();
        const performanceChanged = await this.getConfigWalletPerformance();
        this.walletConfigPerformanceLevel = performanceChanged;
        console.log(
          '^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^ PERFORMANCE LEVEL CHANGED',
          performanceChanged,
        );
      }
    }

    const taskPromises: Promise<void>[] = [];

    // always the App have to fetch this. staked info.
    taskPromises.push(
      new Promise<void>(async resolve => {
        //const s = Date.now();
        await this.fetchStaked();
        //console.log('staked - ', Date.now() - s);
        resolve();
      }),
    );
    // same here. staked balance.
    taskPromises.push(
      new Promise<void>(async resolve => {
        //const s = Date.now();
        await this.fetchTotalBalance();
        //console.log('balance - ', Date.now() - s);
        resolve();
      }),
    );

    // if the wallet needs to save, means the App needs to fetch all the new data
    if (!(await this.getWalletSaveRequired())) {
      console.log('***************** NOT SAVE REQUIRED: No fetching data');
      // do need this because of the sync process
      taskPromises.push(
        new Promise<void>(async resolve => {
          await this.fetchSyncPoll();
          //console.log('INTERVAL poll sync');
          resolve();
        }),
      );
    } else {
      if (
        this.getWalletSaveRequiredLock ||
        this.fetchWalletHeightLock ||
        this.fetchWalletBirthdaySeedUfvkLock ||
        this.fetchInfoAndServerHeightLock ||
        this.fetchAddressesLock ||
        this.fetchTotalBalanceLock ||
        this.fetchTandZandOValueTransfersLock ||
        this.fetchTandZandOMessagesLock ||
        this.fetchSyncStatusLock ||
        this.fetchSyncPollLock ||
        this.fetchZingolibVersionLock ||
        this.refreshSyncLock
      ) {
        console.log('***************** LONG TASKS: No fetching data');
        // do need this because of the sync process
        taskPromises.push(
          new Promise<void>(async resolve => {
            await this.fetchSyncPoll();
            //console.log('INTERVAL poll sync');
            resolve();
          }),
        );
      } else {
        // do need this because of the sync process
        taskPromises.push(
          new Promise<void>(async resolve => {
            await this.fetchSyncPoll();
            //console.log('INTERVAL poll sync');
            resolve();
          }),
        );
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
            await this.fetchAddresses();
            //console.log('addresses - ', Date.now() - s);
            resolve();
          }),
        );
        // save the wallet as required.
        taskPromises.push(
          new Promise<void>(async resolve => {
            const start = Date.now();
            await RPCModule.doSave();
            if (Date.now() - start > 4000) {
              console.log(
                '=========================================== > save wallet - ',
                Date.now() - start,
              );
            }
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
      }
    }

    Promise.allSettled(taskPromises);
  }

  // this is only for the first time when the App is booting, but
  // there are more cases:
  // - LoadedApp mounting component.
  // - App go to Foreground.
  // - Internet from Not Connected to Connected.
  // - Server change.
  async configure(): Promise<void> {
    // takes a while to start
    await this.fetchTandZandOValueTransfers();
    await this.fetchAddresses();
    await this.fetchTotalBalance();
    await this.fetchStaked();
    await this.fetchInfoAndServerHeight();

    // I need to fetch this quickly.
    await this.fetchZingolibVersion();

    await this.fetchTandZandOMessages();
    await this.fetchWalletHeight();
    await this.fetchWalletBirthdaySeedUfvk();

    // every 5 seconds the App update part of the data
    if (!this.updateTimerID) {
      this.updateTimerID = setInterval(() => this.runTaskPromises(), 5 * 1000); // 5 secs
      //console.log('create update timer', this.updateVTTimerID);
      this.timers.push(this.updateTimerID);
    }

    await this.sanitizeTimers();
  }

  //sleep = (ms: number) => new Promise(r => setTimeout(r, ms));

  async pauseSyncProcess(): Promise<void> {
    let returnPause: string = await RPCModule.pauseSyncProcess();
    if (
      returnPause &&
      returnPause.toLowerCase().startsWith(GlobalConst.error)
    ) {
      console.log('SYNC PAUSE ERROR', returnPause);
      if (!returnPause.toLowerCase().includes('sync is not running')) {
        this.fnSetLastError(`Error sync pause: ${returnPause}`);
      }
      return;
    } else {
      console.log('pause sync process. PAUSED', returnPause);
    }
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
    //console.log('WALLET', this.lastWalletBlockHeight, 'SERVER', this.lastServerBlockHeight);

    if (this.refreshSyncLock && !fullRescan) {
      //console.log('REFRESH ----> in execution already');
      return;
    }
    this.refreshSyncLock = true;

    // the App can called `sync run` no matter what
    // this is handy to have the wallet fully synced
    // anytime.
    this.keepAwake(true);

    // This is async, so when it is done, we finish the refresh.
    if (fullRescan) {
      await this.clearTimers();
      // clean the ValueTransfer list before.
      //this.fnSetValueTransfersList([], 0);
      //this.fnSetMessagesList([], 0);
      //this.fnSetTotalBalance({
      //  totalOrchardBalance: 0,
      //  totalSaplingBalance: 0,
      //  totalTransparentBalance: 0,
      //  confirmedTransparentBalance: 0,
      //  confirmedOrchardBalance: 0,
      //  confirmedSaplingBalance: 0,
      //  totalSpendableBalance: 0,
      //} as TotalBalanceClass);
      //this.fnSetSyncingStatus({} as RPCSyncStatusType);

      // the rescan in zingolib do two tasks:
      // 1. stop the sync.
      // 2. launch the rescan.
      await this.pauseSyncProcess();

      const start = Date.now();
      const rescanStr: string = await RPCModule.runRescanProcess();
      if (Date.now() - start > 4000) {
        console.log(
          '=========================================== > rescan run command - ',
          Date.now() - start,
        );
      }
      console.log('rescan RUN', rescanStr);
      if (rescanStr && rescanStr.toLowerCase().startsWith(GlobalConst.error)) {
        console.log(`Error rescan: ${rescanStr}`);
        this.fnSetLastError(`Error rescan: ${rescanStr}`);
      }
      // The App needs to calculate heights

      await this.configure();
    } else {
      const start = Date.now();
      const syncStr: string = await RPCModule.runSyncProcess();
      if (Date.now() - start > 4000) {
        console.log(
          '=========================================== > sync run command - ',
          Date.now() - start,
        );
      }
      console.log('sync RUN', syncStr);
      if (syncStr && syncStr.toLowerCase().startsWith(GlobalConst.error)) {
        console.log(`Error sync: ${syncStr}`);
        if (!syncStr.toLowerCase().includes('sync is already running')) {
          this.fnSetLastError(`Error sync: ${syncStr}`);
        }
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
    const start = Date.now();
    const returnStatus: string = await RPCModule.statusSyncInfo();
    if (Date.now() - start > 4000) {
      console.log(
        '=========================================== > sync status command - ',
        Date.now() - start,
      );
    }
    if (
      returnStatus &&
      returnStatus.toLowerCase().startsWith(GlobalConst.error)
    ) {
      console.log('SYNC STATUS ERROR', returnStatus);
      this.fnSetLastError(`Error sync status: ${returnStatus}`);
      this.fetchSyncStatusLock = false;
      return;
    }
    let ss = {} as RPCSyncStatusType;
    try {
      ss = await JSON.parse(returnStatus);
    } catch (error) {
      console.log('SYNC STATUS ERROR - PARSE JSON', returnStatus, error);
      this.fnSetLastError(
        `Error sync status parse: ${error} value: ${returnStatus}`,
      );
      this.fetchSyncStatusLock = false;
      return;
    }

    //console.log('SYNC STATUS', ss);
    console.log(
      'SYNC STATUS',
      ss.scan_ranges?.length,
      ss.percentage_total_outputs_scanned,
      ss.percentage_total_blocks_scanned,
    );

    //console.log('interval sync/rescan, secs', this.secondsBatch, 'timer', this.syncStatusTimerID);

    // store SyncStatus object for a new screen
    this.fnSetSyncingStatus(ss as RPCSyncStatusType);

    // Close the poll timer if the sync finished(checked via promise above)
    const percentage: number =
      ss.percentage_total_outputs_scanned ||
      ss.percentage_total_blocks_scanned ||
      0;
    const inR: boolean =
      !!ss.scan_ranges && ss.scan_ranges.length > 0 && percentage < 100;
    if (!inR) {
      // here we can release the screen...
      this.keepAwake(false);
    }

    this.fetchSyncStatusLock = false;
  }

  // do not use it for now...
  async fetchSyncPoll(): Promise<void> {
    if (this.fetchSyncPollLock) {
      console.log('***************** SYNC POLL - locked');
      return;
    }
    this.fetchSyncPollLock = true;
    const start = Date.now();
    const returnPoll: string = await RPCModule.pollSyncInfo();
    if (Date.now() - start > 4000) {
      console.log(
        '=========================================== > sync poll command - ',
        Date.now() - start,
      );
    }
    if (returnPoll && returnPoll.toLowerCase().startsWith(GlobalConst.error)) {
      console.log('SYNC POLL ERROR', returnPoll);
      this.fnSetLastError(`Error sync poll: ${returnPoll}`);
      console.log(
        'HEIGHTS  ------- ',
        this.lastWalletBlockHeight,
        this.lastServerBlockHeight,
      );
      // if the error is: LightclientLockPoisoned force a rescan directly
      if (returnPoll.includes('LightclientLockPoisoned')) {
        let result: string = await RPCModule.loadExistingWallet(
          this.indexerServer.uri,
          this.indexerServer.chainName,
          this.performanceLevel,
          GlobalConst.minConfirmations.toString(),
        );
        console.log('POISONED ERROR RECOVERY', result);
        setTimeout(async () => {
          await this.refreshSync(true);
        }, 0);
      } else if (
        this.lastWalletBlockHeight - this.lastServerBlockHeight >= 100 ||
        returnPoll.includes('100 blocks ahead of best chain height')
      ) {
        // if the error is for the server vs wallet height.
        if (!this.walletSeed) {
          await this.fetchWalletBirthdaySeedUfvk();
        }
        console.log(
          '100 BLOCKS AHEAD RECOVERY',
          this.walletBirthday,
          this.walletSeed,
        );
        this.fnOnClickOKChangeWallet({
          screen: 0,
          startingApp: false,
          walletSeed: this.walletSeed,
          walletBirthday:
            this.walletBirthday > this.lastServerBlockHeight
              ? 1
              : this.walletBirthday,
        });
      } else {
        // This command have an error, fine. It's worthy to try running the sync process juat in case.
        setTimeout(async () => {
          await this.refreshSync();
        }, 0);
        setTimeout(async () => {
          await this.fetchSyncStatus();
        }, 0);
      }
      this.fetchSyncPollLock = false;
      return;
    }

    if (
      returnPoll.toLowerCase().startsWith('sync task has not been launched')
    ) {
      console.log('SYNC POLL -> RUN SYNC', returnPoll);
      setTimeout(async () => {
        await this.refreshSync();
      }, 0);
      this.fetchSyncPollLock = false;
      return;
    }

    if (returnPoll.toLowerCase().startsWith('sync task is not complete')) {
      console.log('SYNC POLL -> FETCH STATUS', returnPoll);
      setTimeout(async () => {
        await this.fetchSyncStatus();
      }, 0);
      console.log('SYNC POLL -> RUN SYNC', returnPoll);
      setTimeout(async () => {
        await this.refreshSync();
      }, 0);
      this.fetchSyncPollLock = false;
      return;
    }

    let sp = {} as RPCSyncPollType;
    try {
      sp = await JSON.parse(returnPoll);
    } catch (error) {
      console.log('SYNC POLL ERROR - PARSE JSON', returnPoll, error);
      this.fnSetLastError(
        `Error sync poll parse: ${error} value: ${returnPoll}`,
      );
      this.fetchSyncPollLock = false;
      return;
    }

    console.log('SYNC POLL', sp);

    console.log('SYNC POLL -> FETCH STATUS');
    setTimeout(async () => {
      await this.fetchSyncStatus();
    }, 0);

    this.fetchSyncPollLock = false;
  }

  async fetchInfoAndServerHeight(): Promise<void> {
    try {
      if (this.fetchInfoAndServerHeightLock) {
        return;
      }
      this.fetchInfoAndServerHeightLock = true;
      let infoError: boolean = false;
      const start = Date.now();
      const infoStr: string = await RPCModule.infoServerInfo();
      if (Date.now() - start > 4000) {
        console.log(
          '=========================================== > info - ',
          Date.now() - start,
        );
      }
      //console.log('INFO', infoStr);
      if (infoStr) {
        if (infoStr.toLowerCase().startsWith(GlobalConst.error)) {
          console.log(`Error info & server block height ${infoStr}`);
          this.fnSetLastError(`Error info: ${infoStr}`);
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
        currencyName:
          infoJSON.chain_name === ChainNameEnum.mainChainName
            ? CurrencyNameEnum.ZEC
            : CurrencyNameEnum.cTAZ,
      };

      this.fnSetInfo(info);
      this.lastServerBlockHeight = info.latestBlock;
      this.fetchInfoAndServerHeightLock = false;
    } catch (error) {
      console.log(`Critical Error info & server block height ${error}`);
      this.fnSetLastError(`Error info: ${error}`);
      // relaunch the interval tasks just in case they are aborted.
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
      if (Date.now() - start > 4000) {
        console.log(
          '=========================================== > zingolib version - ',
          Date.now() - start,
        );
      }
      if (zingolibStr) {
        if (zingolibStr.toLowerCase().startsWith(GlobalConst.error)) {
          console.log(`Error zingolib version ${zingolibStr}`);
          this.fnSetLastError(`Error zingolib version: ${zingolibStr}`);
          zingolibStr = GlobalConst.zingolibError;
        }
      } else {
        console.log('Internal Error zingolib version');
        zingolibStr = GlobalConst.zingolibNone;
      }

      this.fnSetZingolib(zingolibStr);
      this.fetchZingolibVersionLock = false;
    } catch (error) {
      console.log(`Critical Error zingolib version ${error}`);
      this.fnSetLastError(`Error zingolib version: ${error}`);
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
      const spendableStr: string =
        await RPCModule.getSpendableBalanceTotalInfo();
      if (Date.now() - start > 4000) {
        console.log(
          '=========================================== > spendable balance - ',
          Date.now() - start,
        );
      }
      //console.log(spendableStr);
      let spendableJSON: RPCSpendablebalanceType =
        {} as RPCSpendablebalanceType;
      if (spendableStr) {
        if (spendableStr.toLowerCase().startsWith(GlobalConst.error)) {
          console.log(`Error spendable balance ${spendableStr}`);
          this.fnSetLastError(`Error spendable balance: ${spendableStr}`);
        } else {
          spendableJSON = await JSON.parse(spendableStr);
        }
      } else {
        console.log('Internal Error spendable balance');
      }

      const start2 = Date.now();
      const balanceStr: string = await RPCModule.getBalanceInfo();
      if (Date.now() - start2 > 4000) {
        console.log(
          '=========================================== > balance - ',
          Date.now() - start2,
        );
      }
      if (balanceStr) {
        if (balanceStr.toLowerCase().startsWith(GlobalConst.error)) {
          console.log(`Error balance ${balanceStr}`);
          this.fnSetLastError(`Error balance: ${balanceStr}`);
          this.fetchTotalBalanceLock = false;
          return;
        }
      } else {
        console.log('Internal Error balance');
        this.fetchTotalBalanceLock = false;
        return;
      }
      const balanceJSON: RPCBalancesType = await JSON.parse(balanceStr);

      console.log('balance:', balanceJSON);

      // Total Balance
      const balance: TotalBalanceClass = {
        totalOrchardBalance: (balanceJSON.total_orchard_balance || 0) / 10 ** 8,
        totalSaplingBalance: (balanceJSON.total_sapling_balance || 0) / 10 ** 8,
        totalTransparentBalance:
          (balanceJSON.total_transparent_balance || 0) / 10 ** 8,
        confirmedOrchardBalance:
          (balanceJSON.confirmed_orchard_balance || 0) / 10 ** 8,
        confirmedSaplingBalance:
          (balanceJSON.confirmed_sapling_balance || 0) / 10 ** 8,
        confirmedTransparentBalance:
          (balanceJSON.confirmed_transparent_balance || 0) / 10 ** 8,
        // header total balance
        totalSpendableBalance: (spendableJSON.spendable_balance || 0) / 10 ** 8,
        //totalSpendableBalance: ((balanceJSON.confirmed_orchard_balance + balanceJSON.confirmed_sapling_balance) || 0) / 10 ** 8,
        stakedAmount: (balanceJSON.staked_amount || 0) / 10 ** 8,
      };
      //console.log(balance);
      this.fnSetTotalBalance(balance);
      this.fetchTotalBalanceLock = false;
    } catch (error) {
      console.log(`Critical Error balances ${error}`);
      this.fnSetLastError(`Error balance: ${error}`);
      // relaunch the interval tasks just in case they are aborted.
      await this.clearTimers();
      await this.configure();
      this.fetchTotalBalanceLock = false;
      return;
    }
  }

  async fetchStaked() {
    try {
      if (this.fetchStakedLock) return;
      this.fetchStakedLock = true;

      const rosterInfoStr: string = await RPCModule.getRosterInfoProcess();

      if (!rosterInfoStr) {
        this.fnSetLastError('Error roster_info: empty response');
        this.fetchStakedLock = false;
        return;
      }
      if (rosterInfoStr.toLowerCase().startsWith(GlobalConst.error)) {
        this.fnSetLastError(`Error roster_info: ${rosterInfoStr}`);
        this.fetchStakedLock = false;
        return;
      }

      const rosterInfo = JSON.parse(rosterInfoStr) as {
        members: Array<{
          pub_key: string;
          voting_power: number;
          txids?: any[];
        }>;
      };

      const globalStakedList: StakeType[] = (rosterInfo.members ?? []).map(
        m => ({
          pubKey: m.pub_key,
          votingPower: (m.voting_power || 0) / 10 ** 8,
        }),
      );

      const stakedList: StakeType[] = (rosterInfo.members ?? []).map(m => ({
        pubKey: m.pub_key,
        votingPower: (m.voting_power || 0) / 10 ** 8,
      }));

      this.fnSetStaked(stakedList);
      this.fnSetGlobalStaked(globalStakedList);

      this.fetchStakedLock = false;
    } catch (error) {
      console.log(`Critical Error staked ${error}`);
      this.fnSetLastError(`Error staked: ${error}`);
      await this.clearTimers();
      await this.configure();
      this.fetchStakedLock = false;
    }
  }

  // This method will get the total balances
  async fetchAddresses() {
    try {
      if (this.fetchAddressesLock) {
        return;
      }
      this.fetchAddressesLock = true;

      // UNIFIED
      const start = Date.now();
      const unifiedAddressesStr: string =
        await RPCModule.getUnifiedAddressesInfo();
      if (Date.now() - start > 4000) {
        console.log(
          '=========================================== > addresses unified - ',
          Date.now() - start,
        );
      }
      if (unifiedAddressesStr) {
        if (unifiedAddressesStr.toLowerCase().startsWith(GlobalConst.error)) {
          console.log(`Error addresses ${unifiedAddressesStr}`);
          this.fnSetLastError(
            `Error unified addresses: ${unifiedAddressesStr}`,
          );
          this.fetchAddressesLock = false;
          return;
        }
      } else {
        console.log('Internal Error addresses');
        this.fetchAddressesLock = false;
        return;
      }
      const unifiedAddressesJSON: RPCUnifiedAddressType[] =
        (await JSON.parse(unifiedAddressesStr)) || [];

      // TRANSPARENT
      const start2 = Date.now();
      const transparentAddressStr: string =
        await RPCModule.getTransparentAddressesInfo();
      if (Date.now() - start2 > 4000) {
        console.log(
          '=========================================== > addresses transparent - ',
          Date.now() - start2,
        );
      }
      if (transparentAddressStr) {
        if (transparentAddressStr.toLowerCase().startsWith(GlobalConst.error)) {
          console.log(`Error addresses ${transparentAddressStr}`);
          this.fnSetLastError(
            `Error transparent addresses: ${transparentAddressStr}`,
          );
          this.fetchAddressesLock = false;
          return;
        }
      } else {
        console.log('Internal Error addresses');
        this.fetchAddressesLock = false;
        return;
      }
      const transparentAddressesJSON: RPCTransparentAddressType[] =
        (await JSON.parse(transparentAddressStr)) || [];

      let allAddresses: (UnifiedAddressClass | TransparentAddressClass)[] = [];

      unifiedAddressesJSON &&
        unifiedAddressesJSON.forEach((u: RPCUnifiedAddressType) => {
          const ua: UnifiedAddressClass = new UnifiedAddressClass(
            u.address_index,
            u.encoded_address,
            AddressKindEnum.u,
            u.has_orchard,
            u.has_sapling,
            u.has_transparent,
          );
          allAddresses.push(ua);
        });

      transparentAddressesJSON &&
        transparentAddressesJSON.forEach((u: RPCTransparentAddressType) => {
          const t: TransparentAddressClass = new TransparentAddressClass(
            u.address_index,
            u.encoded_address,
            AddressKindEnum.t,
            u.scope,
          );
          allAddresses.push(t);
        });

      //console.log(allAddresses);

      this.fnSetAllAddresses(allAddresses);
      this.fetchAddressesLock = false;
    } catch (error) {
      console.log(`Critical Error addresses ${error}`);
      this.fnSetLastError(`Error addresses: ${error}`);
      // relaunch the interval tasks just in case they are aborted.
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
      if (Date.now() - start > 4000) {
        console.log(
          '=========================================== > wallet height - ',
          Date.now() - start,
        );
      }
      //console.log('WALLET HEIGHT', heightStr);
      if (heightStr) {
        if (heightStr.toLowerCase().startsWith(GlobalConst.error)) {
          console.log(`Error wallet height ${heightStr}`);
          this.fnSetLastError(`Error wallet height: ${heightStr}`);
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
      this.fnSetLastError(`Error wallet height: ${error}`);
      // relaunch the interval tasks just in case they are aborted.
      await this.clearTimers();
      await this.configure();
      this.fetchWalletHeightLock = false;
      return;
    }
  }

  async getWalletSaveRequired(): Promise<boolean> {
    try {
      if (this.getWalletSaveRequiredLock) {
        return false;
      }
      this.getWalletSaveRequiredLock = true;
      const start = Date.now();
      const walletSaveRequiredStr: string =
        await RPCModule.getWalletSaveRequiredInfo();
      if (Date.now() - start > 4000) {
        console.log(
          '=========================================== > wallet save required - ',
          Date.now() - start,
        );
      }
      if (walletSaveRequiredStr) {
        if (walletSaveRequiredStr.toLowerCase().startsWith(GlobalConst.error)) {
          console.log(`Error wallet save required ${walletSaveRequiredStr}`);
          this.fnSetLastError(
            `Error wallet save required: ${walletSaveRequiredStr}`,
          );
          this.getWalletSaveRequiredLock = false;
          return false;
        }
      } else {
        console.log('Internal Error wallet save required');
        this.getWalletSaveRequiredLock = false;
        return false;
      }
      const walletSaveRequiredJSON: RPCWalletSaveRequiredType =
        await JSON.parse(walletSaveRequiredStr);

      this.getWalletSaveRequiredLock = false;
      return walletSaveRequiredJSON.save_required;
    } catch (error) {
      console.log(`Critical Error wallet save required ${error}`);
      this.fnSetLastError(`Error wallet save required: ${error}`);
      this.getWalletSaveRequiredLock = false;
      return false;
    }
  }

  async getConfigWalletPerformance(): Promise<
    RPCPerformanceLevelEnum | undefined
  > {
    try {
      const start = Date.now();
      const configWalletPerformanceStr: string =
        await RPCModule.getConfigWalletPerformanceInfo();
      if (Date.now() - start > 4000) {
        console.log(
          '=========================================== > wallet config performance - ',
          Date.now() - start,
        );
      }
      if (configWalletPerformanceStr) {
        if (
          configWalletPerformanceStr.toLowerCase().startsWith(GlobalConst.error)
        ) {
          console.log(
            `Error wallet config performance ${configWalletPerformanceStr}`,
          );
          this.fnSetLastError(
            `Error wallet config performance: ${configWalletPerformanceStr}`,
          );
          return;
        }
      } else {
        console.log('Internal Error wallet config performance');
        return;
      }
      const configWalletPerformanceJSON: RPCConfigWalletPerformanceType =
        await JSON.parse(configWalletPerformanceStr);

      return configWalletPerformanceJSON.performance_level;
    } catch (error) {
      console.log(`Critical Error wallet config performance ${error}`);
      this.fnSetLastError(`Error wallet config performance: ${error}`);
      return;
    }
  }

  async getWalletVersion(): Promise<number | undefined> {
    try {
      const start = Date.now();
      const walletVersionStr: string = await RPCModule.getWalletVersionInfo();
      if (Date.now() - start > 4000) {
        console.log(
          '=========================================== > wallet version - ',
          Date.now() - start,
        );
      }
      if (walletVersionStr) {
        if (walletVersionStr.toLowerCase().startsWith(GlobalConst.error)) {
          console.log(`Error wallet version ${walletVersionStr}`);
          this.fnSetLastError(`Error wallet version: ${walletVersionStr}`);
          return;
        }
      } else {
        console.log('Internal Error wallet version');
        return;
      }
      const walletVersionJSON: RPCWalletVersionType =
        await JSON.parse(walletVersionStr);

      return walletVersionJSON.read_version;
    } catch (error) {
      console.log(`Critical Error wallet version ${error}`);
      this.fnSetLastError(`Error wallet version: ${error}`);
      return;
    }
  }

  async fetchWalletBirthdaySeedUfvk(): Promise<void> {
    try {
      if (this.fetchWalletBirthdaySeedUfvkLock) {
        return;
      }
      this.fetchWalletBirthdaySeedUfvkLock = true;
      const wallet = await RPC.rpcFetchWallet(this.readOnly);

      if (wallet) {
        this.walletBirthday = wallet.birthday;
        this.walletSeed = wallet.seed || '';
        this.fnSetWallet(wallet);
      }
      this.fetchWalletBirthdaySeedUfvkLock = false;
    } catch (error) {
      console.log(`Critical Error wallet birthday ${error}`);
      this.fnSetLastError(`Error wallet birthday: ${error}`);
      // relaunch the interval tasks just in case they are aborted.
      await this.clearTimers();
      await this.configure();
      this.fetchWalletBirthdaySeedUfvkLock = false;
      return;
    }
  }

  // Fetch all T and Z and O ValueTransfers
  async fetchTandZandOValueTransfers() {
    try {
      if (this.fetchTandZandOValueTransfersLock) {
        //console.log('VT LOCKKKKKKKKKKKKKKKKKKKKKKK');
        return;
      }
      this.fetchTandZandOValueTransfersLock = true;
      // first to get the last server block.
      const start = Date.now();
      const heightStr: string = await RPCModule.getLatestBlockServerInfo(
        this.indexerServer.uri,
      );
      if (Date.now() - start > 4000) {
        console.log(
          '=========================================== > server height - ',
          Date.now() - start,
        );
      }
      //console.log('GET SERVER HEIGHT', heightStr);
      if (heightStr) {
        if (heightStr.toLowerCase().startsWith(GlobalConst.error)) {
          console.log(`Error server height ${heightStr}`);
          this.fnSetLastError(`Error server height: ${heightStr}`);
        } else {
          this.lastServerBlockHeight = Number(heightStr);
        }
      } else {
        console.log('Internal Error server height');
      }

      //console.log('SERVER HEIGHT', this.lastServerBlockHeight);

      const start2 = Date.now();
      const valueTransfersStr: string = await RPCModule.getValueTransfersList();
      if (Date.now() - start2 > 4000) {
        console.log(
          '=========================================== > value transfers - ',
          Date.now() - start2,
        );
      }
      //console.log(valueTransfersStr);
      if (valueTransfersStr) {
        if (valueTransfersStr.toLowerCase().startsWith(GlobalConst.error)) {
          console.log(`Error value transfers ${valueTransfersStr}`);
          this.fnSetLastError(`Error value transfers: ${valueTransfersStr}`);
          this.fetchTandZandOValueTransfersLock = false;
          return;
        }
      } else {
        console.log('Internal Error value transfers');
        this.fetchTandZandOValueTransfersLock = false;
        return;
      }
      const valueTransfersJSON: RPCValueTransfersType =
        await JSON.parse(valueTransfersStr);

      //console.log(valueTransfersJSON.value_transfers);

      let vtList: ValueTransferType[] = [];

      // oscar idea and I think it is the correct way to build the history of
      // value transfers.
      valueTransfersJSON &&
        valueTransfersJSON.value_transfers &&
        valueTransfersJSON.value_transfers.forEach(
          (vt: RPCValueTransferType) => {
            const currentValueTransferList: ValueTransferType =
              {} as ValueTransferType;

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
            currentValueTransferList.fee =
              (!vt.transaction_fee ? 0 : vt.transaction_fee) / 10 ** 8;
            currentValueTransferList.zecPrice = !vt.zec_price
              ? 0
              : vt.zec_price;
            if (
              vt.status === RPCValueTransfersStatusEnum.calculated ||
              vt.status === RPCValueTransfersStatusEnum.transmitted ||
              vt.status === RPCValueTransfersStatusEnum.mempool
            ) {
              currentValueTransferList.confirmations = 0;
            } else if (vt.status === RPCValueTransfersStatusEnum.confirmed) {
              currentValueTransferList.confirmations =
                this.lastServerBlockHeight &&
                this.lastServerBlockHeight >= this.lastWalletBlockHeight
                  ? this.lastServerBlockHeight - vt.blockheight + 1
                  : this.lastWalletBlockHeight - vt.blockheight + 1;
            } else {
              // impossible case... I guess.
              currentValueTransferList.confirmations = 0;
            }
            currentValueTransferList.blockheight = vt.blockheight;
            currentValueTransferList.status = vt.status;
            currentValueTransferList.address = !vt.recipient_address
              ? undefined
              : vt.recipient_address;
            currentValueTransferList.amount =
              (!vt.value ? 0 : vt.value) / 10 ** 8;
            currentValueTransferList.memos =
              !vt.memos || vt.memos.length === 0 || !vt.memos.join('')
                ? undefined
                : vt.memos;
            currentValueTransferList.poolType = !vt.pool_received
              ? undefined
              : vt.pool_received;
            if (vt.staking_action === null) {
              currentValueTransferList.stakingAction = null;
            } else {
              currentValueTransferList.stakingAction = {
                kind: vt.staking_action?.kind,
                val:
                  (!vt.staking_action?.val ? 0 : vt.staking_action.val) /
                  10 ** 8,
                target: vt.staking_action?.target,
                source: vt.staking_action?.source,
                insecureTargetName: vt.staking_action?.insecure_target_name,
                insecureSourceName: vt.staking_action?.insecure_source_name,
              } as StakingActionType;
            }

            if (vt.txid.startsWith('xxxxxxxxx')) {
              console.log('server', this.lastServerBlockHeight);
              console.log('wallet', this.lastWalletBlockHeight);
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
          },
        );

      //console.log(vtList);

      this.fnSetValueTransfersList(vtList, vtList.length);
      this.fetchTandZandOValueTransfersLock = false;
    } catch (error) {
      console.log(`Critical Error value transfers ${error}`);
      this.fnSetLastError(`Error value transfers: ${error}`);
      // relaunch the interval tasks just in case they are aborted.
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
        //console.log('MESSAGES LOCKKKKKKKKKKKKKKKKKKKKKKK');
        return;
      }
      this.fetchTandZandOMessagesLock = true;
      const start = Date.now();
      const messagesStr: string = await RPCModule.getMessagesInfo('');
      if (Date.now() - start > 4000) {
        console.log(
          '=========================================== > messages - ',
          Date.now() - start,
        );
      }
      //console.log(messagesStr);
      if (messagesStr) {
        if (messagesStr.toLowerCase().startsWith(GlobalConst.error)) {
          console.log(`Error value transfers messages ${messagesStr}`);
          this.fnSetLastError(`Error value transfers messages: ${messagesStr}`);
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
          currentMessageList.fee =
            (!m.transaction_fee ? 0 : m.transaction_fee) / 10 ** 8;
          currentMessageList.zecPrice = !m.zec_price ? 0 : m.zec_price;
          if (
            m.status === RPCValueTransfersStatusEnum.calculated ||
            m.status === RPCValueTransfersStatusEnum.transmitted ||
            m.status === RPCValueTransfersStatusEnum.mempool
          ) {
            currentMessageList.confirmations = 0;
          } else if (m.status === RPCValueTransfersStatusEnum.confirmed) {
            currentMessageList.confirmations =
              this.lastServerBlockHeight &&
              this.lastServerBlockHeight >= this.lastWalletBlockHeight
                ? this.lastServerBlockHeight - m.blockheight + 1
                : this.lastWalletBlockHeight - m.blockheight + 1;
          } else {
            // impossible case... I guess.
            currentMessageList.confirmations = 0;
          }
          currentMessageList.blockheight = m.blockheight;
          currentMessageList.status = m.status;
          currentMessageList.address = !m.recipient_address
            ? undefined
            : m.recipient_address;
          currentMessageList.amount = (!m.value ? 0 : m.value) / 10 ** 8;
          currentMessageList.memos =
            !m.memos || m.memos.length === 0 || !m.memos.join('')
              ? undefined
              : m.memos;
          currentMessageList.poolType = !m.pool_received
            ? undefined
            : m.pool_received;

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

      this.fnSetMessagesList(mList, mList.length);
      this.fetchTandZandOMessagesLock = false;
    } catch (error) {
      console.log(`Critical Error value transfers messages ${error}`);
      this.fnSetLastError(`Error value transfers messages: ${error}`);
      // relaunch the interval tasks just in case they are aborted.
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
        const proposeStr: string = await RPCModule.sendProcess(
          JSON.stringify(sendJson),
        );
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
            const sendStr: string = await RPCModule.confirmProcess();
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

      await this.refreshSync();

      if (sendTxids) {
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

  // Send a staking transaction using the already constructed stakeJson structure
  async sendStakingTransaction(
    stakeJson: StakeJsonToTypeType,
  ): Promise<string> {
    const sendTxPromise = new Promise<string>(async (resolve, reject) => {
      await this.clearTimers();
      this.setInSend(true);
      this.keepAwake(true);

      let sendError = '';
      let sendTxids = '';

      try {
        console.log('stake JSON', stakeJson);
        const proposeStr: string = await RPCModule.stakeProcess(
          JSON.stringify(stakeJson),
        );

        if (proposeStr) {
          if (proposeStr.toLowerCase().startsWith(GlobalConst.error)) {
            console.log(`Error stake propose ${proposeStr}`);
            sendError = proposeStr;
          }
        } else {
          console.log('Internal Error stake propose');
          sendError = 'Error: Internal RPC Error: stake propose';
        }

        if (!sendError) {
          const proposeJSON: RPCSendProposeType = await JSON.parse(proposeStr);
          if (proposeJSON.error) {
            console.log(`Error stake propose ${proposeJSON.error}`);
            sendError = proposeJSON.error;
          }

          if (!sendError) {
            const sendStr: string = await RPCModule.confirmProcess();
            if (sendStr) {
              if (sendStr.toLowerCase().startsWith(GlobalConst.error)) {
                console.log(`Error stake confirm ${sendStr}`);
                sendError = sendStr;
              }
            } else {
              console.log('Internal Error stake confirm');
              sendError = 'Error: Internal RPC Error: stake confirm';
            }

            if (!sendError) {
              const sendJSON: RPCSendType = await JSON.parse(sendStr);
              if (sendJSON.error) {
                console.log(`Error stake confirm ${sendJSON.error}`);
                sendError = sendJSON.error;
              } else if (sendJSON.txids && sendJSON.txids.length > 0) {
                sendTxids = sendJSON.txids.join(', ');
              }
            }
          }
        }
      } catch (error) {
        console.log(`Critical Error stake ${error}`);
        sendError = `Error: stake ${error}`;
      }

      await this.configure();
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

  async changeWallet() {
    const exists = await RPCModule.walletExists();

    //console.log('jc change wallet', exists);
    if (exists && exists !== GlobalConst.false) {
      await this.pauseSyncProcess();
      await RPCModule.doSaveBackup();
      const result = await RPCModule.deleteExistingWallet();

      if (!(result && result !== GlobalConst.false)) {
        return this.translate('rpc.deletewallet-error') as string;
      }
    } else {
      return this.translate('rpc.walletnotfound-error') as string;
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
        return this.translate('rpc.deletewallet-error') as string;
      }
    } else {
      return this.translate('rpc.walletnotfound-error') as string;
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
        return this.translate('rpc.walletnotfound-error') as string;
      }
    } else {
      return this.translate('rpc.backupnotfound-error') as string;
    }
    return '';
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
