export const REVEAL_MS = 5 * 1000;

export const TRIM_KEEP_DEFAULT = 5;

const MASK_KEEP = 2;
const MASK_HIDE = 1;
const MASK_DOTS = '.....';
const TRIM_KEEP = 7;
const CHUNK_MIN = 16;

const ADDRESS_SHORT = 50;
const ADDRESS_SHORT_LINES = 2;
const ADDRESS_LINE = 30;
const LABEL_LINE = 20;

/** Whether a text is hidden, or shown since a tap that was timed or not. */
export type Reveal = { kind: 'hidden' } | { kind: 'shown'; timed: boolean };

/** A text with the number of lines of its full form and whether its short form is trimmed. */
export type Field = { text: string; lines: number; trims: boolean };

export type TextView =
  | { kind: 'masked'; text: string }
  | { kind: 'trimmed'; text: string }
  | { kind: 'full'; lines: string[] };

/** Whether a reveal shows its text under the current timing mode. */
export const shown = (reveal: Reveal, timed: boolean): boolean =>
  reveal.kind === 'shown' && reveal.timed === timed;

/** Whether a text that hides only in the timed mode shows. */
export const visible = (reveal: Reveal, timed: boolean): boolean =>
  !timed || shown(reveal, timed);

export const trim = (text: string, keep: number): string =>
  `${text.slice(0, keep)}...${text.slice(text.length - keep)}`;

/** A text cut into a number of chunks of equal size, the last chunk taking the rest. */
export const chunks = (text: string, count: number): string[] => {
  if (count > text.length || text.length < CHUNK_MIN) {
    return [text];
  }
  const size: number = Math.round(text.length / count);
  return [
    ...Array.from({ length: count - 1 }, (_, index: number) =>
      text.slice(index * size, (index + 1) * size),
    ),
    text.slice((count - 1) * size),
  ];
};

/** The first characters of a text, with at least one character hidden, followed by dots. */
export const mask = (text: string): string => {
  const chars: string[] = Array.from(text);
  const keep: number = Math.max(
    0,
    Math.min(MASK_KEEP, chars.length - MASK_HIDE),
  );
  return `${chars.slice(0, keep).join('')}${MASK_DOTS}`;
};

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
