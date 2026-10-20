/** Smallest area anything tappable takes, even when its icon is 16 or 20. */
export const touchTarget = 44;

/** Minimum heights: each one grows with its text. */
export const buttonMinHeight = 44;
export const buttonMinHeightSmall = 32;
export const fieldMinHeight = 48;
export const rowMinHeight = 56;
export const chipMinHeight = 32;

export const iconSizeSm = 16;
export const iconSizeMd = 20;
/** Navigation icons and the drawing grid of every icon. */
export const iconSize = 24;
/** The visible stroke of every icon, the same at 16, 20 and 24: the weight of regular text. */
export const iconStroke = 1.75;

/** The hitSlop that grows an icon-only button of `size` to `touchTarget`. */
export const slopFor = (size: number) => {
  const d = Math.max(0, Math.ceil((touchTarget - size) / 2));
  return { top: d, bottom: d, left: d, right: d };
};
