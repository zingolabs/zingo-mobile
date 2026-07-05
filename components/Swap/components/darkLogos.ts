import { TokenEntryType } from '../../../app/swap';

/**
 * Curated set of assets whose logo PNG is a very dark / near-black mark on a
 * transparent background. These are the only logos that need a light neutral
 * canvas behind them: without it the dark glyph vanishes against the dark
 * sheet. Every other logo is left transparent (a colour mark reads fine on the
 * dark surface, and a neutral disc behind it looked "punched-out" and ugly —
 * the reason we removed the blanket background).
 *
 * Keyed by `CHAIN:TICKER` (both uppercase), NOT by ticker alone: the same
 * brand can ship different art per chain. NEAR is the example — its logo is a
 * black transparent mark only on BNB Chain; on the other chains it already
 * carries its usual opaque (green) disc and must stay transparent. Matching on
 * ticker alone would wrongly stamp a grey canvas behind those. BNB Chain
 * surfaces as either `BNB` or `BSC` depending on the provider (see
 * `chainDisplayName.ts`), so both codes are listed.
 *
 * Automatic pixel-luminance detection is unreliable here: these marks are
 * mostly transparent, so any average-colour probe skews light and
 * misclassifies the exact assets we care about — hence a hand-maintained list.
 *
 * To add one: spot a logo that disappears on the dark sheet, add its
 * `CHAIN:TICKER` (uppercase) below.
 */
const DARK_LOGO_KEYS = new Set<string>([
  'BNB:NEAR', // NEAR on BNB Chain: black transparent mark
  'BSC:NEAR', // same asset when the provider labels the chain "BSC"
]);

/** Neutral canvas painted behind a dark logo so its glyph stays visible. */
export const DARK_LOGO_BACKDROP = '#E8E8E8';

/**
 * True when the token's logo is a dark mark that needs {@link DARK_LOGO_BACKDROP}
 * behind it. Everything else renders with a transparent background.
 */
export function isDarkLogo(token: TokenEntryType): boolean {
  const key = `${(token.chain || '').toUpperCase()}:${(token.ticker || '').toUpperCase()}`;
  return DARK_LOGO_KEYS.has(key);
}
