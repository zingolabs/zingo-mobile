import { ImageSourcePropType } from 'react-native';

/**
 * Bundled chain badge icons, keyed by SwapKit chain code (uppercase).
 *
 * Why we ship our own instead of deriving the badge from the API:
 *   - SwapKit has no reliable per-chain logo endpoint. `/chains` 404s, and the
 *     token CDN is inconsistent: `base.base.png` only exists on the `-dev`
 *     host, `bsc` uses `bsc.bnb.png`, and SwapKit's own `<chain>.<chainId>.png`
 *     convention (from their `AssetIcon` widget) 404s for most chains in prod.
 *   - Deriving the badge from a chain's native (gas) token — what we did before
 *     — renders the ETH diamond for every ETH-gas L2 (Base, Arbitrum, Optimism),
 *     so a Base token looked like it lived on Ethereum.
 *
 * The PNGs were pulled once from SwapKit's CDN (best working URL per chain) and
 * committed under `assets/chains/`. Update this map + drop a new PNG when a new
 * destination chain appears in the routable catalog.
 */
const CHAIN_ICONS: Record<string, ImageSourcePropType> = {
  ADA: require('../../../assets/chains/ada.png'),
  ADI: require('../../../assets/chains/adi.png'),
  ARB: require('../../../assets/chains/arb.png'),
  ATOM: require('../../../assets/chains/atom.png'),
  AVAX: require('../../../assets/chains/avax.png'),
  BASE: require('../../../assets/chains/base.png'),
  BCH: require('../../../assets/chains/bch.png'),
  BERA: require('../../../assets/chains/bera.png'),
  BSC: require('../../../assets/chains/bsc.png'),
  BTC: require('../../../assets/chains/btc.png'),
  CRO: require('../../../assets/chains/cro.png'),
  DASH: require('../../../assets/chains/dash.png'),
  DOGE: require('../../../assets/chains/doge.png'),
  DOT: require('../../../assets/chains/dot.png'),
  ETH: require('../../../assets/chains/eth.png'),
  FTM: require('../../../assets/chains/ftm.png'),
  GNO: require('../../../assets/chains/gno.png'),
  // Address validators key Gnosis as `GNOSIS`; same badge as `GNO`.
  GNOSIS: require('../../../assets/chains/gno.png'),
  KAVA: require('../../../assets/chains/kava.png'),
  LINEA: require('../../../assets/chains/linea.png'),
  LTC: require('../../../assets/chains/ltc.png'),
  // Polygon's old (`MATIC`) and current (`POL`) codes share one badge.
  MATIC: require('../../../assets/chains/pol.png'),
  MAYA: require('../../../assets/chains/maya.png'),
  MNT: require('../../../assets/chains/mnt.png'),
  MONAD: require('../../../assets/chains/monad.png'),
  NEAR: require('../../../assets/chains/near.png'),
  OP: require('../../../assets/chains/op.png'),
  POL: require('../../../assets/chains/pol.png'),
  SOL: require('../../../assets/chains/sol.png'),
  STRK: require('../../../assets/chains/strk.png'),
  SUI: require('../../../assets/chains/sui.png'),
  THOR: require('../../../assets/chains/thor.png'),
  TON: require('../../../assets/chains/ton.png'),
  TRON: require('../../../assets/chains/tron.png'),
  // Tron's SwapKit chain code is `TRX`; same badge as `TRON`.
  TRX: require('../../../assets/chains/tron.png'),
  XLAYER: require('../../../assets/chains/xlayer.png'),
  XLM: require('../../../assets/chains/xlm.png'),
  XRP: require('../../../assets/chains/xrp.png'),
};

/**
 * Resolve a chain code (e.g. `"BASE"`) to its bundled badge icon. Returns
 * `undefined` for chains we do not have an icon for — callers render no badge
 * in that case (the main token image + text label still identify the asset).
 */
export function getChainIcon(
  chain: string | undefined,
): ImageSourcePropType | undefined {
  if (!chain) return undefined;
  return CHAIN_ICONS[chain.toUpperCase()];
}
