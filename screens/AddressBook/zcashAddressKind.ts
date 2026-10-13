import { ChainNameEnum } from '@app/AppState';
import { parseAddress } from '@app/walletBackend';
import { RPCAddressKindEnum } from '@app/walletBackend/enums/RPCAddressKindEnum';
import { RPCParseAddressStatusEnum } from '@app/walletBackend/enums/RPCParseAddressStatusEnum';
import { RPCParseAddressType } from '@app/walletBackend/types/RPCParseAddressType';

export type ZcashAddressKind = 'unified' | 'sapling' | 'transparent' | 'tex';

export type AddressCheck =
  | { kind: 'empty' }
  | { kind: 'invalid' }
  | { kind: 'valid'; type: ZcashAddressKind };

const kindOf = (info: RPCParseAddressType): ZcashAddressKind | 'none' => {
  switch (info.address_kind) {
    case RPCAddressKindEnum.unifiedAddressKind:
      return 'unified';
    case RPCAddressKindEnum.saplingAddressKind:
      return 'sapling';
    case RPCAddressKindEnum.transparentAddressKind:
      return 'transparent';
    case RPCAddressKindEnum.texAddressKind:
      return 'tex';
    default:
      return 'none';
  }
};

/** Classifies an address through zingolib; valid only on the wallet's own network. */
export async function checkZcashAddress(
  address: string,
  chain: ChainNameEnum,
): Promise<AddressCheck> {
  if (address.length === 0) {
    return { kind: 'empty' };
  }
  const parsed = await parseAddress(address);
  if (!parsed.ok) {
    return { kind: 'invalid' };
  }
  const info: RPCParseAddressType = JSON.parse(parsed.value);
  const type = kindOf(info);
  if (
    info.status !== RPCParseAddressStatusEnum.successAddressParse ||
    info.chain_name !== chain ||
    type === 'none'
  ) {
    return { kind: 'invalid' };
  }
  return { kind: 'valid', type };
}

/** Whether a Zcash address is transparent, from its prefix alone. */
export const isPublicAddress = (address: string): boolean =>
  /^t/i.test(address);
