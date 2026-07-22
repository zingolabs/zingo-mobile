/**
 * Fetches all wallet state from RPCModule and pushes updates via config callbacks.
 *
 * Each public method is guarded by a boolean lock (e.g. fetchTotalBalanceLock)
 * so that concurrent calls from the SyncCoordinator timer loop are safely
 * dropped rather than queued. SyncCoordinator reads these lock flags to decide
 * whether to skip a polling cycle entirely.
 *
 * onSyncError is intentionally a no-op at construction time. WalletBackend
 * overwrites it after SyncCoordinator is created to break the circular
 * dependency: DataService → SyncCoordinator → DataService.
 */
import {
  TotalBalanceClass,
  InfoType,
  ChainNameEnum,
  CurrencyNameEnum,
  AddressKindEnum,
  GlobalConst,
  ValueTransferType,
  UnifiedAddressClass,
  TransparentAddressClass,
} from '../../AppState';
import RPCModule from '../../RPCModule';
import { RPCUnifiedAddressType } from '../types/RPCUnifiedAddressType';
import { RPCBalancesType } from '../types/RPCBalancesType';
import { RPCInfoType } from '../types/RPCInfoType';
import { RPCWalletHeight } from '../types/RPCWalletHeightType';
import { RPCValueTransfersType } from '../types/RPCValueTransfersType';
import { RPCValueTransferType } from '../types/RPCValueTransferType';
import { RPCTransparentAddressType } from '../types/RPCTransparentAddressType';
import { RPCSpendablebalanceType } from '../types/RPCSpendablebalanceType';
import { RPCWalletSaveRequiredType } from '../types/RPCWalletSaveRequiredType';
import { RPCConfigWalletPerformanceType } from '../types/RPCConfigWalletPerformanceType';
import { RPCPerformanceLevelEnum } from '../enums/RPCPerformanceLevelEnum';
import { RPCWalletVersionType } from '../types/RPCWalletVersionType';
import { WalletBackendConfig } from '../config/WalletBackendConfig';
import { transformValueTransfer } from '../transforms/valueTransferTransform';
import { fetchWallet } from '../utils/walletUtils';

export class DataService {
  config: WalletBackendConfig;

  lastWalletBlockHeight: number = 0;
  lastServerBlockHeight: number = 0;
  walletBirthday: number = 0;

  fetchWalletHeightLock: boolean = false;
  fetchWalletBirthdaySeedUfvkLock: boolean = false;
  fetchInfoAndServerHeightLock: boolean = false;
  fetchTandZandOValueTransfersLock: boolean = false;
  fetchTandZandOMessagesLock: boolean = false;
  fetchTotalBalanceLock: boolean = false;
  fetchAddressesLock: boolean = false;
  fetchZingolibVersionLock: boolean = false;
  getWalletSaveRequiredLock: boolean = false;

  // Set by WalletBackend after SyncCoordinator is created, to restart sync on critical errors.
  onSyncError: () => Promise<void> = async () => {};

  constructor(config: WalletBackendConfig) {
    this.config = config;
  }

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
        spendableJSON = await JSON.parse(spendableStr);
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
      if (!balanceStr) {
        console.log('Internal Error balance');
        return;
      }
      const balanceJSON: RPCBalancesType = await JSON.parse(balanceStr);

