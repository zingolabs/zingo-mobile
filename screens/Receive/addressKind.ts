import {
  TransparentAddressClass,
  UnifiedAddressClass,
} from '@app/wallet/address';

/** The catalog key naming one of the wallet's own addresses by its pools. */
export function addressKindKey(
  address: UnifiedAddressClass | TransparentAddressClass,
): string {
  if (address.addressKind === 't') {
    return 'receive.kind-transparent';
  }
  if (address.has_orchard && address.has_sapling) {
    return 'receive.shielded-orchard-sapling';
  }
  return address.has_orchard
    ? 'receive.shielded-orchard'
    : 'receive.shielded-sapling';
}
