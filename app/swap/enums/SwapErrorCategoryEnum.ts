/**
 * Coarse-grained classification of swap errors.
 *
 * The goal is to translate provider- or SwapKit-specific error payloads into
 * a small set of UX categories so that user-facing messaging is consistent
 * regardless of which provider returned the error.
 *
 * Mapping happens in `app/swap/errors.ts` per (operation × status code × body
 * shape) tuple. Provider executors may extend the mapping in their own
 * `classifyError` if a provider exposes additional semantics.
 */
export enum SwapErrorCategoryEnum {
  // Inputs the user can correct
  UnsupportedAsset = 'UNSUPPORTED_ASSET',
  UnsupportedPair = 'UNSUPPORTED_PAIR',
  InvalidAddressForChain = 'INVALID_ADDRESS_FOR_CHAIN',
  AmountTooSmall = 'AMOUNT_TOO_SMALL',
  AmountTooLarge = 'AMOUNT_TOO_LARGE',
  AmountPrecision = 'AMOUNT_PRECISION',
  SlippageTooLow = 'SLIPPAGE_TOO_LOW',

  // Routing / availability
  NoQuoteOrLiquidity = 'NO_QUOTE_OR_LIQUIDITY',
  RouteExpired = 'ROUTE_EXPIRED',
  ProviderNotAvailable = 'PROVIDER_NOT_AVAILABLE',

  // Wallet-side preconditions
  InsufficientBalance = 'INSUFFICIENT_BALANCE',
  WalletSyncRequired = 'WALLET_SYNC_REQUIRED',

  // Transport / service
  NetworkTimeout = 'NETWORK_TIMEOUT',
  ServiceUnavailable = 'SERVICE_UNAVAILABLE',
  Unauthorized = 'UNAUTHORIZED',

  // Deposit lifecycle
  DepositNotFound = 'DEPOSIT_NOT_FOUND',
  DepositRejected = 'DEPOSIT_REJECTED',
  AmlScreeningRejected = 'AML_SCREENING_REJECTED',

  // Fallback
  Unknown = 'UNKNOWN',
}

/** The high-level operation that produced an error. */
export enum SwapOperationEnum {
  Quote = 'quote',
  Swap = 'swap',
  Track = 'track',
  BroadcastDeposit = 'broadcastDeposit',
}
