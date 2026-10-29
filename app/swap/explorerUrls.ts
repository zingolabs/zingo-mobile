import { BlockExplorerEnum, ChainNameEnum } from '@app/AppState';
import Utils from '@app/utils';
import { SwapKitProviderEnum } from './enums/SwapKitProviderEnum';
import { isRealLegHash } from './providers/trackUpdateBase';
import { providerShortLabel } from './providerLabels';
import { legChain } from './legChains';
import type { SwapRecordType } from './types/SwapRecordType';

/**
 * Per-chain block-explorer transaction URLs, keyed by SwapKit's short chain
 * symbol, the same key `chainMemoEncoding` uses.
 *
 * The list covers the chains we have actually swapped through. Adding one is
 * a line. It stays static rather than reading SwapKit's catalog because the
 * catalog surfaces no explorer field, and these URLs change rarely.
 */
const CHAIN_EXPLORER_TX_URL: Record<string, (hash: string) => string> = {
  ETH: h => `https://etherscan.io/tx/${h}`,
  AVAX: h => `https://snowtrace.io/tx/${h}`,
  BSC: h => `https://bscscan.com/tx/${h}`,
  BASE: h => `https://basescan.org/tx/${h}`,
  ARB: h => `https://arbiscan.io/tx/${h}`,
  OP: h => `https://optimistic.etherscan.io/tx/${h}`,
  MATIC: h => `https://polygonscan.com/tx/${h}`,
  POL: h => `https://polygonscan.com/tx/${h}`,
  FTM: h => `https://ftmscan.com/tx/${h}`,
  GNOSIS: h => `https://gnosisscan.io/tx/${h}`,
  LINEA: h => `https://lineascan.build/tx/${h}`,
  BTC: h => `https://mempool.space/tx/${h}`,
  BCH: h => `https://blockchair.com/bitcoin-cash/transaction/${h}`,
  LTC: h => `https://blockchair.com/litecoin/transaction/${h}`,
  DOGE: h => `https://blockchair.com/dogecoin/transaction/${h}`,
  DASH: h => `https://blockchair.com/dash/transaction/${h}`,
  NEAR: h => `https://nearblocks.io/txns/${h}`,
  SOL: h => `https://solscan.io/tx/${h}`,
  MAYA: h => `https://www.mayascan.org/tx/${h}`,
  THOR: h => `https://viewblock.io/thorchain/tx/${h}`,
};

/**
 * Each explorer above by its own name, which stays the same in every
 * language. Chains that share one (the Etherscan family) keep their own.
 */
const CHAIN_EXPLORER_NAME: Record<string, string> = {
  ETH: 'Etherscan',
  AVAX: 'Snowtrace',
  BSC: 'BscScan',
  BASE: 'BaseScan',
  ARB: 'Arbiscan',
  OP: 'Optimistic Etherscan',
  MATIC: 'PolygonScan',
  POL: 'PolygonScan',
  FTM: 'FTMScan',
  GNOSIS: 'GnosisScan',
  LINEA: 'LineaScan',
  BTC: 'mempool.space',
  BCH: 'Blockchair',
  LTC: 'Blockchair',
  DOGE: 'Blockchair',
  DASH: 'Blockchair',
  NEAR: 'NearBlocks',
  SOL: 'Solscan',
  MAYA: 'MayaScan',
  THOR: 'ViewBlock',
};

/** The Zcash explorers by the names Settings gives them. */
const ZEC_EXPLORER_NAME: Record<BlockExplorerEnum, string> = {
  [BlockExplorerEnum.Zcashexplorer]: 'ZcashExplorer',
  [BlockExplorerEnum.ZecBlock]: 'ZecBlock',
  [BlockExplorerEnum.Zexplorer]: 'ZExplorer',
  [BlockExplorerEnum.None]: '',
};

