/** Tells whether two SwapKit asset identifiers name the same asset, ignoring case. */
export function sameAsset(
  a: string | undefined,
  b: string | undefined,
): boolean {
  return !!a && !!b && a.toUpperCase() === b.toUpperCase();
}
