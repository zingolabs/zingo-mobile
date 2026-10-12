import { DataService } from '@app/walletBackend/modules/DataService';
import { RPCPerformanceLevelEnum } from '@app/walletBackend/enums/RPCPerformanceLevelEnum';

// The coordinator reaches into DataService only for the eight configure()
// fetches, the save-required gate, the performance read, and the lock flags.
// A stub is the seam for the coordinator's own scheduling logic; DataService
// internals are a separate fence.
export function mockDataService(
  overrides: Partial<DataService> = {},
): DataService {
  const resolved = () => jest.fn().mockResolvedValue(undefined);
  return {
    fetchTandZandOValueTransfers: resolved(),
    fetchAddresses: resolved(),
    fetchTotalBalance: resolved(),
    fetchInfoAndServerHeight: resolved(),
    fetchZingolibVersion: resolved(),
    fetchTandZandOMessages: resolved(),
    fetchWalletHeight: resolved(),
    fetchWalletBirthdaySeedUfvk: resolved(),
    getWalletSaveRequired: jest.fn().mockResolvedValue(false),
    getConfigWalletPerformance: jest
      .fn()
      .mockResolvedValue(RPCPerformanceLevelEnum.Low),
    fetchWalletHeightLock: false,
    fetchWalletBirthdaySeedUfvkLock: false,
    fetchInfoAndServerHeightLock: false,
    fetchTandZandOValueTransfersLock: false,
    fetchTandZandOMessagesLock: false,
    fetchTotalBalanceLock: false,
    fetchAddressesLock: false,
    fetchZingolibVersionLock: false,
    getWalletSaveRequiredLock: false,
    ...overrides,
  } as unknown as DataService;
}
