/**
 * The chain a payment URI names for certain, as the address book's chain codes,
 * or undefined when it names none.
 *
 * An address alone often fits several chains (every EVM chain shares one
 * format), and the address book asks the user to confirm in that case. A
 * payment URI settles it: `bitcoin:` is Bitcoin, and EIP-681 carries the chain
 * id (`ethereum:0x…@8453` is Base; without one it is Ethereum mainnet, chain
 * 1). Only schemes with one meaning are listed; anything else leaves the
 * choice to the address.
 */

const SCHEME_CHAINS: Readonly<Record<string, string>> = {
  bitcoin: 'BTC',
  litecoin: 'LTC',
  dogecoin: 'DOGE',
  bitcoincash: 'BCH',
  dash: 'DASH',
  solana: 'SOL',
  ton: 'TON',
  tron: 'TRON',
  monero: 'XMR',
  thorchain: 'THOR',
  mayachain: 'MAYA',
  cacao: 'MAYA',
  zcash: 'ZEC',
};

/** EIP-155 chain ids of the EVM chains the address book knows. */
const EVM_CHAIN_IDS: Readonly<Record<string, string>> = {
  '1': 'ETH',
  '10': 'OP',
  '25': 'CRO',
  '56': 'BSC',
  '100': 'GNO',
  '143': 'MONAD',
  '999': 'HYPEREVM',
  '137': 'POL',
  '196': 'XLAYER',
  '250': 'FTM',
  '2222': 'KAVA',
  '5000': 'MNT',
  '8453': 'BASE',
  '42161': 'ARB',
  '43114': 'AVAX',
  '59144': 'LINEA',
  '80094': 'BERA',
};

export function chainFromPaymentUri(text: string): string | undefined {
  const match = text.trim().match(/^([a-z][a-z0-9+.-]*):/i);
  if (!match) return undefined;
  const scheme = match[1].toLowerCase();
  if (scheme === 'ethereum') {
    // ethereum:[pay-]<address>[@<chain id>][/function][?params]
    const chainId = text.match(/^ethereum:(?:pay-)?[^@/?]+@(\d+)/i)?.[1];
    return chainId ? EVM_CHAIN_IDS[chainId] : 'ETH';
  }
  return SCHEME_CHAINS[scheme];
}
