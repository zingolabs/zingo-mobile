import RPCModule from '../../RPCModule';
import {
  AddressKindEnum,
  GlobalConst,
  InfoType,
  TotalBalanceClass,
  UnifiedAddressClass,
  TransparentAddressClass,
  ChainNameEnum,
  CurrencyNameEnum,
} from '../../AppState';
import { WalletBackendConfig } from '../config/WalletBackendConfig';
import {
  RPCUnifiedAddressType,
  RPCTransparentAddressType,
} from '../types/rpcAddressTypes';
import {
  RPCInfoType,
} from '../types/rpcWalletTypes';
import {
  RPCValueTransferType,
  RPCValueTransfersType,
} from '../types/rpcTransactionTypes';
import { transformRawValueTransfer } from '../transforms/valueTransferTransform';
import { fetchWallet } from '../utils/walletUtils';

export class DataService {
  lastWalletBlockHeight = 0;
  lastServerBlockHeight = 0;
  walletBirthday = 0;

  fetchWalletHeightLock = false;
  fetchWalletBirthdaySeedUfvkLock = false;
  fetchInfoAndServerHeightLock = false;
  fetchTandZandOValueTransfersLock = false;
  fetchTandZandOMessagesLock = false;
  fetchTotalBalanceLock = false;
  fetchAddressesLock = false;
  fetchZingolibVersionLock = false;

  constructor(
    private cfg: WalletBackendConfig,
    private onFatalError: () => Promise<void>,
  ) {}

  async fetchTotalBalance(): Promise<void> {
    if (this.fetchTotalBalanceLock) {
      return;
    }
    this.fetchTotalBalanceLock = true;
    try {
      const start = Date.now();
      const [spendable, balanceInfo] = await Promise.all([
        RPCModule.getSpendableBalanceTotalInfo(),
        RPCModule.getBalanceInfo(),
      ]);
      if (Date.now() - start > 4000) {
        console.log('=========================================== > balances - ', Date.now() - start);
      }

      const balance: TotalBalanceClass = {
        totalOrchardBalance:        (balanceInfo.total_orchard_balance || 0) / 10 ** 8,
        totalSaplingBalance:        (balanceInfo.total_sapling_balance || 0) / 10 ** 8,
        totalTransparentBalance:    (balanceInfo.total_transparent_balance || 0) / 10 ** 8,
        confirmedOrchardBalance:    (balanceInfo.confirmed_orchard_balance || 0) / 10 ** 8,
        confirmedSaplingBalance:    (balanceInfo.confirmed_sapling_balance || 0) / 10 ** 8,
        confirmedTransparentBalance:(balanceInfo.confirmed_transparent_balance || 0) / 10 ** 8,
        totalSpendableBalance:      (spendable.spendable_balance || 0) / 10 ** 8,
      };
      this.cfg.setTotalBalance(balance);
    } catch (error) {
      console.log(`Critical Error balances ${error}`);
      this.cfg.setLastError(`Error balance: ${error}`);
      await this.onFatalError();
    } finally {
      this.fetchTotalBalanceLock = false;
    }
  }

