import { isEqual } from 'lodash';

import { AddressKindEnum } from './enums/AddressKindEnum';
import TransparentAddressClass from './classes/TransparentAddressClass';
import UnifiedAddressClass from './classes/UnifiedAddressClass';

// True when applying the patch alters any field of the state, by deep equality.
export const changes = <S extends object>(
  prev: S,
  patch: Partial<S>,
): boolean => !isEqual({ ...prev, ...patch }, prev);

// The most recently created unified address, or the empty string when the list holds none.
export const lastUnified = (
  addresses: (UnifiedAddressClass | TransparentAddressClass)[],
): string =>
  addresses.filter(a => a.addressKind === AddressKindEnum.u).at(-1)?.address ??
  '';
