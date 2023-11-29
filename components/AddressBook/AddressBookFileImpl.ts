import * as RNFS from 'react-native-fs';

import { AddressBookFileClass } from '../../app/AppState';

export default class AddressBookFileImpl {
  static async getFileName() {
    return RNFS.DocumentDirectoryPath + '/addressbook.json';
  }

  // Write only one item
  static async writeAddressBookItem(label: string, address: string): Promise<AddressBookFileClass[]> {
    const fileName = await this.getFileName();
    const addressBook = await this.readAddressBook();

    if (addressBook.filter(item => item.label === label && item.address === address).length > 0) {
      // already exists the combination of label & address -> do nothing
      return addressBook;
    }

    let newAddressBook: AddressBookFileClass[];
    const newItem: AddressBookFileClass = { label, address };
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
    const addressBook = await this.readAddressBook();

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
  static async readAddressBook(): Promise<AddressBookFileClass[]> {
    const fileName = await this.getFileName();

    try {
      const addressBook: AddressBookFileClass[] = JSON.parse((await RNFS.readFile(fileName, 'utf8')).toString());
      return addressBook;
    } catch (err) {
      // The File doesn't exist, so return nothing
      return [] as AddressBookFileClass[];
    }
  }
}
