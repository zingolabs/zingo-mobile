import type { SwapAssetType } from './types/SwapAssetType';

const native = (
  chain: string,
  symbol: string,
  chainId: string,
  decimals: number,
): SwapAssetType => ({
  swapKitId: `${chain}.${symbol}`,
  chain,
  symbol,
  ticker: symbol,
  chainId,
  decimals,
});

/**
 * The coin of each chain that swaps with ZEC, keyed by the chain code a
 * contact is saved under. Written out because the coin cannot be read from the
 * chain: TON pays in GRAM, Gnosis in xDAI, Base in ETH. From SwapKit `/tokens`,
 * `/swapTo` and `/swapFrom` on 2026-11-02; a chain missing here had no such
 * coin that day.
 */
const CHAIN_NATIVE_ASSETS: Readonly<Record<string, SwapAssetType>> = {
  ADA: native('ADA', 'ADA', 'cardano', 6),
  ADI: native('ADI', 'ADI', '36900', 18),
  ALEO: native('ALEO', 'ALEO', 'aleo', 6),
  ARB: native('ARB', 'ETH', '42161', 18),
  AVAX: native('AVAX', 'AVAX', '43114', 18),
  BASE: native('BASE', 'ETH', '8453', 18),
  BCH: native('BCH', 'BCH', 'bitcoincash', 8),
  BERA: native('BERA', 'BERA', '80094', 18),
  BSC: native('BSC', 'BNB', '56', 18),
  BTC: native('BTC', 'BTC', 'bitcoin', 8),
  DASH: native('DASH', 'DASH', 'dash', 8),
  DOGE: native('DOGE', 'DOGE', 'dogecoin', 8),
  ETH: native('ETH', 'ETH', '1', 18),
  GNO: native('GNO', 'xDAI', '100', 18),
  HOOD: native('HOOD', 'ETH', '4663', 18),
  HYPEREVM: native('HYPEREVM', 'HYPE', '999', 18),
  LTC: native('LTC', 'LTC', 'litecoin', 8),
  MAYA: native('MAYA', 'CACAO', 'mayachain-mainnet-v1', 10),
  MONAD: native('MONAD', 'MON', '143', 18),
  NEAR: native('NEAR', 'NEAR', 'near', 24),
  OP: native('OP', 'ETH', '10', 18),
  POL: native('POL', 'POL', '137', 18),
  SOL: native('SOL', 'SOL', 'solana', 9),
  STRK: native('STRK', 'STRK', '0x534e5f4d41494e', 18),
  SUI: native('SUI', 'SUI', 'sui', 9),
  THOR: native('THOR', 'RUNE', 'thorchain-1', 8),
  TON: native('TON', 'GRAM', 'ton', 9),
  TRON: native('TRON', 'TRX', '728126428', 6),
  XLAYER: native('XLAYER', 'OKB', '196', 18),
  XLM: native('XLM', 'XLM', 'stellar', 7),
  XRP: native('XRP', 'XRP', 'ripple', 6),
};

/** The coin to swap with a contact on `chain`, if the chain has one. */
export function chainNativeAsset(chain: string): SwapAssetType | undefined {
  return CHAIN_NATIVE_ASSETS[chain.toUpperCase()];
}