/** The name of the explorer `buildChainExplorerUrl` opens for a chain. */
export function chainExplorerName(
  chain: string,
  zecBlockExplorer: BlockExplorerEnum,
): string {
  const upper = chain.toUpperCase();
  return upper === 'ZEC'
    ? ZEC_EXPLORER_NAME[zecBlockExplorer]
    : (CHAIN_EXPLORER_NAME[upper] ?? upper);
}

/**
 * Per-chain address pages, for a deposit address no deposit was ever seen
 * at. Only where the explorer shows an address's history; the rest get no
 * link. ZEC is left out: the deposit addresses of a sale belong to the
 * provider, and the wallet's explorers key on transactions.
 */
const CHAIN_EXPLORER_ADDRESS_URL: Record<string, (address: string) => string> =
  {
    ETH: a => `https://etherscan.io/address/${a}`,
    AVAX: a => `https://snowtrace.io/address/${a}`,
    BSC: a => `https://bscscan.com/address/${a}`,
    BASE: a => `https://basescan.org/address/${a}`,
    ARB: a => `https://arbiscan.io/address/${a}`,
    OP: a => `https://optimistic.etherscan.io/address/${a}`,
    MATIC: a => `https://polygonscan.com/address/${a}`,
    POL: a => `https://polygonscan.com/address/${a}`,
    BTC: a => `https://mempool.space/address/${a}`,
    BCH: a => `https://blockchair.com/bitcoin-cash/address/${a}`,
    LTC: a => `https://blockchair.com/litecoin/address/${a}`,
    DOGE: a => `https://blockchair.com/dogecoin/address/${a}`,
    DASH: a => `https://blockchair.com/dash/address/${a}`,
    NEAR: a => `https://nearblocks.io/address/${a}`,
    SOL: a => `https://solscan.io/account/${a}`,
  };

/** An address page on a chain's explorer, or null where there is none. */
export function buildChainAddressUrl(
  chain: string,
  address: string,
): string | null {
  const builder = CHAIN_EXPLORER_ADDRESS_URL[chain.toUpperCase()];
  return builder ? builder(address) : null;
}

/**
 * A block-explorer URL for a chain and hash. ZEC goes through the user's
 * configured explorer so this agrees with the History link, and every other
 * chain takes its default above.
 */
export function buildChainExplorerUrl(args: {
  chain: string;
  hash: string;
  zecChainName: ChainNameEnum;
  zecBlockExplorer: BlockExplorerEnum;
}): string | null {
  const upper = args.chain.toUpperCase();
  if (upper === 'ZEC') {
    const url = Utils.getBlockExplorerTxIDURL(
      args.hash,
      args.zecChainName,
      args.zecBlockExplorer,
    );
    return url.length > 0 ? url : null;
  }
  const builder = CHAIN_EXPLORER_TX_URL[upper];
  return builder ? builder(args.hash) : null;
}

/**
 * The provider's own explorer for the swap's inbound hash, which shows more
 * than a block explorer does: each streaming step, the outbound, a refund.
 * Null when the provider has none, or keys on something other than a tx hash.
 */
export function buildProviderExplorerUrl(
  provider: SwapKitProviderEnum,
  hash: string,
): string | null {
  switch (provider) {
    case SwapKitProviderEnum.MayachainStreaming:
      return `https://explorer.mayachain.info/tx/${hash}`;
    case SwapKitProviderEnum.ThorchainStreaming:
      return `https://viewblock.io/thorchain/tx/${hash}`;
    default:
      return null;
  }
}

/** The provider's explorer by its own name. */
export function providerExplorerName(provider: SwapKitProviderEnum): string {
  switch (provider) {
    case SwapKitProviderEnum.MayachainStreaming:
      return 'Maya Explorer';
    case SwapKitProviderEnum.ThorchainStreaming:
      return 'THORChain Explorer';
    case SwapKitProviderEnum.Near:
      return 'NEAR Intents Explorer';
    default:
      return `${providerShortLabel(provider)} Explorer`;
  }
}

