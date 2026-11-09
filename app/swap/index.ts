// The swap layer's public surface.
//
// Type-only names are re-exported with `export type`. The mobile wallet's
// barrel lists them alongside the values, which Metro accepts because it
// resolves the whole module graph as TypeScript; webpack sees Babel's output,
// where a type has no runtime export and the build fails on the missing name.

export { BroadcastStatusEnum } from './BroadcastStatusEnum';
export { SwapDirectionEnum } from './SwapDirectionEnum';
export {
  SwapErrorCategoryEnum,
  SwapOperationEnum,
} from './SwapErrorCategoryEnum';
export { SwapKitProviderEnum } from './SwapKitProviderEnum';
export {
  SwapStatusEnum,
  isTerminalStatus,
  isPrePaymentStatus,
} from './SwapStatusEnum';
export { TrackingStatusEnum } from './TrackingStatusEnum';
export { canRemoveSwap, hasUnknownHash } from './canRemoveSwap';
export { hasDepositEvidence } from './depositEvidence';
export { newlyExpired, newlyRefunding } from './swapTransitions';
export { prefillFromContact, prefillFromRecord } from './swapPrefill';
export { canResendSale, unsentSale } from './unsentSale';
export { saleDepositRequest } from './saleDepositRequest';
export type { SaleDepositRequestType } from './saleDepositRequest';
export {
  awaitsSaleDeposit,
  claimSaleDeposit,
  paysSale,
  sentPaymentsFrom,
} from './saleDeposits';
export type { SentPaymentType } from './saleDeposits';
export {
  DepositAfterDeshieldError,
  heldDeshield,
} from './depositAfterDeshield';
export { NEAR_NO_REFUND_USD, nearRefusesSmallRefunds } from './nearSmallSwap';
export type { SwapPrefillType } from './SwapPrefillType';
export {
  LATE_WATCH_MS,
  acceptsLateUpdate,
  isRefunding,
  watchesLateDeposit,
} from './lateDeposit';
export { lacksDelivery, watchesDelivery } from './deliveryWatch';
export { isThorchainFamily } from './thorchainFamily';
export {
  DEPOSIT_WAIT_MS,
  DEPOSIT_WARN_AFTER_MS,
  SLOW_DEPOSIT_WARN_AFTER_MS,
  slowDeposit,
  awaitsDeposit,
  depositDeadlineMs,
  depositOverdue,
  depositPhase,
  depositWarnAtMs,
} from './depositDeadline';
export type { DepositPhase } from './depositDeadline';

export type { DepositInstructionsType } from './DepositInstructionsType';
export type { FiatValueBasisType } from './FiatValueBasisType';
export type {
  ChainflipProviderData,
  FlashnetProviderData,
  GenericProviderData,
  MayachainStreamingProviderData,
  NearProviderData,
  ProviderDataType,
  ThorchainStreamingProviderData,
} from './ProviderDataType';
export type {
  QuoteResponseType,
  QuoteRouteAssetType,
  QuoteRouteFeeType,
  QuoteRouteType,
} from './QuoteResponseType';
export type { RefundInfoType } from './RefundInfoType';
export type { RouteOptionType } from './RouteOptionType';
export type { SwapAssetType } from './SwapAssetType';
export type { SwapRecordType } from './SwapRecordType';
export type {
  SwapResponseType,
  SwapTransientType,
  SwapTxType,
} from './SwapResponseType';
export type {
  TokenEntryType,
  TokensProviderBucketType,
  TokensResponseType,
} from './TokensResponseType';
export type { TrackLegType, TrackResponseType } from './TrackResponseType';

export { SwapKitClient } from './SwapKitClient';
export type {
  SwapKitQuoteParams,
  SwapKitSwapParams,
  SwapKitTrackParams,
} from './SwapKitClient';

