import * as RNFS from 'react-native-fs';

import { isWalletAddress } from '@app/walletBackend';
import Utils from '@app/utils';
import { canonicalChainAddress } from '@app/swap';

import {
  AddressBookFileClass,
  ChainNameEnum,
  GlobalConst,
} from '@app/AppState';

export default class AddressBookFileImpl {
  static async getFileName() {
    return RNFS.DocumentDirectoryPath + '/addressbook.json';
  }

  static async updateColorAndOwnItem(
    label: string,
    address: string,
    color: string,
    own: boolean,
  ): Promise<AddressBookFileClass[]> {
    const addressBook = await this.readAddressBook();
    const existing = addressBook.find(
      item => item.label === label && item.address === address,
    );
    if (!existing) {
      // no exists, do nothing
      return addressBook;
    }
    // Spread the existing entry so the multi-chain fields (chain, swapChain)
    // survive a color/own-only refresh.
    const newItem: AddressBookFileClass = {
      ...existing,
      label,
      address,
      color,
      own,
    };
    const newAddressBook: AddressBookFileClass[] = [
      ...addressBook.filter(
        item => item.label !== label && item.address !== address,
      ),
      newItem,
    ];
    return await this.writeAddressBook(newAddressBook);
  }

  // Write only one item
  static async writeAddressBookItem(
    label: string,
    typedAddress: string,
    color: string,
    own: boolean,
    // Default to a mainnet Zcash contact — the common case and what the
    // existing Zcash-only callers expect. Chain-aware callers (the swap flow /
    // the AbDetail chain selector) pass explicit values.
    chain: ChainNameEnum = ChainNameEnum.mainChainName,
    swapChain: string = GlobalConst.zecSwapChain,
  ): Promise<AddressBookFileClass[]> {
    const address = canonicalChainAddress(swapChain, typedAddress);
    const addressBook = await this.readAddressBook();
    if (
      addressBook.filter(
        item => item.label === label && item.address === address,
      ).length > 0
    ) {
      // already exists the combination of label & address -> update fields
      // (updateColorAndOwnItem preserves chain/swapChain via spread).
      return await this.updateColorAndOwnItem(label, address, color, own);
    }

    let newAddressBook: AddressBookFileClass[];
    const newItem: AddressBookFileClass = {
      label,
      address,
      color,
      own,
      chain,
      swapChain,
    };

    if (addressBook.filter(item => item.label === label).length > 0) {
      // already exists the label -> update the address
      newAddressBook = [
        ...addressBook.filter(item => item.label !== label),
        newItem,
      ];
    } else if (
      addressBook.filter(item => item.address === address).length > 0
    ) {
      // already exists the address -> update the label
      newAddressBook = [
        ...addressBook.filter(item => item.address !== address),
        newItem,
      ];
    } else {
      // this is new item -> add it
      newAddressBook = [...addressBook, newItem];
    }
    return await this.writeAddressBook(newAddressBook);
  }

  // remove one item
  static async removeAddressBookItem(
    label: string,
    address: string,
  ): Promise<AddressBookFileClass[]> {
    const addressBook = await this.readAddressBook();
    // the rest of the items
    let newAddressBook: AddressBookFileClass[] = addressBook.filter(
      item => !(item.label === label && item.address === address),
    );
    return await this.writeAddressBook(newAddressBook);
  }

  /** Saves a Zcash contact, replacing the one it edits, and returns the book in name order. */
  static async saveContact(
    previous: AddressBookFileClass | undefined,
    label: string,
    address: string,
    chain: ChainNameEnum,
  ): Promise<AddressBookFileClass[]> {
    if (previous) {
      await this.removeAddressBookItem(previous.label, previous.address);
    }
    const own = await isWalletAddress(address);
    const book = await this.writeAddressBookItem(
      label,
      address,
      previous ? previous.color : Utils.generateColorList(1)[0],
      own,
      chain,
      GlobalConst.zecSwapChain,
    );
    const sorted = [...book].sort((a, b) => a.label.localeCompare(b.label));
    return await this.writeAddressBook(sorted);
  }

  // Read the entire address book
  static async readAddressBook(): Promise<AddressBookFileClass[]> {
    try {
      const fileName = await this.getFileName();
      const fileExits: boolean = await RNFS.exists(fileName);
      if (!fileExits) {
        console.log('address book read file: The file does not exists');
        return [] as AddressBookFileClass[];
      }

      const addressBook: AddressBookFileClass[] = await JSON.parse(
        (await RNFS.readFile(fileName, GlobalConst.utf8)).toString(),
      );
      return addressBook;
    } catch {
      // The File doesn't exist, so return nothing
      return [] as AddressBookFileClass[];
    }
  }

  // Write the entire address book
  static async writeAddressBook(
    newAddressBook: AddressBookFileClass[],
  ): Promise<AddressBookFileClass[]> {
    try {
      const fileName = await this.getFileName();
      await RNFS.writeFile(
        fileName,
        JSON.stringify(newAddressBook),
        GlobalConst.utf8,
      );
      return newAddressBook;
    } catch {
      return [] as AddressBookFileClass[];
    }
  }
}