/**
 * SwapKit's public explorer only renders a usable timeline for
 * `?hash=…&chainId=…`. A `depositAddress` query answers 200 from the API but
 * leaves the dashboard blank, so a hash-less record gets no URL at all and
 * the provider-native row carries the user instead.
 */
export function buildSwapKitTrackerUrl(record: SwapRecordType): string | null {
  const hash = record.broadcast?.txId ?? record.observedDepositTxHash;
  if (!hash) return null;
  return `https://track.swapkit.dev/?hash=${encodeURIComponent(hash)}&chainId=${encodeURIComponent(record.sellAsset.chainId)}`;
}

/** What a tracker link shows, for the row's description. */
export type TrackerWhatType =
  /** SwapKit's view of the whole swap. */
  | { kind: 'swap' }
  /** The provider's own view of its side of the swap. */
  | { kind: 'provider'; provider: string }
  /** The deposit that paid the swap, on the chain it left from. */
  | { kind: 'deposit'; coin: string; chain: string }
  /** The deposit's first step, through the wallet's own transparent address. */
  | { kind: 'hop'; chain: string }
  /** A step between, on the chain the provider routes through. */
  | { kind: 'leg'; chain: string }
  /** What the swap delivered. */
  | { kind: 'delivery'; coin: string; chain: string }
  /** The deposit coming back. */
  | { kind: 'refund'; chain: string }
  /** The deposit address, when no deposit was ever seen. */
  | { kind: 'depositAddress'; chain: string };

export type TrackerEntryType = {
  key: string;
  /** The explorer's own name, the same in every language. */
  name: string;
  what: TrackerWhatType;
  url: string;
  /** The hash or address the link opens. */
  id: string;
  /**
   * Whether the entry opens a Zcash transaction or address. Decided by the
   * chain the link opens rather than by its role, so an inbound swap puts
   * its Zcash delivery there just as an outbound one puts its Zcash deposit.
   * Trackers are on no chain and never count.
   */
  onZcash: boolean;
};

const isZcash = (chain: string): boolean => chain.toUpperCase() === 'ZEC';

const tickerOf = (asset: SwapRecordType['sellAsset']): string =>
  asset.ticker ?? asset.symbol;

/**
 * The tracker links a record can offer, ordered by how much they help:
 * SwapKit's normalised cross-provider view, then the provider's own page,
 * then the block explorers of each leg and of the refund, the Zcash ones
 * last. An entry that cannot be built, for a missing hash or an unknown
 * chain, is left out, so every row rendered from this opens something. A
 * swap no deposit was ever seen for gets its deposit address instead.
 */
