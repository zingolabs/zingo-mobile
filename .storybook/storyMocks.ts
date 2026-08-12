// Shared fixtures for stories whose props are wallet-domain objects.
import {
  ChainNameEnum,
  CurrencyNameEnum,
  AddressKindEnum,
  InfoType,
  ZecPriceType,
} from '@app/AppState';
import TotalBalanceClass from '@app/AppState/classes/TotalBalanceClass';
import UnifiedAddressClass from '@app/AppState/classes/UnifiedAddressClass';
import TransparentAddressClass from '@app/AppState/classes/TransparentAddressClass';
import AddressBookFileClass from '@app/AppState/classes/AddressBookFileClass';
import { RPCAddressScopeEnum } from '@app/walletBackend/enums/RPCAddressScopeEnum';

export const mockZecPrice: ZecPriceType = {
  zecPrice: 33.75,
  date: 1_700_000_000_000,
};

export const mockInfo = {
  chainName: ChainNameEnum.mainChainName,
  serverUri: 'https://mainnet.lightwalletd.com',
  latestBlock: 2_500_000,
  version: '1',
  currencyName: CurrencyNameEnum.ZEC,
  ironwoodActivationHeight: null,
} as InfoType;

export const mockTotalBalance = (() => {
  const b = new TotalBalanceClass();
  b.totalOrchardBalance = 1.2345;
  b.confirmedOrchardBalance = 1.2345;
  b.totalSpendableBalance = 1.2345;
  return b;
})();

export const uAddress =
  'u1l9f0l4348negsncgr9pxd9d3qgm4yca9pj3ecx0zvh4hkje8vd0zjq2y8xj4nq3';
export const tAddress = 't1duiEGg7b39nfQee3XaTY4f5McqfyJKhBi';

export const sampleUnified = new UnifiedAddressClass(
  0,
  uAddress,
  AddressKindEnum.u,
  true,
  true,
  true,
);

export const sampleTransparent = new TransparentAddressClass(
  0,
  tAddress,
  AddressKindEnum.t,
  RPCAddressScopeEnum.external,
);

export const sampleContact = new AddressBookFileClass(
  'Alice',
  uAddress,
  '#e35f36',
  false,
  ChainNameEnum.mainChainName,
  'ZEC',
);
