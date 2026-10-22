import { ValueTransferKindEnum } from '@app/AppState';
import type { ValueTransferType } from '@app/AppState';
import { swapTxidIndex } from '@app/swap/groupHistoryBySwap';
import type { SwapRecordType } from '@app/swap';

/** One entry of the History list, in the order it draws. */
export type HistoryItem =
  | { kind: 'month'; key: string; label: string }
  | {
      kind: 'transfer';
      key: string;
      vt: ValueTransferType;
      /** First row under its month: it draws no hairline above. */
      first: boolean;
    }
  | {
      kind: 'swap';
      key: string;
      vt: ValueTransferType;
      record: SwapRecordType | undefined;
      first: boolean;
      /** The Zcash transactions folded under the row. */
      legCount: number;
      open: boolean;
    }
  | {
      kind: 'leg';
      key: string;
      vt: ValueTransferType;
      recordId: string;
      /** Last leg of its swap: it closes the fold. */
      last: boolean;
    };

/**
 * The History list: a month label wherever the month changes, one row per
 * transfer, one row per swap, and a swap's own Zcash transactions folded
 * under it rather than among the rest.
 *
 * `rows` is what the list shows, filtered and paged; `all` is every
 * transfer, so a swap's legs are found even when they were paged or
 * filtered out. A transaction a swap made never shows as a row of its own.
 */
export function buildHistoryItems(args: {
  rows: ValueTransferType[];
  all: ValueTransferType[];
  records: SwapRecordType[];
  open: ReadonlySet<string>;
  monthOf: (timeSec: number) => string;
}): HistoryItem[] {
  const { rows, all, records, open, monthOf } = args;
  const index = swapTxidIndex(records);
  const recordById = new Map(records.map(r => [r.recordId, r]));
  const legsOf = new Map<string, ValueTransferType[]>();
  for (const vt of all) {
    if (vt.kind === ValueTransferKindEnum.Swap) {
      continue;
    }
    const recordId = index.get(vt.txid);
    if (recordId) {
      legsOf.set(recordId, [...(legsOf.get(recordId) ?? []), vt]);
    }
  }

  const items: HistoryItem[] = [];
  let month = '';
  for (const vt of rows) {
    const isSwap = vt.kind === ValueTransferKindEnum.Swap;
    if (!isSwap && index.has(vt.txid)) {
      continue;
    }
    const label = monthOf(vt.time);
    const first = label !== month;
    if (first) {
      month = label;
      items.push({ kind: 'month', key: `month:${label}`, label });
    }
    if (!isSwap || !vt.swapRecordId) {
      items.push({
        kind: 'transfer',
        key: `vt:${vt.txid}:${vt.kind}`,
        vt,
        first,
      });
      continue;
    }
    const recordId = vt.swapRecordId;
    const legs = [...(legsOf.get(recordId) ?? [])].sort(
      (a, b) => a.time - b.time,
    );
    const isOpen = open.has(recordId) && legs.length > 0;
    items.push({
      kind: 'swap',
      key: `swap:${recordId}`,
      vt,
      record: recordById.get(recordId),
      first,
      legCount: legs.length,
      open: isOpen,
    });
    if (isOpen) {
      legs.forEach((leg, i) =>
        items.push({
          kind: 'leg',
          key: `leg:${recordId}:${leg.txid}:${leg.kind}`,
          vt: leg,
          recordId,
          last: i === legs.length - 1,
        }),
      );
    }
  }
  return items;
}

/** The fixed height each kind of item lays out at. */
export const ITEM_HEIGHT: Record<HistoryItem['kind'], number> = {
  month: 38,
  transfer: 64,
  swap: 64,
  leg: 46,
};

/**
 * The month label to pin at the top of the list for a scroll offset: the
 * last month that starts at or above it. Empty at the very top, where the
 * list's own first label is in view.
 */
export function monthAt(items: HistoryItem[], offsetY: number): string {
  if (offsetY <= 0) {
    return '';
  }
  let top = 0;
  let label = '';
  for (const item of items) {
    if (top > offsetY) {
      break;
    }
    if (item.kind === 'month') {
      label = item.label;
    }
    top += ITEM_HEIGHT[item.kind];
  }
  return label;
}
