// The swap layer's public surface.
//
// Type-only names are re-exported with `export type`. The mobile wallet's
// barrel lists them alongside the values, which Metro accepts because it
// resolves the whole module graph as TypeScript; webpack sees Babel's output,
// where a type has no runtime export and the build fails on the missing name.

export { BroadcastStatusEnum } from './enums/BroadcastStatusEnum';
export { SwapDirectionEnum } from './enums/SwapDirectionEnum';
export {
  SwapErrorCategoryEnum,
  SwapOperationEnum,
} from './enums/SwapErrorCategoryEnum';
export { SwapKitProviderEnum } from './enums/SwapKitProviderEnum';
export {
  SwapStatusEnum,
  isTerminalStatus,
  canRemoveSwap,
  isPrePaymentStatus,
} from './enums/SwapStatusEnum';
export { TrackingStatusEnum } from './enums/TrackingStatusEnum';

export type { DepositInstructionsType } from './types/DepositInstructionsType';
export type { FiatValueBasisType } from './types/FiatValueBasisType';
export type {
  ChainflipProviderData,
  FlashnetProviderData,
  GenericProviderData,
  MayachainStreamingProviderData,
  NearProviderData,
  ProviderDataType,
  ThorchainStreamingProviderData,
} from './types/ProviderDataType';
export type {
  QuoteResponseType,
  QuoteRouteAssetType,
  QuoteRouteFeeType,
  QuoteRouteType,
} from './types/QuoteResponseType';
export type { RefundInfoType } from './types/RefundInfoType';
export type { RouteOptionType } from './types/RouteOptionType';
export type { SwapAssetType } from './types/SwapAssetType';
export type { SwapRecordType } from './types/SwapRecordType';
export type {
  SwapResponseType,
  SwapTransientType,
  SwapTxType,
} from './types/SwapResponseType';
export type {
  TokenEntryType,
  TokensProviderBucketType,
  TokensResponseType,
} from './types/TokensResponseType';
export type {
  TrackLegType,
  TrackResponseType,
} from './types/TrackResponseType';

export { SwapKitClient } from './SwapKitClient';
export type {
  SwapKitQuoteParams,
  SwapKitSwapParams,
  SwapKitTrackParams,
} from './SwapKitClient';

export { SwapStore } from './SwapStore';
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
export type { TrackerEntryType } from './explorerUrls';
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
  SetObservedDepositTxHashArgs,
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
export { quoteAddressPair, quoteBindsAddress } from './quoteAddressBinding';
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
export { chainFromPaymentUri } from './chainFromPaymentUri';

export type {
  ExtractDepositInstructionsContext,
  ProviderExecutor,
} from './providers/ProviderExecutor';
export { FlashnetExecutor } from './providers/FlashnetExecutor';
export { MayaExecutor } from './providers/MayaExecutor';
export { NearIntentsExecutor } from './providers/NearIntentsExecutor';
export {
  ProviderRegistry,
  createDefaultProviderRegistry,
} from './providers/ProviderRegistry';
export { mapSwapStatus, mapTrackingStatus } from './providers/statusMapping';
export {
  applyDefaultTrackUpdate,
  pickLegHash,
  isRealLegHash,
} from './providers/trackUpdateBase';
export {
  isRateLimited,
  rateLimitWaitMs,
  rateLimitedNotice,
  RATE_LIMITED_MESSAGE,
} from './rateLimited';
