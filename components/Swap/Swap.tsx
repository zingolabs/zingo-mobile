/* eslint-disable react-native/no-inline-styles */
import React, {
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  ActivityIndicator,
  AppState,
  Keyboard,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import Animated from 'react-native-reanimated';
import { useTheme } from '@react-navigation/native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import {
  faChevronDown,
  faRotateRight,
  faXmark,
} from '@fortawesome/free-solid-svg-icons';
import BottomSheet, { BottomSheetModal } from '@gorhom/bottom-sheet';
import { getNumberFormatSettings } from 'react-native-localize';

import {
  ButtonTypeEnum,
  ChainNameEnum,
  CurrencyEnum,
  RouteEnum,
  ScreenEnum,
  SnackbarDurationEnum,
} from '../../app/AppState';
import { ContextAppLoaded, useSwapService } from '../../app/context';
import { reserveEphemeralAddress } from '../../app/walletBackend';
import { AppDrawerParamList, ThemeType } from '../../app/types';
import BoldText from '../Components/BoldText';
import RegText from '../Components/RegText';
import FadeText from '../Components/FadeText';
import Button from '../Components/Button';
import Header from '../Header';
import { SwapFilledIcon } from '../Components/Icons/SwapFilledIcon';
import CurrencyAmount from '../Components/CurrencyAmount';
import Utils from '../../app/utils';
import { useDismissSheetsOnBlur } from '../../app/hooks/useDismissSheetsOnBlur';
import { useOptionsPanelSheetSlide } from '../../app/hooks/useOptionsPanelSheetSlide';
import { usePriceSnapAutoClose } from '../../app/hooks/usePriceSnapAutoClose';
import { safeSnapToIndex } from '../../app/utils/safeSnapToIndex';
import {
  FiatValueBasisType,
  QuoteInput,
  RouteOptionType,
  SwapAssetType,
  SwapDirectionEnum,
  SwapErrorCategoryEnum,
  SwapKitHttpError,
  TokenEntryType,
  classifySwapError,
  formatAmountForDisplay,
  isValidChainAddress,
} from '../../app/swap';
import AssetPickerSheet from './components/AssetPickerSheet';
import QuotesPickerSheet from './components/QuotesPickerSheet';
import ReviewSheet from './components/ReviewSheet';
import { chainDisplayName } from './components/chainDisplayName';
import { providerShortLabel } from './components/providerLabels';
import SlippageSheet, {
  formatSlippagePercent,
} from './components/SlippageSheet';
import InsufficientFundsSheet from './components/InsufficientFundsSheet';
import TokenLogo from './components/TokenLogo';

/**
 * Canonical SwapKit asset descriptor for ZEC. Declared at module scope
 * because the values never change and recomputing on every render would
 * pollute the dependency arrays of the quote handler.
 */
/**
 * Symbols beyond this many characters are clipped with an ellipsis. Normal
 * ticker symbols are 3-7 chars (`BTC`, `USDC`, `MATIC`, `wstETH`), so the
 * threshold leaves room for the legitimate long forms while still cutting
 * off the ugly contract-address suffix that some SwapKit `symbol` fields
 * carry when `ticker` is unavailable.
 */
const MAX_SYMBOL_CHARS = 8;
function truncateSymbol(s: string): string {
  if (s.length <= MAX_SYMBOL_CHARS) return s;
  return `${s.slice(0, MAX_SYMBOL_CHARS)}…`;
}

/**
 * Format a fee amount (canonical decimal string from `RouteOptionType`) for
 * display. Returns `"0.0000"` when missing or zero so the headline row never
 * goes blank — empty space there read as "no data" in user testing instead
 * of "no fee", which is the opposite of what we want. Caps at 8 decimals
 * (the same precision the destination amount row uses).
 */
function formatFeeAmount(raw: string | undefined): string {
  const num = parseFloat(raw ?? '0');
  if (!Number.isFinite(num) || num === 0) return '0.0000';
  return num >= 1 ? num.toFixed(4) : num.toFixed(8);
}

/**
 * Format the bridge (affiliate + service) fee row. When the value is zero we
 * render a dashed placeholder `------` to match the design — a literal
 * `"0 BTC"` would draw the eye to a non-existent cost.
 */
function formatBridgeFee(raw: string | undefined, symbol: string): string {
  const num = parseFloat(raw ?? '0');
  if (!Number.isFinite(num) || num === 0) return '------';
  const formatted = num >= 1 ? num.toFixed(4) : num.toFixed(8);
  return `${formatted} ${symbol}`;
}

const ZEC_ASSET: SwapAssetType = {
  swapKitId: 'ZEC.ZEC',
  chain: 'ZEC',
  symbol: 'ZEC',
  ticker: 'ZEC',
  chainId: 'zcash',
  decimals: 8,
};

/**
 * Token-catalog-shaped entry for ZEC. Lets the `TokenLogo` helper render the
 * Zcash logo (with the same composition treatment as non-ZEC chips) in the
 * fixed ZEC slot, so both sides of the swap feel visually balanced.
 */
const ZEC_TOKEN_ENTRY: TokenEntryType = {
  chain: 'ZEC',
  chainId: 'zcash',
  ticker: 'ZEC',
  identifier: 'ZEC.ZEC',
  symbol: 'ZEC',
  name: 'Zcash',
  decimals: 8,
  logoURI:
    'https://storage.googleapis.com/token-list-swapkit/images/zec.zec.png',
};

/**
 * Swap entry screen.
 *
 * Uses the same screen scaffold as Receive/Send/History: a root container
 * measures itself, the Header is laid out above, and the screen content lives
 * inside a `BottomSheet` whose snap points are computed from the container/
 * header sizes so dragging the sheet down reveals the price/balance rows in
 * the Header — matching how the other three screens behave.
 *
 * The body content (cards, toggle, slippage, button) is the static layout
 * approved in the previous iteration; interactivity comes in subsequent
 * pieces.
 */
type SwapProps = NativeStackScreenProps<AppDrawerParamList, RouteEnum.Swap> & {
  toggleMenuDrawer: () => void;
  setShieldingAmount: (value: number) => void;
  setScrollToTop: (value: boolean) => void;
  setScrollToBottom: (value: boolean) => void;
  /** Broadcast the swap deposit transaction via zingolib. Owned by LoadedApp
   *  so the swap screen never holds a direct reference to the wallet.
   *  Returns the broadcast tx hashes in chronological order — single-hop
   *  yields one, the ZIP-320 2-hop yields two with `[length - 1]` being the
   *  deposit tx the provider observes. */
  sendSwapDeposit: (args: {
    depositAddress: string;
    amountAtomic: number;
    memoBytes?: Uint8Array;
    routeViaEphemeral?: boolean;
  }) => Promise<string[]>;
};

