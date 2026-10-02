import { chunks, mask, trim } from '@app/utils/reveal';

const TRIM_KEEP = 7;
const ADDRESS_SHORT = 50;
const ADDRESS_SHORT_LINES = 2;
const ADDRESS_LINE = 30;
const LABEL_LINE = 20;

/** A text with the number of lines of its full form and whether its short form is trimmed. */
export type Field = { text: string; lines: number; trims: boolean };

export type TextView =
  | { kind: 'masked'; text: string }
  | { kind: 'trimmed'; text: string }
  | { kind: 'full'; lines: string[] };

export const addressLines = (address: string): number =>
  address.length === 0
    ? 0
    : address.length < ADDRESS_SHORT
      ? ADDRESS_SHORT_LINES
      : address.length / ADDRESS_LINE;

export const labelLines = (label: string): number =>
  label.length === 0
    ? 0
    : label.length < LABEL_LINE
      ? 1
      : label.length / LABEL_LINE;

/** The form in which a field shows for a privacy mode and a reveal. */
export const textView = (
  field: Field,
  privacy: boolean,
  revealed: boolean,
): TextView =>
  revealed
    ? {
        kind: 'full',
        lines: chunks(field.text, Math.round(field.lines)),
      }
    : privacy
      ? { kind: 'masked', text: mask(field.text) }
      : field.trims
        ? { kind: 'trimmed', text: trim(field.text, TRIM_KEEP) }
        : { kind: 'full', lines: [field.text] };

export const viewLines = (view: TextView): string[] =>
  view.kind === 'full' ? view.lines : [view.text];
