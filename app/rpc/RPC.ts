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

export default class RPC {
  fnSetInfo: (info: InfoType) => void;
  fnSetTotalBalance: (totalBalance: TotalBalanceClass) => void;
  fnSetValueTransfersList: (vtList: ValueTransferType[], total: number) => void;
  fnSetMessagesList: (mList: ValueTransferType[], total: number) => void;
  fnSetAllAddresses: (
    allAddresses: (UnifiedAddressClass | TransparentAddressClass)[],
  ) => void;
  fnSetSyncingStatus: (syncingStatus: RPCSyncStatusType) => void;
  translate: (key: string) => TranslateType;
  keepAwake: (keep: boolean) => void;
  fnSetZingolib: (zingolib: string) => void;
  fnSetBirthday: (birthday: number) => void;
  fnSetLastError: (error: string) => void;

  updateTimerID?: NodeJS.Timeout;

  lastWalletBlockHeight: number;
  lastServerBlockHeight: number;
  walletBirthday: number;

  fetchWalletHeightLock: boolean;
  fetchWalletBirthdaySeedUfvkLock: boolean;
  fetchInfoAndServerHeightLock: boolean;
  fetchTandZandOValueTransfersLock: boolean;
  fetchTandZandOMessagesLock: boolean;
  fetchTotalBalanceLock: boolean;
  fetchAddressesLock: boolean;
  refreshSyncLock: boolean;
  fetchSyncStatusLock: boolean;
  fetchSyncPollLock: boolean;
  fetchZingolibVersionLock: boolean;
  getWalletSaveRequiredLock: boolean;

  inSend: boolean;

  timers: NodeJS.Timeout[];

  readOnly: boolean;
  server: ServerType;
  performanceLevel: RPCPerformanceLevelEnum;

  walletConfigPerformanceLevel: RPCPerformanceLevelEnum | undefined;

  constructor(
    fnSetTotalBalance: (totalBalance: TotalBalanceClass) => void,
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
    fnSetBirthday: (birthday: number) => void,
    fnSetLastError: (error: string) => void,
    readOnly: boolean,
    server: ServerType,
    performanceLevel: RPCPerformanceLevelEnum,
  ) {
    this.fnSetTotalBalance = fnSetTotalBalance;
    this.fnSetValueTransfersList = fnSetValueTransfersList;
    this.fnSetMessagesList = fnSetMessagesList;
    this.fnSetAllAddresses = fnSetAllAddresses;
    this.fnSetInfo = fnSetInfo;
    this.fnSetSyncingStatus = fnSetSyncingStatus;
    this.translate = translate;
    this.keepAwake = keepAwake;
    this.fnSetZingolib = fnSetZingolib;
    this.fnSetBirthday = fnSetBirthday;
    this.fnSetLastError = fnSetLastError;

    this.lastWalletBlockHeight = 0;
    this.lastServerBlockHeight = 0;
    this.walletBirthday = 0;

    this.fetchWalletHeightLock = false;
    this.fetchWalletBirthdaySeedUfvkLock = false;
    this.fetchInfoAndServerHeightLock = false;
    this.fetchTandZandOValueTransfersLock = false;
    this.fetchTandZandOMessagesLock = false;
    this.fetchTotalBalanceLock = false;
    this.fetchAddressesLock = false;
    this.refreshSyncLock = false;
    this.fetchSyncStatusLock = false;
    this.fetchSyncPollLock = false;
    this.fetchZingolibVersionLock = false;
    this.getWalletSaveRequiredLock = false;

    this.inSend = false;

    this.timers = [];

    this.readOnly = readOnly;
    this.server = server;
    this.performanceLevel = performanceLevel;
  }

