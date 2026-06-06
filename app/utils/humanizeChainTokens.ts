import { TranslateType } from '../AppState/types/TranslateType';

/**
 * zingolib surfaces chain-mismatch errors with the raw `ChainNameEnum`
 * values ("main" / "test" / "regtest") embedded in the message (e.g.
 * "Wallet chain name main doesn't match expected test"). This helper
 * rewrites any standalone occurrence of those tokens with the matching
 * `settings.value-chainname-*` translation (Mainnet / Testnet / Regtest)
 * so error alerts and snackbars read naturally to the user.
 *
 * The match is word-bounded, so the substitution is safe for messages
 * that don't contain a chain reference at all.
 */
export function humanizeChainTokens(
  text: string,
  translate: (key: string) => TranslateType,
): string {
  return text.replace(
    /\b(main|test|regtest)\b/g,
    token => translate(`settings.value-chainname-${token}`) as string,
  );
}