const Swap: React.FunctionComponent<SwapProps> = ({
  toggleMenuDrawer,
  setShieldingAmount,
  setScrollToTop,
  setScrollToBottom,
  sendSwapDeposit,
}) => {
  const context = useContext(ContextAppLoaded);
  const {
    translate,
    addLastSnackbar,
    setBackgroundError,
    server,
    currency,
    totalBalance,
    zecPrice,
    privacy,
  } = context;
  const { colors } = useTheme() as ThemeType;

  const t = (key: string, fallback: string): string =>
    (translate?.(key) as string) || fallback;

  // Spendable balance in ZEC display units. Matches Send's bookkeeping
  // (`totalBalance.totalSpendableBalance` is already in ZEC, not zatoshis).
  // Tracked as state so a future poll-driven update (mirroring Send's
  // `getSpendableBalanceWithAddress` call) can refine the value beyond what
  // `totalBalance` exposes.
  const [spendable, setSpendable] = useState<number>(
    totalBalance ? totalBalance.totalSpendableBalance : 0,
  );
  useEffect(() => {
    setSpendable(totalBalance ? totalBalance.totalSpendableBalance : 0);
  }, [totalBalance]);

  // Direction is initialized once based on the spendable balance at mount:
  // a user with ZEC opened the screen to sell (OUTBOUND), a user with nothing
  // came here to acquire ZEC (INBOUND). After mount the toggle button lets
  // the user flip it.
  const [direction, setDirection] = useState<SwapDirectionEnum>(() =>
    (totalBalance?.totalSpendableBalance ?? 0) > 0
      ? SwapDirectionEnum.Outbound
      : SwapDirectionEnum.Inbound,
  );
  const isOutbound = direction === SwapDirectionEnum.Outbound;

  // Token catalog: fetched once via SwapService and cached for the session.
  // The non-ZEC side of the swap is user-selectable from this list; ZEC is
  // always the fixed side. `selectedToken` defaults to BTC (the identifier
  // `BTC.BTC`) as soon as the catalog resolves.
  const swapService = useSwapService();
  const [tokens, setTokens] = useState<TokenEntryType[] | null>(null);
  const [selectedToken, setSelectedToken] = useState<TokenEntryType | null>(
    null,
  );
  const assetPickerRef = useRef<BottomSheetModal>(null);

  // True after a catalog fetch failed with SwapKit's edge-block page (CF
  // "Sorry, you have been blocked"). Drives the persistent banner above the
  // form. Cleared the moment a fetch succeeds — which is how the banner
  // disappears as soon as the user activates a VPN and the catalog comes
  // through. Snackbar is emitted only once per blocked transition.
  const [catalogEdgeBlocked, setCatalogEdgeBlocked] = useState<boolean>(false);
  const [catalogRetrying, setCatalogRetrying] = useState<boolean>(false);

  // Catalog fetch lifted out of the mount-effect so it can be invoked from
  // the manual "retry" button on the banner and from the AppState listener
  // when the app comes back to foreground (typical "I just turned the VPN
  // on" flow). The `cancelled` flag protects against re-entry: only the
  // most recent invocation writes to state.
  const loadCatalogRef = useRef<{
    cancelled: boolean;
  } | null>(null);
  const loadCatalog = useCallback(async () => {
    if (!swapService) return;
    // Cancel any in-flight previous load so a stale response can't
    // overwrite the success of a fresh retry.
    if (loadCatalogRef.current) loadCatalogRef.current.cancelled = true;
    const token = { cancelled: false };
    loadCatalogRef.current = token;
    setCatalogRetrying(true);
    const directionForFilter: 'outbound' | 'inbound' = isOutbound
      ? 'outbound'
      : 'inbound';
    try {
      const list = await swapService.listRoutableTokens(directionForFilter);
      if (token.cancelled) return;
      setTokens(list);
      setCatalogEdgeBlocked(false);
      const btc =
        list.find(item => item.identifier === 'BTC.BTC') ?? list[0] ?? null;
      setSelectedToken(prev => prev ?? btc);
    } catch (err) {
      if (token.cancelled) return;
      const errMsg = err instanceof Error ? err.message : String(err);
      console.log('Swap: listRoutableTokens failed:', errMsg, err);
      // Differentiate the SwapKit edge-block page (CF "Sorry, you have
      // been blocked") from any other failure: the first case is region /
      // ISP-driven and the user needs a VPN; everything else is a normal
      // network / server issue and the legacy snackbar still applies.
      const edgeBlocked = err instanceof SwapKitHttpError && err.isEdgeBlocked;
      if (edgeBlocked) {
        if (!catalogEdgeBlocked) {
          // Only fire the snackbar on the *first* failure of a streak so
          // subsequent silent retries don't spam.
          addLastSnackbar?.(
            (translate?.('swap.edge-blocked-snackbar') as string) ||
              'Swap service is blocked on your network. Try a VPN.',
            SnackbarDurationEnum.long,
          );
        }
        setCatalogEdgeBlocked(true);
      } else {
        const errLabel =
          (translate?.('swap.catalog-error') as string) ||
          'Failed to load tokens';
        addLastSnackbar?.(`${errLabel}: ${errMsg}`, SnackbarDurationEnum.long);
      }
    } finally {
      if (!token.cancelled) setCatalogRetrying(false);
    }
  }, [swapService, isOutbound, addLastSnackbar, translate, catalogEdgeBlocked]);

  // Initial fetch on mount and whenever the dependencies of `loadCatalog`
  // change (direction flip, service ready). The actual cancellation is
  // handled inside `loadCatalog` via the ref-tracked token.
  useEffect(() => {
    loadCatalog().catch(() => {
      // loadCatalog handles its own errors via state/snackbar; the catch
      // is just to satisfy lint's no-floating-promises stance.
    });
    return () => {
      if (loadCatalogRef.current) loadCatalogRef.current.cancelled = true;
    };
  }, [loadCatalog]);

  // Auto-retry when the app returns to foreground while the banner is up.
  // Natural flow: user sees banner → backgrounds the app → opens VPN client
  // → returns to Zingo. We re-attempt the catalog silently; if it succeeds
  // the banner disappears without any user gesture.
  useEffect(() => {
    if (!catalogEdgeBlocked) return;
    const sub = AppState.addEventListener('change', state => {
      if (state === 'active') {
        loadCatalog().catch(() => {
          // Handled inside loadCatalog.
        });
      }
    });
    return () => {
      sub.remove();
    };
  }, [catalogEdgeBlocked, loadCatalog]);

  // Catalog view shown in the asset picker. Wrapped-ZEC variants (NEAR, SOL,
  // STRK bridges) are hidden when the user is sending native ZEC out — there
  // is no scenario where bridging native ZEC to a wrapped version is the
  // right move. The reverse is fine: if the user already holds a wrapped ZEC
  // somewhere, swapping it back to native ZEC is exactly what this wallet is
  // for, so we show them in the inbound direction.
  const displayedTokens = useMemo(() => {
    if (!tokens) return null;
    if (!isOutbound) return tokens;
    return tokens.filter(tok => {
      const ticker = (tok.ticker || tok.symbol || '').toUpperCase();
      return ticker !== 'ZEC';
    });
  }, [tokens, isOutbound]);

  // If the user picked a wrapped-ZEC token while inbound and then flips to
  // outbound, the chip would point at an asset we are about to refuse to
  // route to. Snap it back to a safe default so the form stays consistent.
  useEffect(() => {
    if (!isOutbound || !selectedToken || !tokens) return;
    const ticker = (
      selectedToken.ticker ||
      selectedToken.symbol ||
      ''
    ).toUpperCase();
    if (ticker === 'ZEC') {
      const fallback =
        tokens.find(tok => tok.identifier === 'BTC.BTC') ?? tokens[0] ?? null;
      setSelectedToken(fallback);
    }
  }, [isOutbound, selectedToken, tokens]);

  const openAssetPicker = useCallback(() => {
    if (!displayedTokens || displayedTokens.length === 0) return;
    assetPickerRef.current?.present();
  }, [displayedTokens]);

  // Both directions ask the user for a non-ZEC address, but the role is
  // different:
  //   - Outbound (ZEC -> non-ZEC): destination — where the non-ZEC asset is
  //     delivered.
  //   - Inbound (non-ZEC -> ZEC): refund — where the provider sends the
  //     non-ZEC asset back if the swap cannot complete (slippage, AML, etc.).
  //     It is also the address the user pays *from*, since most providers
  //     refund to the source of the inbound transaction.
  // Two separate state vars so toggling direction does not silently overwrite
  // either purpose-specific address. Each carries a "touched" companion that
  // flips to `true` the first time the user blurs the field — until then the
  // address-format error stays hidden so the input doesn't flash red while the
  // user is mid-paste.
  const [destinationAddress, setDestinationAddress] = useState<string>('');
  const [destinationAddressTouched, setDestinationAddressTouched] =
    useState<boolean>(false);
  const [refundAddress, setRefundAddress] = useState<string>('');
  const [refundAddressTouched, setRefundAddressTouched] =
    useState<boolean>(false);

  // When the user switches asset/chain, clear both address fields (and
  // their touched flags) — an address valid for the previous chain is
  // almost certainly invalid for the new one, and leaving the stale value
  // sitting in the field without an error indicator is misleading. The
  // touched-flag reset alone (which is what we used to do) hid the error
  // banner but let the user submit an address that wouldn't route.
  // `onToggleDirection` already clears both for the same reason on
  // direction flip; this mirrors that pattern.
  useEffect(() => {
    setDestinationAddress('');
    setRefundAddress('');
    setDestinationAddressTouched(false);
    setRefundAddressTouched(false);
  }, [direction, selectedToken?.chain]);

  // Validate the currently active address (destination on outbound, refund
  // on inbound) against the selected non-ZEC chain. The error only renders
  // once the field has been touched so the user sees the message after
  // committing to a value, not while typing.
  const activeAddressChain = selectedToken?.chain ?? '';
  const activeAddressValue = isOutbound ? destinationAddress : refundAddress;
  const activeAddressTouched = isOutbound
    ? destinationAddressTouched
    : refundAddressTouched;
  const activeAddressValid = useMemo(
    () => isValidChainAddress(activeAddressChain, activeAddressValue),
    [activeAddressChain, activeAddressValue],
  );
  const activeAddressShowError =
    activeAddressTouched &&
    activeAddressValue.trim().length > 0 &&
    !activeAddressValid;

  // Source amount input. Locale-aware decimal separator: in Spanish the user
  // types `1,5`; in English `1.5`. We filter input to digits + the locale
  // separator, then parse for the live destination/rate computation.
  const { decimalSeparator } = getNumberFormatSettings();
  const [sourceInput, setSourceInput] = useState<string>('');

  // Slippage tolerance in basis points (2% = 200 bps). Editable via the
  // SlippageSheet modal. Sent to `swapService.quote()` so the route is
  // priced against the user's tolerance.
  const [slippageBps, setSlippageBps] = useState<number>(200);
  const slippageSheetRef = useRef<BottomSheetModal>(null);
  const openSlippageSheet = useCallback(() => {
    slippageSheetRef.current?.present();
  }, []);
  const reviewSheetRef = useRef<BottomSheetModal>(null);
  const insufficientSheetRef = useRef<BottomSheetModal>(null);
  const openReviewSheet = useCallback(() => {
    // Refresh the addresses on the pinned `quoteInput` snapshot to whatever
    // the user has now typed. Auto-quoting fires while the address field is
    // still empty (SwapKit's `/v3/quote` tolerates that), so at commit time
    // we need to materialise the real address before `commitRoute` runs.
    // Addresses do not affect the quoted rate — they only ride into the
    // provider's deposit-instructions payload — so patching here is safe.
    setLiveQuote(prev => {
      if (!prev) return prev;
      const isOut = direction === SwapDirectionEnum.Outbound;
      return {
        ...prev,
        quoteInput: {
          ...prev.quoteInput,
          sourceAddress: isOut ? prev.quoteInput.sourceAddress : refundAddress,
          destinationAddress: isOut
            ? destinationAddress
            : prev.quoteInput.destinationAddress,
        },
      };
    });
    reviewSheetRef.current?.present();
  }, [direction, destinationAddress, refundAddress]);
  const quotesPickerSheetRef = useRef<BottomSheetModal>(null);
  const openQuotesPickerSheet = useCallback(() => {
    quotesPickerSheetRef.current?.present();
  }, []);
  // Reset the per-intent form state once the user acknowledges a finished
  // swap via the ReviewSheet's Done button. Cleared: amount, both address
  // fields and their touched flags, live quote, and the ephemeral t-addr
  // reservation (next swap reserves a fresh one). Kept: direction, selected
  // asset and slippage tolerance — those are user preferences, not
  // per-swap state, and forcing the user to re-pick them after every swap
  // would be annoying.
  const onSwapCompleted = useCallback(() => {
    setSourceInput('');
    setDestinationAddress('');
    setRefundAddress('');
    setDestinationAddressTouched(false);
    setRefundAddressTouched(false);
    setLiveQuote(null);
    setEphemeralZecAddress(null);
  }, []);

  const onChangeSourceAmount = useCallback(
    (text: string) => {
      let filtered = '';
      let seenSep = false;
      for (const ch of text) {
        if (ch >= '0' && ch <= '9') filtered += ch;
        else if (ch === decimalSeparator && !seenSep) {
          filtered += ch;
          seenSep = true;
        }
      }
      setSourceInput(filtered);
    },
    [decimalSeparator],
  );

  const sourceNum = useMemo(() => {
    if (sourceInput.length === 0) return 0;
    const normalized =
      decimalSeparator === ',' ? sourceInput.replace(',', '.') : sourceInput;
    const n = parseFloat(normalized);
    return Number.isFinite(n) ? n : 0;
  }, [sourceInput, decimalSeparator]);

  // Live quote bookkeeping. `liveQuote` holds the projected destination
  // amount and rate from the most recent successful /v3/quote call PLUS the
  // metadata the review/commit step needs (the chosen route, the canonical
  // QuoteInput the API saw, and the fiat-basis snapshot). The whole bundle is
  // cleared whenever an input that affects the quote changes (amount,
  // direction, asset) so the screen never displays a stale rate against a
  // fresh input — and the review sheet never commits a value the user didn't
  // confirm against.
  const [isQuoting, setIsQuoting] = useState<boolean>(false);
  // "The last quote attempt for the current inputs failed" — kept as a
  // separate flag so the auto-fire debounce doesn't retry the same
  // failing combination forever (amount below provider minimum, no
  // route, network transient, etc.). Cleared whenever an input that
  // affects the quote actually changes; also cleared when a successful
  // quote lands so a legitimate refetch can happen after invalidation.
  const [quoteAttemptFailed, setQuoteAttemptFailed] = useState<boolean>(false);
  // Ref-latched pointer to the current `liveQuote` so `onGetQuote`'s catch
  // block can tell "initial fetch failed" (no previous snapshot → clear
  // and warn) apart from "refresh failed" (keep previous snapshot visible,
  // silently reset the countdown so the section doesn't flicker away).
  // Kept in a ref rather than the useCallback deps so `onGetQuote` stays
  // stable across every `liveQuote` change.
  const liveQuoteRef = useRef<typeof liveQuote>(null);
  // Manual-refresh rate limit. The refresh icon next to the countdown
  // triggers an immediate re-quote; without a cooldown, a spammed tap
  // would fire an HTTP request per press. Debounces the button to a
  // maximum of one manual fetch every 5 seconds.
  const MANUAL_REFRESH_COOLDOWN_MS = 5_000;
  const [manualRefreshCooldownUntilMs, setManualRefreshCooldownUntilMs] =
    useState<number>(0);
  const [liveQuote, setLiveQuote] = useState<{
    expectedReceive: string;
    /** Non-ZEC per ZEC. Inverted from the wire form so the rate label
     *  stays in the canonical "1 ZEC = X TOKEN" orientation regardless of
     *  swap direction. */
    ratePerZec: number;
    /** Pinned snapshot of the inputs that produced this quote. The review
     *  sheet calls `commitRoute` against these exact values regardless of
     *  what the form state shows at the moment of confirmation. */
    route: RouteOptionType;
    /** Every route SwapKit returned for the current quote. Kept so the
     *  QuotesPickerSheet can render the alternatives without re-quoting
     *  when the user wants to compare or override the default choice. */
    routes: ReadonlyArray<RouteOptionType>;
    quoteInput: QuoteInput;
    fiatValueBasis: FiatValueBasisType;
    /** Wall-clock ms when the /v3/quote response landed. Used as the start
     *  point for the 60s fallback countdown when SwapKit omits
     *  `route.expiresAtMs`. */
    receivedAtMs: number;
  } | null>(null);

  // Quote countdown. SwapKit returns an absolute expiry per route
  // (`expiresAtMs`); if missing we fall back to 60s from quote receipt. The
  // tick is paused while the ReviewSheet is open so the user gets to confirm
  // against the snapshot they saw — the provider will reject a stale commit
  // on its own if they take too long.
  const [isReviewSheetOpen, setIsReviewSheetOpen] = useState<boolean>(false);
  const [nowMs, setNowMs] = useState<number>(() => Date.now());
  // Quote refresh cadence. We ignore SwapKit's `route.expiresAtMs` on
  // purpose: providers advertise expiries of tens of minutes (NEAR 1 h,
  // Maya Streaming ~75 min), which give the user a false sense of price
  // stability — the rate at commit time can easily drift 5–10% from what
  // was displayed 40 min earlier. Instead we re-quote every 20 s. Short
  // enough that the displayed price stays close to the current market,
  // long enough not to hammer the API. Refresh pauses while the
  // ReviewSheet is open (the user is committing to the pinned snapshot).
  const QUOTE_REFRESH_INTERVAL_MS = 20_000;
  const quoteNextRefreshAtMs = useMemo<number | null>(() => {
    if (!liveQuote) return null;
    return liveQuote.receivedAtMs + QUOTE_REFRESH_INTERVAL_MS;
  }, [liveQuote]);
  const quoteSecondsLeft = useMemo<number | null>(() => {
    if (!liveQuote || quoteNextRefreshAtMs === null) return null;
    return Math.max(0, Math.ceil((quoteNextRefreshAtMs - nowMs) / 1000));
  }, [liveQuote, quoteNextRefreshAtMs, nowMs]);
  useEffect(() => {
    if (!liveQuote || isReviewSheetOpen) return;
    const id = setInterval(() => setNowMs(Date.now()), 1000);
    return () => clearInterval(id);
  }, [liveQuote, isReviewSheetOpen]);
  // On countdown → 0 we DO NOT null out `liveQuote`. Instead we fire
  // `onGetQuote` directly, which sets `isQuoting=true` and then, when the
  // response lands, overwrites `liveQuote` in place. All sections that
  // gate on `liveQuote` keep rendering the previous values throughout the
  // refresh — the user just sees the numbers swap for the new snapshot,
  // not the whole panel flicker away and reappear. The `!isQuoting`
  // guard prevents duplicate fires while one refresh is already in
  // flight (the countdown ticks by 1 s intervals; without the guard a
  // fresh tick during the request would re-enter).
  useEffect(() => {
    if (
      liveQuote &&
      !isReviewSheetOpen &&
      !isQuoting &&
      quoteNextRefreshAtMs !== null &&
      nowMs >= quoteNextRefreshAtMs
    ) {
      onGetQuoteRef.current?.();
    }
  }, [liveQuote, isReviewSheetOpen, isQuoting, quoteNextRefreshAtMs, nowMs]);

  // Post-quote affordability check (outbound only). The route's
  // `totalFeesInSellAsset` already aggregates every leg's fee converted to
  // ZEC — so the same formula works for Maya/Thor 2-hop, NEAR, Flashnet,
  // and anything else SwapKit may route through. The user can still
  // request a quote (purely informational) and just can't commit; the
  // "Reduce to X" affordance below the CTA helps them recover without
  // doing the arithmetic by hand.
  const totalFeesInSellAssetNum = useMemo<number>(() => {
    if (!liveQuote) return 0;
    const n = parseFloat(liveQuote.route.totalFeesInSellAsset || '0');
    return Number.isFinite(n) ? n : 0;
  }, [liveQuote]);
  const insufficientForCommit = useMemo<boolean>(() => {
    if (!liveQuote || !isOutbound) return false;
    return sourceNum + totalFeesInSellAssetNum > spendable;
  }, [liveQuote, isOutbound, sourceNum, totalFeesInSellAssetNum, spendable]);
  const maxSpendableForSwap = useMemo<number>(() => {
    return Math.max(0, spendable - totalFeesInSellAssetNum);
  }, [spendable, totalFeesInSellAssetNum]);
  const onReduceToMax = useCallback(() => {
    if (maxSpendableForSwap <= 0) return;
    // Mirror onToggleDirection's formatting: drop trailing zeros via
    // `String(n)` and swap the dot for the locale separator before
    // handing it to the TextInput.
    const stringified = String(
      Math.floor(maxSpendableForSwap * 1e8) / 1e8,
    ).replace('.', decimalSeparator);
    setSourceInput(stringified);
  }, [maxSpendableForSwap, decimalSeparator]);

  // User-driven route override from the QuotesPickerSheet. Replaces the
  // active route inside `liveQuote` and recomputes the derived values the
  // rest of the form depends on (expectedReceive, ratePerZec). The pinned
  // `quoteInput` and `fiatValueBasis` are intentionally preserved — they
  // describe the request that produced the quote, not the chosen route, and
  // the review sheet's commit path uses them as the canonical inputs.
  const selectRoute = useCallback(
    (newRoute: RouteOptionType) => {
      setLiveQuote(prev => {
        if (!prev) return prev;
        const expectedReceive = parseFloat(newRoute.expectedReceiveAmount);
        const sellAmountNum = parseFloat(
          prev.quoteInput.sellAmountHumanDecimal,
        );
        const isOut = direction === SwapDirectionEnum.Outbound;
        const ratePerZec = isOut
          ? sellAmountNum > 0
            ? expectedReceive / sellAmountNum
            : 0
          : expectedReceive > 0
            ? sellAmountNum / expectedReceive
            : 0;
        return {
          ...prev,
          route: newRoute,
          expectedReceive: newRoute.expectedReceiveAmount,
          ratePerZec,
        };
      });
    },
    [direction],
  );

  // Flip the swap direction. If we have a live quote we use its rate to
  // pre-fill the new source with the equivalent amount in the flipped trade;
  // otherwise we clear the input rather than synthesise a number out of a
  // made-up placeholder rate (which would mislead the user). The address
  // fields only matter for one direction each, so they are cleared on every
  // flip to avoid carrying stale state across modes.
  const onToggleDirection = useCallback(() => {
    Keyboard.dismiss();
    setDirection(prev => {
      const wasOutbound = prev === SwapDirectionEnum.Outbound;
      if (liveQuote && liveQuote.ratePerZec > 0) {
        const newSourceNum = wasOutbound
          ? sourceNum * liveQuote.ratePerZec // was OUT, now IN: new source is the old dest non-ZEC amount
          : sourceNum / liveQuote.ratePerZec; // was IN, now OUT: new source is the old dest ZEC amount
        if (newSourceNum > 0) {
          // Round to sensible precision before showing. `String(n)` on the
          // raw product / division leaks JS float rounding noise like
          // `0.01076140999999999` (verified in-app after a direction
          // flip). `formatAmountForDisplay` caps at 4 dp for values ≥ 1
          // and 8 dp otherwise, trimming trailing zeros — same policy as
          // every other amount shown in the swap surface, so the input
          // reads consistent with the display next to it.
          const stringified = formatAmountForDisplay(
            String(newSourceNum),
          ).replace('.', decimalSeparator);
          setSourceInput(stringified);
        } else {
          setSourceInput('');
        }
      } else {
        setSourceInput('');
      }
      setDestinationAddress('');
      setRefundAddress('');
      return wasOutbound
        ? SwapDirectionEnum.Inbound
        : SwapDirectionEnum.Outbound;
    });
  }, [sourceNum, decimalSeparator, liveQuote]);

  useEffect(() => {
    // Hard-invalidate the snapshot only on the "big" context changes:
    // flipping direction swaps which side is ZEC, and picking a new
    // asset makes the previous quote's fields meaningless. Both would
    // paint nonsensical values if we let the old quote linger.
    //
    // `sourceInput` and `slippageBps` are intentionally OUT of this
    // effect: they cause a fresh quote too, but we do that in place via
    // the auto-fire effect below — the previous snapshot keeps rendering
    // until the new one lands, so the panel does not flicker away and
    // reappear on every keystroke or slippage adjustment.
    //
    // Address fields are also intentionally excluded: SwapKit's
    // `/v3/quote` price is a function of assets + amount + slippage, not
    // of destination / refund address. Including them would refetch on
    // every char of an address paste, and the address is materialised
    // into the pinned `quoteInput` at commit time by `openReviewSheet`.
    setLiveQuote(null);
    setQuoteAttemptFailed(false);
  }, [direction, selectedToken?.identifier]);

  // Any input change that could make a previously-failed attempt worth
  // retrying: clear the "failed" flag so the auto-fire debounce fires
  // again for the new inputs. Kept as a separate effect from the hard-
  // invalidation above so the panel does NOT flicker (`liveQuote` stays
  // put). Without this, changing the amount after a "no routes" error
  // would leave `quoteAttemptFailed = true` forever and the auto-fire
  // would refuse to schedule anything for the new value.
  useEffect(() => {
    setQuoteAttemptFailed(false);
  }, [sourceInput, slippageBps]);

  // Our wallet-side ZEC address for the swap. We reserve a one-shot
  // ZIP-320 refund-scope (ephemeral) t-address so providers see a fresh
  // identifier per swap, refunds aren't linked to the user's persistent
  // t-receiver, and incoming refund/payout UTXOs still surface via sync
  // because pepper-sync scans the refund scope by default. Reused across
  // re-quotes for the same swap intent (same direction + selected asset);
  // invalidated when either changes so the next quote burns a new index.
  const [ephemeralZecAddress, setEphemeralZecAddress] = useState<string | null>(
    null,
  );
  useEffect(() => {
    setEphemeralZecAddress(null);
  }, [direction, selectedToken?.identifier]);

  // Quote button only depends on what the USER has to type: an amount and
  // the non-ZEC address. Internal preconditions (catalog loaded, mainnet)
  // are surfaced via snackbar on tap so the user always understands why
  // a request is not going through, instead of staring at a disabled
  // button with no explanation.
  // Requirements to fire a quote request. Address is intentionally NOT
  // required here — SwapKit's `/v3/quote` accepts an empty
  // `destinationAddress` (verified against the live endpoint) and returns
  // the same routes it would with a real one. The refund/destination
  // address is only needed at commit time, so we defer that check to the
  // "Continue" button's disabled logic.
  const canFetchQuote = !isQuoting && sourceNum > 0 && !!selectedToken;

  // Auto-fire the quote 500ms after the user stops changing the amount /
  // asset / direction. Removes the manual "Get Quote" tap: the user types
  // and the quote appears. `liveQuote` is already cleared on every input
  // change by the effect further up, so between input changes the button
  // reads as `!liveQuote` (disabled) and the debounced fetch produces a
  // fresh quote for the new inputs. 500ms absorbs typing bursts without
  // feeling laggy.
  useEffect(() => {
    if (!canFetchQuote) return;
    // Do NOT re-fire when the last attempt for the CURRENT inputs already
    // failed (below-minimum amount, no-route, provider transient…).
    // Without this guard the debounce would keep hammering the API with
    // the same failing request every 500ms. The flag clears when an
    // input actually changes, so a legitimate new attempt can happen.
    if (quoteAttemptFailed) return;
    // If we already hold a live quote AND its pinned inputs match what
    // the user has on-screen now, do nothing — this is the "we just
    // quoted the same thing" case that avoids an infinite loop after
    // every successful fetch (canFetchQuote flips false→true, effect
    // re-runs). When `sourceInput` or `slippageBps` differ from the
    // pinned snapshot we DO fire, but crucially we DO NOT null out
    // `liveQuote` first — the debounce takes 500 ms + the fetch, and
    // during that window the panel keeps showing the previous values
    // instead of flickering to an empty state.
    if (liveQuote) {
      const sellForApi =
        decimalSeparator === ',' ? sourceInput.replace(',', '.') : sourceInput;
      const sameAmount =
        liveQuote.quoteInput.sellAmountHumanDecimal === sellForApi;
      const sameSlippage = liveQuote.quoteInput.slippageBps === slippageBps;
      if (sameAmount && sameSlippage) return;
    }
    const timer = setTimeout(() => {
      onGetQuoteRef.current?.();
    }, 500);
    return () => clearTimeout(timer);
  }, [
    canFetchQuote,
    liveQuote,
    quoteAttemptFailed,
    sourceInput,
    decimalSeparator,
    sourceNum,
    selectedToken?.identifier,
    direction,
    slippageBps,
  ]);
  // Ref-latched handle to `onGetQuote` so the debounce effect above does
  // not need `onGetQuote` in its deps — that callback rebuilds on every
  // render and would restart the timer on every keystroke, defeating the
  // debounce.
  const onGetQuoteRef = useRef<(() => void) | null>(null);

  const onGetQuote = useCallback(async () => {
    if (!swapService) {
      addLastSnackbar?.(
        (translate?.('swap.quote-service-unavailable') as string) ||
          'Swap service is unavailable. Try again in a moment.',
        SnackbarDurationEnum.long,
      );
      return;
    }
    if (!selectedToken) {
      addLastSnackbar?.(
        (translate?.('swap.quote-catalog-loading') as string) ||
          'Asset catalog is still loading. Try again in a moment.',
        SnackbarDurationEnum.long,
      );
      return;
    }

    // Flip the spinner ON before any async work — the ephemeral address
    // reservation below is a native RPC that can take a noticeable beat,
    // and the SwapKit `/v3/quote` request after it is also non-trivial.
    // The previous order (spinner after reservation) made the CTA appear
    // frozen for the user.
    //
    // We deliberately DO NOT `Keyboard.dismiss()` here anymore. Auto-quote
    // fires from a debounce on the amount input; dismissing the keyboard
    // on every quote kicks the user out of the field while they are still
    // editing. The keyboard is dismissed elsewhere (direction flip, review
    // sheet open) where doing so is contextually correct.
    setIsQuoting(true);

    // Reserve a fresh ephemeral t-address if we don't already have one for
    // this swap intent. The reserved index is persisted in the wallet, so
    // even if the user abandons the swap the index is "burned" — no funds at
    // risk, only a BIP32 child slot. Reuse the same address across re-quotes
    // until direction/asset changes.
    let ephemeral = ephemeralZecAddress;
    if (!ephemeral) {
      try {
        const raw = await reserveEphemeralAddress();
        if (raw.startsWith('Error:')) {
          throw new Error(raw);
        }
        const parsed = JSON.parse(raw) as { encoded_address?: string };
        if (!parsed.encoded_address) {
          throw new Error('reserveEphemeralAddress: missing encoded_address');
        }
        ephemeral = parsed.encoded_address;
        setEphemeralZecAddress(ephemeral);
      } catch (err) {
        const errMsg = err instanceof Error ? err.message : String(err);
        console.log('Swap: reserveEphemeralAddress failed:', errMsg, err);
        const label =
          (translate?.('swap.ephemeral-error') as string) ||
          'Failed to reserve a swap address';
        addLastSnackbar?.(`${label}: ${errMsg}`, SnackbarDurationEnum.long);
        setIsQuoting(false);
        return;
      }
    }
    try {
      const nonZecAsset: SwapAssetType = {
        swapKitId: selectedToken.identifier,
        chain: selectedToken.chain,
        // Persist BOTH forms so downstream consumers can pick the appropriate
        // one: `symbol` is the catalog-precise variant (`"BTC-nbtc.bridge.near"`
        // for NEAR's wrapped BTC), used by surfaces that need to surface the
        // exact on-chain asset the user will end up holding (post-commit
        // success row). `ticker` is the clean short form (`"BTC"`) used by
        // surfaces that mean "the asset the user picked from the picker"
        // — chip, deposit-instructions exact amount, swap-screen fees row.
        symbol: selectedToken.symbol,
        ticker: selectedToken.ticker,
        chainId: selectedToken.chainId,
        decimals: selectedToken.decimals,
      };
      // The SwapKit API expects a `.`-separated decimal regardless of locale.
      const sellAmountForApi =
        decimalSeparator === ',' ? sourceInput.replace(',', '.') : sourceInput;

      const quoteInputForApi: QuoteInput = {
        sellAsset: isOutbound ? ZEC_ASSET : nonZecAsset,
        receiveAsset: isOutbound ? nonZecAsset : ZEC_ASSET,
        sellAmountHumanDecimal: sellAmountForApi,
        sourceAddress: isOutbound ? ephemeral : refundAddress,
        destinationAddress: isOutbound ? destinationAddress : ephemeral,
        slippageBps,
      };
      const result = await swapService.quote(quoteInputForApi);

      if (result.routes.length === 0) {
        // "No routes" is a real signal about the current market state
        // (amount below every provider's minimum right now, provider
        // liquidity gone, etc.) — NOT a transient network glitch. Hide
        // the panel and surface the reason so the user cannot commit
        // a stale snapshot expecting a rate that no longer exists.
        // Same treatment whether this was an initial fetch or a refresh.
        addLastSnackbar?.(
          (translate?.('swap.quote-no-route') as string) ||
            'No route available for this swap.',
          SnackbarDurationEnum.long,
        );
        setLiveQuote(null);
        setQuoteAttemptFailed(true);
        return;
      }

      // Default route: prefer whatever SwapKit tagged `RECOMMENDED` (their
      // own server-side ranking that already considers liquidity, price and
      // ETA). Falls back to the first route SwapKit returned when no tag is
      // present. Until the picker (Etapa 2) is wired the user has no UI to
      // override this choice — when it lands, the same `best` is just the
      // initial selection.
      const best =
        result.routes.find(r => r.tags?.includes('RECOMMENDED')) ??
        result.routes[0];
      const expectedReceive = parseFloat(best.expectedReceiveAmount);
      const sellAmountNum = parseFloat(sellAmountForApi);
      // Normalize the rate to BTC-per-ZEC regardless of direction so the
      // rate row stays in the "1 ZEC = X non-ZEC" form.
      const ratePerZec = isOutbound
        ? sellAmountNum > 0
          ? expectedReceive / sellAmountNum
          : 0
        : expectedReceive > 0
          ? sellAmountNum / expectedReceive
          : 0;
      // Build the fiat-basis snapshot. SwapKit emits the per-asset USD
      // prices at the *route* level (`route.meta.assets[]`), not at the
      // top of the quote response — verified empirically against
      // `api.swapkit.dev/v3/quote` on 2026-06-28. We still also probe
      // the top-level shape as a defensive fallback so the code keeps
      // working if SwapKit ever flattens the location. Collected across
      // every route because some routes may carry partial price lists.
      // Fall back to 0 when the entry is missing so the record
      // persistence path stays valid; the review sheet hides the
      // `≈ $X.XX` line when the unit price is 0.
      const topLevelAssets = Array.isArray(
        (result.rawResponse as { assets?: unknown }).assets,
      )
        ? (
            result.rawResponse as {
              assets: { asset?: string; price?: number }[];
            }
          ).assets
        : [];
      const routeLevelAssets: { asset?: string; price?: number }[] = [];
      for (const r of result.rawResponse.routes ?? []) {
        const metaAssets = (r.meta as { assets?: unknown } | undefined)?.assets;
        if (Array.isArray(metaAssets)) {
          for (const a of metaAssets) {
            routeLevelAssets.push(a as { asset?: string; price?: number });
          }
        }
      }
      const allAssets = [...routeLevelAssets, ...topLevelAssets];
      const findUsd = (id: string): number => {
        const entry = allAssets.find(a => a.asset === id);
        return entry?.price ?? 0;
      };
      const fiatValueBasis: FiatValueBasisType = {
        sellUsdUnitPrice: findUsd(quoteInputForApi.sellAsset.swapKitId),
        receiveUsdUnitPrice: findUsd(quoteInputForApi.receiveAsset.swapKitId),
        capturedAt: Date.now(),
      };
      setLiveQuote({
        expectedReceive: best.expectedReceiveAmount,
        ratePerZec,
        route: best,
        routes: result.routes,
        quoteInput: quoteInputForApi,
        fiatValueBasis,
        receivedAtMs: Date.now(),
      });
      setQuoteAttemptFailed(false);
      setNowMs(Date.now());
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : String(err);
      // Mirror the snackbar message to the JS console so it can be
      // copy-pasted from the device log when triaging a failure.
      console.log('Swap.onGetQuote failed:', errMsg, err);
      const category = classifySwapError(err);
      const noRoutes = category === SwapErrorCategoryEnum.NoQuoteOrLiquidity;
      const previous = liveQuoteRef.current;
      if (previous && !noRoutes) {
        // Transient failure while a previous snapshot is on-screen (real
        // network glitch, HTTP 5xx, edge timeout, etc.). Keep the panel
        // visible and bump the timer so we retry silently on the next
        // cycle — no snackbar noise per failed background attempt.
        setLiveQuote({ ...previous, receivedAtMs: Date.now() });
      } else {
        // Either it's the very first fetch, or SwapKit is telling us
        // "no route for these inputs" (404 `noRoutesFound`, common on
        // sub-minimum amounts). Both cases need to hide the previous
        // snapshot and surface the reason so the user cannot commit a
        // stale rate against inputs the market has now rejected.
        // Without this branch, a valid quote followed by a sub-minimum
        // amount looped forever: the `noRoutesFound` throw was treated
        // as a "keep previous, retry in 30 s" transient failure, and
        // every 30 s cycle re-threw the same 404 with the same amount.
        const snackbarText = noRoutes
          ? (translate?.('swap.quote-no-route') as string) ||
            'No route available for this amount. Try a different amount.'
          : `${
              (translate?.('swap.quote-error') as string) || 'Quote failed'
            }: ${errMsg}`;
        addLastSnackbar?.(snackbarText, SnackbarDurationEnum.long);
        setLiveQuote(null);
        setQuoteAttemptFailed(true);
      }
    } finally {
      setIsQuoting(false);
    }
  }, [
    swapService,
    selectedToken,
    sourceInput,
    decimalSeparator,
    isOutbound,
    ephemeralZecAddress,
    destinationAddress,
    refundAddress,
    slippageBps,
    addLastSnackbar,
    translate,
  ]);

  // Keep the ref-latched pointer to the newest `onGetQuote` in sync so the
  // debounce effect above can call the up-to-date callback without needing
  // it in its deps (which would restart the timer every keystroke and kill
  // the debounce).
  useEffect(() => {
    onGetQuoteRef.current = onGetQuote;
  }, [onGetQuote]);
  // Sync the ref to the freshest live quote so the catch inside
  // `onGetQuote` can distinguish refresh-fail (keep previous snapshot,
  // stay silent) from initial-fetch-fail (clear + snackbar).
  useEffect(() => {
    liveQuoteRef.current = liveQuote;
  }, [liveQuote]);

  // Layout measurements drive the BottomSheet snap points so the user can
  // drag the sheet down to reveal the price/balance rows in the Header.
  const [containerH, setContainerH] = useState<number>(0);
  const [headerH, setHeaderH] = useState<number>(0);
  const [usdRowH, setUsdRowH] = useState<number>(0);
  const [priceRowH, setPriceRowH] = useState<number>(0);

  const swapSheetRef = useRef<BottomSheet>(null);
  const sheetSlideStyle = useOptionsPanelSheetSlide();
  useDismissSheetsOnBlur();

  // Rounded sheet header, mounted as gorhom's real handle so its top
  // border seams cleanly into the sheet's `backgroundStyle`. Wrapped in
  // `useCallback` (same shape as SlippageSheet's `renderHandle`) so the
  // handle identity is stable across renders — otherwise gorhom would
  // remount the handle on every parent render, defeating the point.
  const renderSwapSheetHandle = useCallback(
    () => (
      <View
        style={{
          paddingTop: 8,
          paddingBottom: 6,
          paddingHorizontal: 16,
          backgroundColor: colors.bottomSheetBackground,
          borderTopLeftRadius: 40,
          borderTopRightRadius: 40,
          borderTopWidth: 1,
          borderLeftWidth: 0.5,
          borderRightWidth: 0.5,
          borderTopColor: colors.bottomSheetBorder,
          borderLeftColor: colors.bottomSheetBorder,
          borderRightColor: colors.bottomSheetBorder,
        }}
      >
        <View style={styles.sheetTitleRow}>
          <BoldText style={{ ...styles.sheetTitle, color: colors.text }}>
            {t('swap.title', 'Swap Assets')}
          </BoldText>
        </View>
      </View>
    ),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [colors],
  );

  // Identical snap-point math to Receive/History so dragging feels the same
  // across screens.
  const TOP_ICONS_H = 55;
  const SNAP_GAP = 4;
  const BALANCE_SNAP_BUMP = 10;

  useEffect(() => {
    const isMainChain = server.chainName === ChainNameEnum.mainChainName;
    const withUsd = isMainChain && currency === CurrencyEnum.USDCurrency;
    if (!withUsd) {
      setUsdRowH(0);
    }
  }, [currency, server.chainName]);

  const swapSnapPoints = useMemo(() => {
    const isMainChain = server.chainName === ChainNameEnum.mainChainName;
    const withUsd = isMainChain && currency === CurrencyEnum.USDCurrency;
    if (containerH <= 0 || headerH <= 0) {
      return withUsd ? ['85%', '89%', '93%'] : ['89%', '93%'];
    }
    const snapBase = containerH - headerH - SNAP_GAP;
    const snapPrice = Math.max(snapBase + BALANCE_SNAP_BUMP, 100);
    const snapLow = Math.max(snapBase + priceRowH + BALANCE_SNAP_BUMP, 100);
    const snapMid = Math.min(
      Math.max(snapBase + priceRowH + usdRowH + BALANCE_SNAP_BUMP, snapLow + 1),
      containerH - TOP_ICONS_H - SNAP_GAP,
    );
    const snapMax = Math.max(containerH - TOP_ICONS_H - SNAP_GAP, snapLow + 1);
    const points: number[] = [];
    if (priceRowH > 0) {
      points.push(snapPrice);
    }
    points.push(snapLow);
    if (withUsd && usdRowH > 0) {
      points.push(snapMid);
    }
    points.push(snapMax);
    return points;
  }, [currency, server.chainName, containerH, headerH, usdRowH, priceRowH]);

  // The BottomSheet `index` prop is hardcoded to 0 below (NOT reactive). See
  // the longer comment in Receive.tsx: a reactive `index` racing with a
  // snapPoints change crashes gorhom v5.2.14's invariant because its
  // `useDerivedValue<detents>` doesn't re-evaluate on snapPoints prop
  // changes (only on layoutState SharedValue changes). History/Send already
  // hardcode `index={0}` and never crash; Receive/Swap had the dynamic prop
  // and were the only ones tripping the invariant in production.
  // Movement to the desired "open" snap goes through the ref + safeSnapToIndex.
  const sheetMeasured = containerH > 0 && headerH > 0;
  const internalSnapIndexRef = useRef<number>(0);
  // One-shot: snap to the natural "open" position (largest snap) once the
  // layout settles, via the ref. Avoids touching the `index` prop entirely.
  const didInitialSnapRef = useRef<boolean>(false);
  useEffect(() => {
    if (didInitialSnapRef.current) return;
    if (!sheetMeasured) return;
    if (swapSnapPoints.length === 0) return;
    didInitialSnapRef.current = true;
    safeSnapToIndex(
      swapSheetRef,
      swapSnapPoints.length - 1,
      swapSnapPoints.length,
    );
  }, [sheetMeasured, swapSnapPoints]);
  useEffect(() => {
    if (internalSnapIndexRef.current >= swapSnapPoints.length) {
      safeSnapToIndex(
        swapSheetRef,
        swapSnapPoints.length - 1,
        swapSnapPoints.length,
      );
    }
  }, [swapSnapPoints]);

  // Snap to the largest detent the first time a `liveQuote` arrives. The
  // fees summary card grows the form below the rest of the inputs and the
  // Review CTA can land behind the bottom-tab bar at lower snap points —
  // pulling the sheet up keeps the action button reachable without forcing
  // the user to drag. Resets when the quote is invalidated so the next
  // successful quote re-snaps; respects the user if they have already
  // positioned the sheet at the top.
  const didSnapForQuoteRef = useRef<boolean>(false);
  useEffect(() => {
    if (!liveQuote) {
      didSnapForQuoteRef.current = false;
      return;
    }
    if (didSnapForQuoteRef.current) return;
    if (!sheetMeasured) return;
    if (swapSnapPoints.length === 0) return;
    didSnapForQuoteRef.current = true;
    const topIndex = swapSnapPoints.length - 1;
    if (internalSnapIndexRef.current === topIndex) return;
    safeSnapToIndex(swapSheetRef, topIndex, swapSnapPoints.length);
  }, [liveQuote, sheetMeasured, swapSnapPoints]);

  // Bump up one snap when the PriceRow first appears so the user stays at
  // the same visual snap.
  const prevHasPriceSnapRef = useRef<boolean>(false);
  useEffect(() => {
    const hasPriceSnap = priceRowH > 0;
    const justAppeared = !prevHasPriceSnapRef.current && hasPriceSnap;
    prevHasPriceSnapRef.current = hasPriceSnap;
    if (!justAppeared) return;
    safeSnapToIndex(
      swapSheetRef,
      internalSnapIndexRef.current + 1,
      swapSnapPoints.length,
    );
  }, [priceRowH, swapSnapPoints]);

  const priceSnapIndex = priceRowH > 0 ? 0 : null;
  const onPriceSnapChange = usePriceSnapAutoClose(
    swapSheetRef,
    priceSnapIndex,
    1,
    swapSnapPoints.length,
  );

  // Per-card derived values. SwapKit's `ticker` field is the clean
  // uppercase short form (`"USDC"`); `symbol` may include the contract
  // address suffix for ERC20s (`"USDC-0x8ac76a51..."`) which would break
  // tight UI slots — so we prefer `ticker` and truncate as a safety net.
  const nonZecSymbol = truncateSymbol(
    selectedToken?.ticker ?? selectedToken?.symbol ?? 'BTC',
  );
  // For bridged assets the visible symbol and the chain differ (e.g., ETH on
  // Near, USDC on Base) and the address format the user must enter follows
  // the chain, not the symbol. We surface the chain in the address label and
  // in the validation error so a user holding "ETH" doesn't paste an EVM
  // address into a field that actually expects a NEAR account.
  const nonZecChainName = selectedToken
    ? chainDisplayName(selectedToken.chain)
    : '';
  const symbolDiffersFromChain =
    selectedToken !== null &&
    selectedToken.symbol.toUpperCase() !== selectedToken.chain.toUpperCase();
  const addressChip = symbolDiffersFromChain
    ? `${nonZecSymbol} · ${nonZecChainName}`
    : nonZecSymbol;
  const invalidAddressMessage = (() => {
    if (!selectedToken) {
      return (
        (translate?.('swap.invalid-address') as string) || 'Invalid address'
      );
    }
    const template =
      (translate?.('swap.invalid-chain-address') as string) ||
      'Invalid {chain} address';
    return template.replace('{chain}', nonZecChainName);
  })();
  const sourceIsZec = isOutbound;
  const spendableStr = spendable.toFixed(4);
  const spendableLabel = `${t('swap.spendable', 'Spendable')}: ${spendableStr}`;
  const externalLabel = t('swap.balance-external', 'Balance: External Wallet');
  const sourceBalanceLabel = isOutbound ? spendableLabel : externalLabel;
  const destBalanceLabel = isOutbound ? externalLabel : spendableLabel;
  // Destination amount: show "—" until SwapKit returns a real quote. We
  // previously fell back to a hardcoded 0.004 BTC/ZEC ratio when there was
  // no quote yet, but that number was both stale (~16× off at current
  // prices) and meaningless for non-BTC tokens — better to show no value
  // than a misleading one.
  const sourceAmountStr = sourceInput;
  // Rate header rendered inside the fees card (top, centered, dim). Always
  // expressed as "1 <what the user sends> = X <what the user receives>" so
  // the value reads naturally regardless of direction. `liveQuote.ratePerZec`
  // is stored as receive-per-ZEC, which lets us pick the orientation here
  // without a second roundtrip to the quote response.
  const rateHeader = (() => {
    if (!liveQuote || liveQuote.ratePerZec <= 0) return null;
    if (isOutbound) {
      return `1 ZEC = ${Utils.parseNumberFloatToStringLocale(
        liveQuote.ratePerZec,
        liveQuote.ratePerZec >= 1 ? 4 : 8,
      )} ${nonZecSymbol}`;
    }
    const zecPerNonZec = 1 / liveQuote.ratePerZec;
    return `1 ${nonZecSymbol} = ${Utils.parseNumberFloatToStringLocale(
      zecPerNonZec,
      zecPerNonZec >= 1 ? 4 : 8,
    )} ZEC`;
  })();
  const destAmountStr = (() => {
    if (!liveQuote) return '—';
    const num = parseFloat(liveQuote.expectedReceive);
    return Number.isFinite(num)
      ? Utils.parseNumberFloatToStringLocale(num, 8)
      : '—';
  })();

  // Soft cap: when sending ZEC outbound, flag the amount as invalid if it
  // exceeds the spendable balance. The TextInput still accepts the value —
  // we just colour it so the user sees the problem.
  const sourceInvalid = isOutbound && sourceNum > spendable;

  return (
    <View
      style={{ flex: 1 }}
      onLayout={e => setContainerH(e.nativeEvent.layout.height)}
      testID="swap.title"
    >
      <View
        accessible={true}
        accessibilityLabel={t('swap.title', 'Swap Assets')}
        style={{
          display: 'flex',
          justifyContent: 'flex-start',
          width: '100%',
        }}
        onLayout={e => setHeaderH(e.nativeEvent.layout.height)}
      >
        <Header
          title={''}
          screenName={ScreenEnum.Swap}
          toggleMenuDrawer={toggleMenuDrawer}
          setPrivacyOption={undefined}
          addLastSnackbar={(msg: string, duration?: SnackbarDurationEnum) =>
            addLastSnackbar?.(msg, duration)
          }
          setShieldingAmount={setShieldingAmount}
          setScrollToTop={setScrollToTop}
          setScrollToBottom={setScrollToBottom}
          setBackgroundError={setBackgroundError}
          showMessagesIcon={true}
          onUsdRowLayout={setUsdRowH}
          onPriceRowLayout={setPriceRowH}
        />
      </View>
      <Animated.View
        pointerEvents="box-none"
        style={[StyleSheet.absoluteFill, sheetSlideStyle]}
      >
        {sheetMeasured && (
          <BottomSheet
            ref={swapSheetRef}
            accessible={false}
            snapPoints={swapSnapPoints}
            index={0}
            onChange={i => {
              internalSnapIndexRef.current = i;
              onPriceSnapChange(i);
            }}
            enableDynamicSizing={false}
            enablePanDownToClose={false}
            enableContentPanningGesture={false}
            backgroundStyle={{
              backgroundColor: colors.bottomSheetBackground,
              borderTopLeftRadius: 40,
              borderTopRightRadius: 40,
            }}
            // Header rendered via `handleComponent` (mirrors History/Send/
            // SlippageSheet): gorhom mounts the rounded header as the
            // sheet's real handle, so its top border blends into the
            // `backgroundStyle` without leaving the small "pico" seam
            // that showed up when the header was drawn inside `children`.
            handleComponent={renderSwapSheetHandle}
          >
            <View
              style={{ flex: 1, backgroundColor: colors.bottomSheetBackground }}
            >
              <ScrollView
                style={{ flex: 1 }}
                contentContainerStyle={styles.scrollContent}
                keyboardShouldPersistTaps="handled"
                bounces={false}
                alwaysBounceVertical={false}
              >
                {/* Region-block banner. Visible only while a catalog fetch
                    has returned the SwapKit edge-block page (CF "Sorry,
                    you have been blocked"). Auto-retries on resume from
                    background so activating a VPN and switching back is
                    enough to clear it; the "Retry" button covers the
                    in-app retry without leaving the screen. */}
                {catalogEdgeBlocked && (
                  <View
                    style={[
                      styles.regionBlockBanner,
                      {
                        backgroundColor: colors.warning.background,
                        borderColor: colors.warning.border,
                      },
                    ]}
                  >
                    <BoldText
                      style={{ color: colors.warning.title, marginBottom: 4 }}
                    >
                      {t(
                        'swap.edge-blocked-banner-title',
                        'Swap service unavailable on this network',
                      )}
                    </BoldText>
                    <RegText style={{ color: colors.warning.text }}>
                      {t(
                        'swap.edge-blocked-banner-body',
                        'The swap provider is blocking requests from your network. If your country or ISP is restricted, connecting through a VPN usually resolves this.',
                      )}
                    </RegText>
                    <Pressable
                      onPress={loadCatalog}
                      disabled={catalogRetrying}
                      style={({ pressed }) => ({
                        marginTop: 10,
                        alignSelf: 'flex-start',
                        opacity: pressed || catalogRetrying ? 0.6 : 1,
                      })}
                    >
                      {catalogRetrying ? (
                        <ActivityIndicator
                          size="small"
                          color={colors.warning.primary}
                        />
                      ) : (
                        <BoldText style={{ color: colors.warning.primary }}>
                          {t('swap.edge-blocked-retry', 'Retry')}
                        </BoldText>
                      )}
                    </Pressable>
                  </View>
                )}

                {renderAssetCard({
                  role: 'source',
                  isZec: sourceIsZec,
                  nonZecSymbol,
                  nonZecToken: selectedToken,
                  balanceLabel: sourceBalanceLabel,
                  amount: sourceAmountStr,
                  editable: true,
                  invalid: sourceInvalid,
                  onChangeAmount: onChangeSourceAmount,
                  decimalSeparator,
                  onSelectAsset: openAssetPicker,
                  colors,
                  t,
                  currency,
                  zecPrice: zecPrice?.zecPrice,
                  privacy,
                  // INBOUND: source is BTC → refund address belongs here.
                  address: !sourceIsZec
                    ? {
                        value: refundAddress,
                        onChange: setRefundAddress,
                        onBlur: () => setRefundAddressTouched(true),
                        label: `${t('swap.refund-address-label', 'Refund address')} (${addressChip})`,
                        placeholder: t(
                          'swap.dest-address-placeholder',
                          'Enter address',
                        ),
                        invalid: activeAddressShowError,
                        errorText: invalidAddressMessage,
                        testID: 'swap.refund-address',
                      }
                    : undefined,
                })}

                {/* Direction toggle. Tapping inverts the swap (the previous
                    destination becomes the new source). The icon is rotated
                    90 deg so its arrows point up/down, matching the vertical
                    layout of the two cards. */}
                <View style={styles.toggleWrap}>
                  <Pressable
                    onPress={onToggleDirection}
                    accessibilityRole="button"
                    accessibilityLabel={t(
                      'swap.toggle-direction',
                      'Flip swap direction',
                    )}
                    style={({ pressed }) => [
                      styles.toggleBtn,
                      {
                        backgroundColor: colors.primary,
                        opacity: pressed ? 0.7 : 1,
                      },
                    ]}
                    testID="swap.toggle-direction"
                  >
                    <View style={styles.toggleIconRotate}>
                      <SwapFilledIcon size={20} color={colors.background} />
                    </View>
                  </Pressable>
                </View>

                {renderAssetCard({
                  role: 'destination',
                  isZec: !sourceIsZec,
                  nonZecSymbol,
                  nonZecToken: selectedToken,
                  balanceLabel: destBalanceLabel,
                  amount: destAmountStr,
                  editable: false,
                  onSelectAsset: openAssetPicker,
                  colors,
                  t,
                  currency,
                  zecPrice: zecPrice?.zecPrice,
                  privacy,
                  // OUTBOUND: destination is BTC → destination address here.
                  address: sourceIsZec
                    ? {
                        value: destinationAddress,
                        onChange: setDestinationAddress,
                        onBlur: () => setDestinationAddressTouched(true),
                        label: `${t('swap.dest-address-label', 'Destination address')} (${addressChip})`,
                        placeholder: t(
                          'swap.dest-address-placeholder',
                          'Enter address',
                        ),
                        invalid: activeAddressShowError,
                        errorText: invalidAddressMessage,
                        testID: 'swap.destination-address',
                      }
                    : undefined,
                })}

                {/* Fees summary. Replaces the legacy `1 ZEC = X TOKEN` rate
                    row with a richer card the user can tap to override the
                    selected provider. Three rows that map 1:1 to the design:
                    headline fee (in destination asset), bridge fee (affiliate
                    + service portion, also in destination asset), provider
                    name (tappable → opens the QuotesPickerSheet which lists
                    every route SwapKit returned). Hidden until a quote
                    exists — pre-quote the user has nothing to summarise. */}
                {liveQuote && (
                  <View
                    style={[
                      styles.feesCard,
                      {
                        backgroundColor: colors.card,
                        borderColor: colors.border,
                      },
                    ]}
                  >
                    {rateHeader && (
                      <FadeText style={styles.feesRateHeader}>
                        {rateHeader}
                      </FadeText>
                    )}
                    {/* Fees expressed in ZEC regardless of direction — the
                        user's frame of reference for this wallet is always
                        ZEC, not the wrapped variant they happen to receive.
                        The projection produces both orientations; we pick
                        the one where ZEC lives: sell side for outbound
                        (ZEC → X), receive side for inbound (X → ZEC). */}
                    <View style={styles.feesRow}>
                      <FadeText style={styles.feesLabel}>
                        {t('swap.fees-label', 'Fees')}
                      </FadeText>
                      <RegText style={{ color: colors.text }}>
                        {`${formatFeeAmount(
                          isOutbound
                            ? liveQuote.route.totalFeesInSellAsset
                            : liveQuote.route.totalFeesInReceiveAsset,
                        )} ZEC`}
                      </RegText>
                    </View>
                    <View style={styles.feesRow}>
                      <FadeText style={styles.feesLabel}>
                        {t('swap.bridge-fee-label', 'Bridge Fee')}
                      </FadeText>
                      <RegText style={{ color: colors.text }}>
                        {formatBridgeFee(
                          isOutbound
                            ? liveQuote.route.bridgeFeesInSellAsset
                            : liveQuote.route.bridgeFeesInReceiveAsset,
                          'ZEC',
                        )}
                      </RegText>
                    </View>
                    <Pressable
                      onPress={openQuotesPickerSheet}
                      accessibilityRole="button"
                      accessibilityHint={t(
                        'swap.provider-hint',
                        'Tap to choose between available quotes',
                      )}
                      style={styles.feesRow}
                      testID="swap.provider-row"
                    >
                      <FadeText style={styles.feesLabel}>
                        {t('swap.provider-label', 'Provider')}
                      </FadeText>
                      <BoldText
                        style={{
                          color: colors.primary,
                          textDecorationLine: 'underline',
                        }}
                      >
                        {providerShortLabel(liveQuote.route.provider)}
                      </BoldText>
                    </Pressable>
                  </View>
                )}

                {/* Slippage row */}
                <View style={styles.slippageRow}>
                  <FadeText>
                    {`${t('swap.slippage', 'Slippage')}: ${formatSlippagePercent(slippageBps, decimalSeparator)}%`}
                  </FadeText>
                  <Pressable onPress={openSlippageSheet}>
                    <RegText style={{ color: colors.primary }}>
                      {t('swap.change', 'Change')}
                    </RegText>
                  </Pressable>
                </View>

                {/* Manual re-quote affordance. The auto-refresh runs silently
                    every 20 s; we no longer show a countdown / seconds label
                    (it read as "you're running out of time to click"). The
                    refresh-in-flight state is surfaced on the CTA
                    ("Actualizando cotización…") instead. */}
                {liveQuote && quoteSecondsLeft !== null && (
                  <View style={styles.countdownRow}>
                    {/* Manual refresh. Fires a re-quote immediately and
                        locks itself for 5 s after each tap so a spammed
                        button never turns into a burst of HTTP calls.
                        Also disabled while a fetch is already in flight
                        (`isQuoting`) — the icon dims to communicate the
                        wait state without a separate spinner. */}
                    {(() => {
                      const manualDisabled =
                        isQuoting || nowMs < manualRefreshCooldownUntilMs;
                      return (
                        <Pressable
                          onPress={() => {
                            if (manualDisabled) return;
                            setManualRefreshCooldownUntilMs(
                              Date.now() + MANUAL_REFRESH_COOLDOWN_MS,
                            );
                            onGetQuoteRef.current?.();
                          }}
                          disabled={manualDisabled}
                          accessibilityRole="button"
                          hitSlop={8}
                          style={{
                            marginLeft: 8,
                            padding: 4,
                            opacity: manualDisabled ? 0.4 : 1,
                          }}
                          testID="swap.manual-refresh"
                        >
                          <FontAwesomeIcon
                            icon={faRotateRight}
                            size={14}
                            color={colors.text}
                          />
                        </Pressable>
                      );
                    })()}
                  </View>
                )}

                {/* CTA. The quote is fetched automatically by the debounced
                    effect on amount change, so there is no manual "Get Quote"
                    step. Uses the shared <Button> so it matches the other
                    primary/secondary buttons in the app. Three states:
                      - Quoting (isQuoting, first fetch or 20 s refresh):
                        "Actualizando cotización…", disabled.
                      - Insufficient funds: SECONDARY + tappable, opens the
                        InsufficientFundsSheet (long copy + "reduce to max").
                      - Otherwise "Continue": opens the review/commit sheet,
                        disabled until a live quote + a valid address exist. */}
                <View style={styles.ctaWrap}>
                  {(() => {
                    const addressReady =
                      activeAddressValid &&
                      activeAddressValue.trim().length > 0;
                    if (isQuoting) {
                      // Same label for the first fetch and every 20 s refresh;
                      // `swap.quote-refreshing` already reads "Actualizando
                      // cotización…" in es.
                      return (
                        <Button
                          type={ButtonTypeEnum.Primary}
                          disabled
                          title={t(
                            'swap.quote-refreshing',
                            'Refreshing quote…',
                          )}
                          onPress={() => {}}
                          testID="swap.continue"
                        />
                      );
                    }
                    if (liveQuote && insufficientForCommit) {
                      return (
                        <Button
                          type={ButtonTypeEnum.Secondary}
                          title={`${t(
                            'swap.insufficient-title',
                            'Insufficient funds',
                          )} ⓘ`}
                          onPress={() =>
                            insufficientSheetRef.current?.present()
                          }
                          testID="swap.continue"
                        />
                      );
                    }
                    return (
                      <Button
                        type={ButtonTypeEnum.Primary}
                        title={t('swap.continue', 'Continue')}
                        disabled={!liveQuote || !addressReady}
                        onPress={openReviewSheet}
                        testID="swap.continue"
                      />
                    );
                  })()}
                </View>
              </ScrollView>
            </View>
          </BottomSheet>
        )}
      </Animated.View>
      <AssetPickerSheet
        ref={assetPickerRef}
        title={t('swap.pick-asset', 'Choose an asset')}
        tokens={displayedTokens ?? []}
        selectedIdentifier={selectedToken?.identifier ?? null}
        onChange={setSelectedToken}
        translate={translate}
        testID="swap.asset-picker"
      />
      <SlippageSheet
        ref={slippageSheetRef}
        slippageBps={slippageBps}
        onChange={setSlippageBps}
        translate={translate}
      />
      <InsufficientFundsSheet
        ref={insufficientSheetRef}
        maxSpendable={maxSpendableForSwap}
        onReduceToMax={onReduceToMax}
        translate={translate}
      />
      <ReviewSheet
        ref={reviewSheetRef}
        selectedRoute={liveQuote?.route ?? null}
        quoteInput={liveQuote?.quoteInput ?? null}
        fiatValueBasis={liveQuote?.fiatValueBasis ?? null}
        direction={direction}
        sellSymbol={isOutbound ? 'ZEC' : nonZecSymbol}
        receiveSymbol={isOutbound ? nonZecSymbol : 'ZEC'}
        swapService={swapService}
        onSheetIndexChange={index => setIsReviewSheetOpen(index >= 0)}
        sendSwapDeposit={sendSwapDeposit}
        translate={translate}
        addLastSnackbar={addLastSnackbar}
        onSwapCompleted={onSwapCompleted}
      />
      <QuotesPickerSheet
        ref={quotesPickerSheetRef}
        routes={liveQuote?.routes ?? []}
        selectedRouteId={liveQuote?.route.routeId ?? null}
        onSelect={selectRoute}
        sellSymbol={isOutbound ? 'ZEC' : nonZecSymbol}
        receiveSymbol={isOutbound ? nonZecSymbol : 'ZEC'}
        isOutbound={isOutbound}
        translate={translate}
      />
    </View>
  );
};