  static async rpcGetZecPrice(
    withTOR: boolean,
  ): Promise<{ price: number; error: string }> {
    try {
      if (withTOR) {
        // create the tor client if needed
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

  static async rpcFetchWallet(readOnly: boolean): Promise<WalletType | null> {
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
            return null;
          }
        } else {
          console.log('Internal Error ufvk');
          return null;
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
        return null;
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
            return null;
          }
        } else {
          console.log('Internal Error seed');
          return null;
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
        return null;
      }
    }
  }

  async runTaskPromises(): Promise<void> {
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

    // if the wallet needs to save, means the App needs to fetch all the new data
    if (!(await this.getWalletSaveRequired())) {
      console.log('***************** NOT SAVE REQUIRED: No fetching data');
      taskPromises.push(this.fetchSyncPoll());
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
        taskPromises.push(this.fetchSyncPoll());
      } else {
        taskPromises.push(this.fetchSyncPoll());
        taskPromises.push(this.fetchWalletHeight());
        taskPromises.push(this.fetchWalletBirthdaySeedUfvk());
        taskPromises.push(this.fetchInfoAndServerHeight());
        taskPromises.push(this.fetchAddresses());
        taskPromises.push(this.fetchTotalBalance());
        // save the wallet as required.
        taskPromises.push(
          (async () => {
            const start = Date.now();
            await RPCModule.doSave();
            if (Date.now() - start > 4000) {
              console.log(
                '=========================================== > save wallet - ',
                Date.now() - start,
              );
            }
          })(),
        );
        taskPromises.push(this.fetchTandZandOValueTransfers());
        taskPromises.push(this.fetchTandZandOMessages());
      }
    }

    await Promise.allSettled(taskPromises);
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
    await this.fetchInfoAndServerHeight();

    // I need to fetch this quickly.
    await this.fetchZingolibVersion();

    await this.fetchTandZandOMessages();
    await this.fetchWalletHeight();
    await this.fetchWalletBirthdaySeedUfvk();

    // every 5 seconds the App update part of the data
    if (!this.updateTimerID) {
      this.updateTimerID = setInterval(() => this.runTaskPromises(), 5 * 1000); // 5 secs
      this.timers.push(this.updateTimerID);
    }

    await this.sanitizeTimers();
  }

  //sleep = (ms: number) => new Promise(r => setTimeout(r, ms));

  async pauseSyncProcess(): Promise<void> {
    try {
      let returnPause: string = await RPCModule.pauseSyncProcess();
      if (
        returnPause &&
        returnPause.toLowerCase().startsWith(GlobalConst.error)
      ) {
        console.log('SYNC PAUSE ERROR', returnPause);
        this.fnSetLastError(`Error sync pause: ${returnPause}`);
      } else {
        console.log('pause sync process. PAUSED', returnPause);
      }
    } catch (error) {
      console.log(`Critical Error pause sync ${error}`);
    }
  }

  async clearTimers(): Promise<void> {
    if (this.updateTimerID) {
      clearInterval(this.updateTimerID);
      this.updateTimerID = undefined;
    }

    // and now the array of timers...
    while (this.timers.length > 0) {
      const inter = this.timers.pop();
      clearInterval(inter);
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
      }
    }
    // remove the cleared timers.
    for (var i = 0; i < deleted.length; i++) {
      this.timers.splice(deleted[i], 1);
    }
  }

  async refreshSync(fullRescan?: boolean) {
    if (this.refreshSyncLock && !fullRescan) {
      return;
    }
    this.refreshSyncLock = true;
    try {
      // the App can called `sync run` no matter what
      // this is handy to have the wallet fully synced
      // anytime.
      this.keepAwake(true);

      // This is async, so when it is done, we finish the refresh.
      if (fullRescan) {
        await this.clearTimers();
        // clean the ValueTransfer list before.
        this.fnSetValueTransfersList([], 0);
        this.fnSetMessagesList([], 0);
        this.fnSetTotalBalance({
          totalOrchardBalance: 0,
          totalSaplingBalance: 0,
          totalTransparentBalance: 0,
          confirmedTransparentBalance: 0,
          confirmedOrchardBalance: 0,
          confirmedSaplingBalance: 0,
          totalSpendableBalance: 0,
        } as TotalBalanceClass);
        this.fnSetSyncingStatus({} as RPCSyncStatusType);

        const start = Date.now();
        const rescanStr: string = await RPCModule.runRescanProcess();
        if (Date.now() - start > 4000) {
          console.log(
            '=========================================== > rescan run command - ',
            Date.now() - start,
          );
        }
        if (
          rescanStr &&
          rescanStr.toLowerCase().startsWith(GlobalConst.error)
        ) {
          console.log(`Error rescan: ${rescanStr}`);
          this.fnSetLastError(`Error rescan: ${rescanStr}`);
        }
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
          this.fnSetLastError(`Error sync: ${syncStr}`);
        }
      }
    } catch (error) {
      console.log(`Critical Error sync/rescan run ${error}`);
    } finally {
      this.refreshSyncLock = false;
    }
  }

  async fetchSyncStatus(): Promise<void> {
    if (this.fetchSyncStatusLock) {
      return;
    }
    this.fetchSyncStatusLock = true;
    try {
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
        return;
      }

      console.log(
        'SYNC STATUS',
        ss.scan_ranges?.length,
        ss.percentage_total_outputs_scanned,
        ss.percentage_total_blocks_scanned,
      );

      // avoiding 0.00, minimum 0.01, maximun 100
      // fixing when is:
      // - 0.00000000123 (rounded 0)     better: 0.01  than 0
      // - 99.9999999123 (rounded 99.99) better: 99.99 than 100.
      ss.percentage_total_outputs_scanned =
        ss.percentage_total_outputs_scanned &&
        ss.percentage_total_outputs_scanned < 0.01
          ? 0.01
          : ss.percentage_total_outputs_scanned &&
              ss.percentage_total_outputs_scanned > 99.99 &&
              ss.percentage_total_outputs_scanned < 100
            ? 99.99
            : Number(ss.percentage_total_outputs_scanned?.toFixed(2));

      ss.percentage_total_blocks_scanned =
        ss.percentage_total_blocks_scanned &&
        ss.percentage_total_blocks_scanned < 0.01
          ? 0.01
          : ss.percentage_total_blocks_scanned &&
              ss.percentage_total_blocks_scanned > 99.99 &&
              ss.percentage_total_blocks_scanned < 100
            ? 99.99
            : Number(ss.percentage_total_blocks_scanned?.toFixed(2));

      // Close the poll timer if the sync finished(checked via promise above)
      const inR: boolean =
        !!ss.scan_ranges &&
        ss.scan_ranges.length > 0 &&
        (ss.percentage_total_outputs_scanned ??
          ss.percentage_total_blocks_scanned ??
          0) < 100;
      if (!inR) {
        // here we can release the screen...
        this.keepAwake(false);
      } else {
        this.keepAwake(true);
      }

      // store SyncStatus object for a new screen
      this.fnSetSyncingStatus(ss as RPCSyncStatusType);
    } catch (error) {
      console.log(`Critical Error sync status ${error}`);
    } finally {
      this.fetchSyncStatusLock = false;
    }
  }

  async fetchSyncPoll(): Promise<void> {
    if (this.fetchSyncPollLock) {
      console.log('***************** SYNC POLL - locked');
      return;
    }
    this.fetchSyncPollLock = true;
    try {
      const start = Date.now();
      const returnPoll: string = await RPCModule.pollSyncInfo();
      if (Date.now() - start > 4000) {
        console.log(
          '=========================================== > sync poll command - ',
          Date.now() - start,
        );
      }
      if (
        returnPoll &&
        returnPoll.toLowerCase().startsWith(GlobalConst.error)
      ) {
        console.log('SYNC POLL ERROR', returnPoll);
        this.fnSetLastError(`Error sync poll: ${returnPoll}`);
        return;
      }

      if (
        returnPoll.toLowerCase().startsWith('sync task has not been launched')
      ) {
        console.log('SYNC POLL -> RUN SYNC', returnPoll);
        setTimeout(async () => {
          await this.refreshSync();
        }, 0);
        return;
      }

      if (returnPoll.toLowerCase().startsWith('sync task is not complete')) {
        console.log('SYNC POLL -> FETCH STATUS', returnPoll);
        setTimeout(async () => {
          await this.fetchSyncStatus();
        }, 0);
        console.log('SYNC POLL -> RUN SYNC', returnPoll);
        // I don't trust in this message, when the tx is stuck in Trasmitted
        // this is the message I got & after that the status says 100% complete
        // this is not true, here Just in case, I need to run the sync again.
        setTimeout(async () => {
          await this.refreshSync();
        }, 0);
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
        return;
      }

      // avoiding 0.00, minimum 0.01, maximun 100
      // fixing when is:
      // - 0.00000000123 (rounded 0)     better: 0.01  than 0
      // - 99.9999999123 (rounded 99.99) better: 99.99 than 100.
      sp.sync_complete.percentage_total_outputs_scanned =
        sp.sync_complete.percentage_total_outputs_scanned &&
        sp.sync_complete.percentage_total_outputs_scanned < 0.01
          ? 0.01
          : sp.sync_complete.percentage_total_outputs_scanned &&
              sp.sync_complete.percentage_total_outputs_scanned > 99.99 &&
              sp.sync_complete.percentage_total_outputs_scanned < 100
            ? 99.99
            : Number(
                sp.sync_complete.percentage_total_outputs_scanned?.toFixed(2),
              );

      const inR: boolean =
        (sp.sync_complete.percentage_total_outputs_scanned ?? 0) < 100;
      if (!inR) {
        // here we can release the screen...
        this.keepAwake(false);
      } else {
        this.keepAwake(true);
      }

      console.log('SYNC POLL', sp);

      console.log('SYNC POLL -> FETCH STATUS');
      setTimeout(async () => {
        await this.fetchSyncStatus();
      }, 0);
    } catch (error) {
      console.log(`Critical Error sync poll ${error}`);
    } finally {
      this.fetchSyncPollLock = false;
    }
  }

  async fetchInfoAndServerHeight(): Promise<void> {
    if (this.fetchInfoAndServerHeightLock) {
      return;
    }
    this.fetchInfoAndServerHeightLock = true;
    try {
      let infoError: boolean = false;
      const start = Date.now();
      const infoStr: string = await RPCModule.infoServerInfo();
      if (Date.now() - start > 4000) {
        console.log(
          '=========================================== > info - ',
          Date.now() - start,
        );
      }
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
        return;
      }

      let infoJSON = {} as RPCInfoType;
      try {
        infoJSON = await JSON.parse(infoStr);
      } catch (error) {
        console.log('INFO PARSE JSON ERROR', infoStr, error);
        this.fnSetLastError(`Error info parse: ${error} value: ${infoStr}`);
        this.fnSetInfo({
          latestBlock: 0,
          serverUri: '',
          version: '',
        } as InfoType);
        this.lastServerBlockHeight = 0;
        return;
      }

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
            : CurrencyNameEnum.TAZ,
      };

      this.fnSetInfo(info);
      this.lastServerBlockHeight = info.latestBlock;
    } catch (error) {
      console.log(`Critical Error info & server block height ${error}`);
      this.fnSetLastError(`Error info: ${error}`);
      // relaunch the interval tasks just in case they are aborted.
      await this.clearTimers();
      await this.configure();
    } finally {
      this.fetchInfoAndServerHeightLock = false;
    }
  }

  async fetchZingolibVersion(): Promise<void> {
    if (this.fetchZingolibVersionLock) {
      return;
    }
    this.fetchZingolibVersionLock = true;
    try {
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
    } catch (error) {
      console.log(`Critical Error zingolib version ${error}`);
      this.fnSetLastError(`Error zingolib version: ${error}`);
    } finally {
      this.fetchZingolibVersionLock = false;
    }
  }

  // This method will get the total balances
  async fetchTotalBalance() {
    if (this.fetchTotalBalanceLock) {
      return;
    }
    this.fetchTotalBalanceLock = true;
    try {
      const start = Date.now();
      const spendableStr: string =
        await RPCModule.getSpendableBalanceTotalInfo();
      if (Date.now() - start > 4000) {
        console.log(
          '=========================================== > spendable balance - ',
          Date.now() - start,
        );
      }
      let spendableJSON: RPCSpendablebalanceType =
        {} as RPCSpendablebalanceType;
      if (spendableStr) {
        if (spendableStr.toLowerCase().startsWith(GlobalConst.error)) {
          console.log(`Error spendable balance ${spendableStr}`);
          this.fnSetLastError(`Error spendable balance: ${spendableStr}`);
        } else {
          try {
            spendableJSON = await JSON.parse(spendableStr);
          } catch (error) {
            console.log(
              'SPENDABLE BALANCE PARSE JSON ERROR',
              spendableStr,
              error,
            );
            this.fnSetLastError(
              `Error spendable balance parse: ${error} value: ${spendableStr}`,
            );
          }
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
          return;
        }
      } else {
        console.log('Internal Error balance');
        return;
      }
      let balanceJSON = {} as RPCBalancesType;
      try {
        balanceJSON = await JSON.parse(balanceStr);
      } catch (error) {
        console.log('BALANCE PARSE JSON ERROR', balanceStr, error);
        this.fnSetLastError(
          `Error balance parse: ${error} value: ${balanceStr}`,
        );
        return;
      }

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
      };
      this.fnSetTotalBalance(balance);
    } catch (error) {
      console.log(`Critical Error balances ${error}`);
      this.fnSetLastError(`Error balance: ${error}`);
      // relaunch the interval tasks just in case they are aborted.
      await this.clearTimers();
      await this.configure();
    } finally {
      this.fetchTotalBalanceLock = false;
    }
  }

  // This method will get the total balances
  async fetchAddresses() {
    if (this.fetchAddressesLock) {
      return;
    }
    this.fetchAddressesLock = true;
    try {
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
          return;
        }
      } else {
        console.log('Internal Error addresses');
        return;
      }
      let unifiedAddressesJSON: RPCUnifiedAddressType[] = [];
      try {
        unifiedAddressesJSON = (await JSON.parse(unifiedAddressesStr)) || [];
      } catch (error) {
        console.log(
          'UNIFIED ADDRESSES PARSE JSON ERROR',
          unifiedAddressesStr,
          error,
        );
        this.fnSetLastError(
          `Error unified addresses parse: ${error} value: ${unifiedAddressesStr}`,
        );
        return;
      }

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
          return;
        }
      } else {
        console.log('Internal Error addresses');
        return;
      }
      let transparentAddressesJSON: RPCTransparentAddressType[] = [];
      try {
        transparentAddressesJSON =
          (await JSON.parse(transparentAddressStr)) || [];
      } catch (error) {
        console.log(
          'TRANSPARENT ADDRESSES PARSE JSON ERROR',
          transparentAddressStr,
          error,
        );
        this.fnSetLastError(
          `Error transparent addresses parse: ${error} value: ${transparentAddressStr}`,
        );
        return;
      }

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

      this.fnSetAllAddresses(allAddresses);
    } catch (error) {
      console.log(`Critical Error addresses ${error}`);
      this.fnSetLastError(`Error addresses: ${error}`);
      // relaunch the interval tasks just in case they are aborted.
      await this.clearTimers();
      await this.configure();
    } finally {
      this.fetchAddressesLock = false;
    }
  }

  async fetchWalletHeight(): Promise<void> {
    if (this.fetchWalletHeightLock) {
      return;
    }
    this.fetchWalletHeightLock = true;
    try {
      const start = Date.now();
      const heightStr: string = await RPCModule.getLatestBlockWalletInfo();
      if (Date.now() - start > 4000) {
        console.log(
          '=========================================== > wallet height - ',
          Date.now() - start,
        );
      }
      if (heightStr) {
        if (heightStr.toLowerCase().startsWith(GlobalConst.error)) {
          console.log(`Error wallet height ${heightStr}`);
          this.fnSetLastError(`Error wallet height: ${heightStr}`);
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
      this.fnSetLastError(`Error wallet height: ${error}`);
      // relaunch the interval tasks just in case they are aborted.
      await this.clearTimers();
      await this.configure();
    } finally {
      this.fetchWalletHeightLock = false;
    }
  }

  async getWalletSaveRequired(): Promise<boolean> {
    if (this.getWalletSaveRequiredLock) {
      return false;
    }
    this.getWalletSaveRequiredLock = true;
    try {
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
          return false;
        }
      } else {
        console.log('Internal Error wallet save required');
        return false;
      }
      const walletSaveRequiredJSON: RPCWalletSaveRequiredType =
        await JSON.parse(walletSaveRequiredStr);

      return walletSaveRequiredJSON.save_required;
    } catch (error) {
      console.log(`Critical Error wallet save required ${error}`);
      this.fnSetLastError(`Error wallet save required: ${error}`);
      return false;
    } finally {
      this.getWalletSaveRequiredLock = false;
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
    if (this.fetchWalletBirthdaySeedUfvkLock) {
      return;
    }
    this.fetchWalletBirthdaySeedUfvkLock = true;
    try {
      const wallet = await RPC.rpcFetchWallet(this.readOnly);

      if (wallet) {
        this.walletBirthday = wallet.birthday;
        this.fnSetBirthday(wallet.birthday || 0);
      }
    } catch (error) {
      console.log(`Critical Error wallet birthday ${error}`);
      this.fnSetLastError(`Error wallet birthday: ${error}`);
      // relaunch the interval tasks just in case they are aborted.
      await this.clearTimers();
      await this.configure();
    } finally {
      this.fetchWalletBirthdaySeedUfvkLock = false;
    }
  }

  // Fetch all T and Z and O ValueTransfers
  async fetchTandZandOValueTransfers() {
    if (this.fetchTandZandOValueTransfersLock) {
      return;
    }
    this.fetchTandZandOValueTransfersLock = true;
    try {
      // first to get the last server block.
      const start = Date.now();
      const heightStr: string = await RPCModule.getLatestBlockServerInfo(
        this.server.uri,
      );
      if (Date.now() - start > 4000) {
        console.log(
          '=========================================== > server height - ',
          Date.now() - start,
        );
      }
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

      const start2 = Date.now();
      const valueTransfersStr: string = await RPCModule.getValueTransfersList();
      if (Date.now() - start2 > 4000) {
        console.log(
          '=========================================== > value transfers - ',
          Date.now() - start2,
        );
      }
      if (valueTransfersStr) {
        if (valueTransfersStr.toLowerCase().startsWith(GlobalConst.error)) {
          console.log(`Error value transfers ${valueTransfersStr}`);
          this.fnSetLastError(`Error value transfers: ${valueTransfersStr}`);
          return;
        }
      } else {
        console.log('Internal Error value transfers');
        return;
      }
      let valueTransfersJSON = {} as RPCValueTransfersType;
      try {
        valueTransfersJSON = await JSON.parse(valueTransfersStr);
      } catch (error) {
        console.log(
          'VALUE TRANSFERS PARSE JSON ERROR',
          valueTransfersStr,
          error,
        );
        this.fnSetLastError(
          `Error value transfers parse: ${error} value: ${valueTransfersStr}`,
        );
        return;
      }

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
              vt.status === RPCValueTransfersStatusEnum.mempool ||
              vt.status === RPCValueTransfersStatusEnum.failed
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

            vtList.push(currentValueTransferList);
          },
        );

      this.fnSetValueTransfersList(vtList, vtList.length);
    } catch (error) {
      console.log(`Critical Error value transfers ${error}`);
      this.fnSetLastError(`Error value transfers: ${error}`);
      // relaunch the interval tasks just in case they are aborted.
      await this.clearTimers();
      await this.configure();
    } finally {
      this.fetchTandZandOValueTransfersLock = false;
    }
  }

  // Fetch all T and Z and O ValueTransfers as a Messages
  async fetchTandZandOMessages() {
    if (this.fetchTandZandOMessagesLock) {
      return;
    }
    this.fetchTandZandOMessagesLock = true;
    try {
      const start = Date.now();
      const messagesStr: string = await RPCModule.getMessagesInfo('');
      if (Date.now() - start > 4000) {
        console.log(
          '=========================================== > messages - ',
          Date.now() - start,
        );
      }
      if (messagesStr) {
        if (messagesStr.toLowerCase().startsWith(GlobalConst.error)) {
          console.log(`Error value transfers messages ${messagesStr}`);
          this.fnSetLastError(`Error value transfers messages: ${messagesStr}`);
          return;
        }
      } else {
        console.log('Internal Error value transfers messages');
        return;
      }
      let messagesJSON = {} as RPCValueTransfersType;
      try {
        messagesJSON = await JSON.parse(messagesStr);
      } catch (error) {
        console.log('MESSAGES PARSE JSON ERROR', messagesStr, error);
        this.fnSetLastError(
          `Error value transfers messages parse: ${error} value: ${messagesStr}`,
        );
        return;
      }

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
            m.status === RPCValueTransfersStatusEnum.mempool ||
            m.status === RPCValueTransfersStatusEnum.failed
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

          mList.push(currentMessageList);
        });

      this.fnSetMessagesList(mList, mList.length);
    } catch (error) {
      console.log(`Critical Error value transfers messages ${error}`);
      this.fnSetLastError(`Error value transfers messages: ${error}`);
      // relaunch the interval tasks just in case they are aborted.
      await this.clearTimers();
      await this.configure();
    } finally {
      this.fetchTandZandOMessagesLock = false;
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

      // run sync process here just in case.
      await this.refreshSync();

      // create the tasks
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

    if (exists && exists !== GlobalConst.false) {
      await this.pauseSyncProcess();

      const backupResult = await RPCModule.doSaveBackup();
      if (!backupResult || backupResult === GlobalConst.false) {
        return this.translate('rpc.backupwallet-error');
      }

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

    if (existsBackup && existsBackup !== GlobalConst.false) {
      const existsWallet = await RPCModule.walletExists();

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
