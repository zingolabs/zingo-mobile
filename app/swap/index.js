import { BroadcastStatusEnum } from './enums/BroadcastStatusEnum';
import { SwapDirectionEnum } from './enums/SwapDirectionEnum';
import {
  SwapErrorCategoryEnum,
  SwapOperationEnum,
} from './enums/SwapErrorCategoryEnum';
import { SwapKitProviderEnum } from './enums/SwapKitProviderEnum';
import { SwapStatusEnum, isTerminalStatus } from './enums/SwapStatusEnum';
import { TrackingStatusEnum } from './enums/TrackingStatusEnum';

import { DepositInstructionsType } from './types/DepositInstructionsType';
import { FiatValueBasisType } from './types/FiatValueBasisType';
import {
  ChainflipProviderData,
  FlashnetProviderData,
  GenericProviderData,
  MayachainStreamingProviderData,
  NearProviderData,
  ProviderDataType,
  ThorchainStreamingProviderData,
} from './types/ProviderDataType';
import {
  QuoteResponseType,
  QuoteRouteAssetType,
  QuoteRouteFeeType,
  QuoteRouteType,
} from './types/QuoteResponseType';
import { RefundInfoType } from './types/RefundInfoType';
import { RouteOptionType } from './types/RouteOptionType';
import { SwapAssetType } from './types/SwapAssetType';
import { SwapRecordType } from './types/SwapRecordType';
import {
  SwapResponseType,
  SwapTransientType,
  SwapTxType,
} from './types/SwapResponseType';
import {
  TokenEntryType,
  TokensProviderBucketType,
  TokensResponseType,
} from './types/TokensResponseType';
import { TrackLegType, TrackResponseType } from './types/TrackResponseType';

import {
  SwapKitClient,
  SwapKitQuoteParams,
  SwapKitSwapParams,
  SwapKitTrackParams,
} from './SwapKitClient';
import { SwapStore, SwapStoreChangeListener } from './SwapStore';
import { deriveWalletFingerprint } from './walletFingerprint';
import { formatAmountForDisplay } from './formatAmountForDisplay';
import {
  swapRecordToValueTransfer,
  isOutboundSwap,
} from './swapRecordToValueTransfer';
import { TokenCatalog } from './TokenCatalog';
import {
  SwapPoller,
  SwapPollerArgs,
  SwapPollerConfig,
  DEFAULT_SWAP_POLLER_CONFIG,
} from './SwapPoller';
import {
  SwapService,
  SwapServiceArgs,
  QuoteInput,
  QuoteResult,
  CommitRouteArgs,
  CommitRouteResult,
  MarkBroadcastedArgs,
  SetObservedDepositTxHashArgs,
  createSwapService,
} from './SwapService';
import {
  SwapKitError,
  SwapKitHttpError,
  SwapKitNetworkError,
  classifySwapError,
} from './errors';
import { isValidChainAddress, SWAP_ADDRESS_CHAINS } from './addressValidators';
import { validateAddressForChain } from './validateAddressForChain';
import { possibleChainsForAddress } from './possibleChainsForAddress';

import {
  ExtractDepositInstructionsContext,
  ProviderExecutor,
} from './providers/ProviderExecutor';
import { FlashnetExecutor } from './providers/FlashnetExecutor';
import { MayaExecutor } from './providers/MayaExecutor';
import { NearIntentsExecutor } from './providers/NearIntentsExecutor';
import {
  ProviderRegistry,
  createDefaultProviderRegistry,
} from './providers/ProviderRegistry';
import { mapSwapStatus, mapTrackingStatus } from './providers/statusMapping';
import {
  applyDefaultTrackUpdate,
  pickLegHash,
} from './providers/trackUpdateBase';

export {
  // Enums
  BroadcastStatusEnum,
  SwapDirectionEnum,
  SwapErrorCategoryEnum,
  SwapKitProviderEnum,
  SwapOperationEnum,
  SwapStatusEnum,
  TrackingStatusEnum,
  isTerminalStatus,

  // Primitive types
  FiatValueBasisType,
  RefundInfoType,
  SwapAssetType,

  // Provider-specific data variants
  ChainflipProviderData,
  FlashnetProviderData,
  GenericProviderData,
  MayachainStreamingProviderData,
  NearProviderData,
  ProviderDataType,
  ThorchainStreamingProviderData,

  // Aggregates
  DepositInstructionsType,
  RouteOptionType,
  SwapRecordType,

  // SwapKit REST DTOs
  QuoteResponseType,
  QuoteRouteAssetType,
  QuoteRouteFeeType,
  QuoteRouteType,
  SwapResponseType,
  SwapTransientType,
  SwapTxType,
  TokenEntryType,
  TokensProviderBucketType,
  TokensResponseType,
  TrackLegType,
  TrackResponseType,

  // REST client
  SwapKitClient,
  SwapKitQuoteParams,
  SwapKitSwapParams,
  SwapKitTrackParams,

  // Persistence
  SwapStore,
  SwapStoreChangeListener,
  deriveWalletFingerprint,
  swapRecordToValueTransfer,
  isOutboundSwap,

  // Display helpers
  formatAmountForDisplay,

  // Token catalog
  TokenCatalog,

  // Poller
  SwapPoller,
  SwapPollerArgs,
  SwapPollerConfig,
  DEFAULT_SWAP_POLLER_CONFIG,

  // Top-level service
  SwapService,
  SwapServiceArgs,
  QuoteInput,
  QuoteResult,
  CommitRouteArgs,
  CommitRouteResult,
  MarkBroadcastedArgs,
  SetObservedDepositTxHashArgs,
  createSwapService,

  // Errors
  SwapKitError,
  SwapKitHttpError,
  SwapKitNetworkError,
  classifySwapError,

  // Address validators
  isValidChainAddress,
  SWAP_ADDRESS_CHAINS,
  validateAddressForChain,
  possibleChainsForAddress,

  // Provider executors
  ExtractDepositInstructionsContext,
  ProviderExecutor,
  MayaExecutor,
  NearIntentsExecutor,
  FlashnetExecutor,
  ProviderRegistry,
  createDefaultProviderRegistry,
  mapSwapStatus,
  mapTrackingStatus,
  applyDefaultTrackUpdate,
  pickLegHash,
};
