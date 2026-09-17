/**
 * Reads wallet state through the typed handle and publishes it through the
 * config callbacks. Each fetch holds a lock so overlapping refreshes drop
 * instead of queueing; `onSyncError` is wired by WalletBackend once the
 * SyncCoordinator exists.
 */
import { ZingoError_Tags } from 'zingo-ffi';
import {
  InfoType,
  ChainNameEnum,
  CurrencyNameEnum,
  AddressKindEnum,
  UnifiedAddressClass,
  TransparentAddressClass,
  foldBlockSpacing,
} from '@app/AppState';
import { FfiError, zats } from '@app/walletBackend/ffi';
import { callWallet } from '@app/walletBackend/wallet';
import { RPCPerformanceLevelEnum } from '@app/walletBackend/enums/RPCPerformanceLevelEnum';
import { WalletBackendConfig } from '@app/walletBackend/config/WalletBackendConfig';
import {
  addressScope,
  chainNameOf,
  performanceLevelName,
} from '@app/walletBackend/transforms/enumTransform';
import { transformValueTransfer } from '@app/walletBackend/transforms/valueTransferTransform';
import {
  fetchWallet,
  getLatestBlockServerInfo,
  getVersionInfo,
} from '@app/walletBackend/utils/walletUtils';

const ZATS_PER_ZEC = 10 ** 8;

const NO_INFO: InfoType = {
  chainName: ChainNameEnum.noneChainName,
  latestBlock: 0,
  serverUri: '',
  version: '',
  currencyName: CurrencyNameEnum.ZEC,
  ironwoodActivationHeight: null,
};

export class DataService {
  config: WalletBackendConfig;

  lastWalletBlockHeight: number = 0;
  lastServerBlockHeight: number = 0;
  walletBirthday: number = 0;

  blockTimeBaseHeight: number = 0;
  blockTimeBaseMs: number = 0;
  secondsPerBlock: number | undefined;

  fetchWalletHeightLock: boolean = false;
  fetchWalletBirthdaySeedUfvkLock: boolean = false;
  fetchInfoAndServerHeightLock: boolean = false;
  fetchTandZandOValueTransfersLock: boolean = false;
  fetchTandZandOMessagesLock: boolean = false;
  fetchTotalBalanceLock: boolean = false;
  fetchAddressesLock: boolean = false;
  fetchZingolibVersionLock: boolean = false;
  getWalletSaveRequiredLock: boolean = false;

  onSyncError: () => Promise<void> = async () => {};

  constructor(config: WalletBackendConfig) {
    this.config = config;
  }

  busy(): boolean {
    return (
      this.getWalletSaveRequiredLock ||
      this.fetchWalletHeightLock ||
      this.fetchWalletBirthdaySeedUfvkLock ||
      this.fetchInfoAndServerHeightLock ||
      this.fetchAddressesLock ||
      this.fetchTotalBalanceLock ||
      this.fetchTandZandOValueTransfersLock ||
      this.fetchTandZandOMessagesLock ||
      this.fetchZingolibVersionLock
    );
  }

  private async fail(scope: string, error: FfiError): Promise<void> {
    this.config.onError(`Error ${scope}: ${error.tag}: ${error.detail}`);
    await this.onSyncError();
  }

