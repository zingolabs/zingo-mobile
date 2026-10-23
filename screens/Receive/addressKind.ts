import {
  AddressKindEnum,
  TransparentAddressClass,
  UnifiedAddressClass,
} from '@app/AppState';

/** The catalog key naming one of the wallet's own addresses by its pools. */
export function addressKindKey(
  address: UnifiedAddressClass | TransparentAddressClass,
): string {
  if (address.addressKind === AddressKindEnum.t) {
    return 'receive.kind-transparent';
  }
  if (address.has_orchard && address.has_sapling) {
    return 'receive.shielded-orchard-sapling';
  }
  return address.has_orchard
    ? 'receive.shielded-orchard'
    : 'receive.shielded-sapling';
}
