import { isEvmChain } from './addressValidators';

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

/**
 * The bare address out of a payment URI for `chain`, so a wallet's receive QR
 * (`bitcoin:bc1…?amount=0.1`) fills a swap address field. Text that is not a
 * URI for that chain comes back trimmed and untouched, and the field's own
 * check refuses it: a URI naming another network must never yield an address
 * for this one.
 *
 * An `ethereum:` URI without a chain id fits any EVM field: wallets put it
 * on the receive QR of every EVM network, and the form already names the
 * network. With a chain id, the id must be the field's.
 *
 * An EIP-681 token transfer (`ethereum:<token>/transfer?address=<to>`) names
 * the token contract first and the recipient in `address`; only the recipient
 * is an address to pay, so a transfer without one yields nothing usable.
 */
export function addressFromPaymentUri(chain: string, text: string): string {
  const trimmed = text.trim();
  const ethereum = /^ethereum:/i.test(trimmed);
  const body = trimmed.slice(trimmed.indexOf(':') + 1);
  const [path, query = ''] = body.split('?');
  const genericEvm =
    ethereum && !/^(pay-)?[^@/]+@/i.test(path) && isEvmChain(chain);
  if (chainFromPaymentUri(trimmed) !== chain && !genericEvm) return trimmed;
  if (ethereum && path.includes('/')) {
    /** By hand: React Native's URLSearchParams does not implement get. */
    const to = query
      .split('&')
      .map(pair => pair.split('='))
      .find(([key]) => key === 'address')?.[1];
    return to ? decodeURIComponent(to).trim() : trimmed;
  }
  return path
    .replace(/^pay-/i, '')
    .replace(/^\/\/(transfer\/)?/i, '')
    .split('@')[0]
    .trim();
}