/**
 * Renders one asset card. Kept local to the file (not exported) because the
 * two on-screen cards have nearly identical structure and would otherwise be
 * tedious to keep in sync as we layer interactivity on top.
 */
type AssetCardArgs = {
  role: 'source' | 'destination';
  isZec: boolean;
  /** Symbol shown when the card's asset is the non-ZEC side. */
  nonZecSymbol: string;
  /**
   * Full token entry for the non-ZEC asset. Drives the composed token
   * logo (main image + chain badge). `null` while the catalog is still
   * loading; the chip falls back to a coin icon then.
   */
  nonZecToken: TokenEntryType | null;
  balanceLabel: string;
  amount: string;
  /**
   * `true` for the source card (renders a TextInput so the user can type
   * the amount). `false` for the destination card (renders a static label).
   */
  editable: boolean;
  /** Source amount exceeds the spendable cap — shown in red. */
  invalid?: boolean;
  /** Required when `editable` is true. */
  onChangeAmount?: (text: string) => void;
  /** Locale separator; used by the TextInput placeholder. */
  decimalSeparator?: string;
  /** Invoked when the user taps the non-ZEC chip (ZEC's chip is non-tappable). */
  onSelectAsset: () => void;
  colors: ThemeType['colors'];
  t: (key: string, fallback: string) => string;
  /** Active fiat currency from app context. Drives USD conversion display. */
  currency: CurrencyEnum;
  /** Current ZEC price in `currency` units. Undefined while loading. */
  zecPrice?: number;
  /** Privacy mode toggle from app context. */
  privacy?: boolean;
  /**
   * Address field rendered inside the card's border, below the amount row.
   * Pass it only on the non-ZEC card so the input is visually anchored to
   * the asset it concerns (refund when BTC is the source, destination when
   * BTC is the destination). Omit on the ZEC card.
   */
  address?: {
    value: string;
    onChange: (text: string) => void;
    onBlur?: () => void;
    label: string;
    placeholder: string;
    invalid?: boolean;
    errorText?: string;
    testID?: string;
  };
};

