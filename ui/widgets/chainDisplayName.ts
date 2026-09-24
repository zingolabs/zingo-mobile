/**
 * Friendly display name for a SwapKit chain code (`token.chain`).
 *
 * SwapKit's REST API does not expose a "list of chains with display names"
 * endpoint, so we maintain a small lookup table for the chains the user is
 * likely to see in the picker. Unknown chains fall back to the raw code in
 * upper case so we still render something usable.
 */
const CHAIN_DISPLAY: Readonly<Record<string, string>> = {
  ADA: 'Cardano',
  ARB: 'Arbitrum',
  ATOM: 'Cosmos',
  AVAX: 'Avalanche',
  BASE: 'Base',
  BCH: 'Bitcoin Cash',
  BERA: 'Berachain',
  BNB: 'BNB Chain',
  BSC: 'BNB Chain',
  BTC: 'Bitcoin',
  CRO: 'Cronos',
  DASH: 'Dash',
  DOGE: 'Dogecoin',
  DOT: 'Polkadot',
  ETH: 'Ethereum',
  FTM: 'Fantom',
  KAVA: 'Kava',
  LTC: 'Litecoin',
  MAYA: 'Mayachain',
  MNT: 'Mantle',
  NEAR: 'Near',
  OP: 'Optimism',
  POL: 'Polygon',
  RUNE: 'Thorchain',
  SCRT: 'Secret Network',
  SOL: 'Solana',
  STRK: 'Starknet',
  SUI: 'Sui',
  THOR: 'Thorchain',
  TON: 'TON',
  TRX: 'Tron',
  XLM: 'Stellar',
  XRP: 'XRP Ledger',
  ZEC: 'Zcash',
  zcash: 'Zcash',
  bitcoin: 'Bitcoin',
  ethereum: 'Ethereum',
  near: 'Near',
};

export function chainDisplayName(chain: string | undefined): string {
  if (!chain) return '';
  return CHAIN_DISPLAY[chain] ?? CHAIN_DISPLAY[chain.toUpperCase()] ?? chain;
}