  async fetchAddresses(): Promise<void> {
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
      if (unifiedAddressesStr) {
        if (unifiedAddressesStr.toLowerCase().startsWith(GlobalConst.error)) {
          console.log(`Error addresses ${unifiedAddressesStr}`);
          this.cfg.setLastError(
            `Error unified addresses: ${unifiedAddressesStr}`,
          );
          return;
        }
      } else {
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
      if (transparentAddressStr) {
        if (
          transparentAddressStr.toLowerCase().startsWith(GlobalConst.error)
        ) {
          console.log(`Error addresses ${transparentAddressStr}`);
          this.cfg.setLastError(
            `Error transparent addresses: ${transparentAddressStr}`,
          );
          return;
        }
      } else {
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

      this.cfg.setAllAddresses(allAddresses);
    } catch (error) {
      console.log(`Critical Error addresses ${error}`);
      this.cfg.setLastError(`Error addresses: ${error}`);
      await this.onFatalError();
    } finally {
      this.fetchAddressesLock = false;
    }
  }

  async fetchInfoAndServerHeight(): Promise<void> {
    if (this.fetchInfoAndServerHeightLock) {
      return;
    }
    this.fetchInfoAndServerHeightLock = true;
    try {
      let infoError = false;
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
          this.cfg.setLastError(`Error info: ${infoStr}`);
          infoError = true;
        }
      } else {
        console.log('Internal Error info & server block height');
        infoError = true;
      }

      if (infoError) {
        this.cfg.setInfo({
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
        version: `${infoJSON.vendor}/${infoJSON.git_commit ? infoJSON.git_commit.substring(0, 6) : ''}/${infoJSON.version}`,
        currencyName:
          infoJSON.chain_name === ChainNameEnum.mainChainName
            ? CurrencyNameEnum.ZEC
            : CurrencyNameEnum.TAZ,
      };
      this.cfg.setInfo(info);
      this.lastServerBlockHeight = info.latestBlock;
    } catch (error) {
      console.log(`Critical Error info & server block height ${error}`);
      this.cfg.setLastError(`Error info: ${error}`);
      await this.onFatalError();
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
          this.cfg.setLastError(`Error zingolib version: ${zingolibStr}`);
          zingolibStr = GlobalConst.zingolibError;
        }
      } else {
        console.log('Internal Error zingolib version');
        zingolibStr = GlobalConst.zingolibNone;
      }
      this.cfg.setZingolibVersion(zingolibStr);
    } catch (error) {
      console.log(`Critical Error zingolib version ${error}`);
      this.cfg.setLastError(`Error zingolib version: ${error}`);
    } finally {
      this.fetchZingolibVersionLock = false;
    }
  }

  async fetchWalletHeight(): Promise<void> {
    if (this.fetchWalletHeightLock) {
      return;
    }
    this.fetchWalletHeightLock = true;
    try {
      const start = Date.now();
      const heightInfo = await RPCModule.getLatestBlockWalletInfo();
      if (Date.now() - start > 4000) {
        console.log('=========================================== > wallet height - ', Date.now() - start);
      }
      this.lastWalletBlockHeight = heightInfo.height;
    } catch (error) {
      console.log(`Critical Error wallet height ${error}`);
      this.cfg.setLastError(`Error wallet height: ${error}`);
      await this.onFatalError();
    } finally {
      this.fetchWalletHeightLock = false;
    }
  }

  async fetchWalletBirthdaySeedUfvk(): Promise<void> {
    if (this.fetchWalletBirthdaySeedUfvkLock) {
      return;
    }
    this.fetchWalletBirthdaySeedUfvkLock = true;
    try {
      const wallet = await fetchWallet(this.cfg.readOnly);
      if (wallet) {
        this.walletBirthday = wallet.birthday;
        this.cfg.setBirthday(wallet.birthday || 0);
      }
    } catch (error) {
      console.log(`Critical Error wallet birthday ${error}`);
      this.cfg.setLastError(`Error wallet birthday: ${error}`);
      await this.onFatalError();
    } finally {
      this.fetchWalletBirthdaySeedUfvkLock = false;
    }
  }

  async fetchTandZandOValueTransfers(): Promise<void> {
    if (this.fetchTandZandOValueTransfersLock) {
      return;
    }
    this.fetchTandZandOValueTransfersLock = true;
    try {
      const start = Date.now();
      const heightStr: string = await RPCModule.getLatestBlockServerInfo(
        this.cfg.server.uri,
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
          this.cfg.setLastError(`Error server height: ${heightStr}`);
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
          this.cfg.setLastError(`Error value transfers: ${valueTransfersStr}`);
          return;
        }
      } else {
        console.log('Internal Error value transfers');
        return;
      }
      const valueTransfersJSON: RPCValueTransfersType =
        await JSON.parse(valueTransfersStr);

      const vtList = (valueTransfersJSON?.value_transfers ?? []).map(
        (vt: RPCValueTransferType) => {
          if (vt.txid.startsWith('xxxxxxxxx')) {
            console.log('server', this.lastServerBlockHeight);
            console.log('wallet', this.lastWalletBlockHeight);
            console.log('valuetransfer zingolib: ', vt);
          }
          return transformRawValueTransfer(
            vt,
            this.lastServerBlockHeight,
            this.lastWalletBlockHeight,
          );
        },
      );

      this.cfg.setValueTransfersList(vtList, vtList.length);
    } catch (error) {
      console.log(`Critical Error value transfers ${error}`);
      this.cfg.setLastError(`Error value transfers: ${error}`);
      await this.onFatalError();
    } finally {
      this.fetchTandZandOValueTransfersLock = false;
    }
  }

  async fetchTandZandOMessages(): Promise<void> {
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
          this.cfg.setLastError(
            `Error value transfers messages: ${messagesStr}`,
          );
          return;
        }
      } else {
        console.log('Internal Error value transfers messages');
        return;
      }
      const messagesJSON: RPCValueTransfersType =
        await JSON.parse(messagesStr);

      const mList = (messagesJSON?.value_transfers ?? []).map(
        (m: RPCValueTransferType) => {
          if (m.txid.startsWith('xxxxxxxxx')) {
            console.log('valuetransfer messages zingolib: ', m);
          }
          return transformRawValueTransfer(
            m,
            this.lastServerBlockHeight,
            this.lastWalletBlockHeight,
          );
        },
      );

      this.cfg.setMessagesList(mList, mList.length);
    } catch (error) {
      console.log(`Critical Error value transfers messages ${error}`);
      this.cfg.setLastError(`Error value transfers messages: ${error}`);
      await this.onFatalError();
    } finally {
      this.fetchTandZandOMessagesLock = false;
    }
  }
}
