/* eslint-disable react-native/no-inline-styles */
import React, { useContext, useEffect, useMemo, useRef, useState } from 'react';
import { maxBy } from 'lodash';
import { InfoIcon } from '@ui/primitives/Icons/InfoIcon';
import TitleBar from '@ui/widgets/TitleBar';
import { Platform, ScrollView, StyleSheet, View } from 'react-native';
import Animated from 'react-native-reanimated';
import Pressable from '@ui/primitives/Pressable';
import { duration } from '@app/theme/motion';
import BottomSheet, { BottomSheetModal } from '@gorhom/bottom-sheet';
import {
  space12,
  space4,
  space8,
  space20,
  useTheme,
  iconSizeSm,
  radiusPill,
} from '@app/theme';
import { GlobalConst, Route, SnackbarDurationEnum } from '@app/AppState';
import AddressBookFileImpl from '@app/services/AddressBookFileImpl';
import { HomeTabScreenProps } from '@app/types';
import { ContextAppLoaded, useSwapRecords, useSwapService } from '@app/context';
import {
  awaitsDeposit,
  canonicalChainAddress,
  formatAmountForDisplay,
  isRefunding,
  isTerminalStatus,
  nearRefusesSmallRefunds,
  providerShortLabel,
  rateLimitedNotice,
  renderSwapText,
} from '@app/swap';
import type { SwapRecordType } from '@app/swap';
import { SwapKitProviderEnum } from '@app/swap/enums/SwapKitProviderEnum';
import {
  sendGateOpen,
  shownStatusKey,
} from '@app/walletBackend/transforms/mixnetView';
import { fiatQuote, toFiatText, toZecText } from '@app/price/fiatQuote';
import { showConfirm } from '@app/services/showConfirm';
import { useDismissSheetsOnBlur } from '@app/hooks/useDismissSheetsOnBlur';
import { useNavigation } from '@react-navigation/native';
import { useResult } from '@app/navigation/results';
import { WalletNavigation } from '@app/types';
import { swapScreenFor } from './swapRoute';
import { pendingSwapLabel } from './pendingSwapLabel';
import { useNearSmallWarningHide } from '@app/hooks/useNearSmallWarningHide';
import DontShowAgain from './components/DontShowAgain';
import { useOptionsPanelSheetSlide } from '@app/hooks/useOptionsPanelSheetSlide';
import Utils from '@app/utils';
import {
  formatAmount,
  formatUsd,
  parseAmountInput,
  toAmountInput,
} from '@app/utils/formatAmount';
import Header from '@ui/widgets/Header';
import AppSheet from '@ui/primitives/AppSheet';
import Text from '@ui/primitives/Text';
import Button from '@ui/primitives/Button';
import Card from '@ui/widgets/Card';
import Banner from '@ui/widgets/Banner';
import TextInputAddress from '@ui/widgets/TextInputAddress';
import SaveContactSheet from './components/SaveContactSheet';
import { chainDisplayName } from '@ui/widgets/chainDisplayName';
import { SlidersIcon } from '@ui/primitives/Icons/SlidersIcon';
import { HistoryIcon } from '@ui/primitives/Icons/HistoryIcon';
import { CheckIcon } from '@ui/primitives/Icons/CheckIcon';
import InfoTooltip from '@ui/widgets/InfoTooltip';
import { SheetPresence } from '@ui/primitives/SheetPresence';
import { ChevronDown, ChevronUp } from '@ui/primitives/Icons/Chevron';
import {
  DEFAULT_SLIPPAGE_BPS,
  QUOTE_REFRESH_MS,
  useSwapForm,
} from './useSwapForm';
import PairCards from './components/PairCards';
import AssetPickerSheet from './components/AssetPickerSheet';
import RoutesSheet from './components/RoutesSheet';
import SwapSettingsSheet from './components/SwapSettingsSheet';
import SwapHistorySheet, { swapPairLabel } from './components/SwapHistorySheet';
import { tokenToSwapAsset } from './swapAssets';
import { useCoinPrice } from './useCoinPrice';
import { onTabScroll } from '@app/navigation/tabBarScroll';
import { PANEL_TOP } from '@ui/widgets/Header/Header';
import InsufficientFundsSheet from './components/InsufficientFundsSheet';

