import { AddressClass, AddressKindEnum, ReceiverEnum } from '../../app/AppState';

export const mockAddresses: AddressClass[] = [
  {
    uOrchardAddress: 'UA-12345678901234567890',
    address: 'UA-12345678901234567890',
    addressKind: AddressKindEnum.u,
    receivers: ReceiverEnum.o + ReceiverEnum.z + ReceiverEnum.t,
  },
  {
    uOrchardAddress: 'UA-12345678901234567890',
    address: 'sapling-12345678901234567890',
    addressKind: AddressKindEnum.z,
    receivers: ReceiverEnum.z,
  },
  {
    uOrchardAddress: 'UA-12345678901234567890',
    address: 'transparent-12345678901234567890',
    addressKind: AddressKindEnum.t,
    receivers: ReceiverEnum.t,
  },
];
