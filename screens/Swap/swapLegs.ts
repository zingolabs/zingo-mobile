import { ValueTransferKindEnum } from '@app/AppState';
import type { ValueTransferType } from '@app/AppState';
import { SwapStatusEnum, providerShortLabel, swapTxidIndex } from '@app/swap';
import { isThorchainFamily } from '@app/swap/thorchainFamily';
import type { SwapRecordType } from '@app/swap';

type Translate = (key: string) => string;

/** The Zcash transactions a swap made in this wallet, oldest first. */
export function legsOf(
  records: SwapRecordType[],
  transfers: ValueTransferType[],
  recordId: string,
): ValueTransferType[] {
  const index = swapTxidIndex(records);
  return transfers
    .filter(
      vt =>
        vt.kind !== ValueTransferKindEnum.Swap &&
        index.get(vt.txid) === recordId,
    )
    .sort((a, b) => a.time - b.time);
}

/** The deshield to the wallet's own transparent address before a memo deposit. */
export function isHop(leg: ValueTransferType, record: SwapRecordType): boolean {
  const hops = record.broadcast?.allTxIds;
  return (
    leg.kind === ValueTransferKindEnum.SendToSelf ||
    (!!hops && hops.length > 1 && hops[0] === leg.txid)
  );
}

/** What a leg was, in plain words. */
export function legName(
  leg: ValueTransferType,
  record: SwapRecordType,
  t: Translate,
): string {
  if (isHop(leg, record)) {
    return t('swap.leg-to-self');
  }
  if (leg.kind !== ValueTransferKindEnum.Received) {
    return `${t('swap.leg-payment-to')} ${providerShortLabel(record.provider)}`;
  }
  return t(
    record.status === SwapStatusEnum.Completed
      ? 'swap.leg-zec-received'
      : 'swap.leg-refund',
  );
}

/** One line on what the leg's address is, and whether to warn off sending to it. */
export function legRole(
  leg: ValueTransferType,
  record: SwapRecordType,
  t: Translate,
): { note: string; warn: boolean } {
  const provider = providerShortLabel(record.provider);
  if (isHop(leg, record)) {
    return {
      note: `${t('swap.leg-hop-note-1')} ${provider}${t('swap.leg-hop-note-2')} ${provider} ${t('swap.leg-hop-note-3')}`,
      warn: false,
    };
  }
  if (leg.kind !== ValueTransferKindEnum.Received) {
    return { note: `${provider} ${t('swap.leg-payment-note')}`, warn: true };
  }
  if (record.status !== SwapStatusEnum.Completed) {
    return {
      note: isThorchainFamily(record.provider)
        ? `${provider} ${t('swap.leg-refund-note-memo')}`
        : t('swap.leg-refund-note'),
      warn: false,
    };
  }
  return { note: t('swap.leg-received-note'), warn: false };
}
