export const REVEAL_MS = 5 * 1000;

export const TRIM_KEEP_DEFAULT = 5;

const MASK_KEEP = 2;
const MASK_HIDE = 1;
const MASK_DOTS = '.....';
const CHUNK_MIN = 16;

/** Whether a text is hidden, or shown since a tap. */
export type Reveal = { kind: 'hidden' } | { kind: 'shown' };

/** Whether a text that hides only in the timed mode shows. */
export const visible = (reveal: Reveal, timed: boolean): boolean =>
  !timed || reveal.kind === 'shown';

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