function renderAssetCard(args: AssetCardArgs): React.ReactElement {
  const {
    role,
    isZec,
    nonZecSymbol,
    nonZecToken,
    balanceLabel,
    amount,
    editable,
    invalid,
    onChangeAmount,
    decimalSeparator,
    onSelectAsset,
    colors,
    t,
    currency,
    zecPrice,
    privacy,
    address,
  } = args;
  const showUsd =
    isZec &&
    currency === CurrencyEnum.USDCurrency &&
    zecPrice !== undefined &&
    zecPrice > 0;
  const amountNumber = parseFloat(
    decimalSeparator === ',' ? amount.replace(',', '.') : amount,
  );
  const amountNumberSafe = Number.isFinite(amountNumber) ? amountNumber : 0;
  const titleKey = role === 'source' ? 'swap.you-send' : 'swap.you-receive';
  const titleFallback =
    role === 'source' ? 'You Send' : 'You Receive (Estimated)';
  const amountColor = role === 'source' ? colors.text : colors.placeholder;

  // ZEC is non-selectable (the fixed side of every swap). Non-ZEC assets are
  // selectable via the picker — rendered as a `Pressable` with a chevron.
  const chip = isZec ? (
    <View
      style={[
        styles.assetChip,
        { backgroundColor: colors.bottomSheetBackground },
      ]}
    >
      <TokenLogo
        token={ZEC_TOKEN_ENTRY}
        size={22}
        surfaceColor={colors.bottomSheetBackground}
      />
      <BoldText style={{ ...styles.assetSymbol, color: colors.primary }}>
        ZEC
      </BoldText>
    </View>
  ) : (
    <Pressable
      onPress={onSelectAsset}
      style={[
        styles.assetChip,
        { backgroundColor: colors.bottomSheetBackground },
      ]}
    >
      <TokenLogo
        token={nonZecToken}
        size={22}
        surfaceColor={colors.bottomSheetBackground}
      />
      <BoldText style={{ ...styles.assetSymbol, color: colors.text }}>
        {nonZecSymbol}
      </BoldText>
      <FontAwesomeIcon icon={faChevronDown} size={12} color={colors.text} />
    </Pressable>
  );

  return (
    <View
      style={[
        styles.card,
        { backgroundColor: colors.background, borderColor: colors.border },
      ]}
    >
      <View style={styles.cardHeaderRow}>
        <FadeText style={styles.cardLabel}>
          {t(titleKey, titleFallback)}
        </FadeText>
        <FadeText style={styles.cardLabel}>{balanceLabel}</FadeText>
      </View>
      <View style={styles.cardBodyRow}>
        {chip}
        <View style={styles.amountCol}>
          {editable ? (
            <TextInput
              value={amount}
              onChangeText={onChangeAmount}
              keyboardType="decimal-pad"
              placeholder="0"
              placeholderTextColor={colors.placeholder}
              autoCorrect={false}
              spellCheck={false}
              selectTextOnFocus
              style={[
                styles.amountInput,
                {
                  color: invalid ? colors.danger.text : colors.text,
                },
              ]}
              testID={`swap.${role}.amount`}
            />
          ) : (
            <BoldText style={{ ...styles.amountText, color: amountColor }}>
              {amount}
            </BoldText>
          )}
          {showUsd && (
            <CurrencyAmount
              style={styles.amountUsd}
              price={zecPrice}
              amtZec={amountNumberSafe}
              currency={currency}
              privacy={privacy}
            />
          )}
        </View>
      </View>
      {address && (
        <View style={[styles.addressBlock, { borderTopColor: colors.border }]}>
          <FadeText style={styles.addressLabel}>{address.label}</FadeText>
          {/* The X-clear sits absolutely positioned inside the input so the
              input's border stays a single visual unit (same pattern as
              TextInputAddress in the rest of the app). When the field is
              empty, the X is unmounted entirely — no faded ghost. */}
          <View style={{ position: 'relative' }}>
            <TextInput
              value={address.value}
              onChangeText={address.onChange}
              onBlur={address.onBlur}
              placeholder={address.placeholder}
              placeholderTextColor={colors.placeholder}
              autoCapitalize="none"
              autoCorrect={false}
              spellCheck={false}
              style={[
                styles.addressInput,
                {
                  color: colors.text,
                  backgroundColor: colors.bottomSheetBackground,
                  borderColor: address.invalid
                    ? colors.danger.text
                    : colors.border,
                  // Reserve room on the right so user text never slides
                  // under the X icon.
                  paddingRight: address.value.length > 0 ? 36 : 12,
                },
              ]}
              testID={address.testID}
            />
            {address.value.length > 0 ? (
              <TouchableOpacity
                onPress={() => address.onChange('')}
                accessibilityRole="button"
                hitSlop={8}
                style={{
                  position: 'absolute',
                  right: 10,
                  top: 0,
                  bottom: 0,
                  justifyContent: 'center',
                }}
              >
                <FontAwesomeIcon
                  icon={faXmark}
                  size={18}
                  color={colors.primaryDisabled}
                />
              </TouchableOpacity>
            ) : null}
          </View>
          {address.invalid && address.errorText ? (
            <FadeText
              style={{ ...styles.addressError, color: colors.danger.text }}
            >
              {address.errorText}
            </FadeText>
          ) : null}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  sheetTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
  },
  sheetTitle: {
    fontSize: 18,
  },
  scrollContent: {
    paddingHorizontal: 16,
    // Generous bottom padding so the CTA (and the countdown + affordability
    // hint stack above it) can be scrolled clear of the bottom tab bar on
    // small screens. The ScrollView already accepts the gesture; this just
    // ensures the user can land the CTA in the visible area without it
    // sitting under the navigator chrome.
    paddingBottom: 200,
    paddingTop: 8,
  },
  regionBlockBanner: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 12,
    marginBottom: 16,
  },
  card: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  cardLabel: {
    fontSize: 12,
    opacity: 0.7,
  },
  cardBodyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  assetChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    columnGap: 6,
  },
  assetSymbol: {
    fontSize: 16,
  },
  amountText: {
    fontSize: 24,
  },
  amountInput: {
    fontSize: 24,
    fontWeight: '700',
    textAlign: 'right',
    padding: 0,
    minWidth: 120,
  },
  amountCol: {
    alignItems: 'flex-end',
  },
  amountUsd: {
    fontSize: 12,
    fontWeight: '500',
    marginTop: 2,
  },
  toggleWrap: {
    alignItems: 'center',
    marginVertical: 8,
  },
  toggleBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  toggleIconRotate: {
    transform: [{ rotate: '90deg' }],
  },
  addressBlock: {
    marginTop: 14,
    paddingTop: 12,
    borderTopWidth: 1,
    rowGap: 6,
  },
  addressLabel: {
    fontSize: 12,
  },
  addressInput: {
    fontSize: 14,
    fontWeight: '600',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  addressError: {
    fontSize: 12,
    marginTop: 2,
  },
  feesCard: {
    marginTop: 12,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 12,
    borderWidth: 1,
    rowGap: 6,
  },
  feesRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  feesLabel: {
    fontSize: 13,
  },
  feesRateHeader: {
    fontSize: 12,
    textAlign: 'center',
    marginBottom: 4,
  },
  slippageRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 16,
    paddingHorizontal: 4,
  },
  countdownRow: {
    marginTop: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  ctaWrap: {
    marginTop: 8,
    alignItems: 'center',
  },
});

export default Swap;