  async fetchTotalBalance(): Promise<void> {
    if (this.fetchTotalBalanceLock) {
      return;
    }
    this.fetchTotalBalanceLock = true;
    try {
      const spendable = await callWallet(wallet => wallet.spendableBalance());
      if (!spendable.ok) {
        await this.fail('balance', spendable.error);
        return;
      }
      const balance = await callWallet(wallet => wallet.balance());
      if (!balance.ok) {
        await this.fail('balance', balance.error);
        return;
      }
      const b = balance.value;
      this.config.onBalanceChanged({
        totalOrchardBalance: zats(b.totalOrchardBalance) / ZATS_PER_ZEC,
        totalIronwoodBalance: zats(b.totalIronwoodBalance) / ZATS_PER_ZEC,
        totalSaplingBalance: zats(b.totalSaplingBalance) / ZATS_PER_ZEC,
        totalTransparentBalance:
          zats(b.totalTransparentBalance) / ZATS_PER_ZEC,
        confirmedOrchardBalance: zats(b.confirmedOrchardBalance) / ZATS_PER_ZEC,
        confirmedIronwoodBalance:
          zats(b.confirmedIronwoodBalance) / ZATS_PER_ZEC,
        confirmedSaplingBalance: zats(b.confirmedSaplingBalance) / ZATS_PER_ZEC,
        confirmedTransparentBalance:
          zats(b.confirmedTransparentBalance) / ZATS_PER_ZEC,
        totalSpendableBalance: zats(spendable.value) / ZATS_PER_ZEC,
      });
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
      const unified = await callWallet(wallet => wallet.unifiedAddresses());
      if (!unified.ok) {
        await this.fail('addresses', unified.error);
        return;
      }
      const transparent = await callWallet(wallet =>
        wallet.transparentAddresses(),
      );
      if (!transparent.ok) {
        await this.fail('addresses', transparent.error);
        return;
      }
      const addresses: (UnifiedAddressClass | TransparentAddressClass)[] = [
        ...unified.value.map(
          u =>
            new UnifiedAddressClass(
              u.addressIndex,
              u.encodedAddress,
              AddressKindEnum.u,
              u.hasOrchard,
              u.hasSapling,
              u.hasTransparent,
            ),
        ),
        ...transparent.value.map(
          t =>
            new TransparentAddressClass(
              t.addressIndex,
              t.encodedAddress,
              AddressKindEnum.t,
              addressScope(t.scope),
            ),
        ),
      ];
      this.config.onAddressesChanged(addresses);
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
      const height = await callWallet(wallet => wallet.latestBlockWallet());
      if (!height.ok) {
        await this.fail('wallet height', height.error);
        return;
      }
      this.lastWalletBlockHeight = height.value;
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
      const info = await callWallet(wallet => wallet.serverInfo());
      if (!info.ok) {
        this.config.onInfoChanged(NO_INFO);
        this.lastServerBlockHeight = 0;
        if (info.error.tag !== ZingoError_Tags.Offline) {
          await this.fail('info', info.error);
        }
        return;
      }
      const s = info.value;
      const latestBlock = zats(s.latestBlockHeight);
      const chainName =
        chainNameOf(s.chainName) ?? ChainNameEnum.noneChainName;
      const published: InfoType = {
        chainName,
        latestBlock,
        serverUri: s.serverUri,
        version: `${s.vendor}/${s.gitCommit.substring(0, 6)}/${s.version}`,
        currencyName:
          chainName === ChainNameEnum.mainChainName
            ? CurrencyNameEnum.ZEC
            : CurrencyNameEnum.TAZ,
        ironwoodActivationHeight: s.ironwoodActivationHeight ?? null,
      };
      this.observeBlockSpacing(latestBlock, Date.now());
      if (this.secondsPerBlock !== undefined) {
        published.secondsPerBlock = this.secondsPerBlock;
      }
      this.config.onInfoChanged(published);
      this.lastServerBlockHeight = latestBlock;
    } finally {
      this.fetchInfoAndServerHeightLock = false;
    }
  }

  // One sample per height change: the wall-clock gap since the last reading
  // that moved, divided by how many blocks it moved. A rewound tip re-bases.
  private observeBlockSpacing(height: number, nowMs: number): void {
    if (height <= 0) {
      return;
    }
    if (this.blockTimeBaseHeight === 0 || height < this.blockTimeBaseHeight) {
      this.blockTimeBaseHeight = height;
      this.blockTimeBaseMs = nowMs;
      return;
    }
    if (height === this.blockTimeBaseHeight) {
      return;
    }
    const sample =
      (nowMs - this.blockTimeBaseMs) /
      1000 /
      (height - this.blockTimeBaseHeight);
    this.blockTimeBaseHeight = height;
    this.blockTimeBaseMs = nowMs;
    this.secondsPerBlock =
      foldBlockSpacing(this.secondsPerBlock ?? null, sample) ?? undefined;
  }

  async fetchZingolibVersion(): Promise<void> {
    if (this.fetchZingolibVersionLock) {
      return;
    }
    this.fetchZingolibVersionLock = true;
    try {
      this.config.onZingolibVersionChanged(getVersionInfo());
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
        this.config.onBirthdayChanged(wallet.birthday);
      }
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
      if (this.config.server.uri) {
        const height = await getLatestBlockServerInfo(this.config.server.uri);
        if (height.ok) {
          this.lastServerBlockHeight = height.value;
        }
      }
      const transfers = await callWallet(wallet => wallet.valueTransfers());
      if (!transfers.ok) {
        await this.fail('value transfers', transfers.error);
        return;
      }
      const list = transfers.value.map(vt =>
        transformValueTransfer(
          vt,
          this.lastServerBlockHeight,
          this.lastWalletBlockHeight,
        ),
      );
      this.config.onValueTransfersChanged(list, list.length);
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
      const messages = await callWallet(wallet => wallet.messages(''));
      if (!messages.ok) {
        await this.fail('messages', messages.error);
        return;
      }
      const list = messages.value.map(m =>
        transformValueTransfer(
          m,
          this.lastServerBlockHeight,
          this.lastWalletBlockHeight,
        ),
      );
      this.config.onMessagesChanged(list, list.length);
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
      const required = await callWallet(wallet => wallet.isSaveRequired());
      if (!required.ok) {
        this.config.onError(
          `Error wallet save required: ${required.error.detail}`,
        );
        return false;
      }
      return required.value;
    } finally {
      this.getWalletSaveRequiredLock = false;
    }
  }

  async getConfigWalletPerformance(): Promise<
    RPCPerformanceLevelEnum | undefined
  > {
    const settings = await callWallet(wallet => wallet.settings());
    if (!settings.ok) {
      this.config.onError(
        `Error wallet config performance: ${settings.error.detail}`,
      );
      return undefined;
    }
    return performanceLevelName(settings.value.performance);
  }

  async getWalletVersion(): Promise<number | undefined> {
    const walletVersion = await callWallet(wallet => wallet.walletVersion());
    if (!walletVersion.ok) {
      this.config.onError(`Error wallet version: ${walletVersion.error.detail}`);
      return undefined;
    }
    return zats(walletVersion.value.read);
  }
}
