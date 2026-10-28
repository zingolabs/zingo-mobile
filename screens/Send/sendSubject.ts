import type { AddressBookFileClass, ToAddrClass } from '@app/AppState';
import Utils from '@app/utils';
import { formatAmount } from '@app/utils/formatAmount';

/** What the sending screen names: how much goes, and the contact, Zcash Name or short address it goes to. */
export function sendSubject(
  to: ToAddrClass,
  addressBook: AddressBookFileClass[],
): { amount: string; who: string } {
  return {
    amount: formatAmount(Utils.parseStringLocaleToNumberFloat(to.amount)),
    who:
      addressBook.find(entry => entry.address === to.to)?.label ||
      to.znsAlias ||
      Utils.trimToSmall(to.to, 6),
  };
}