type SwapProps = HomeTabScreenProps<'Swap'>;

/**
 * The swap tab: pick the other side, state an amount, and quote it. ZEC is
 * always one side. The sheet sits fixed under the header's icons; the review
 * and everything after it are screens of their own.
 */
const Swap: React.FunctionComponent<SwapProps> = ({ route }) => {
  const context = useContext(ContextAppLoaded);
  const {
    translate,
    info,
    totalBalance,
    zecPrice,
    server,
    walletChainName,
    mixnetView,
    setPrivacyOption,
    addLastSnackbar,
    addressBook,
    setAddressBook,
    setShieldingAmount,
    setBackgroundError,
  } = context;
  const { colors } = useTheme();
  const navigation = useNavigation<WalletNavigation>();
  const swapService = useSwapService();
  const records = useSwapRecords();
  const nearWarning = useNearSmallWarningHide();
  const sheetSlideStyle = useOptionsPanelSheetSlide();
  useDismissSheetsOnBlur();

  const spendable = totalBalance?.totalSpendableBalance ?? 0;
  /** Modal sheets open over the form; the quote countdown holds meanwhile. */
  const [sheetsOpen, setSheetsOpen] = useState<number>(0);
  const sheetPresence = useMemo(
    () => (open: boolean) =>
      setSheetsOpen(n => Math.max(0, n + (open ? 1 : -1))),
    [],
  );
  const [whyOpen, setWhyOpen] = useState<boolean>(false);
  const form = useSwapForm({
    swapService,
    spendable,
    zecChain: walletChainName,
    mixnetBlocked: !sendGateOpen(mixnetView),
    paused: sheetsOpen > 0,
    prefill: route.params?.prefill,
  });

  const [containerH, setContainerH] = useState<number>(0);
  const sheetRef = useRef<BottomSheet>(null);
  const assetSheetRef = useRef<BottomSheetModal>(null);
  const routesSheetRef = useRef<BottomSheetModal>(null);
  const settingsSheetRef = useRef<BottomSheetModal>(null);
  const historySheetRef = useRef<BottomSheetModal>(null);
  const insufficientSheetRef = useRef<BottomSheetModal>(null);
  const saveContactSheetRef = useRef<BottomSheetModal>(null);

  // Fixed under the header's icons: the form needs the height, and the
  // balance it would reveal is already on the card.
  const snapPoints = useMemo(
    () => [containerH > 0 ? containerH - PANEL_TOP : '93%'],
    [containerH],
  );

  // The amount can be typed in USD; the swap is always quoted and sent in
  // the coin. Selling ZEC, the price is the wallet's ZEC price. Buying, it is
  // the coin's USD price from SwapKit, which only comes with a quote: the
  // last one seen for each coin is kept, so USD is offered from the first
  // quote on, and a requote does not rewrite what was typed.
  const quote = fiatQuote(zecPrice, server, walletChainName);
  const sellCoinPrice = useCoinPrice(
    form.quoteContext?.quoteInput.sellAsset.swapKitId,
    form.quoteContext?.fiatValueBasis.sellUsdUnitPrice ?? 0,
    form.selectedToken
      ? tokenToSwapAsset(form.selectedToken).swapKitId
      : undefined,
  );
  const price = form.isOutbound
    ? quote.kind === 'quote' && info.currencyName === GlobalConst.zecSwapChain
      ? quote.price
      : 0
    : sellCoinPrice;
  const usdAvailable = price > 0;
  const [unit, setUnit] = useState<'coin' | 'usd'>('coin');
  const [usdText, setUsdText] = useState<string>('');
  const usdMode = usdAvailable && unit === 'usd';
  /** What the amount is typed in, when not in USD. */
  const sellSymbol = form.isOutbound
    ? info.currencyName
    : form.selectedToken?.ticker || form.selectedToken?.symbol || '';
  const onChangeAmountText = (text: string) => {
    if (usdMode) {
      setUsdText(text);
      form.setAmount(toZecText(text, price));
    } else {
      form.setAmount(text);
    }
  };
  const toggleUnit = () => {
    if (usdMode) {
      setUnit('coin');
    } else {
      setUsdText(toFiatText(form.amount, price));
      setUnit('usd');
    }
  };
  const usdOf = (zecText: string): string => {
    const text = toFiatText(zecText, price);
    return text ? `≈ $${text}` : '';
  };

  const counterpartyTicker =
    form.selectedToken?.ticker || form.selectedToken?.symbol || '';
  const receiveAsset = form.quoteContext?.quoteInput.receiveAsset;
  const receiveSymbol =
    receiveAsset?.ticker ??
    receiveAsset?.chain ??
    (form.isOutbound ? counterpartyTicker : info.currencyName);
  const receiveUsdUnitPrice =
    form.quoteContext?.fiatValueBasis.receiveUsdUnitPrice ?? 0;
  const receiveText = form.chosenRoute
    ? formatAmountForDisplay(form.chosenRoute.expectedReceiveAmount)
    : '';
  const receiveUsd =
    form.chosenRoute && receiveUsdUnitPrice > 0
      ? `≈ ${formatUsd(parseFloat(form.chosenRoute.expectedReceiveAmount) * receiveUsdUnitPrice)}`
      : '';

  // The newest swap in progress. A late payment on its way back is not one;
  // it has no card.
  const pending = maxBy(
    records.filter(r => !isTerminalStatus(r.status) && !isRefunding(r)),
    r => r.createdAtMs,
  );
  // The card turns to its warning half an hour after the payment address.
  const [nowMs, setNowMs] = useState<number>(() => Date.now());
  const awaiting = !!pending && awaitsDeposit(pending);
  useEffect(() => {
    if (!awaiting) {
      return;
    }
    const timer = setInterval(() => setNowMs(Date.now()), 30_000);
    return () => clearInterval(timer);
  }, [awaiting]);
  const pendingState = pending
    ? pendingSwapLabel(pending, nowMs, key => translate(key) as string)
    : null;

  /** The address book's contact for the address in the field, on its chain. */
  const savedContact = addressBook.find(
    c =>
      c.swapChain.toUpperCase() === form.counterpartyChain.toUpperCase() &&
      c.address ===
        canonicalChainAddress(form.counterpartyChain, form.activeAddress),
  );

  /** "BTC", or "USDC on Base" for a coin away from its own chain. */
  const chainLabel = form.selectedToken
    ? form.selectedToken.chain === form.selectedToken.symbol
      ? counterpartyTicker
      : (translate('swap.asset-on') as string)
          .replace('{asset}', counterpartyTicker)
          .replace(
            '{network}',
            chainDisplayName(form.selectedToken.chain) ||
              form.selectedToken.chain,
          )
    : '';
  const networkLabel =
    chainDisplayName(form.counterpartyChain) || form.counterpartyChain;

  /** The button says what is missing; waiting on the mixnet it stays Continue, off. */
  const ctaLabel = translate(
    form.cta === 'noAddress'
      ? form.isOutbound
        ? 'swap.cta-noAddress-sell'
        : 'swap.cta-noAddress-buy'
      : form.cta === 'mixnetBlocked'
        ? 'swap.cta-ready'
        : `swap.cta-${form.cta}`,
  ) as string;
  const nymWaiting =
    form.isOutbound &&
    mixnetView.kind === 'transport' &&
    mixnetView.sendBlocked;
  const ctaEnabled = form.cta === 'ready';
  // The review answers under one request: cancelled, done, or a refusal
  // with its provider and reason, which takes the route off the list.
  useResult('swap.contact', address => form.setActiveAddress(address));

  useResult('swap.review', answer => {
    if (answer === 'done') {
      form.finish();
      return;
    }
    if (answer.startsWith('refused:')) {
      const [, provider, ...reason] = answer.split(':');
      form.refuseRoute(provider as SwapKitProviderEnum, reason.join(':'));
    }
    form.cancelReview();
  });
  const openRecord = (record: SwapRecordType) =>
    navigation.navigate(swapScreenFor(record), { recordId: record.recordId });
  const onContinue = () => {
    const proceed = () => {
      const review = form.review();
      if (review) {
        navigation.navigate(Route.SwapReview, {
          review,
          direction: form.direction,
        });
      }
    };
    if (form.nearNeedsConfirm) {
      showConfirm({
        title: translate('swap.near-confirm-title') as string,
        message: `${translate('swap.near-confirm-body') as string} ${form.canonicalAddress}`,
        buttons: [
          { text: translate('swap.close') as string, style: 'cancel' },
          { text: translate('swap.cta-ready') as string, onPress: proceed },
        ],
      });
      return;
    }
    // Buying ZEC through NEAR under its no-refunds line: the warning comes
    // first, once, or until the user asks not to see it again.
    if (
      !nearWarning.hidden &&
      nearRefusesSmallRefunds({
        provider: form.chosenRoute?.provider,
        direction: form.direction,
        sellUsd:
          form.amountNumber *
          (form.quoteContext?.fiatValueBasis.sellUsdUnitPrice ?? 0),
      })
    ) {
      const dontShow = { current: false };
      showConfirm({
        title: translate('swap.near-small-title') as string,
        message: translate('swap.near-small-body') as string,
        content: (
          <DontShowAgain
            testID="swap.near-small.dont-show"
            label={translate('swap.dont-show-again') as string}
            onChange={checked => {
              dontShow.current = checked;
            }}
          />
        ),
        buttons: [
          {
            text: translate('swap.cta-ready') as string,
            onPress: () => {
              if (dontShow.current) {
                nearWarning.setHidden(true);
              }
              proceed();
            },
          },
          { text: translate('swap.cancel') as string, style: 'cancel' },
        ],
      });
      return;
    }
    proceed();
  };

  // A new quote asked from an expired swap goes straight to the review.
  useEffect(() => {
    if (form.prefillArmed && form.cta === 'ready') {
      form.disarmPrefill();
      onContinue();
    }
  });

  const noticeText = (): string => {
    const notice = form.quoteNotice;
    if (!notice) {
      return '';
    }
    const parts: string[] = [];
    if (notice.carriedProviders.length > 0) {
      parts.push(
        `${notice.carriedProviders.map(providerShortLabel).join(', ')}: ${translate('swap.notice-carried') as string}`,
      );
      if (notice.carriedUntilMs) {
        parts.push(
          `${translate('swap.notice-carried-until') as string} ${Utils.formatDate(notice.carriedUntilMs, 'h:mm aaa', context.language)}.`,
        );
      }
    }
    if (notice.droppedProvider) {
      parts.push(
        `${providerShortLabel(notice.droppedProvider)} ${translate('swap.notice-dropped') as string}`,
      );
    }
    return parts.join(' ');
  };

  const sheetHeader = (
    <TitleBar
      title={translate('swap.title') as string}
      left={{
        icon: SlidersIcon,
        testID: 'swap.settings',
        accessibilityLabel: translate('swap.settings-acc') as string,
        onPress: () => settingsSheetRef.current?.present(),
        badge:
          form.slippageBps !== DEFAULT_SLIPPAGE_BPS ? (
            <View
              style={{
                width: 8,
                height: 8,
                marginLeft: -3,
                marginTop: -8,
                borderRadius: radiusPill,
                backgroundColor: colors.bgAccent,
              }}
            />
          ) : undefined,
      }}
      right={{
        icon: HistoryIcon,
        testID: 'swap.history',
        accessibilityLabel: translate('swap.history-acc') as string,
        onPress: () => historySheetRef.current?.present(),
      }}
    />
  );

  return (
    <SheetPresence.Provider value={sheetPresence}>
      <View
        testID="swap.container"
        accessible={false}
        style={{ flex: 1 }}
        onLayout={e => setContainerH(e.nativeEvent.layout.height)}
      >
        {/* Only the top bar: the panel covers the rest, and nothing should show while it settles. */}
        <Header
          title={''}
          noBalance={true}
          noSyncingStatus={true}
          noPrivacy={true}
          setPrivacyOption={setPrivacyOption}
          addLastSnackbar={addLastSnackbar}
          setShieldingAmount={setShieldingAmount}
          setBackgroundError={setBackgroundError}
          showMessagesIcon={true}
        />
        <Animated.View
          pointerEvents="box-none"
          style={[StyleSheet.absoluteFill, sheetSlideStyle]}
        >
          {/* Mounted once measured, at its snap: the tab is in place on its first frame. */}
          {containerH > 0 && (
            <AppSheet
              ref={sheetRef}
              snapPoints={snapPoints}
              header={sheetHeader}
              animateOnMount={false}
            >
              <ScrollView
                onScroll={onTabScroll}
                scrollEventThrottle={16}
                keyboardShouldPersistTaps="handled"
                testID="swap.scroll-view"
                contentContainerStyle={{
                  paddingHorizontal: space20,
                  paddingTop: space8,
                  paddingBottom:
                    Platform.OS === GlobalConst.platformOSandroid ? 120 : 160,
                  rowGap: space12,
                }}
              >
                {!!pending && (
                  <Card
                    testID="swap.pending"
                    onPress={() => openRecord(pending)}
                  >
                    <View
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        columnGap: space12,
                      }}
                    >
                      <View
                        style={{
                          width: 8,
                          height: 8,
                          borderRadius: radiusPill,
                          backgroundColor: colors.fgWarning,
                        }}
                      />
                      <View style={{ flex: 1 }}>
                        <Text variant="bodyStrong">
                          {swapPairLabel(pending)}
                        </Text>
                        <Text
                          variant="bodySmall"
                          tone={pendingState?.warning ? 'warning' : 'muted'}
                        >
                          {pendingState?.text}
                        </Text>
                      </View>
                    </View>
                  </Card>
                )}

                {form.catalogUnreachable && (
                  <Banner
                    tone="warning"
                    title={translate('swap.service-down') as string}
                    actionBeside
                    action={
                      <Button
                        inline
                        size="small"
                        variant="text"
                        title={translate('swap.retry') as string}
                        busy={form.catalogRetrying}
                        onPress={form.loadCatalog}
                      />
                    }
                  />
                )}
                {form.catalogEdgeBlocked && (
                  <Banner
                    tone="warning"
                    title={translate('swap.edge-blocked-title') as string}
                  >
                    {translate('swap.edge-blocked-body') as string}
                  </Banner>
                )}
                {!!form.catalogError && (
                  <Banner tone="warning" title={form.catalogError} />
                )}

                <PairCards
                  isOutbound={form.isOutbound}
                  token={form.selectedToken}
                  amountText={usdMode ? usdText : form.amount}
                  onChangeAmountText={onChangeAmountText}
                  amountPlaceholder="0"
                  unit={usdMode ? 'usd' : 'coin'}
                  onToggleUnit={usdAvailable ? toggleUnit : undefined}
                  altText={
                    usdMode
                      ? `≈ ${formatAmount(parseAmountInput(form.amount))} ${sellSymbol}`
                      : usdOf(form.amount)
                  }
                  availableText={
                    !form.isOutbound
                      ? undefined
                      : usdMode
                        ? toFiatText(String(form.maxSpendableForSwap), price) ||
                          Utils.parseNumberFloatToStringLocale(0, 2)
                        : `${formatAmountForDisplay(String(form.maxSpendableForSwap))} ${info.currencyName}`
                  }
                  onUseMax={() =>
                    onChangeAmountText(
                      usdMode
                        ? toFiatText(
                            toAmountInput(form.maxSpendableForSwap),
                            price,
                          )
                        : toAmountInput(form.maxSpendableForSwap),
                    )
                  }
                  invalid={form.overBalance}
                  receiveText={receiveText}
                  receivePlaceholder="0"
                  receiveAltText={receiveUsd}
                  ring={
                    form.routes?.length
                      ? {
                          resetKey: form.refreshedAtMs,
                          durationMs: QUOTE_REFRESH_MS,
                          fetching: form.quoting,
                          disabled: form.refreshDisabled,
                          paused: sheetsOpen > 0,
                          onPress: form.refreshNow,
                        }
                      : undefined
                  }
                  onFlip={form.flip}
                  onPickAsset={() => assetSheetRef.current?.present()}
                  texts={{
                    youSend: translate('swap.you-send') as string,
                    youReceive: form.isOutbound
                      ? (translate('swap.you-receive') as string)
                      : (translate('swap.receive-in-zingo') as string),
                    receiveTip: translate('swap.tip-derived') as string,
                    fromOtherWallet: translate(
                      'swap.from-other-wallet',
                    ) as string,
                    available: translate('swap.available') as string,
                    pickAsset: translate('swap.pick-asset-acc') as string,
                    flip: translate('swap.flip-acc') as string,
                    useMax: translate('swap.use-max-acc') as string,
                    switchUnit: translate('swap.switch-unit-acc') as string,
                    refreshNow: translate('swap.refresh') as string,
                  }}
                />

                {form.overBalance && (
                  <View
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      columnGap: 8,
                    }}
                  >
                    <InfoIcon size={iconSizeSm} color={colors.fgDanger} />
                    <Text
                      variant="bodySmall"
                      tone="danger"
                      style={{ flexShrink: 1 }}
                    >
                      {translate('swap.over-balance') as string}
                    </Text>
                  </View>
                )}

                {/* The button says what is missing and stays off; the why
                  (the fee on top of the amount, and what would fit) waits
                  behind a link, in its sheet. */}
                {form.cta === 'insufficient' && (
                  <View
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      columnGap: 8,
                    }}
                  >
                    <InfoIcon size={iconSizeSm} color={colors.fgDanger} />
                    <Text
                      variant="bodySmall"
                      tone="danger"
                      style={{ flexShrink: 1 }}
                    >
                      {translate('swap.insufficient-title') as string}
                    </Text>
                    <Pressable
                      kind="link"
                      testID="swap.insufficient-why"
                      accessibilityRole="button"
                      hitSlop={space8}
                      onPress={() => insufficientSheetRef.current?.present()}
                      style={{ marginLeft: 'auto' }}
                    >
                      <Text
                        variant="caption"
                        tone="danger"
                        style={{
                          fontWeight: '700',
                          textDecorationLine: 'underline',
                        }}
                      >
                        {translate('swap.see-why') as string}
                      </Text>
                    </Pressable>
                  </View>
                )}

                {!!form.selectedToken && (
                  <View
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      columnGap: space8,
                      minHeight: 44,
                      paddingHorizontal: 4,
                    }}
                  >
                    <Text
                      variant="bodySmall"
                      tone="muted"
                      style={{ flex: 1, fontWeight: '600' }}
                    >
                      {translate('swap.provider') as string}
                    </Text>
                    {form.chosenRoute ? (
                      <>
                        <Pressable
                          kind="link"
                          testID="swap.change-route"
                          accessibilityRole="button"
                          accessibilityLabel={
                            translate('swap.change-route-acc') as string
                          }
                          onPress={() => routesSheetRef.current?.present()}
                          hitSlop={8}
                          style={{ minHeight: 32, justifyContent: 'center' }}
                        >
                          <Text
                            variant="bodySmall"
                            style={{
                              fontWeight: '600',
                              textDecorationLine: 'underline',
                            }}
                          >
                            {providerShortLabel(form.chosenRoute.provider)}
                          </Text>
                        </Pressable>
                        {!!form.chosenRoute.estimatedTimeText && (
                          <Text variant="caption" tone="muted">
                            {form.chosenRoute.estimatedTimeText}
                          </Text>
                        )}
                      </>
                    ) : (
                      <Text variant="caption" tone="muted">
                        {
                          translate(
                            form.cta === 'noRoutes'
                              ? 'swap.provider-none'
                              : 'swap.provider-pending',
                          ) as string
                        }
                      </Text>
                    )}
                  </View>
                )}
                {form.rateLimited && (
                  <Banner
                    tone="warning"
                    title={renderSwapText(
                      rateLimitedNotice(form.rateLimitedUntilMs - form.nowMs),
                      key => (translate(key) as string).trim(),
                    )}
                  />
                )}
                {!!form.quoteNotice && (
                  <Banner tone="warning" title={noticeText()} />
                )}

                {!!form.selectedToken && (
                  <View>
                    <View
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        columnGap: space8,
                        marginBottom: space8,
                        paddingHorizontal: 4,
                      }}
                    >
                      <Text
                        variant="caption"
                        tone="muted"
                        style={{ fontWeight: '600' }}
                      >
                        {
                          translate(
                            form.isOutbound
                              ? 'swap.dest-address'
                              : 'swap.refund-address',
                          ) as string
                        }
                      </Text>
                      <View
                        style={{
                          flexDirection: 'row',
                          alignItems: 'center',
                          columnGap: 4,
                          flexShrink: 1,
                        }}
                      >
                        <Text variant="caption" tone="muted" numberOfLines={1}>
                          {chainLabel}
                        </Text>
                        {!form.isOutbound && (
                          <InfoTooltip
                            testID="swap.refund-info"
                            label={translate('swap.refund-address') as string}
                            text={translate('swap.tip-refund') as string}
                          >
                            <></>
                          </InfoTooltip>
                        )}
                      </View>
                    </View>
                    <TextInputAddress
                      address={form.activeAddress}
                      setAddress={form.setActiveAddress}
                      setError={() => {}}
                      disabled={false}
                      showLabel={false}
                      swapChain={form.counterpartyChain}
                      scanRequest="swap.address"
                      pasteLabel={translate('paste') as string}
                      onPickContact={() =>
                        navigation.navigate(Route.AddressBook, {
                          pick: 'swap.contact',
                          chain: form.counterpartyChain,
                        })
                      }
                      pickContactLabel={
                        translate('addressbook.pick-title') as string
                      }
                      placeholder={(
                        translate('swap.address-placeholder') as string
                      ).replace('{chain}', counterpartyTicker)}
                    />
                    {form.addressShowError ? (
                      <View
                        style={{
                          flexDirection: 'row',
                          alignItems: 'center',
                          columnGap: 8,
                          marginTop: 8,
                          paddingHorizontal: 4,
                        }}
                      >
                        <InfoIcon size={iconSizeSm} color={colors.fgDanger} />
                        <Text
                          variant="bodySmall"
                          tone="danger"
                          style={{ flexShrink: 1 }}
                        >
                          {form.addressIsZcash
                            ? (translate('swap.address-zcash') as string)
                            : (translate('swap.address-bad') as string).replace(
                                '{network}',
                                networkLabel,
                              )}
                        </Text>
                      </View>
                    ) : form.activeAddress.trim().length > 0 &&
                      form.addressValid ? (
                      <View
                        style={{
                          flexDirection: 'row',
                          alignItems: 'center',
                          columnGap: 8,
                          marginTop: 8,
                          paddingHorizontal: 4,
                        }}
                      >
                        <CheckIcon size={iconSizeSm} color={colors.fgAccent} />
                        {savedContact ? (
                          <Text
                            testID="swap.address.contact"
                            variant="caption"
                            tone="muted"
                            numberOfLines={1}
                            style={{ flexShrink: 1 }}
                          >
                            <Text
                              variant="caption"
                              style={{ fontWeight: '700' }}
                            >
                              {savedContact.label}
                            </Text>
                            {` · ${translate('swap.address-in-book') as string}`}
                          </Text>
                        ) : (
                          <>
                            <Text
                              variant="caption"
                              tone="muted"
                              numberOfLines={1}
                              style={{ flexShrink: 1 }}
                            >
                              {(
                                translate('swap.address-valid') as string
                              ).replace('{asset}', chainLabel)}
                            </Text>
                            <View style={{ marginLeft: 'auto' }}>
                              <Button
                                testID="swap.save-contact"
                                variant="text"
                                size="small"
                                inline
                                title={translate('swap.save-contact') as string}
                                onPress={() =>
                                  saveContactSheetRef.current?.present()
                                }
                              />
                            </View>
                          </>
                        )}
                      </View>
                    ) : null}
                  </View>
                )}

                {form.cta === 'noRoutes' && (
                  <Banner
                    tone="warning"
                    title={translate('swap.no-route-now') as string}
                  >
                    {form.unavailable.length > 0 && (
                      <View style={{ rowGap: space4 }}>
                        <Pressable
                          kind="link"
                          testID="swap.see-why"
                          accessibilityRole="button"
                          accessibilityState={{ expanded: whyOpen }}
                          onPress={() => setWhyOpen(open => !open)}
                          hitSlop={space8}
                          style={{
                            flexDirection: 'row',
                            alignItems: 'center',
                            columnGap: space4,
                          }}
                        >
                          <Text
                            variant="caption"
                            tone="warning"
                            style={{
                              fontWeight: '700',
                              textDecorationLine: 'underline',
                            }}
                          >
                            {translate('swap.see-why') as string}
                          </Text>
                          {whyOpen ? (
                            <ChevronUp
                              size={iconSizeSm}
                              color={colors.fgWarning}
                            />
                          ) : (
                            <ChevronDown
                              size={iconSizeSm}
                              color={colors.fgWarning}
                            />
                          )}
                        </Pressable>
                        {whyOpen &&
                          form.unavailable.map(row => (
                            <Text
                              key={row.provider}
                              variant="caption"
                              tone="muted"
                            >
                              {`${providerShortLabel(row.provider)} · ${renderSwapText(
                                row.reason,
                                key => (translate(key) as string).trim(),
                              )}`}
                            </Text>
                          ))}
                      </View>
                    )}
                  </Banner>
                )}
                {form.cta !== 'noRoutes' &&
                  !!form.quoteError &&
                  !form.routes?.length && (
                    <Banner tone="warning" title={form.quoteError} />
                  )}

                <View
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'center',
                    columnGap: space4,
                    marginTop: space4,
                  }}
                >
                  <Text variant="caption" tone="muted">
                    {translate('swap.privacy-note') as string}
                  </Text>
                  <InfoTooltip
                    testID="swap.privacy-info"
                    label={translate('swap.privacy-note') as string}
                    text={translate('swap.tip-privacy') as string}
                  >
                    <></>
                  </InfoTooltip>
                </View>

                {nymWaiting && (
                  <View style={{ alignItems: 'center', rowGap: space4 }}>
                    <Text
                      variant="bodySmall"
                      tone="muted"
                      style={{ textAlign: 'center' }}
                    >
                      {translate('swap.nym-wait') as string}
                    </Text>
                    <Text
                      variant="body"
                      style={{ textAlign: 'center', fontWeight: '500' }}
                    >
                      {translate(shownStatusKey(mixnetView)) as string}
                    </Text>
                  </View>
                )}

                <View style={{ marginTop: space4 }}>
                  <Button
                    testID="swap.continue"
                    variant="primary"
                    title={ctaLabel}
                    disabled={!ctaEnabled}
                    onPress={onContinue}
                  />
                </View>
              </ScrollView>
            </AppSheet>
          )}
        </Animated.View>

        <AssetPickerSheet
          ref={assetSheetRef}
          tokens={form.tokens ?? []}
          selected={form.selectedToken}
          onSelect={form.setSelectedToken}
        />
        <RoutesSheet
          ref={routesSheetRef}
          routes={form.routes ?? []}
          unavailable={form.unavailable}
          selectedRouteId={form.chosenRouteId}
          receiveSymbol={receiveSymbol}
          receiveUsdUnitPrice={receiveUsdUnitPrice}
          onSelect={form.pickRoute}
        />
        <SaveContactSheet
          ref={saveContactSheetRef}
          address={canonicalChainAddress(
            form.counterpartyChain,
            form.activeAddress,
          )}
          chain={form.counterpartyChain}
          book={addressBook}
          onSave={async name => {
            setAddressBook(
              await AddressBookFileImpl.saveChainContact(
                name,
                form.activeAddress,
                form.counterpartyChain,
              ),
            );
            addLastSnackbar(
              (translate('addressbook.added') as string).replace(
                '{name}',
                name,
              ),
              SnackbarDurationEnum.short,
            );
          }}
        />
        <SwapSettingsSheet
          ref={settingsSheetRef}
          slippageBps={form.slippageBps}
          onChange={form.setSlippageBps}
        />
        <SwapHistorySheet
          ref={historySheetRef}
          records={records}
          nowMs={nowMs}
          onOpen={record => {
            openRecord(record);
            // Gone at once under the risen panel, without a motion of its own.
            setTimeout(
              () => historySheetRef.current?.dismiss({ duration: 0 }),
              duration.panelIn,
            );
          }}
        />
        <InsufficientFundsSheet
          ref={insufficientSheetRef}
          spendable={spendable}
          maxSpendableForSwap={form.maxSpendableForSwap}
          onReduce={form.setAmount}
        />
      </View>
    </SheetPresence.Provider>
  );
};

export default Swap;
