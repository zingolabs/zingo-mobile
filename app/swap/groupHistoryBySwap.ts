import type ValueTransferType from '@app/AppState/types/ValueTransferType';
import { ValueTransferKindEnum } from '@app/AppState';
import { isRealLegHash } from './providers/trackUpdateBase';
import type { SwapRecordType } from './types/SwapRecordType';

/**
 * History grouped by swap: each swap row followed by the Zcash transactions it
 * made in this wallet.
 *
 * Chronological order keeps a swap next to its transactions only by accident.
 * A one-transaction NEAR deposit sits beside its swap because it shares the
 * swap row's txid and happens moments after it; a ZIP 320 deposit is two
 * transactions and only one shares that txid, a refund arrives hours later,
 * and an inbound swap's delivery shares no txid with the row at all.
 *
 * Everything here is linear over the list, with one map lookup per row, so it
 * adds nothing that grows with a long history beyond the sort the list already
 * does.
 */

const isZcash = (chain: string): boolean => chain.toUpperCase() === 'ZEC';

/**
 * Every Zcash transaction a swap made in this wallet, keyed by txid.
 *
 * Only hashes on Zcash: a hash from the other chain can never match a row of
 * this wallet. For a swap selling ZEC that is its broadcast (every hop of it)
 * and a refund, which comes back on the chain the deposit left from; for a
 * swap buying ZEC, its delivery.
 */
export function swapTxidIndex(
  records: ReadonlyArray<SwapRecordType>,
): Map<string, string> {
  const index = new Map<string, string>();
  const add = (hash: string | undefined, recordId: string) => {
    // First swap wins. One transaction belonging to two swaps is not a case
    // the flow produces, and a row can only be drawn once.
    if (isRealLegHash(hash) && !index.has(hash)) index.set(hash, recordId);
  };
  for (const record of records) {
    if (isZcash(record.sellAsset.chain)) {
      add(record.broadcast?.txId, record.recordId);
      record.broadcast?.allTxIds?.forEach(hop => add(hop, record.recordId));
      add(record.observedDepositTxHash, record.recordId);
      add(record.refundInfo?.refundTxHash, record.recordId);
    }
    if (isZcash(record.receiveAsset.chain)) {
      add(record.destinationTxHash, record.recordId);
    }
  }
  return index;
}

/** The swap a row belongs to: its own for a swap row, its swap's for a transaction. */
export function swapGroupOf(
  vt: ValueTransferType,
  index: ReadonlyMap<string, string>,
): string | undefined {
  return vt.kind === ValueTransferKindEnum.Swap
    ? vt.swapRecordId
    : index.get(vt.txid);
}

/**
 * The same rows, each swap followed by its transactions.
 *
 * A group sits where its swap row sits, so a refund that arrived hours later
 * reads under the swap it belongs to rather than at its own time. Inside the
 * group the transactions run oldest first, the order the swap happened in:
 * deposit, then any hop, then the refund or the delivery.
 *
 * `rows` is newest first, as the history already is. A transaction whose swap
 * has no row in the list stays where it was.
 */
export function groupHistoryBySwap(
  rows: ReadonlyArray<ValueTransferType>,
  index: ReadonlyMap<string, string>,
): ValueTransferType[] {
  const swapRows = new Set<string>();
  for (const vt of rows) {
    if (vt.kind === ValueTransferKindEnum.Swap && vt.swapRecordId)
      swapRows.add(vt.swapRecordId);
  }

  const members = new Map<string, ValueTransferType[]>();
  for (const vt of rows) {
    if (vt.kind === ValueTransferKindEnum.Swap) continue;
    const swapId = index.get(vt.txid);
    if (!swapId || !swapRows.has(swapId)) continue;
    const bucket = members.get(swapId);
    if (bucket) bucket.push(vt);
    else members.set(swapId, [vt]);
  }

  const grouped: ValueTransferType[] = [];
  for (const vt of rows) {
    if (vt.kind === ValueTransferKindEnum.Swap) {
      grouped.push(vt);
      // Collected newest first, like the list; the group reads oldest first.
      const bucket = vt.swapRecordId ? members.get(vt.swapRecordId) : undefined;
      if (bucket)
        for (let i = bucket.length - 1; i >= 0; i--) grouped.push(bucket[i]);
      continue;
    }
    const swapId = index.get(vt.txid);
    if (swapId && swapRows.has(swapId)) continue; // drawn with its swap
    grouped.push(vt);
  }
  return grouped;
}

/**
 * The first `count` rows, extended so the page does not end halfway through a
 * swap's group: the rows that follow and belong to the same swap as the last
 * one shown come along with it.
 */
export function sliceKeepingGroups(
  rows: ReadonlyArray<ValueTransferType>,
  count: number,
  groupOf: (vt: ValueTransferType) => string | undefined,
): ValueTransferType[] {
  let end = Math.min(count, rows.length);
  const lastGroup = end > 0 ? groupOf(rows[end - 1]) : undefined;
  if (lastGroup) {
    while (end < rows.length && groupOf(rows[end]) === lastGroup) end++;
  }
  return rows.slice(0, end);
}