export function buildTrackerEntries(args: {
  record: SwapRecordType;
  zecChainName: ChainNameEnum;
  zecBlockExplorer: BlockExplorerEnum;
}): TrackerEntryType[] {
  const { record, zecChainName, zecBlockExplorer } = args;
  const explorerArgs = { zecChainName, zecBlockExplorer };
  const entries: TrackerEntryType[] = [];
  const sellChain = record.sellAsset.chain;

  /** A block-explorer entry for a hash, when its chain has an explorer. */
  const chainEntry = (
    key: string,
    chain: string,
    hash: string,
    what: TrackerWhatType,
  ) => {
    const url = buildChainExplorerUrl({ chain, hash, ...explorerArgs });
    if (url) {
      entries.push({
        key,
        name: chainExplorerName(chain, zecBlockExplorer),
        what,
        url,
        id: hash,
        onZcash: isZcash(chain),
      });
    }
  };

  // `isRealLegHash` filters the all-zero placeholder an older build may have
  // persisted, so no dead link is ever built from it.
  const broadcastHash = isRealLegHash(record.broadcast?.txId)
    ? record.broadcast?.txId
    : undefined;
  const observedHash = isRealLegHash(record.observedDepositTxHash)
    ? record.observedDepositTxHash
    : undefined;
  const sourceHash = broadcastHash ?? observedHash;

  const swapKitUrl = buildSwapKitTrackerUrl(record);
  if (swapKitUrl && sourceHash) {
    entries.push({
      key: 'swapkit',
      name: 'SwapKit Explorer',
      what: { kind: 'swap' },
      url: swapKitUrl,
      id: sourceHash,
      onZcash: false,
    });
  }

  // Prefer the URL the provider itself sent through `/track`: Flashnet's
  // points straight at the order id, which reaches further than any
  // hash-keyed URL could. NEAR Intents opens a swap by its deposit address,
  // so even a swap whose deposit was never seen has its page there.
  const providerPage: { url: string; id: string } | null =
    record.providerExplorerUrl
      ? {
          url: record.providerExplorerUrl,
          id: sourceHash ?? record.depositAddress,
        }
      : record.provider === SwapKitProviderEnum.Near && record.depositAddress
        ? {
            url: `https://explorer.near-intents.org/transactions/${encodeURIComponent(record.depositAddress)}`,
            id: record.depositAddress,
          }
        : sourceHash
          ? (() => {
              const url = buildProviderExplorerUrl(record.provider, sourceHash);
              return url ? { url, id: sourceHash } : null;
            })()
          : null;
  if (providerPage) {
    entries.push({
      key: 'provider',
      name: providerExplorerName(record.provider),
      what: { kind: 'provider', provider: providerShortLabel(record.provider) },
      url: providerPage.url,
      id: providerPage.id,
      onZcash: false,
    });
  }

  if (sourceHash) {
    chainEntry('source-explorer', sellChain, sourceHash, {
      kind: 'deposit',
      coin: tickerOf(record.sellAsset),
      chain: sellChain,
    });
  } else if (record.depositAddress) {
    const url = buildChainAddressUrl(sellChain, record.depositAddress);
    if (url) {
      entries.push({
        key: 'deposit-address',
        name: chainExplorerName(sellChain, zecBlockExplorer),
        what: { kind: 'depositAddress', chain: sellChain },
        url,
        id: record.depositAddress,
        onZcash: isZcash(sellChain),
      });
    }
  }

  // The intermediate hops of an outbound ZIP-320 pair. The last is the hash
  // already surfaced above, so it is skipped.
  if (record.broadcast?.allTxIds && record.broadcast.allTxIds.length > 1) {
    record.broadcast.allTxIds.slice(0, -1).forEach((hop, index) => {
      if (isRealLegHash(hop)) {
        chainEntry(`source-hop-${index}`, sellChain, hop, {
          kind: 'hop',
          chain: sellChain,
        });
      }
    });
  }

  // The legs between, on whichever chain the provider routes through. For
  // NEAR Intents that is the execute_intents call on NEAR: where the swap
  // itself happens, and the link SwapKit's own explorer gives for it.
  record.intermediateLegs?.forEach((leg, index) => {
    if (isRealLegHash(leg.hash)) {
      const chain = legChain(leg.chainId).symbol;
      chainEntry(`leg-${index}`, chain, leg.hash, { kind: 'leg', chain });
    }
  });

  if (isRealLegHash(record.destinationTxHash)) {
    chainEntry(
      'dest-explorer',
      record.receiveAsset.chain,
      record.destinationTxHash as string,
      {
        kind: 'delivery',
        coin: tickerOf(record.receiveAsset),
        chain: record.receiveAsset.chain,
      },
    );
  }

  // A refund returns the deposit on the chain it left from.
  if (isRealLegHash(record.refundInfo?.refundTxHash)) {
    chainEntry(
      'refund-explorer',
      sellChain,
      record.refundInfo?.refundTxHash as string,
      { kind: 'refund', chain: sellChain },
    );
  }

  return [
    ...entries.filter(e => !e.onZcash),
    ...entries.filter(e => e.onZcash),
  ];
}
