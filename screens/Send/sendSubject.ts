import type {
  AddressBookFileClass,
  ToAddrClass,
  TranslateType,
  ValueTransferType,
} from '@app/AppState';
import { ValueTransferKindEnum } from '@app/AppState/enums/ValueTransferKindEnum';
import Utils from '@app/utils';
import { formatAmount } from '@app/utils/formatAmount';
import type { ComputingSubject } from '@app/walletBackend/transforms/sendSettlement';

/** A TEX address only takes transparent funds, so a send to it goes in two transactions. */
const TEX = /^tex(test)?1/i;

/** What the sending screen names: how much goes, and the contact, Zcash Name or short address it goes to. */
export function sendSubject(
  to: ToAddrClass,
  addressBook: AddressBookFileClass[],
): ComputingSubject {
  return {
    amount: formatAmount(Utils.parseStringLocaleToNumberFloat(to.amount)),
    who:
      addressBook.find(entry => entry.address === to.to)?.label ||
      to.znsAlias ||
      Utils.trimToSmall(to.to, 6),
    kind: 'send',
    pair: TEX.test(to.to.trim()),
  };
}

/** The same, for a transaction History reopens on the sending screen: each transaction of a TEX send on its own. */
export function transferSubject(
  vt: ValueTransferType,
  addressBook: AddressBookFileClass[],
  translate: (key: string) => TranslateType,
): ComputingSubject {
  const shield = vt.kind === ValueTransferKindEnum.Shield;
  return {
    amount: formatAmount(vt.amount),
    who: shield
      ? (translate('send.shield-who') as string)
      : addressBook.find(entry => entry.address === vt.address)?.label ||
        Utils.trimToSmall(vt.address ?? '', 6),
    kind: shield ? 'shield' : 'send',
    pair: false,
  };
}
