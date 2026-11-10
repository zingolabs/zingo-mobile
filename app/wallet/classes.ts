import { RPCAddressScopeEnum } from '@app/walletBackend/enums/RPCAddressScopeEnum';

import { AddressKindEnum } from './enums';

export class ToAddrClass {
  id: number;
  to: string;
  amount: string;
  amountCurrency: string;
  memo: string;
  includeUAMemo: boolean;
  // The ZNS alias this recipient was resolved from, empty when the address
  // was entered directly. Carried so the confirmation screen can name the
  // recipient the way the user did, and offer it when saving a contact.
  znsAlias: string;

  constructor(id: number) {
    this.id = id;
    this.to = '';
    this.amount = '';
    this.amountCurrency = '';
    this.memo = '';
    this.includeUAMemo = false;
    this.znsAlias = '';
  }
}

export class SendPageStateClass {
  toaddr: ToAddrClass;

  constructor(toaddr: ToAddrClass) {
    this.toaddr = toaddr;
  }
}

export class TotalBalanceClass {
  // Total transparent, confirmed and unconfirmed
  totalTransparentBalance: number;

  // Total private, confirmed and unconfirmed
  totalSaplingBalance: number;

  // Total orchard, confirmed and unconfirmed
  totalOrchardBalance: number;

  // Total ironwood (NU6.3), confirmed and unconfirmed
  totalIronwoodBalance: number;

  // Total transparent, only confirmed funds
  confirmedTransparentBalance: number;

  // Total private, only confirmed funds
  confirmedSaplingBalance: number;

  // Total orchard, only confirmed funds
  confirmedOrchardBalance: number;

  // Total ironwood (NU6.3), only confirmed funds
  confirmedIronwoodBalance: number;

  // Total spendable
  totalSpendableBalance: number;

  constructor() {
    this.totalTransparentBalance = 0;
    this.totalSaplingBalance = 0;
    this.totalOrchardBalance = 0;
    this.totalIronwoodBalance = 0;
    this.confirmedTransparentBalance = 0;
    this.confirmedSaplingBalance = 0;
    this.confirmedOrchardBalance = 0;
    this.confirmedIronwoodBalance = 0;
    this.totalSpendableBalance = 0;
  }
}

const poolPairs = (
  balance: TotalBalanceClass,
): { total: number; confirmed: number }[] => [
  {
    total: balance.totalIronwoodBalance,
    confirmed: balance.confirmedIronwoodBalance,
  },
  {
    total: balance.totalOrchardBalance,
    confirmed: balance.confirmedOrchardBalance,
  },
  {
    total: balance.totalSaplingBalance,
    confirmed: balance.confirmedSaplingBalance,
  },
  {
    total: balance.totalTransparentBalance,
    confirmed: balance.confirmedTransparentBalance,
  },
];

export const hasUnconfirmedFunds = (balance: TotalBalanceClass): boolean =>
  poolPairs(balance).some(pool => pool.total !== pool.confirmed);

export const hasFullyUnconfirmedPool = (balance: TotalBalanceClass): boolean =>
  poolPairs(balance).some(pool => pool.total > 0 && pool.confirmed === 0);

export class TransparentAddressClass {
  index: number;
  address: string;
  addressKind: AddressKindEnum.t;
  scope: RPCAddressScopeEnum;

  constructor(
    index: number,
    address: string,
    addressKind: AddressKindEnum.t,
    scope: RPCAddressScopeEnum,
  ) {
    this.index = index;
    this.address = address;
    this.addressKind = addressKind;
    this.scope = scope;
  }
}

export class UnifiedAddressClass {
  index: number;
  address: string;
  addressKind: AddressKindEnum.u;
  has_orchard: boolean;
  has_sapling: boolean;
  has_transparent: boolean;

  constructor(
    index: number,
    address: string,
    addressKind: AddressKindEnum.u,
    has_orchard: boolean,
    has_sapling: boolean,
    has_transparent: boolean,
  ) {
    this.index = index;
    this.address = address;
    this.addressKind = addressKind;
    this.has_orchard = has_orchard;
    this.has_sapling = has_sapling;
    this.has_transparent = has_transparent;
  }
}
