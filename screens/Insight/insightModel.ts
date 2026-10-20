import { AddressBookFileClass, ValueTransferKindEnum } from '@app/AppState';
import ValueTransferType from '@app/AppState/types/ValueTransferType';
import { themeTokens } from '@app/theme';

export const TOP = 5;
export const MIN_WEEKS = 4;
const WEEK_MS = 7 * 24 * 60 * 60 * 1000;
const PALETTE = [
  themeTokens.fgCategory1,
  themeTokens.fgCategory2,
  themeTokens.fgCategory3,
  themeTokens.fgCategory4,
  themeTokens.fgCategory5,
];
export const OTHERS_COLOR = themeTokens.fgMuted;

export type Cell = { amount: number; sends: number; bytes: number };

export type Group =
  | {
      kind: 'recipient';
      address: string;
      name: string;
      contact: boolean;
      color: string;
    }
  | { kind: 'others'; count: number; color: string };

export type Insight = {
  weeks: number;
  /** End of the last week, local midnight after today. */
  end: number;
  groups: Group[];
  /** cells[group][week], oldest week first. */
  cells: Cell[][];
};

export type Metric = 'amount' | 'sends';

const encoder = new TextEncoder();

const empty = (): Cell => ({ amount: 0, sends: 0, bytes: 0 });

/** Payments the wallet sent to an address, each recipient line on its own. */
const sendsOf = (transfers: ValueTransferType[]): ValueTransferType[] =>
  transfers.filter(
    vt => vt.kind === ValueTransferKindEnum.Sent && !!vt.address,
  );

/** Weekly sends per recipient: the five largest by amount, then the rest together. */
export const buildInsight = (
  transfers: ValueTransferType[],
  book: AddressBookFileClass[],
  now: Date,
): Insight => {
  const sends = sendsOf(transfers);
  const endDate = new Date(now);
  endDate.setHours(24, 0, 0, 0);
  const end = endDate.getTime();
  const first = sends.reduce(
    (min, vt) => Math.min(min, vt.time * 1000),
    end - WEEK_MS,
  );
  const weeks = Math.max(MIN_WEEKS, Math.floor((end - first) / WEEK_MS) + 1);

  const totals = new Map<string, number>();
  sends.forEach(vt =>
    totals.set(
      vt.address ?? '',
      (totals.get(vt.address ?? '') ?? 0) + vt.amount,
    ),
  );
  const ranked = [...totals.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([address]) => address);
  const top = ranked.slice(0, TOP);
  const rest = ranked.length - top.length;

  const contacts = new Map(book.map(c => [c.address, c]));
  const free = PALETTE.filter(
    color => !top.some(a => contacts.get(a)?.color === color),
  );
  const groups: Group[] = top.map(address => {
    const contact = contacts.get(address);
    return {
      kind: 'recipient',
      address,
      name: contact ? contact.label : '',
      contact: !!contact,
      color: contact ? contact.color : (free.shift() ?? OTHERS_COLOR),
    };
  });
  if (rest > 0) {
    groups.push({ kind: 'others', count: rest, color: OTHERS_COLOR });
  }

  const cells = groups.map(() => Array.from({ length: weeks }, empty));
  const counted = new Set<string>();
  sends.forEach(vt => {
    const address = vt.address ?? '';
    const at = top.indexOf(address);
    const g = at >= 0 ? at : groups.length - 1;
    const w = weeks - 1 - Math.floor((end - vt.time * 1000) / WEEK_MS);
    if (w < 0 || w >= weeks || groups.length === 0) {
      return;
    }
    const cell = cells[g][w];
    cell.amount += vt.amount;
    cell.bytes += encoder.encode((vt.memos ?? []).join('')).length;
    const key = `${vt.txid}:${address}`;
    if (!counted.has(key)) {
      counted.add(key);
      cell.sends += 1;
    }
  });

  return { weeks, end, groups, cells };
};

/** One group's sum over weeks a..b inclusive. */
export const groupTotal = (
  insight: Insight,
  g: number,
  a: number,
  b: number,
): Cell =>
  insight.cells[g].slice(a, b + 1).reduce(
    (sum, c) => ({
      amount: sum.amount + c.amount,
      sends: sum.sends + c.sends,
      bytes: sum.bytes + c.bytes,
    }),
    empty(),
  );

export const metricOf = (cell: Cell, metric: Metric): number =>
  metric === 'amount' ? cell.amount : cell.sends;

/** The last day of week w, at local midnight. */
export const weekEnd = (insight: Insight, w: number): Date =>
  new Date(insight.end - (insight.weeks - 1 - w) * WEEK_MS - 1);

/** A round axis top a little above the largest bar. */
export const niceTop = (max: number, metric: Metric): number => {
  if (metric === 'sends') {
    return Math.max(2, Math.ceil(max * 1.15));
  }
  if (max <= 0) {
    return 1;
  }
  const v = max * 1.08;
  const p = Math.pow(10, Math.floor(Math.log10(v)));
  const m = v / p;
  return (m <= 1 ? 1 : m <= 2 ? 2 : m <= 2.5 ? 2.5 : m <= 5 ? 5 : 10) * p;
};
