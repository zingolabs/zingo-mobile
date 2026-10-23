import { useContext, useMemo } from 'react';
import { ContextAppLoaded } from '@app/context';
import {
  AddressKindEnum,
  TransparentAddressClass,
  UnifiedAddressClass,
} from '@app/AppState';
import { RPCAddressScopeEnum } from '@app/walletBackend/enums/RPCAddressScopeEnum';

export type OwnAddress = UnifiedAddressClass | TransparentAddressClass;

/**
 * The wallet's addresses Receive offers, oldest first: the shielded ones,
 * and the external transparent ones (change addresses never receive).
 */
export function useOwnAddresses(): {
  shielded: UnifiedAddressClass[];
  transparent: TransparentAddressClass[];
} {
  const { addresses } = useContext(ContextAppLoaded);
  return useMemo(() => {
    const shielded: UnifiedAddressClass[] = [];
    const transparent: TransparentAddressClass[] = [];
    (addresses ?? []).forEach(a => {
      if (a.addressKind === AddressKindEnum.u) {
        shielded.push(a);
      } else if (a.scope === RPCAddressScopeEnum.external) {
        transparent.push(a);
      }
    });
    return { shielded, transparent };
  }, [addresses]);
}
