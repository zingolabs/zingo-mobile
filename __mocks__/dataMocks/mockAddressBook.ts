import { AddressBookFileClass, ChainNameEnum } from '@app/AppState';

export const mockAddressBook: AddressBookFileClass[] = [
  {
    label: 'pepe',
    address: 'u1234567890_____________',
    color: '#000000',
    own: true,
    chain: ChainNameEnum.mainChainName,
    swapChain: 'ZEC',
  },
  {
    label: 'lolo',
    address: 'u0987654321_____________',
    color: '#FFFFFF',
    own: false,
    chain: ChainNameEnum.mainChainName,
    swapChain: 'ZEC',
  },
];
