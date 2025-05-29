import * as RNFS from 'react-native-fs';

import { AddressBookFileClass } from '../../app/AppState';

export default class AddressBookFileImpl {
  static async getFileName() {
    return RNFS.DocumentDirectoryPath + '/addressbook.json';
  }

  static async updateColorItem(
    label: string,
    address: string,
    color: string,
  ): Promise<AddressBookFileClass[]> {
    const fileName = await this.getFileName();
    const addressBook = await this.readAddressBook(fileName);

    if (
      addressBook.filter(
        item => item.label === label && item.address === address,
      ).length === 0
    ) {
      // no exists, do nothing
      return addressBook;
    } else {
      let newAddressBook: AddressBookFileClass[];
      const newItem: AddressBookFileClass = { label, address, color };
      newAddressBook = [
        ...addressBook.filter(
          item => item.label !== label && item.address !== address,
        ),
        newItem,
      ];

      RNFS.writeFile(fileName, JSON.stringify(newAddressBook), 'utf8')
        .then(() => {
          //console.log('FILE WRITTEN!');
        })
        .catch(() => {
          return [] as AddressBookFileClass[];
        });
      return newAddressBook;
    }
  }

  // Write only one item
  static async writeAddressBookItem(
    label: string,
    address: string,
    color: string,
  ): Promise<AddressBookFileClass[]> {
    const fileName = await this.getFileName();
    const addressBook = await this.readAddressBook(fileName);

    if (
      addressBook.filter(
        item => item.label === label && item.address === address,
      ).length > 0
    ) {
      // already exists the combination of label & address & orchard address -> do nothing
      return addressBook;
    }

    let newAddressBook: AddressBookFileClass[];
    const newItem: AddressBookFileClass = { label, address, color };

    if (addressBook.filter(item => item.label === label && item.address === address).length > 0) {
      // already exists the label & the address -> update the orchard address
      newAddressBook = [...addressBook.filter(item => item.label !== label && item.address !== address), newItem];
    } else if (addressBook.filter(item => item.label === label).length > 0) {
      // already exists the label -> update the address
      newAddressBook = [...addressBook.filter(item => item.label !== label), newItem];
    } else if (addressBook.filter(item => item.address === address).length > 0) {
      // already exists the address -> update the label
      newAddressBook = [...addressBook.filter(item => item.address !== address), newItem];
    } else {
      // this is new item -> add it
      newAddressBook = [...addressBook, newItem];
    }

    //console.log(' address book write', newAddressBook);

    RNFS.writeFile(fileName, JSON.stringify(newAddressBook), 'utf8')
      .then(() => {
        //console.log('FILE WRITTEN!');
      })
      .catch(() => {
        return [] as AddressBookFileClass[];
      });
    return newAddressBook;
  }

  // remove one item
  static async removeAddressBookItem(label: string, address: string): Promise<AddressBookFileClass[]> {
    const fileName = await this.getFileName();
    const addressBook = await this.readAddressBook(fileName);

    // the rest of the items
    let newAddressBook: AddressBookFileClass[] = addressBook.filter(
      item => !(item.label === label && item.address === address),
    );

    //console.log(' address book remove', newAddressBook);

    RNFS.writeFile(fileName, JSON.stringify(newAddressBook), 'utf8')
      .then(() => {
        //console.log('FILE WRITTEN!')
      })
      .catch(() => {
        return [] as AddressBookFileClass[];
      });
    return newAddressBook;
  }

  // Read the entire address book
  static async readAddressBook(fileName: string): Promise<AddressBookFileClass[]> {
    try {
      const addressBook: AddressBookFileClass[] = await JSON.parse((await RNFS.readFile(fileName, 'utf8')).toString());
      return addressBook;
    } catch (err) {
      // The File doesn't exist, so return nothing
      return [] as AddressBookFileClass[];
    }
  }
}
