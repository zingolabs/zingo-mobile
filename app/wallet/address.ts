export type AddressKind = 'u' | 't';

export type AddressScope = 'external' | 'internal' | 'refund';

export class TransparentAddressClass {
  index: number;
  address: string;
  addressKind: 't';
  scope: AddressScope;

  constructor(
    index: number,
    address: string,
    addressKind: 't',
    scope: AddressScope,
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
  addressKind: 'u';
  has_orchard: boolean;
  has_sapling: boolean;
  has_transparent: boolean;

  constructor(
    index: number,
    address: string,
    addressKind: 'u',
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