      const balance: TotalBalanceClass = {
        totalOrchardBalance: (balanceJSON.total_orchard_balance || 0) / 10 ** 8,
        totalIronwoodBalance:
          (balanceJSON.total_ironwood_balance || 0) / 10 ** 8,
        totalSaplingBalance: (balanceJSON.total_sapling_balance || 0) / 10 ** 8,
        totalTransparentBalance:
          (balanceJSON.total_transparent_balance || 0) / 10 ** 8,
        confirmedOrchardBalance:
          (balanceJSON.confirmed_orchard_balance || 0) / 10 ** 8,
        confirmedIronwoodBalance:
          (balanceJSON.confirmed_ironwood_balance || 0) / 10 ** 8,
        confirmedSaplingBalance:
          (balanceJSON.confirmed_sapling_balance || 0) / 10 ** 8,
        confirmedTransparentBalance:
          (balanceJSON.confirmed_transparent_balance || 0) / 10 ** 8,
        totalSpendableBalance: (spendableJSON.spendable_balance || 0) / 10 ** 8,
      };
      this.config.onBalanceChanged(balance);
    } catch (error) {
      console.log(`Critical Error balances ${error}`);
      this.config.onError(`Error balance: ${error}`);
      await this.onSyncError();
    } finally {
      this.fetchTotalBalanceLock = false;
    }
  }

  async fetchAddresses() {
    if (this.fetchAddressesLock) {
      return;
    }
    this.fetchAddressesLock = true;
    try {
      const start = Date.now();
      const unifiedAddressesStr: string =
        await RPCModule.getUnifiedAddressesInfo();
      if (Date.now() - start > 4000) {
        console.log(
          '=========================================== > addresses unified - ',
          Date.now() - start,
        );
      }
      // The routed getters reject on failure, so error handling lives in
      // the owning catch; a resolved value is data, never inspected for
      // an error sentinel (zingo-mobile#1151).
      if (!unifiedAddressesStr) {
        console.log('Internal Error addresses');
        return;
      }
      const unifiedAddressesJSON: RPCUnifiedAddressType[] =
        (await JSON.parse(unifiedAddressesStr)) || [];

      const start2 = Date.now();
      const transparentAddressStr: string =
        await RPCModule.getTransparentAddressesInfo();
      if (Date.now() - start2 > 4000) {
        console.log(
          '=========================================== > addresses transparent - ',
          Date.now() - start2,
        );
      }
      if (!transparentAddressStr) {
        console.log('Internal Error addresses');
        return;
      }
      const transparentAddressesJSON: RPCTransparentAddressType[] =
        (await JSON.parse(transparentAddressStr)) || [];

      const allAddresses: (UnifiedAddressClass | TransparentAddressClass)[] =
        [];

      unifiedAddressesJSON &&
        unifiedAddressesJSON.forEach((u: RPCUnifiedAddressType) => {
          allAddresses.push(
            new UnifiedAddressClass(
              u.address_index,
              u.encoded_address,
              AddressKindEnum.u,
              u.has_orchard,
              u.has_sapling,
              u.has_transparent,
            ),
          );
        });

      transparentAddressesJSON &&
        transparentAddressesJSON.forEach((u: RPCTransparentAddressType) => {
          allAddresses.push(
            new TransparentAddressClass(
              u.address_index,
              u.encoded_address,
              AddressKindEnum.t,
              u.scope,
            ),
          );
        });

      this.config.onAddressesChanged(allAddresses);
    } catch (error) {
      console.log(`Critical Error addresses ${error}`);
      this.config.onError(`Error addresses: ${error}`);
      await this.onSyncError();
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
      if (!heightStr) {
        console.log('Internal Error wallet height');
        return;
      }
      const heightJSON: RPCWalletHeight = await JSON.parse(heightStr);
      this.lastWalletBlockHeight = heightJSON.height;
    } catch (error) {
      console.log(`Critical Error wallet height ${error}`);
      this.config.onError(`Error wallet height: ${error}`);
      await this.onSyncError();
    } finally {
      this.fetchWalletHeightLock = false;
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
          this.config.onError(`Error info: ${infoStr}`);
          infoError = true;
        }
      } else {
        console.log('Internal Error info & server block height');
        infoError = true;
      }

      if (infoError) {
        this.config.onInfoChanged({
          latestBlock: 0,
          serverUri: '',
          version: '',
        } as InfoType);
        this.lastServerBlockHeight = 0;
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
            : CurrencyNameEnum.TAZ,
        // `?? null` collapses both "no activation scheduled" (null) and "older
        // native lib that doesn't report it" (undefined) into the same
        // not-yet-active answer.
        ironwoodActivationHeight: infoJSON.ironwood_activation_height ?? null,
      };

      this.config.onInfoChanged(info);
      this.lastServerBlockHeight = info.latestBlock;
    } catch (error) {
      console.log(`Critical Error info & server block height ${error}`);
      this.config.onError(`Error info: ${error}`);
      await this.onSyncError();
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
      if (!zingolibStr) {
        console.log('Internal Error zingolib version');
        zingolibStr = GlobalConst.zingolibNone;
      }

      this.config.onZingolibVersionChanged(zingolibStr);
    } catch (error) {
      console.log(`Critical Error zingolib version ${error}`);
      this.config.onError(`Error zingolib version: ${error}`);
      // The version display still needs a value when the FFI rejects.
      this.config.onZingolibVersionChanged(GlobalConst.zingolibError);
    } finally {
      this.fetchZingolibVersionLock = false;
    }
  }

  async fetchWalletBirthdaySeedUfvk(): Promise<void> {
    if (this.fetchWalletBirthdaySeedUfvkLock) {
      return;
    }
    this.fetchWalletBirthdaySeedUfvkLock = true;
    try {
      const wallet = await fetchWallet(this.config.readOnly);

      if (wallet) {
        this.walletBirthday = wallet.birthday;
        this.config.onBirthdayChanged(wallet.birthday || 0);
      }
    } catch (error) {
      console.log(`Critical Error wallet birthday ${error}`);
      this.config.onError(`Error wallet birthday: ${error}`);
      await this.onSyncError();
    } finally {
      this.fetchWalletBirthdaySeedUfvkLock = false;
    }
  }

  async fetchTandZandOValueTransfers() {
    if (this.fetchTandZandOValueTransfersLock) {
      return;
    }
    this.fetchTandZandOValueTransfersLock = true;
    try {
      const start = Date.now();
      const heightStr: string = await RPCModule.getLatestBlockServerInfo(
        this.config.server.uri,
      );
      if (Date.now() - start > 4000) {
        console.log(
          '=========================================== > server height - ',
          Date.now() - start,
        );
      }
      if (heightStr) {
        this.lastServerBlockHeight = Number(heightStr);
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
      if (!valueTransfersStr) {
        console.log('Internal Error value transfers');
        return;
      }
      const valueTransfersJSON: RPCValueTransfersType =
        await JSON.parse(valueTransfersStr);

      const vtList: ValueTransferType[] =
        valueTransfersJSON?.value_transfers?.map((vt: RPCValueTransferType) => {
          const result = transformValueTransfer(
            vt,
            this.lastServerBlockHeight,
            this.lastWalletBlockHeight,
          );
          if (vt.txid.startsWith('xxxxxxxxx')) {
            console.log('server', this.lastServerBlockHeight);
            console.log('wallet', this.lastWalletBlockHeight);
            console.log('valuetransfer zingolib: ', vt);
            console.log('valuetransfer zingo', result);
            console.log('--------------------------------------------------');
          }
          return result;
        }) ?? [];

      this.config.onValueTransfersChanged(vtList, vtList.length);
    } catch (error) {
      console.log(`Critical Error value transfers ${error}`);
      this.config.onError(`Error value transfers: ${error}`);
      await this.onSyncError();
    } finally {
      this.fetchTandZandOValueTransfersLock = false;
    }
  }

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
      if (!messagesStr) {
        console.log('Internal Error value transfers messages');
        return;
      }
      const messagesJSON: RPCValueTransfersType = await JSON.parse(messagesStr);

      const mList: ValueTransferType[] =
        messagesJSON?.value_transfers?.map((m: RPCValueTransferType) => {
          const result = transformValueTransfer(
            m,
            this.lastServerBlockHeight,
            this.lastWalletBlockHeight,
          );
          if (m.txid.startsWith('xxxxxxxxx')) {
            console.log('valuetransfer messages zingolib: ', m);
            console.log('valuetransfer messages zingo', result);
            console.log('--------------------------------------------------');
          }
          return result;
        }) ?? [];

      this.config.onMessagesChanged(mList, mList.length);
    } catch (error) {
      console.log(`Critical Error value transfers messages ${error}`);
      this.config.onError(`Error value transfers messages: ${error}`);
      await this.onSyncError();
    } finally {
      this.fetchTandZandOMessagesLock = false;
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
      if (!walletSaveRequiredStr) {
        console.log('Internal Error wallet save required');
        return false;
      }
      const walletSaveRequiredJSON: RPCWalletSaveRequiredType =
        await JSON.parse(walletSaveRequiredStr);

      return walletSaveRequiredJSON.save_required;
    } catch (error) {
      console.log(`Critical Error wallet save required ${error}`);
      this.config.onError(`Error wallet save required: ${error}`);
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
      if (!configWalletPerformanceStr) {
        console.log('Internal Error wallet config performance');
        return;
      }
      const configWalletPerformanceJSON: RPCConfigWalletPerformanceType =
        await JSON.parse(configWalletPerformanceStr);

      return configWalletPerformanceJSON.performance_level;
    } catch (error) {
      console.log(`Critical Error wallet config performance ${error}`);
      this.config.onError(`Error wallet config performance: ${error}`);
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
      if (!walletVersionStr) {
        console.log('Internal Error wallet version');
        return;
      }
      const walletVersionJSON: RPCWalletVersionType =
        await JSON.parse(walletVersionStr);

      return walletVersionJSON.read_version;
    } catch (error) {
      console.log(`Critical Error wallet version ${error}`);
      this.config.onError(`Error wallet version: ${error}`);
      return;
    }
  }
}
