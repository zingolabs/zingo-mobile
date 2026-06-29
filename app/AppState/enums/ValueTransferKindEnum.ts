export enum ValueTransferKindEnum {
  Sent = 'Sent',
  Received = 'Received',
  MemoToSelf = 'MemoToSelf',
  SendToSelf = 'SendToSelf', // like 'basic` in zingolib
  Shield = 'Shield',
  Rejection = 'Rejection',
  /**
   * Wallet-side classification (not produced by zingolib). Applied by the
   * History view when a VT's txid matches a `SwapRecord` in the swap store
   * (either `broadcast.txId` for outbound or `destinationTxHash` for inbound).
   * The associated `SwapRecord` carries the direction, provider, and other
   * swap-specific details.
   */
  Swap = 'Swap',
}
