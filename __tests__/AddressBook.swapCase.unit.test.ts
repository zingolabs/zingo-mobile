import { ChainNameEnum } from '@app/AppState';
import AddressBookFileImpl from '@app/services/AddressBookFileImpl';

test('Tests that the address book stores a Bitcoin address in lowercase when it was typed in uppercase', async () => {
  jest.spyOn(AddressBookFileImpl, 'readAddressBook').mockResolvedValue([]);
  jest
    .spyOn(AddressBookFileImpl, 'writeAddressBook')
    .mockImplementation(async book => book);

  const book = await AddressBookFileImpl.writeAddressBookItem(
    'Alice',
    'BC1QW508D6QEJXTDG4Y5R3ZARVARY0C5XW7KV8F3T4',
    '#000000',
    false,
    ChainNameEnum.mainChainName,
    'BTC',
  );

  expect(book.map(contact => contact.address)).toEqual([
    'bc1qw508d6qejxtdg4y5r3zarvary0c5xw7kv8f3t4',
  ]);
});
