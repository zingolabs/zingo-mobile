import type { TrackResponseType } from '@app/swap/types/TrackResponseType';

/**
 * A completed NEAR Intents swap of ZEC into USDC on Solana, as `/track`
 * returned it on mainnet on 2026-09-12.
 *
 * The shape is the real one: the chain ids, the leg kinds and their order,
 * the statuses, and which hashes are present. Every hash and address is
 * replaced. The response ties a Zcash deposit to a Solana wallet, and this
 * file is public; nothing a test asserts depends on the real values.
 *
 * Three legs, and the middle one is what the detail screen used to miss: the
 * `execute_intents` call on NEAR, which is where the swap itself happens and
 * the only link SwapKit's own explorer gives for it.
 */
export const DEPOSIT_HASH = 'aa11'.repeat(16);
export const NEAR_EXECUTION_HASH =
  'NearExecutionHashBase58xxxxxxxxxxxxxxxxxxxxx';
export const SOLANA_DELIVERY_SIGNATURE = 'SolanaDeliverySignatureBase58'.padEnd(
  88,
  'x',
);
const DEPOSIT_ADDRESS = 't1NearDepositAddressPlaceholderxxx';
const DESTINATION = 'SolanaDestinationPlaceholderxxxxxxxxxxxxxxx';
const USDC = 'SOL.USDC-EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v';

export const nearZecToSolUsdcTrack: TrackResponseType = {
  chainId: 'zcash',
  hash: DEPOSIT_HASH,
  status: 'completed',
  trackingStatus: 'completed',
  fromAsset: 'ZEC.ZEC',
  fromAmount: '0.006',
  toAsset: USDC,
  toAmount: '6.405551',
  meta: { provider: 'NEAR', providerAction: 'swap' },
  legs: [
    {
      chainId: 'zcash',
      hash: DEPOSIT_HASH,
      block: 3481268,
      type: 'native_send',
      status: 'completed',
      trackingStatus: 'completed',
      fromAsset: 'ZEC.ZEC',
      toAsset: 'ZEC.ZEC',
      toAddress: DEPOSIT_ADDRESS,
    },
    {
      chainId: 'near',
      hash: NEAR_EXECUTION_HASH,
      block: -1,
      type: 'swap',
      status: 'completed',
      trackingStatus: 'completed',
      fromAsset: 'ZEC.ZEC',
      toAsset: USDC,
      toAddress: DESTINATION,
      meta: { provider: 'NEAR', providerAction: 'swap' },
    },
    {
      chainId: 'solana',
      hash: SOLANA_DELIVERY_SIGNATURE,
      block: -1,
      type: 'token_transfer',
      status: 'completed',
      trackingStatus: 'completed',
      fromAsset: USDC,
      toAsset: USDC,
      toAddress: DESTINATION,
    },
  ],
} as TrackResponseType;
