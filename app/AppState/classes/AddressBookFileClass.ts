import { ChainNameEnum } from '@app/AppState/enums/ChainNameEnum';

export default class AddressBookFileClass {
  label: string;
  address: string;
  color: string;
  own: boolean;
  // Zcash network of a ZEC address (main/test/regtest). For non-ZEC swap
  // contacts it is `mainChainName` (swaps only exist in mainnet context).
  chain: ChainNameEnum;
  // SwapKit chain code of the address ('ZEC' / 'BTC' / 'ETH' / ...). 'ZEC' for
  // Zcash contacts. Shown to the user via `chainDisplayName` ('ZEC' → 'Zcash').
  swapChain: string;

  constructor(
    label: string,
    address: string,
    color: string,
    own: boolean,
    chain: ChainNameEnum,
    swapChain: string,
  ) {
    this.label = label;
    this.address = address;
    this.color = color;
    this.own = own;
    this.chain = chain;
    this.swapChain = swapChain;
  }
}
