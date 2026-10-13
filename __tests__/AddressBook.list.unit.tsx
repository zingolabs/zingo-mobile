/**
 * @format
 */

import { AddressBookFileClass, ChainNameEnum } from '@app/AppState';
import { listedContacts } from '@screens/AddressBook/AddressBook';

const contact = (
  label: string,
  address: string,
  own = false,
  chain = ChainNameEnum.mainChainName,
): AddressBookFileClass =>
  new AddressBookFileClass(label, address, '#000000', own, chain, 'ZEC');

const book = [
  contact('Marta', 'u1marta'),
  contact('Ana', 'zs1ana'),
  contact('My savings', 'u1mine', true),
  contact('Testnet Luis', 'utest1luis', false, ChainNameEnum.testChainName),
];

describe('AddressBook list', () => {
  test('Tests that the list keeps other people on the wallet network, in name order, when the book also holds own tags and another network.', () => {
    expect(
      listedContacts(book, ChainNameEnum.mainChainName, '').map(c => c.label),
    ).toEqual(['Ana', 'Marta']);
  });

  test('Tests that the search finds a contact when the query is part of its address.', () => {
    expect(
      listedContacts(book, ChainNameEnum.mainChainName, 'MART').map(
        c => c.label,
      ),
    ).toEqual(['Marta']);
  });

  test('Tests that an entry without a chain counts as the wallet network when the book predates the chain field.', () => {
    const legacy = {
      ...contact('Old', 'u1old'),
      chain: '' as ChainNameEnum,
    };
    expect(
      listedContacts([legacy], ChainNameEnum.mainChainName, '').map(
        c => c.label,
      ),
    ).toEqual(['Old']);
  });
});
