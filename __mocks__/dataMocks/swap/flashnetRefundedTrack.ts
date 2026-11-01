import type { TrackResponseType } from '@app/swap/types/TrackResponseType';

/**
 * A refunded Flashnet swap of ZEC into USDC on Solana, as `/track` returned it
 * on mainnet on 2026-09-12.
 *
 * The shape is the real one: the deposit leg on Zcash, the Spark swap leg that
 * never landed, and the refund leg back on Zcash, last. Every hash, address
 * and order id is replaced; this file is public.
 *
 * Nothing in it is on Solana. With the delivery taken positionally from the
 * last leg, the refund hash was stored as the destination and opened on a
 * Solana explorer, and it hid the Refund row that should have shown it.
 */
export const REFUNDED_DEPOSIT_HASH = 'dd44'.repeat(16);
export const REFUND_HASH = 'ee55'.repeat(16);
const ZERO_HASH = '0x' + '0'.repeat(64);
const SOURCE = 't1EphemeralSourcePlaceholder';
const DEPOSIT_ADDRESS = 't1FlashnetDepositPlaceholder';

export const flashnetRefundedTrack: TrackResponseType = {
  chainId: 'zcash',
  hash: REFUNDED_DEPOSIT_HASH,
  status: 'refunded',
  trackingStatus: 'refunded',
  fromAsset: 'ZEC.ZEC',
  fromAmount: '0.007',
  toAsset: 'ZEC.ZEC',
  toAmount: '0',
  meta: { provider: 'FLASHNET', providerAction: 'swap' },
  legs: [
    {
      chainId: 'zcash',
      hash: REFUNDED_DEPOSIT_HASH,
      block: 3480891,
      type: 'native_send',
      status: 'completed',
      trackingStatus: 'completed',
      fromAddress: SOURCE,
      toAddress: DEPOSIT_ADDRESS,
    },
    {
      chainId: 'spark',
      hash: ZERO_HASH,
      block: -1,
      type: 'swap',
      status: 'refunded',
      trackingStatus: 'refunded',
      fromAddress: SOURCE,
      toAddress: SOURCE,
      meta: { provider: 'FLASHNET', providerOrderId: 'ord_placeholder' },
    },
    {
      chainId: 'zcash',
      hash: REFUND_HASH,
      block: -1,
      type: 'native_send',
      status: 'refunded',
      trackingStatus: 'refunded',
      toAddress: SOURCE,
    },
  ],
} as TrackResponseType;
