/**
 * A number as the dot-separated decimal SwapKit reads, whatever the device's
 * locale, never in exponent notation.
 */
export function toDottedDecimal(value: number): string {
  const plain = String(value);
  if (!/e/i.test(plain)) {
    return plain;
  }
  return value.toFixed(20).replace(/0+$/, '').replace(/\.$/, '');
}
