import * as RNFS from 'react-native-fs';

import { AddressBookFileClass, GlobalConst } from '../../app/AppState';

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
    if (
      addressBook.filter(
        item => item.label === label && item.address === address,
      ).length === 0
    ) {
      // no exists, do nothing
      return addressBook;
    } else {
      let newAddressBook: AddressBookFileClass[];
      const newItem: AddressBookFileClass = { label, address, color, own };
      newAddressBook = [
        ...addressBook.filter(
          item => item.label !== label && item.address !== address,
        ),
        newItem,
      ];
      return await this.writeAddressBook(newAddressBook);
    }
  }

  // Write only one item
  static async writeAddressBookItem(
    label: string,
    address: string,
    color: string,
    own: boolean,
  ): Promise<AddressBookFileClass[]> {
    const addressBook = await this.readAddressBook();
    if (
      addressBook.filter(
        item => item.label === label && item.address === address,
      ).length > 0
    ) {
      // already exists the combination of label & address -> update fields
      return await this.updateColorAndOwnItem(label, address, color, own);
    }

    let newAddressBook: AddressBookFileClass[];
    const newItem: AddressBookFileClass = { label, address, color, own };

    if (addressBook.filter(item => item.label === label).length > 0) {
      // already exists the label -> update the address
      newAddressBook = [...addressBook.filter(item => item.label !== label), newItem];
    } else if (addressBook.filter(item => item.address === address).length > 0) {
      // already exists the address -> update the label
      newAddressBook = [...addressBook.filter(item => item.address !== address), newItem];
    } else {
      // this is new item -> add it
      newAddressBook = [...addressBook, newItem];
    }
    return await this.writeAddressBook(newAddressBook);
  }

  // remove one item
  static async removeAddressBookItem(label: string, address: string): Promise<AddressBookFileClass[]> {
    const addressBook = await this.readAddressBook();
    // the rest of the items
    let newAddressBook: AddressBookFileClass[] = addressBook.filter(
      item => !(item.label === label && item.address === address),
    );
    return await this.writeAddressBook(newAddressBook);
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

      const addressBook: AddressBookFileClass[] = await JSON.parse((await RNFS.readFile(fileName, GlobalConst.utf8 as BufferEncoding)).toString());
      return addressBook;
    } catch (err) {
      // The File doesn't exist, so return nothing
      return [] as AddressBookFileClass[];
    }
  }

  // Write the entire address book
  static async writeAddressBook(newAddressBook: AddressBookFileClass[]): Promise<AddressBookFileClass[]> {
    try {
      const fileName = await this.getFileName();
      RNFS.writeFile(fileName, JSON.stringify(newAddressBook), GlobalConst.utf8 as BufferEncoding)
        .then(() => {
          //console.log('FILE WRITTEN!')
        })
        .catch(() => {
          return [] as AddressBookFileClass[];
        });
      return newAddressBook;
    } catch (err) {
      return [] as AddressBookFileClass[];
    }
  }
}
