import { ChainNameEnum } from '@app/AppState/enums/ChainNameEnum';

export default class AddressBookFileClassObsolete {
  label: string;
  address: string;
  color?: string;
  own?: boolean;
  // Optional so the boot-time `hasOwnProperty` migration can detect entries
  // that predate the multi-chain fields.
  chain?: ChainNameEnum;
  swapChain?: string;
  // obsolete
  uOrchardAddress?: string;

  constructor(label: string, address: string, color?: string, own?: boolean) {
    this.label = label;
    this.address = address;
    this.color = color;
    this.own = own;
  }
}