export { SwapStore, SWAP_RECORDS_KEY_PREFIX } from './SwapStore';
export {
  groupHistoryBySwap,
  sliceKeepingGroups,
  swapGroupOf,
  swapTxidIndex,
} from './groupHistoryBySwap';
export type { SwapStoreChangeListener } from './SwapStore';
export { deriveWalletFingerprint } from './walletFingerprint';
export { readCurrentWalletFingerprint } from './currentWalletFingerprint';
export {
  swapRecordToValueTransfer,
  isOutboundSwap,
} from './swapRecordToValueTransfer';
export { formatAmountForDisplay } from './formatAmountForDisplay';
export { toDottedDecimal } from './toDottedDecimal';
export { swapRowLabel } from './swapRowLabel';
export { extractFiatValueBasis } from './quoteFiatBasis';
export { describeEmptyQuote } from './describeEmptyQuote';
export {
  describeCommitFailure,
  commitRefusalCondemnsRoute,
} from './describeCommitFailure';
export { describeQuoteFailure } from './describeQuoteFailure';
export {
  FAILED_REFRESH_RETRY_MS,
  carryOverRoutes,
  quoteQuestionKey,
} from './keepLastQuote';
export {
  providerShortLabel,
  providerLongLabel,
  providerCustody,
} from './providerLabels';
export type { ProviderCustodyType } from './providerLabels';
export { describeCostVsMarket } from './costVsMarket';
export {
  describeRealizedSlippage,
  describeSlippageTolerance,
} from './slippageReport';
export {
  convertFeeToAsset,
  formatFeeAmount,
  assetShortLabel,
} from './feeConversion';
export type { FeeConversionType } from './feeConversion';
export {
  buildChainExplorerUrl,
  buildProviderExplorerUrl,
  buildSwapKitTrackerUrl,
  buildTrackerEntries,
} from './explorerUrls';
export type { TrackerEntryType, TrackerWhatType } from './explorerUrls';
export { TokenCatalog } from './TokenCatalog';

export { SwapPoller, DEFAULT_SWAP_POLLER_CONFIG } from './SwapPoller';
export type { SwapPollerArgs, SwapPollerConfig } from './SwapPoller';

export { SwapService, createSwapService } from './SwapService';
export type {
  SwapServiceArgs,
  QuoteInput,
  QuoteResult,
  CommitRouteArgs,
  CommitRouteResult,
  MarkBroadcastedArgs,
  MarkDepositSentArgs,
} from './SwapService';

export {
  SwapKitError,
  SwapKitHttpError,
  SwapKitNetworkError,
  classifySwapError,
} from './errors';

export {
  EVM_SOURCE_CHAINS,
  UTXO_SOURCE_CHAINS,
  buildEip681Uri,
  buildMemolessPaymentUri,
  humanDecimalToBaseUnits,
  isEvmSourceChain,
  isUtxoSourceChain,
  memoToHexCalldata,
} from './chainMemoEncoding';
export {
  depositCarriesMemo,
  depositSpendsSourceAddress,
  zecNetworkFeeReserve,
} from './depositRouting';
export {
  orderNamesEphemeral,
  quoteAddressPair,
  quoteBindsAddress,
} from './quoteAddressBinding';
export { renderSwapText, swapKey, swapRaw } from './swapText';
export type { SwapTextType } from './swapText';
export { unavailableProviders } from './unavailableProviders';
export type { UnavailableProviderType } from './unavailableProviders';
export {
  buildDepositQr,
  exactAmountWarningText,
  memoFieldHintForChain,
  providerRequiresMemo,
  requiresExactAmountWarning,
} from './depositGuidance';
export type { DepositQrType } from './depositGuidance';

export {
  canonicalChainAddress,
  isValidChainAddress,
  nearAccountNeedsConfirm,
  SWAP_ADDRESS_CHAINS,
} from './addressValidators';
export { validateAddressForChain } from './validateAddressForChain';
export { possibleChainsForAddress } from './possibleChainsForAddress';
export { extractPlainAddress } from './extractPlainAddress';
export {
  addressFromPaymentUri,
  chainFromPaymentUri,
} from './chainFromPaymentUri';

export type {
  ExtractDepositInstructionsContext,
  ProviderExecutor,
} from './ProviderExecutor';
export { FlashnetExecutor } from './FlashnetExecutor';
export { MayaExecutor } from './MayaExecutor';
export { NearIntentsExecutor } from './NearIntentsExecutor';
export {
  ProviderRegistry,
  createDefaultProviderRegistry,
} from './ProviderRegistry';
export { mapSwapStatus, mapTrackingStatus } from './statusMapping';
export {
  applyDefaultTrackUpdate,
  pickLegHash,
  isRealLegHash,
} from './trackUpdateBase';
export {
  isRateLimited,
  rateLimitWaitMs,
  rateLimitedNotice,
  RATE_LIMITED_MESSAGE,
} from './rateLimited';
export {
  chainCarriesShieldedPurchase,
  paysPurchaseShielded,
  routeIsShielded,
  swapAddressOf,
} from './shieldedPurchase';
export { fetchMayaShieldedMemoTarget } from './mayaShieldedMemo';
