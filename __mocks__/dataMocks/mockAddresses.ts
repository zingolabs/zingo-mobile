import {
  UnifiedAddressClass,
  TransparentAddressClass,
} from '@app/wallet/address';

export const mockAddresses: (UnifiedAddressClass | TransparentAddressClass)[] =
  [
    {
      index: 0,
      address: 'UA-orchard-sapling12345678901234567890',
      addressKind: 'u',
      has_orchard: true,
      has_sapling: true,
      has_transparent: false,
    },
    {
      index: 1,
      address: 'UA-sapling-12345678901234567890',
      addressKind: 'u',
      has_orchard: false,
      has_sapling: true,
      has_transparent: false,
    },
    {
      index: 2,
      address: 'UA-orchard-12345678901234567890',
      addressKind: 'u',
      has_orchard: true,
      has_sapling: false,
      has_transparent: false,
    },
    {
      index: 0,
      address: 'transparent-1-12345678901234567890',
      addressKind: 't',
      scope: 'external',
    },
    {
      index: 1,
      address: 'transparent-2-12345678901234567890',
      addressKind: 't',
      scope: 'external',
    },
  ];
