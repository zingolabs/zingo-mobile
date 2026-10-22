import {
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { AppState } from 'react-native';

import { ChainNameEnum } from '@app/AppState';
import { ContextAppLoaded } from '@app/context';
import {
  FAILED_REFRESH_RETRY_MS,
  SwapDirectionEnum,
  SwapKitHttpError,
  SwapKitNetworkError,
  canonicalChainAddress,
  carryOverRoutes,
  describeEmptyQuote,
  describeQuoteFailure,
  extractFiatValueBasis,
  isRateLimited,
  nearAccountNeedsConfirm,
  quoteAddressPair,
  quoteBindsAddress,
  quoteQuestionKey,
  rateLimitWaitMs,
  renderSwapText,
  swapRaw,
  validateAddressForChain,
  zecNetworkFeeReserve,
} from '@app/swap';
import { selectionAcrossRefresh } from '@app/swap/selectionAcrossRefresh';
import type {
  FiatValueBasisType,
  QuoteInput,
  RouteOptionType,
  SwapService,
  SwapTextType,
  TokenEntryType,
  UnavailableProviderType,
} from '@app/swap';
import { SwapKitProviderEnum } from '@app/swap/enums/SwapKitProviderEnum';
import { deriveRefundAddress } from '@app/walletBackend';
import {
  ZEC_ASSET,
  isQuotableToken,
  isZecWrapper,
  tokenToSwapAsset,
} from './swapAssets';

/** SwapKit's default slippage tolerance, in basis points. */
export const DEFAULT_SLIPPAGE_BPS = 300;

/** How long a quote is shown before it is replaced. */
export const QUOTE_REFRESH_MS = 20_000;

/**
 * How long the amount must sit still before it is quoted: long enough that
 * typing digit by digit asks once, short enough that the wait does not read
 * as the screen ignoring the input.
 */
const QUOTE_DEBOUNCE_MS = 1_000;

/** Floor between two hand-asked quotes. */
const MANUAL_REFRESH_COOLDOWN_MS = 5_000;

/** The catalog entry the picker starts on, before the user chooses. */
const DEFAULT_TOKEN_IDENTIFIER = 'BTC.BTC';

export type SwapReview = {
  route: RouteOptionType;
  quoteInput: QuoteInput;
  fiatValueBasis: FiatValueBasisType;
};

/** Routes still on screen from an earlier quote, and a pick that went away. */
export type QuoteNotice = {
  carriedProviders: SwapKitProviderEnum[];
  carriedUntilMs?: number;
  droppedProvider?: SwapKitProviderEnum;
};

/** What the main action can do, which is also what its label says. */
export type SwapCta =
  | 'serviceDown'
  | 'noAmount'
  | 'overBalance'
  | 'noRoutes'
  | 'noAddress'
  | 'insufficient'
  | 'mixnetBlocked'
  | 'quoting'
  | 'ready';

export type SwapFormArgs = {
  swapService: SwapService | null;
  /** Shielded balance the wallet can spend, in ZEC display units. */
  spendable: number;
  zecChain: ChainNameEnum;
  /** The mixnet gate is shut, so an outbound deposit cannot leave yet. */
  mixnetBlocked: boolean;
  /** A sheet is open over the form: the quote countdown holds until it closes. */
  paused: boolean;
};

/**
 * The swap form's state: direction, asset, amount, addresses, and the quotes
 * for them. The screen renders it; the review takes `review()`.
 *
 * ZEC is always one side. Outbound sells ZEC, inbound buys it. The screen
 * starts on whichever the balance suggests, and the user can flip it.
 */
export function useSwapForm({
  swapService,
  spendable,
  zecChain,
  mixnetBlocked,
  paused,
}: SwapFormArgs) {
  const [direction, setDirection] = useState<SwapDirectionEnum>(() =>
    spendable > 0 ? SwapDirectionEnum.Outbound : SwapDirectionEnum.Inbound,
  );
  const isOutbound = direction === SwapDirectionEnum.Outbound;
  const { translate } = useContext(ContextAppLoaded);
  const say = useCallback(
    (text: SwapTextType) =>
      renderSwapText(text, key => (translate(key) as string).trim()),
    [translate],
  );

  const [tokens, setTokens] = useState<TokenEntryType[] | null>(null);
  // The catalog differs by direction and reloads on a flip, so a catalog
  // still on screen after one belongs to the direction just left.
  const [tokensDirection, setTokensDirection] =
    useState<SwapDirectionEnum | null>(null);
  const [catalogError, setCatalogError] = useState<string>('');
  // SwapKit's edge refusing the request outright, a region or ISP block. The
  // way out is a VPN, which is why it is told apart from a server having a
  // bad day.
  const [catalogEdgeBlocked, setCatalogEdgeBlocked] = useState<boolean>(false);
  // The catalog request never reached SwapKit: no connection, or none that
  // gets out.
  const [catalogUnreachable, setCatalogUnreachable] = useState<boolean>(false);
  const [catalogRetrying, setCatalogRetrying] = useState<boolean>(false);
  const [selectedToken, setSelectedToken] = useState<TokenEntryType | null>(
    null,
  );

  const [amount, setAmount] = useState<string>('');
  // Two fields, one per direction: outbound the destination is where the
  // bought asset lands, inbound the refund is where the sold asset returns.
  // Kept apart so a flip restores what the user typed for that direction.
  const [destinationAddress, setDestinationAddress] = useState<string>('');
  const [refundAddress, setRefundAddress] = useState<string>('');
  const [addressValid, setAddressValid] = useState<boolean>(true);
  /** The address refused is a Zcash one: swap sends to another coin. */
  const [addressIsZcash, setAddressIsZcash] = useState<boolean>(false);

  // The refund-scope address declared to SwapKit as this swap's wallet side.
  // Derived rather than reserved, so browsing quotes leaves the wallet's
  // index where it was; the commit claims it.
  const [ephemeralAddress, setEphemeralAddress] = useState<string>('');

  const [routes, setRoutes] = useState<RouteOptionType[] | null>(null);
  const [unavailable, setUnavailable] = useState<UnavailableProviderType[]>([]);
  const [chosenRouteId, setChosenRouteId] = useState<string>('');
  // A refresh follows the optimum while nobody has said otherwise, and stops
  // the moment the user picks a route.
  const [routePickedByUser, setRoutePickedByUser] = useState<boolean>(false);
  // Providers that refused to commit a route for this intent, kept out of the
  // quotes until the user changes the swap they are asking for.
  const [refused, setRefused] = useState<UnavailableProviderType[]>([]);
  const [quoteContext, setQuoteContext] = useState<{
    quoteInput: QuoteInput;
    fiatValueBasis: FiatValueBasisType;
  } | null>(null);
  // A copy taken when the user pressed Continue, so a refresh landing while
  // they read cannot move the figures they agreed to.
  const [reviewed, setReviewed] = useState<SwapReview | null>(null);
  const reviewing = reviewed !== null;
  const [refreshedAtMs, setRefreshedAtMs] = useState<number>(0);
  const [nowMs, setNowMs] = useState<number>(() => Date.now());
  const [quoting, setQuoting] = useState<boolean>(false);
  const [quoteError, setQuoteError] = useState<string>('');
  const [quoteNotice, setQuoteNotice] = useState<QuoteNotice | null>(null);
  const shownQuoteRef = useRef<{
    questionKey: string;
    lastFreshAtMs: number;
  } | null>(null);
  // The last attempt for the current inputs failed, so the debounce must not
  // retry the same question forever. Cleared when an input changes.
  const [quoteAttemptFailed, setQuoteAttemptFailed] = useState<boolean>(false);
  const [manualRefreshCooldownUntilMs, setManualRefreshCooldownUntilMs] =
    useState<number>(0);
  // Until when the screen leaves the service alone after a 429: the quota
  // belongs to the app's key and every user waits on it.
  const [rateLimitedUntilMs, setRateLimitedUntilMs] = useState<number>(0);
  const [slippageBps, setSlippageBps] = useState<number>(DEFAULT_SLIPPAGE_BPS);

  const loadCatalogRef = useRef<{ cancelled: boolean } | null>(null);
  const loadCatalog = useCallback(async () => {
    if (!swapService) {
      return;
    }
    if (loadCatalogRef.current) {
      loadCatalogRef.current.cancelled = true;
    }
    const token = { cancelled: false };
    loadCatalogRef.current = token;
    setCatalogRetrying(true);
    try {
      // Receiving wrapped ZEC for native ZEC is a swap nobody means to make;
      // selling it is ZEC on another chain coming home.
      const catalog = (
        await swapService.listRoutableTokens(
          isOutbound ? 'outbound' : 'inbound',
        )
      ).filter(t => isQuotableToken(t) && !(isOutbound && isZecWrapper(t)));
      if (token.cancelled) {
        return;
      }
      setTokens(catalog);
      setTokensDirection(
        isOutbound ? SwapDirectionEnum.Outbound : SwapDirectionEnum.Inbound,
      );
      setCatalogError('');
      setCatalogEdgeBlocked(false);
      setCatalogUnreachable(false);
      setSelectedToken(
        catalog.find(t => t.identifier === DEFAULT_TOKEN_IDENTIFIER) ??
          catalog[0] ??
          null,
      );
    } catch (error) {
      if (token.cancelled) {
        return;
      }
      setTokens([]);
      const edgeBlocked =
        error instanceof SwapKitHttpError && error.isEdgeBlocked;
      const unreachable = error instanceof SwapKitNetworkError;
      setCatalogEdgeBlocked(edgeBlocked);
      setCatalogUnreachable(unreachable);
      setCatalogError(
        edgeBlocked || unreachable ? '' : say(describeQuoteFailure(error)),
      );
    } finally {
      if (!token.cancelled) {
        setCatalogRetrying(false);
      }
    }
  }, [swapService, isOutbound, say]);

  useEffect(() => {
    loadCatalog();
    return () => {
      if (loadCatalogRef.current) {
        loadCatalogRef.current.cancelled = true;
      }
    };
  }, [loadCatalog]);

  // The user reads the banner, switches to their VPN app and comes back: the
  // catalog is asked again without them asking.
  useEffect(() => {
    if (!catalogEdgeBlocked && !catalogUnreachable) {
      return;
    }
    const subscription = AppState.addEventListener('change', state => {
      if (state === 'active') {
        loadCatalog();
      }
    });
    return () => subscription.remove();
  }, [catalogEdgeBlocked, catalogUnreachable, loadCatalog]);

  // Only the changes that make a shown quote meaningless clear it. The
  // amount, the slippage and the address re-quote in place instead.
  useEffect(() => {
    setRoutes(null);
    setUnavailable([]);
    setChosenRouteId('');
    setRoutePickedByUser(false);
    setRefused([]);
    setQuoteContext(null);
    setReviewed(null);
    setQuoteError('');
  }, [direction, selectedToken]);

  // A swap intent is a direction and an asset. One address across intents
  // would let a provider tie two unrelated swaps to one identifier.
  useEffect(() => {
    setEphemeralAddress('');
  }, [direction, selectedToken?.identifier]);

  // A wrapped-ZEC pick made inbound would point outbound at an asset the
  // catalog refuses; snap back to the default.
  useEffect(() => {
    if (!isOutbound || !selectedToken || !tokens) {
      return;
    }
    const ticker = (
      selectedToken.ticker ||
      selectedToken.symbol ||
      ''
    ).toUpperCase();
    if (ticker === 'ZEC') {
      setSelectedToken(
        tokens.find(t => t.identifier === DEFAULT_TOKEN_IDENTIFIER) ??
          tokens[0] ??
          null,
      );
    }
  }, [isOutbound, selectedToken, tokens]);

  const counterpartyChain = selectedToken?.chain ?? '';

  // An address valid for the previous chain is almost certainly wrong for the
  // new one, and leaving it invites sending to it. A flip keeps the chain, so
  // the address typed for one direction carries over to the other's empty one.
  useEffect(() => {
    setDestinationAddress('');
    setRefundAddress('');
  }, [counterpartyChain]);

  const activeAddress = isOutbound ? destinationAddress : refundAddress;
  const setActiveAddress = isOutbound
    ? setDestinationAddress
    : setRefundAddress;

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const valid = await validateAddressForChain(
        counterpartyChain,
        activeAddress,
        zecChain,
      );
      const zcash =
        !valid &&
        counterpartyChain !== ZEC_ASSET.chain &&
        (await validateAddressForChain(
          ZEC_ASSET.chain,
          activeAddress,
          zecChain,
        ));
      if (!cancelled) {
        setAddressValid(valid);
        setAddressIsZcash(zcash);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [activeAddress, counterpartyChain, zecChain]);

  const addressShowError = activeAddress.trim().length > 0 && !addressValid;
  const canonicalAddress = canonicalChainAddress(
    counterpartyChain,
    activeAddress,
  );
  // A NEAR name that could be another chain's address is confirmed before
  // it is swapped to.
  const nearNeedsConfirm =
    counterpartyChain === 'NEAR' && nearAccountNeedsConfirm(canonicalAddress);

  const amountNumber = parseFloat(amount.replace(',', '.'));
  const amountValid = Number.isFinite(amountNumber) && amountNumber > 0;
  // Inbound the funds come from another wallet, whose balance this one
  // cannot know.
  const overBalance = isOutbound && amountValid && amountNumber > spendable;

  // A field left empty clears the quote; one passing through empty while a
  // digit is retyped does not.
  useEffect(() => {
    if (amountValid) {
      return;
    }
    const timer = setTimeout(() => {
      setRoutes(null);
      setUnavailable([]);
      setChosenRouteId('');
      setRoutePickedByUser(false);
      setQuoteContext(null);
      setQuoteError('');
      setQuoteNotice(null);
      setQuoteAttemptFailed(false);
    }, QUOTE_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [amountValid]);

  const canQuote = !!swapService && !!selectedToken && amountValid;
  const addressReady = activeAddress.trim().length > 0 && addressValid;

  const deriveEphemeral = useCallback(async (): Promise<string> => {
    if (ephemeralAddress) {
      return ephemeralAddress;
    }
    const reply = await deriveRefundAddress();
    if (!reply.ok) {
      throw new Error(reply.error.message);
    }
    const parsed = JSON.parse(reply.value) as { encoded_address?: string };
    if (!parsed.encoded_address) {
      throw new Error('the wallet named no refund address for this swap');
    }
    setEphemeralAddress(parsed.encoded_address);
    return parsed.encoded_address;
  }, [ephemeralAddress]);

  // Canonical here so the value compared against the committed quote is the
  // one that was sent.
  const boundAddress = addressReady ? canonicalAddress : '';

  // Read inside `requestQuote` without rebuilding it on every refresh, which
  // would restart the interval below.
  const routesRef = useRef<RouteOptionType[] | null>(null);
  useEffect(() => {
    routesRef.current = routes;
  }, [routes]);
  const routePickedByUserRef = useRef<boolean>(false);
  useEffect(() => {
    routePickedByUserRef.current = routePickedByUser;
  }, [routePickedByUser]);
  const chosenRouteIdRef = useRef<string>('');
  useEffect(() => {
    chosenRouteIdRef.current = chosenRouteId;
  }, [chosenRouteId]);
  const refusedRef = useRef<UnavailableProviderType[]>([]);
  useEffect(() => {
    refusedRef.current = refused;
  }, [refused]);

  const requestQuote = useCallback(async () => {
    if (!swapService || !selectedToken) {
      return;
    }
    setQuoting(true);
    setQuoteError('');
    let questionKey: string | null = null;
    // A price the provider committed to until its expiry is not taken away
    // because the provider missed one refresh.
    const carriedFrom = (
      freshRoutes: readonly RouteOptionType[],
    ): RouteOptionType[] =>
      questionKey
        ? carryOverRoutes({
            questionKey,
            shownQuestionKey: shownQuoteRef.current?.questionKey ?? null,
            shownRoutes: routesRef.current ?? [],
            freshRoutes,
            lastFreshAtMs: shownQuoteRef.current?.lastFreshAtMs ?? null,
            nowMs: Date.now(),
          })
        : [];
    const noticeFor = (
      carried: readonly RouteOptionType[],
      droppedProvider?: SwapKitProviderEnum,
    ): QuoteNotice | null => {
      if (!carried.length && !droppedProvider) {
        return null;
      }
      const expiries = carried
        .map(r => r.expiresAtMs)
        .filter((ms): ms is number => !!ms);
      return {
        carriedProviders: carried.map(r => r.provider),
        carriedUntilMs: expiries.length ? Math.min(...expiries) : undefined,
        droppedProvider,
      };
    };
    try {
      const ephemeral = await deriveEphemeral();
      const other = tokenToSwapAsset(selectedToken);
      const quoteInput: QuoteInput = {
        sellAsset: isOutbound ? ZEC_ASSET : other,
        receiveAsset: isOutbound ? other : ZEC_ASSET,
        // SwapKit reads a dot-separated decimal whatever the user's locale.
        sellAmountHumanDecimal: amount.replace(',', '.'),
        ...quoteAddressPair({
          isOutbound,
          ephemeralAddress: ephemeral,
          boundAddress,
        }),
        slippageBps,
      };
      questionKey = quoteQuestionKey(quoteInput);
      const result = await swapService.quote(quoteInput);
      const carried = carriedFrom(result.routes);
      const refusedProviders = new Set(
        refusedRef.current.map(row => row.provider),
      );
      const routesNow = [...result.routes, ...carried].filter(
        r => !refusedProviders.has(r.provider),
      );
      const carriedProviders = new Set(carried.map(r => r.provider));
      if (routesNow.length > 0) {
        shownQuoteRef.current = {
          questionKey,
          lastFreshAtMs:
            result.routes.length > 0
              ? Date.now()
              : (shownQuoteRef.current?.lastFreshAtMs ?? Date.now()),
        };
      }
      // No route is an answer about the market: the amount sits below every
      // provider's minimum, or the liquidity is gone.
      setQuoteError(
        routesNow.length === 0
          ? say(
              describeEmptyQuote(
                result.rawResponse,
                quoteInput.sellAsset.ticker,
                result.unavailable,
              ),
            )
          : '',
      );
      setQuoteAttemptFailed(routesNow.length === 0);
      const selection = selectionAcrossRefresh({
        pickedRouteId: chosenRouteIdRef.current,
        pickedByUser: routePickedByUserRef.current,
        shownRoutes: routesRef.current ?? [],
        freshRoutes: routesNow,
      });
      setChosenRouteId(selection.routeId);
      if (selection.droppedProvider) {
        setRoutePickedByUser(false);
      }
      setQuoteNotice(noticeFor(carried, selection.droppedProvider));
      setRoutes(routesNow);
      setUnavailable([
        ...result.unavailable.filter(
          row =>
            !carriedProviders.has(row.provider) &&
            !refusedProviders.has(row.provider),
        ),
        ...refusedRef.current,
      ]);
      setRefreshedAtMs(
        result.routes.length === 0 && carried.length > 0
          ? Date.now() - QUOTE_REFRESH_MS + FAILED_REFRESH_RETRY_MS
          : Date.now(),
      );
      if (result.routes.length === 0) {
        return;
      }
      // The commit uses the inputs the user was shown, whatever the form
      // holds by then.
      setQuoteContext({
        quoteInput,
        fiatValueBasis: extractFiatValueBasis({
          response: result.rawResponse,
          sellAssetId: quoteInput.sellAsset.swapKitId,
          receiveAssetId: quoteInput.receiveAsset.swapKitId,
          capturedAt: Date.now(),
        }),
      });
    } catch (error) {
      if (isRateLimited(error)) {
        const now = Date.now();
        setRateLimitedUntilMs(now + rateLimitWaitMs(error));
        setNowMs(now);
      }
      const carried = carriedFrom([]);
      if (carried.length > 0) {
        setQuoteNotice(noticeFor(carried));
        setRoutes(carried);
        setRefreshedAtMs(
          Date.now() - QUOTE_REFRESH_MS + FAILED_REFRESH_RETRY_MS,
        );
        return;
      }
      setQuoteNotice(null);
      setQuoteError(say(describeQuoteFailure(error)));
      setRoutes(null);
      setUnavailable([]);
      setQuoteContext(null);
      setQuoteAttemptFailed(true);
    } finally {
      setQuoting(false);
    }
  }, [
    swapService,
    selectedToken,
    isOutbound,
    amount,
    slippageBps,
    boundAddress,
    deriveEphemeral,
    say,
  ]);

  // Quote as soon as there is something to quote. `requestQuote` is left out
  // of the dependencies on purpose: it is rebuilt on every amount change,
  // which would restart the debounce on every keystroke.
  useEffect(() => {
    if (
      !canQuote ||
      reviewing ||
      quoting ||
      rateLimitedUntilMs > 0 ||
      quoteAttemptFailed
    ) {
      return;
    }
    const timer = setTimeout(() => requestQuote(), QUOTE_DEBOUNCE_MS);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    canQuote,
    reviewing,
    amount,
    slippageBps,
    selectedToken,
    direction,
    boundAddress,
    quoteAttemptFailed,
    rateLimitedUntilMs,
  ]);

  useEffect(() => {
    setQuoteAttemptFailed(false);
    setQuoteNotice(null);
  }, [amount, slippageBps, selectedToken, direction, boundAddress]);

  const chosenRoute = useMemo(
    () => routes?.find(r => r.routeId === chosenRouteId) ?? null,
    [routes, chosenRouteId],
  );

  // Whether the routes on screen were quoted for the address on screen.
  const routesBindAddress = useMemo(
    () =>
      quoteBindsAddress({
        quoted: quoteContext?.quoteInput ?? null,
        isOutbound,
        boundAddress,
      }),
    [quoteContext, boundAddress, isOutbound],
  );

  const totalFeesInSellAssetNum = useMemo(() => {
    const parsed = parseFloat(chosenRoute?.totalFeesInSellAsset ?? '');
    return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
  }, [chosenRoute]);
  // Held back for the Zcash network fee on the deposit itself. Zero inbound,
  // and zero before a route names a provider, since the figure depends on
  // whether the deposit takes the two-transaction hop.
  const networkFeeReserve = useMemo(
    () =>
      isOutbound && chosenRoute
        ? zecNetworkFeeReserve(chosenRoute.provider)
        : 0,
    [isOutbound, chosenRoute],
  );
  const maxSpendableForSwap = useMemo(
    () => Math.max(0, spendable - totalFeesInSellAssetNum - networkFeeReserve),
    [spendable, totalFeesInSellAssetNum, networkFeeReserve],
  );
  const insufficientForCommit = useMemo(
    () =>
      isOutbound &&
      !!chosenRoute &&
      amountValid &&
      amountNumber + totalFeesInSellAssetNum + networkFeeReserve > spendable,
    [
      isOutbound,
      chosenRoute,
      amountValid,
      amountNumber,
      totalFeesInSellAssetNum,
      networkFeeReserve,
      spendable,
    ],
  );

  // Time spent under a sheet does not count toward the next quote: the
  // countdown carries on from where it was when the sheet closes.
  const [pauseShiftMs, setPauseShiftMs] = useState<number>(0);
  const pausedAtRef = useRef<number>(0);
  useEffect(() => setPauseShiftMs(0), [refreshedAtMs]);
  useEffect(() => {
    if (paused) {
      pausedAtRef.current = Date.now();
      return;
    }
    if (pausedAtRef.current > 0) {
      const held = Date.now() - pausedAtRef.current;
      pausedAtRef.current = 0;
      setPauseShiftMs(shift => shift + held);
    }
  }, [paused]);

  // A fixed cadence rather than the providers' own expiries, which advertise
  // tens of minutes the rate does not have. Paused while the user reviews.
  useEffect(() => {
    if (
      (!routes?.length && rateLimitedUntilMs === 0) ||
      reviewing ||
      quoting ||
      paused
    ) {
      return;
    }
    const timer = setInterval(() => setNowMs(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [routes, reviewing, quoting, paused, rateLimitedUntilMs]);

  const rateLimited = nowMs < rateLimitedUntilMs;
  useEffect(() => {
    if (rateLimitedUntilMs === 0 || nowMs < rateLimitedUntilMs) {
      return;
    }
    setRateLimitedUntilMs(0);
    setQuoteAttemptFailed(false);
    setQuoteError('');
  }, [nowMs, rateLimitedUntilMs]);

  const secondsToRefresh = Math.max(
    0,
    Math.ceil((refreshedAtMs + pauseShiftMs + QUOTE_REFRESH_MS - nowMs) / 1000),
  );

  useEffect(() => {
    if (!routes?.length || reviewing || quoting || rateLimited || paused) {
      return;
    }
    if (nowMs - refreshedAtMs - pauseShiftMs < QUOTE_REFRESH_MS) {
      return;
    }
    requestQuote();
  }, [
    nowMs,
    refreshedAtMs,
    pauseShiftMs,
    routes,
    reviewing,
    quoting,
    paused,
    rateLimited,
    requestQuote,
  ]);

  const refreshDisabled =
    quoting || reviewing || rateLimited || nowMs < manualRefreshCooldownUntilMs;
  const refreshNow = useCallback(() => {
    setManualRefreshCooldownUntilMs(Date.now() + MANUAL_REFRESH_COOLDOWN_MS);
    // A hand-asked quote is a new attempt by definition.
    setQuoteAttemptFailed(false);
    requestQuote();
  }, [requestQuote]);

  const flip = useCallback(() => {
    if (isOutbound) {
      setRefundAddress(current => current || destinationAddress);
    } else {
      setDestinationAddress(current => current || refundAddress);
    }
    setDirection(
      isOutbound ? SwapDirectionEnum.Inbound : SwapDirectionEnum.Outbound,
    );
  }, [isOutbound, destinationAddress, refundAddress]);

  const pickRoute = useCallback((routeId: string) => {
    setChosenRouteId(routeId);
    setRoutePickedByUser(true);
  }, []);

  const cta: SwapCta = catalogUnreachable
    ? 'serviceDown'
    : !amountValid
      ? 'noAmount'
      : overBalance
        ? 'overBalance'
        : quoteAttemptFailed && !routes?.length
          ? 'noRoutes'
          : !addressReady
            ? 'noAddress'
            : insufficientForCommit
              ? 'insufficient'
              : isOutbound && mixnetBlocked
                ? 'mixnetBlocked'
                : !chosenRoute || !quoteContext || !routesBindAddress
                  ? 'quoting'
                  : 'ready';

  const review = useCallback((): SwapReview | null => {
    if (!chosenRoute || !quoteContext) {
      return null;
    }
    const taken = {
      route: chosenRoute,
      quoteInput: quoteContext.quoteInput,
      fiatValueBasis: quoteContext.fiatValueBasis,
    };
    setReviewed(taken);
    return taken;
  }, [chosenRoute, quoteContext]);

  const cancelReview = useCallback(() => setReviewed(null), []);

  // The provider refused the route while the user looked at it: it comes off
  // the list with its reason, and the selection goes with it.
  const refuseRoute = useCallback(
    (provider: SwapKitProviderEnum, reason: string) => {
      setRefused(previous => [
        ...previous.filter(row => row.provider !== provider),
        { provider, reason: swapRaw(reason) },
      ]);
      setRoutes(
        previous => previous?.filter(r => r.provider !== provider) ?? previous,
      );
      setUnavailable(previous => [
        ...previous.filter(row => row.provider !== provider),
        { provider, reason: swapRaw(reason) },
      ]);
      setChosenRouteId('');
      setRoutePickedByUser(false);
    },
    [],
  );

  // A completed swap leaves the form empty: the next swap is a new decision.
  const finish = useCallback(() => {
    setReviewed(null);
    setRoutes(null);
    setUnavailable([]);
    setChosenRouteId('');
    setRoutePickedByUser(false);
    setQuoteContext(null);
    setAmount('');
    setDestinationAddress('');
    setRefundAddress('');
    setEphemeralAddress('');
  }, []);

  return {
    direction,
    isOutbound,
    flip,
    tokens,
    tokensDirection,
    catalogError,
    catalogEdgeBlocked,
    catalogUnreachable,
    catalogRetrying,
    loadCatalog,
    selectedToken,
    setSelectedToken,
    counterpartyChain,
    amount,
    setAmount,
    amountNumber,
    amountValid,
    overBalance,
    activeAddress,
    setActiveAddress,
    addressValid,
    addressIsZcash,
    addressShowError,
    canonicalAddress,
    nearNeedsConfirm,
    routes,
    unavailable,
    chosenRoute,
    chosenRouteId,
    pickRoute,
    quoteContext,
    quoting,
    quoteError,
    quoteNotice,
    rateLimited,
    rateLimitedUntilMs,
    nowMs,
    refreshedAtMs,
    secondsToRefresh,
    refreshNow,
    refreshDisabled,
    slippageBps,
    setSlippageBps,
    maxSpendableForSwap,
    insufficientForCommit,
    cta,
    reviewed,
    reviewing,
    review,
    cancelReview,
    refuseRoute,
    finish,
  };
}
