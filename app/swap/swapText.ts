/**
 * A sentence the swap layer puts to the user, kept as a translation key so
 * the layer stays free of the app's language. Provider prose that no key can
 * say comes through as written.
 */
export type SwapTextType =
  | {
      kind: 'key';
      key: string;
      params?: Readonly<Record<string, string | SwapTextType>>;
    }
  | { kind: 'raw'; text: string }
  | { kind: 'lines'; lines: readonly SwapTextType[] };

export const swapKey = (
  key: string,
  params?: Readonly<Record<string, string | SwapTextType>>,
): SwapTextType => ({ kind: 'key', key, params });

export const swapRaw = (text: string): SwapTextType => ({ kind: 'raw', text });

/** The text in the app's language; `{name}` in a translation takes its param. */
export function renderSwapText(
  text: SwapTextType,
  translate: (key: string) => string,
): string {
  if (text.kind === 'raw') return text.text;
  if (text.kind === 'lines')
    return text.lines.map(line => renderSwapText(line, translate)).join('\n');
  return Object.entries(text.params ?? {}).reduce(
    (sentence, [name, value]) =>
      sentence
        .split(`{${name}}`)
        .join(
          typeof value === 'string' ? value : renderSwapText(value, translate),
        ),
    translate(text.key),
  );
}
