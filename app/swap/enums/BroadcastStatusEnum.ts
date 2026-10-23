/**
 * Local broadcast state for outbound-swap deposit transactions.
 *
 * Tracks whether the ZEC tx that funds an outbound swap has been handed off
 * to lightwalletd. Used by the account-deletion guard so we can warn the user
 * before wiping wallet data while a swap deposit is in flight that has
 * on-chain consequences but no terminal SwapKit status yet.
 *
 * Not applicable to inbound swaps.
 */
export enum BroadcastStatusEnum {
  PendingBroadcast = 'PENDING_BROADCAST',
  Broadcasted = 'BROADCASTED',
  Failed = 'FAILED',
}
