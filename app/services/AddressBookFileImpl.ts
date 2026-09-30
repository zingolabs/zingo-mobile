import * as RNFS from 'react-native-fs';

import {
  AddressBookFileClass,
  ChainNameEnum,
  GlobalConst,
} from '@app/AppState';

export default class AddressBookFileImpl {
  private static pending: Promise<void> = Promise.resolve();

  private static enqueue(write: () => Promise<AddressBookFileClass[]>) {
    const pending = this.pending.then(write);
    this.pending = pending.then(
      () => undefined,
      () => undefined,
    );
    return pending;
  }

  private static mutate(
    change: (book: AddressBookFileClass[]) => AddressBookFileClass[],
  ) {
    return this.enqueue(async () => {
      const book = await this.readAddressBook();
      const changed = change(book);
      if (changed === book) {
        return book;
      }
      changed.sort((a, b) => a.label.localeCompare(b.label));
      return this.persist(changed);
    });
  }

  static async getFileName() {
    return RNFS.DocumentDirectoryPath + '/addressbook.json';
  }

  static async updateColorAndOwnItem(
    label: string,
    address: string,
    color: string,
    own: boolean,
  ): Promise<AddressBookFileClass[]> {
    return this.mutate(book =>
      this.updateEntry(book, label, address, color, own),
    );
  }

  private static updateEntry(
    addressBook: AddressBookFileClass[],
    label: string,
    address: string,
    color: string,
    own: boolean,
  ) {
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
    return newAddressBook;
  }

  // Write only one item
  static async writeAddressBookItem(
    label: string,
    address: string,
    color: string,
    own: boolean,
    // Default to a mainnet Zcash contact — the common case and what the
    // existing Zcash-only callers expect. Chain-aware callers (the swap flow /
    // the AbDetail chain selector) pass explicit values.
    chain: ChainNameEnum = ChainNameEnum.mainChainName,
    swapChain: string = GlobalConst.zecSwapChain,
  ): Promise<AddressBookFileClass[]> {
    return this.mutate(addressBook => {
      if (
        addressBook.filter(
          item => item.label === label && item.address === address,
        ).length > 0
      ) {
        // already exists the combination of label & address -> update fields
        // (updateColorAndOwnItem preserves chain/swapChain via spread).
        return this.updateEntry(addressBook, label, address, color, own);
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
      return newAddressBook;
    });
  }

  // remove one item
  static async removeAddressBookItem(
    label: string,
    address: string,
  ): Promise<AddressBookFileClass[]> {
    return this.mutate(addressBook =>
      addressBook.filter(
        item => !(item.label === label && item.address === address),
      ),
    );
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
    } catch (err) {
      // The File doesn't exist, so return nothing
      return [] as AddressBookFileClass[];
    }
  }

  // Write the entire address book
  static async writeAddressBook(
    newAddressBook: AddressBookFileClass[],
  ): Promise<AddressBookFileClass[]> {
    return this.enqueue(() => this.persist(newAddressBook));
  }

  private static async persist(
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
    } catch (err) {
      return [] as AddressBookFileClass[];
    }
  }
}
