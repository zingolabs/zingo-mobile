/* eslint-disable react-native/no-inline-styles */
import React, { useContext, useMemo, useRef, useState } from 'react';
import {
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import Animated from 'react-native-reanimated';
import BottomSheet, { BottomSheetModal } from '@gorhom/bottom-sheet';
import {
  radiusMd,
  slopFor,
  space12,
  space16,
  space4,
  space8,
  useTheme,
} from '@app/theme';
import { GlobalConst, Route } from '@app/AppState';
import { HomeTabScreenProps } from '@app/types';
import { ContextAppLoaded, useSwapRecords, useSwapService } from '@app/context';
import {
  formatAmountForDisplay,
  isTerminalStatus,
  providerShortLabel,
  rateLimitedNotice,
  renderSwapText,
} from '@app/swap';
import { SwapStatusEnum } from '@app/swap/enums/SwapStatusEnum';
import { SwapKitProviderEnum } from '@app/swap/enums/SwapKitProviderEnum';
import { sendGateOpen } from '@app/walletBackend/transforms/mixnetView';
import { fiatQuote, toFiatText, toZecText } from '@app/price/fiatQuote';
import { showConfirm } from '@app/services/showConfirm';
import { useDismissSheetsOnBlur } from '@app/hooks/useDismissSheetsOnBlur';
import { useNavigation } from '@react-navigation/native';
import { useResult } from '@app/navigation/results';
import { WalletNavigation } from '@app/types';
import { swapScreenFor } from './swapRoute';
import { useOptionsPanelSheetSlide } from '@app/hooks/useOptionsPanelSheetSlide';
import Utils from '@app/utils';
import Header from '@ui/widgets/Header';
import AppSheet from '@ui/primitives/AppSheet';
import Text from '@ui/primitives/Text';
import Button from '@ui/primitives/Button';
import Card from '@ui/widgets/Card';
import Banner from '@ui/widgets/Banner';
import TextInputAddress from '@ui/widgets/TextInputAddress';
import { chainDisplayName } from '@ui/widgets/chainDisplayName';
import { SlidersIcon } from '@ui/primitives/Icons/SlidersIcon';
import { HistoryIcon } from '@ui/primitives/Icons/HistoryIcon';
import { CheckIcon } from '@ui/primitives/Icons/CheckIcon';
import { InfoIcon } from '@ui/primitives/Icons/InfoIcon';
import { TriangleAlert } from '@ui/primitives/Icons/TriangleAlert';
import {
  DEFAULT_SLIPPAGE_BPS,
  QUOTE_REFRESH_MS,
  useSwapForm,
} from './useSwapForm';
import PairCards from './components/PairCards';
import AssetPickerSheet from './components/AssetPickerSheet';
import RoutesSheet from './components/RoutesSheet';
import SwapSettingsSheet, {
  formatSlippagePercent,
} from './components/SwapSettingsSheet';
import SwapHistorySheet, { swapPairLabel } from './components/SwapHistorySheet';
import InsufficientFundsSheet from './components/InsufficientFundsSheet';

type SwapProps = HomeTabScreenProps<'Swap'>;

/** The strip of icons at the top of the header the sheet stops under. */
const TOP_ICONS_H = 55;
const SNAP_GAP = 4;

/**
 * The swap tab: pick the other side, state an amount, and quote it. ZEC is
 * always one side. The sheet sits fixed under the header's icons; the review
 * and everything after it are screens of their own.
 */
const Swap: React.FunctionComponent<SwapProps> = () => {
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
    setShieldingAmount,
    setBackgroundError,
  } = context;
  const { colors } = useTheme();
  const navigation = useNavigation<WalletNavigation>();
  const swapService = useSwapService();
  const records = useSwapRecords();
  const sheetSlideStyle = useOptionsPanelSheetSlide();
  useDismissSheetsOnBlur();

  const spendable = totalBalance?.totalSpendableBalance ?? 0;
  const form = useSwapForm({
    swapService,
    spendable,
    zecChain: walletChainName,
    mixnetBlocked: !sendGateOpen(mixnetView),
  });

  const [containerH, setContainerH] = useState<number>(0);
  const sheetRef = useRef<BottomSheet>(null);
  const assetSheetRef = useRef<BottomSheetModal>(null);
  const routesSheetRef = useRef<BottomSheetModal>(null);
  const settingsSheetRef = useRef<BottomSheetModal>(null);
  const historySheetRef = useRef<BottomSheetModal>(null);
  const insufficientSheetRef = useRef<BottomSheetModal>(null);

  // Fixed under the header's icons: the form needs the height, and the
  // balance it would reveal is already on the card.
  const snapPoints = useMemo(
    () => [containerH > 0 ? containerH - TOP_ICONS_H - SNAP_GAP : '93%'],
    [containerH],
  );

  // Selling ZEC, the amount can be typed in USD; the swap is always quoted
  // and sent in ZEC.
  const quote = fiatQuote(zecPrice, server, walletChainName);
  const usdAvailable =
    form.isOutbound &&
    quote.kind === 'quote' &&
    info.currencyName === GlobalConst.zecSwapChain;
  const [unit, setUnit] = useState<'coin' | 'usd'>('coin');
  const [usdText, setUsdText] = useState<string>('');
  const usdMode = usdAvailable && unit === 'usd';
  const price = quote.kind === 'quote' ? quote.price : 0;
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
      ? `≈ $${(parseFloat(form.chosenRoute.expectedReceiveAmount) * receiveUsdUnitPrice).toFixed(2)}`
      : '';

  const pending = records.find(r => !isTerminalStatus(r.status));
  const pendingState =
    pending?.status === SwapStatusEnum.AwaitingExternalDeposit
      ? (translate('swap.pending-waiting') as string)
      : (translate('swap.pending-swapping') as string);

  const chainLabel = form.selectedToken
    ? form.selectedToken.chain === form.selectedToken.symbol
      ? counterpartyTicker
      : `${counterpartyTicker} · ${chainDisplayName(form.selectedToken.chain)}`
    : '';

  const ctaLabel = translate(`swap.cta-${form.cta}`) as string;
  const ctaEnabled = form.cta === 'ready' || form.cta === 'insufficient';
  // The review answers under one request: cancelled, done, or a refusal
  // with its provider and reason, which takes the route off the list.
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
  const openRecord = (recordId: string, status: SwapStatusEnum) =>
    navigation.navigate(swapScreenFor(status), { recordId });
  const onContinue = () => {
    if (form.cta === 'insufficient') {
      insufficientSheetRef.current?.present();
      return;
    }
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
    proceed();
  };

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
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingTop: 8,
        paddingBottom: 6,
        paddingHorizontal: space16,
      }}
    >
      <Pressable
        testID="swap.settings"
        accessibilityRole="button"
        accessibilityLabel={translate('swap.settings-acc') as string}
        hitSlop={slopFor(24)}
        onPress={() => settingsSheetRef.current?.present()}
      >
        <SlidersIcon size={22} color={colors.fgDefault} />
        {form.slippageBps !== DEFAULT_SLIPPAGE_BPS && (
          <View
            style={{
              position: 'absolute',
              top: -2,
              right: -4,
              width: 8,
              height: 8,
              borderRadius: 4,
              backgroundColor: colors.bgAccent,
            }}
          />
        )}
      </Pressable>
      <Text variant="subtitle" style={{ flex: 1, textAlign: 'center' }}>
        {translate('swap.title') as string}
      </Text>
      <Pressable
        testID="swap.history"
        accessibilityRole="button"
        accessibilityLabel={translate('swap.history-acc') as string}
        hitSlop={slopFor(24)}
        onPress={() => historySheetRef.current?.present()}
      >
        <HistoryIcon size={22} color={colors.fgDefault} />
      </Pressable>
    </View>
  );

  const row = (label: string, value: React.ReactNode) => (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        columnGap: space12,
        paddingVertical: space8,
      }}
    >
      <Text variant="bodySmall" tone="muted">
        {label}
      </Text>
      {value}
    </View>
  );

  return (
    <View
      accessible={false}
      style={{ flex: 1 }}
      onLayout={e => setContainerH(e.nativeEvent.layout.height)}
    >
      <Header
        title={''}
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
        <AppSheet ref={sheetRef} snapPoints={snapPoints} header={sheetHeader}>
          <ScrollView
            keyboardShouldPersistTaps="handled"
            testID="swap.scroll-view"
            contentContainerStyle={{
              paddingHorizontal: space16,
              paddingBottom:
                Platform.OS === GlobalConst.platformOSandroid ? 120 : 160,
              rowGap: space12,
            }}
          >
            {!!pending && (
              <Card
                tone="selected"
                testID="swap.pending"
                onPress={() => openRecord(pending.recordId, pending.status)}
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
                      borderRadius: 4,
                      backgroundColor: colors.bgAccent,
                    }}
                  />
                  <View style={{ flex: 1 }}>
                    <Text variant="bodyStrong">{swapPairLabel(pending)}</Text>
                    <Text variant="bodySmall" tone="muted">
                      {pendingState}
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
                <Text variant="bodySmall">
                  {translate('swap.edge-blocked-body') as string}
                </Text>
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
              amountPlaceholder={usdMode ? '0.00' : '0.0000'}
              unit={usdMode ? 'usd' : 'coin'}
              onToggleUnit={usdAvailable ? toggleUnit : undefined}
              altText={
                form.isOutbound
                  ? usdMode
                    ? `≈ ${form.amount || '0'} ${info.currencyName}`
                    : usdOf(form.amount)
                  : ''
              }
              availableText={
                form.isOutbound
                  ? usdMode
                    ? `$${toFiatText(String(spendable), price) || '0.00'}`
                    : `${Utils.parseNumberFloatToStringLocale(spendable, 8)} ${info.currencyName}`
                  : undefined
              }
              onUseMax={() =>
                onChangeAmountText(
                  usdMode
                    ? toFiatText(String(form.maxSpendableForSwap), price)
                    : String(form.maxSpendableForSwap),
                )
              }
              invalid={form.overBalance}
              receiveText={receiveText}
              receivePlaceholder={form.isOutbound ? '0.00' : '0.0000'}
              receiveAltText={receiveUsd}
              ring={
                form.routes?.length
                  ? {
                      resetKey: form.refreshedAtMs,
                      durationMs: QUOTE_REFRESH_MS,
                      fetching: form.quoting,
                      disabled: form.refreshDisabled,
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
                fromOtherWallet: translate('swap.from-other-wallet') as string,
                available: translate('swap.available') as string,
                pickAsset: translate('swap.pick-asset-acc') as string,
                flip: translate('swap.flip-acc') as string,
                useMax: translate('swap.use-max-acc') as string,
                switchUnit: translate('swap.switch-unit-acc') as string,
                refreshNow: translate('swap.refresh') as string,
              }}
            />

            {!!form.routes?.length && (
              <View
                style={{
                  borderWidth: 1,
                  borderColor: colors.bottomSheetBorder,
                  borderRadius: radiusMd,
                  paddingHorizontal: space16,
                }}
              >
                {row(
                  translate('swap.provider') as string,
                  <Pressable
                    testID="swap.change-route"
                    accessibilityRole="button"
                    onPress={() => routesSheetRef.current?.present()}
                    hitSlop={8}
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      columnGap: space4,
                    }}
                  >
                    <Text
                      variant="bodyStrong"
                      style={{
                        textDecorationLine: 'underline',
                      }}
                    >
                      {form.chosenRoute
                        ? providerShortLabel(form.chosenRoute.provider)
                        : '—'}
                    </Text>
                  </Pressable>,
                )}
                {form.rateLimited && (
                  <Text
                    variant="caption"
                    tone="warning"
                    style={{ paddingBottom: space8 }}
                  >
                    {renderSwapText(
                      rateLimitedNotice(form.rateLimitedUntilMs - form.nowMs),
                      key => (translate(key) as string).trim(),
                    )}
                  </Text>
                )}
                {!!form.quoteNotice && (
                  <Text
                    variant="caption"
                    tone="warning"
                    style={{ paddingBottom: space8 }}
                  >
                    {noticeText()}
                  </Text>
                )}
              </View>
            )}

            {!!form.selectedToken && (
              <View>
                <Text variant="caption" tone="muted">
                  {`${translate(form.isOutbound ? 'swap.dest-address' : 'swap.refund-address') as string} (${chainLabel})`}
                </Text>
                <TextInputAddress
                  address={form.activeAddress}
                  setAddress={form.setActiveAddress}
                  setError={() => {}}
                  disabled={false}
                  showLabel={false}
                  swapChain={form.counterpartyChain}
                  scanRequest="swap.address"
                  pasteLabel={translate('swap.paste') as string}
                />
                {form.addressShowError ? (
                  <View
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      columnGap: space4,
                    }}
                  >
                    <TriangleAlert size={14} color={colors.fgDanger} />
                    <Text variant="caption" tone="danger">
                      {`${translate('swap.address-bad') as string} ${chainDisplayName(form.counterpartyChain) || form.counterpartyChain}.`}
                    </Text>
                  </View>
                ) : form.activeAddress.trim().length > 0 ? (
                  <View
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      columnGap: space4,
                    }}
                  >
                    <CheckIcon size={14} color={colors.fgMuted} />
                    <Text variant="caption" tone="muted">
                      {translate('swap.address-ok') as string}
                    </Text>
                  </View>
                ) : !form.isOutbound ? (
                  <Text variant="caption" tone="muted">
                    {translate('swap.refund-hint') as string}
                  </Text>
                ) : null}
              </View>
            )}

            {form.cta === 'noRoutes' && (
              <Banner
                tone="warning"
                title={translate('swap.no-routes-title') as string}
              >
                <Text variant="bodySmall">
                  {form.quoteError ||
                    (translate('swap.no-routes-body') as string)}
                </Text>
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
              <InfoIcon size={16} color={colors.fgMuted} />
            </View>

            <View style={{ marginTop: space8 }}>
              <Button
                testID="swap.continue"
                variant={form.isOutbound ? 'nym' : 'primary'}
                title={ctaLabel}
                disabled={!ctaEnabled}
                onPress={onContinue}
              />
              {form.slippageBps !== DEFAULT_SLIPPAGE_BPS && (
                <Text
                  variant="caption"
                  tone="muted"
                  style={{ textAlign: 'center', marginTop: space8 }}
                >
                  {`${translate('swap.slippage') as string}: ${formatSlippagePercent(form.slippageBps)}%`}
                </Text>
              )}
            </View>
          </ScrollView>
        </AppSheet>
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
      <SwapSettingsSheet
        ref={settingsSheetRef}
        slippageBps={form.slippageBps}
        onChange={form.setSlippageBps}
      />
      <SwapHistorySheet
        ref={historySheetRef}
        records={records}
        onOpen={record => {
          historySheetRef.current?.dismiss();
          openRecord(record.recordId, record.status);
        }}
      />
      <InsufficientFundsSheet
        ref={insufficientSheetRef}
        spendable={spendable}
        maxSpendableForSwap={form.maxSpendableForSwap}
        onReduce={form.setAmount}
      />
    </View>
  );
};

export default Swap;
