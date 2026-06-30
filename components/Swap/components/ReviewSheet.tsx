/* eslint-disable react-native/no-inline-styles */
import React, {
  forwardRef,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react';
import {
  ActivityIndicator,
  Linking,
  Pressable,
  StyleSheet,
  View,
} from 'react-native';
import { useTheme } from '@react-navigation/native';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import {
  faCheck,
  faCopy,
  faExclamationTriangle,
  faExternalLinkAlt,
  faXmark,
} from '@fortawesome/free-solid-svg-icons';
import {
  BottomSheetBackdrop,
  BottomSheetBackdropProps,
  BottomSheetModal,
  BottomSheetScrollView,
} from '@gorhom/bottom-sheet';
import Clipboard from '@react-native-clipboard/clipboard';
import QRCode from 'react-native-qrcode-svg';

import { ThemeType } from '../../../app/types';
import { SnackbarDurationEnum, TranslateType } from '../../../app/AppState';
import {
  DepositInstructionsType,
  QuoteInput,
  RouteOptionType,
  SwapDirectionEnum,
  SwapKitProviderEnum,
  SwapRecordType,
  SwapService,
} from '../../../app/swap';
import { FiatValueBasisType } from '../../../app/swap/types/FiatValueBasisType';
import BoldText from '../../Components/BoldText';
import FadeText from '../../Components/FadeText';
import RegText from '../../Components/RegText';
import { providerLongLabel } from './providerLabels';
import {
  EVM_SOURCE_CHAINS,
  UTXO_SOURCE_CHAINS,
  buildEip681Uri,
  isEvmSourceChain,
  isUtxoSourceChain,
  memoToHexCalldata,
} from '../../../app/swap/chainMemoEncoding';

/**
 * Review-and-commit modal for a swap.
 *
 * Two visual phases, gated by whether `commitRoute` has succeeded:
 *
 *   1. **Review** — the user sees the chosen route's amounts, rate, refund
 *      destination, and provider, plus a "Confirm" CTA. Dismissing here is
 *      free; nothing has been written to SwapKit yet.
 *
 *   2. **Deposit instructions** — after `commitRoute` returns, the sheet
 *      switches to a payment slip: deposit address, exact amount, optional
 *      memo (Maya/THORChain), and the route expiry. The user copies these
 *      values and either (outbound, this milestone) constructs the deposit
 *      tx in another tool, or (inbound) sends from their external wallet.
 *
 * The actual broadcast for outbound deposits via zingolib is a future
 * milestone — for now the user is responsible for paying the address shown
 * here. The `SwapRecord` is already persisted on commit so the poller will
 * pick up the deposit once it lands on-chain.
 */
type ReviewSheetProps = {
  selectedRoute: RouteOptionType | null;
  quoteInput: QuoteInput | null;
  fiatValueBasis: FiatValueBasisType | null;
  direction: SwapDirectionEnum;
  /** Display symbol for the source asset (e.g. "ZEC" outbound). */
  sellSymbol: string;
  /** Display symbol for the destination asset (e.g. "BTC" outbound). */
  receiveSymbol: string;
  swapService: SwapService | null;
  /** Broadcast the outbound deposit via zingolib (LoadedApp owns the call).
   *  Not invoked for inbound swaps — the user pays from an external wallet.
   *  Returns broadcast tx hashes in chronological order. */
  sendSwapDeposit: (args: {
    depositAddress: string;
    amountAtomic: number;
    memoBytes?: Uint8Array;
    routeViaEphemeral?: boolean;
  }) => Promise<string[]>;
  translate: (key: string) => TranslateType;
  addLastSnackbar:
    | ((message: string, duration?: SnackbarDurationEnum) => void)
    | undefined;
  /** Fired exactly once per swap when the user dismisses the post-commit
   *  view. The Swap screen uses it to clear the per-intent form state
   *  (amount, address, live quote, ephemeral address) so the next
   *  interaction starts fresh. Direction and selected asset are preserved
   *  as user preferences and reset by the caller as it sees fit. */
  onSwapCompleted?: () => void;
  /** Notifies the parent every time the BottomSheetModal's index changes
   *  (`-1` = dismissed). The Swap screen uses this to pause its quote
   *  countdown while the user is reviewing, since the snapshot they're
   *  about to confirm is already pinned. */
  onSheetIndexChange?: (index: number) => void;
};

type PostCommitState = {
  record: SwapRecordType;
  instructions: DepositInstructionsType;
  /** Outbound only: txid returned by zingolib once the deposit is broadcast.
   *  When present, the post-commit view renders the success-with-txid layout
   *  instead of the "send these instructions" layout. */
  txId?: string;
};

const ReviewSheet = forwardRef<BottomSheetModal, ReviewSheetProps>(
  (
    {
      selectedRoute,
      quoteInput,
      fiatValueBasis,
      direction,
      sellSymbol,
      receiveSymbol,
      swapService,
      sendSwapDeposit,
      translate,
      addLastSnackbar,
      onSwapCompleted,
      onSheetIndexChange,
    },
    ref,
  ) => {
    const { colors } = useTheme() as ThemeType;
    const t = useCallback(
      (key: string, fallback: string): string =>
        (translate(key) as string) || fallback,
      [translate],
    );

    const [isCommitting, setIsCommitting] = useState<boolean>(false);
    const [postCommit, setPostCommit] = useState<PostCommitState | null>(null);

    const dismiss = useCallback(() => {
      (ref as React.RefObject<BottomSheetModal>)?.current?.dismiss();
    }, [ref]);

    // Reset internal state whenever the sheet closes so a new commit starts
    // clean, and so `postCommit` from a previous swap doesn't leak through if
    // the user re-opens the sheet for a different intent.
    const onSheetChange = useCallback(
      (index: number) => {
        if (index < 0) {
          setPostCommit(null);
          setIsCommitting(false);
        }
        onSheetIndexChange?.(index);
      },
      [onSheetIndexChange],
    );

    const renderBackdrop = useCallback(
      (props: BottomSheetBackdropProps) => (
        <BottomSheetBackdrop
          {...props}
          disappearsOnIndex={-1}
          appearsOnIndex={0}
          // While committing the network round-trip is mid-flight: pressing the
          // backdrop would leave the user not knowing whether the swap was
          // submitted. Gate the close on the post-commit state instead.
          pressBehavior={isCommitting ? 'none' : 'close'}
        />
      ),
      [isCommitting],
    );

    const onConfirm = useCallback(async () => {
      if (!swapService || !selectedRoute || !quoteInput || !fiatValueBasis) {
        addLastSnackbar?.(
          t('swap.review-missing', 'Swap context is incomplete'),
          SnackbarDurationEnum.long,
        );
        return;
      }
      setIsCommitting(true);

      // Step 1: reserve the route at SwapKit. After this the SwapRecord
      // exists locally regardless of whether the broadcast (step 2) goes
      // through — if step 2 fails the user can still see / pay the address.
      let commitResult: Awaited<ReturnType<SwapService['commitRoute']>>;
      try {
        commitResult = await swapService.commitRoute({
          quoteInput,
          chosenRoute: selectedRoute,
          direction,
          fiatValueBasis,
        });
      } catch (err) {
        const errMsg = err instanceof Error ? err.message : String(err);
        console.log('ReviewSheet.commitRoute failed:', errMsg, err);
        const label = t('swap.commit-error', 'Failed to start the swap');
        addLastSnackbar?.(`${label}: ${errMsg}`, SnackbarDurationEnum.long);
        setIsCommitting(false);
        return;
      }

      // Inbound stops here: the user pays from an external wallet, so the
      // sheet now renders the deposit-instructions view and waits.
      if (direction !== SwapDirectionEnum.Outbound) {
        setPostCommit({
          record: commitResult.record,
          instructions: commitResult.instructions,
        });
        setIsCommitting(false);
        return;
      }

      // Step 2: outbound — broadcast the deposit via zingolib. Convert the
      // human-decimal amount (e.g. "0.05") to zatoshis. Math.round avoids the
      // floating-point ULP drift of `* 1e8` on the boundary cases that bite
      // any wallet doing currency math in JS.
      const amountAtomic = Math.round(
        parseFloat(commitResult.instructions.amountHumanDecimal) * 1e8,
      );
      // Mayachain / THORChain derive the refund destination from the on-chain
      // `from_address` of the inbound deposit. A shielded source has no
      // observable `from_address` and the OP_RETURN memo cap (~80 bytes) is
      // too tight to encode a `/REFUNDADDR` clause, so we force a ZIP-320
      // two-hop send (shielded → wallet ephemeral t-addr → vault) and let
      // the protocol observe the ephemeral. NEAR Intents / Flashnet bind
      // refunds to the per-quote deposit address itself, so they don't need
      // this and a direct single-hop send is cheaper.
      const provider = commitResult.instructions.provider;
      const routeViaEphemeral =
        provider === SwapKitProviderEnum.MayachainStreaming ||
        provider === SwapKitProviderEnum.ThorchainStreaming;

      try {
        const txIds = await sendSwapDeposit({
          depositAddress: commitResult.instructions.depositAddress,
          amountAtomic,
          memoBytes: commitResult.instructions.memoBytes,
          routeViaEphemeral,
        });
        // For a single-hop send `txIds.length === 1` and `txIds[0]` is the
        // deposit tx. For the ZIP-320 two-hop send (`routeViaEphemeral`
        // path, used for Maya / THORChain) zingolib emits the steps in
        // chronological order: `txIds[0]` is shielded → ephemeral,
        // `txIds[1]` is ephemeral → vault — the latter is what the
        // provider observes and what `/track` keys on. Murphy-proofing
        // note: this picks the LAST txid regardless of array length, so
        // a future zingolib change that adds intermediate steps would
        // still correctly select the final tx; only a reordering that
        // moves the deposit tx away from the last slot would break it,
        // which would require an explicit refactor of zingolib's
        // `calculate_transactions`.
        const depositTxId = txIds[txIds.length - 1];
        // Persist the deposit bookkeeping so the poller / activity list
        // see the right hash; record every txid produced so the activity
        // history can render the full proposal chronology later.
        const updatedRecord = await swapService.markBroadcasted({
          recordId: commitResult.record.recordId,
          txId: depositTxId,
          allTxIds: txIds,
        });
        setPostCommit({
          record: updatedRecord,
          instructions: commitResult.instructions,
          txId: depositTxId,
        });
      } catch (err) {
        const errMsg = err instanceof Error ? err.message : String(err);
        console.log('ReviewSheet.sendSwapDeposit failed:', errMsg, err);
        const label = t(
          'swap.broadcast-error',
          'Failed to broadcast the deposit',
        );
        addLastSnackbar?.(`${label}: ${errMsg}`, SnackbarDurationEnum.long);
        // Fall back to showing the deposit instructions so the user can
        // still pay manually (or retry later from the activity list).
        setPostCommit({
          record: commitResult.record,
          instructions: commitResult.instructions,
        });
      } finally {
        setIsCommitting(false);
      }
    }, [
      swapService,
      selectedRoute,
      quoteInput,
      fiatValueBasis,
      direction,
      sendSwapDeposit,
      addLastSnackbar,
      t,
    ]);

    const copyText = useCallback(
      (value: string, what: string) => {
        if (!value) return;
        Clipboard.setString(value);
        addLastSnackbar?.(
          `${what} ${t('swap.copied', 'copied to clipboard')}`,
          SnackbarDurationEnum.short,
        );
      },
      [addLastSnackbar, t],
    );

    const handle = useMemo(
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
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <View style={{ width: 48 }} />
            <BoldText
              numberOfLines={1}
              style={{ flex: 1, textAlign: 'center', color: colors.text }}
            >
              {postCommit
                ? t('swap.deposit-instructions-title', 'Deposit instructions')
                : t('swap.review-title', 'Review swap')}
            </BoldText>
            <Pressable
              onPress={dismiss}
              disabled={isCommitting}
              accessibilityRole="button"
              hitSlop={8}
              style={{ padding: 14, opacity: isCommitting ? 0.4 : 1 }}
            >
              <FontAwesomeIcon icon={faXmark} size={20} color={colors.text} />
            </Pressable>
          </View>
        </View>
      ),
      [colors, dismiss, isCommitting, postCommit, t],
    );

    return (
      <BottomSheetModal
        ref={ref}
        index={0}
        snapPoints={SNAP_POINTS}
        enableDynamicSizing={false}
        enablePanDownToClose={!isCommitting}
        keyboardBehavior="extend"
        keyboardBlurBehavior="restore"
        backdropComponent={renderBackdrop}
        handleComponent={() => handle}
        backgroundStyle={{
          backgroundColor: colors.bottomSheetBackground,
        }}
        onChange={onSheetChange}
      >
        <BottomSheetScrollView
          contentContainerStyle={{
            paddingHorizontal: 16,
            paddingBottom: 24,
          }}
          style={{ backgroundColor: colors.bottomSheetBackground }}
        >
          {postCommit ? (
            <PostCommitView
              instructions={postCommit.instructions}
              record={postCommit.record}
              txId={postCommit.txId}
              colors={colors}
              t={t}
              copyText={copyText}
              // Notify the parent screen that the swap intent has been fully
              // resolved (record persisted, txid surfaced, user acknowledged)
              // BEFORE dismissing the sheet. Parent uses this signal to clear
              // its per-intent form state so the next swap starts on an empty
              // form rather than the stale values from the swap just shipped.
              onDone={() => {
                onSwapCompleted?.();
                dismiss();
              }}
            />
          ) : (
            <ReviewView
              selectedRoute={selectedRoute}
              quoteInput={quoteInput}
              fiatValueBasis={fiatValueBasis}
              direction={direction}
              sellSymbol={sellSymbol}
              receiveSymbol={receiveSymbol}
              isCommitting={isCommitting}
              colors={colors}
              t={t}
              onConfirm={onConfirm}
              copyText={copyText}
            />
          )}
        </BottomSheetScrollView>
      </BottomSheetModal>
    );
  },
);

ReviewSheet.displayName = 'ReviewSheet';
export default ReviewSheet;

// Module-level so the array reference is stable across renders — the sheet
// rejects an inline `[ '95%' ]` because of equality checks inside the lib.
const SNAP_POINTS = ['95%'];

type ColorsType = ThemeType['colors'];
type TFn = (key: string, fallback: string) => string;
type CopyFn = (value: string, what: string) => void;

function ReviewView(props: {
  selectedRoute: RouteOptionType | null;
  quoteInput: QuoteInput | null;
  fiatValueBasis: FiatValueBasisType | null;
  direction: SwapDirectionEnum;
  sellSymbol: string;
  receiveSymbol: string;
  isCommitting: boolean;
  colors: ColorsType;
  t: TFn;
  onConfirm: () => void;
  copyText: CopyFn;
}): React.ReactElement {
  const {
    selectedRoute,
    quoteInput,
    fiatValueBasis,
    direction,
    sellSymbol,
    receiveSymbol,
    isCommitting,
    colors,
    t,
    onConfirm,
    copyText,
  } = props;

  if (!selectedRoute || !quoteInput || !fiatValueBasis) {
    return (
      <View style={{ paddingVertical: 32, alignItems: 'center' }}>
        <FadeText>{t('swap.review-empty', 'No quote selected.')}</FadeText>
      </View>
    );
  }

  const sellAmount = quoteInput.sellAmountHumanDecimal;
  const receiveAmount = selectedRoute.expectedReceiveAmount;
  const rateText = (() => {
    const sell = parseFloat(sellAmount);
    const receive = parseFloat(receiveAmount);
    if (!Number.isFinite(sell) || sell <= 0) return '—';
    if (!Number.isFinite(receive) || receive <= 0) return '—';
    // Compute from the user's perspective so the label `1 sell ≈ X receive`
    // reads literally in both directions: outbound (ZEC → USDT) yields
    // USDT-per-ZEC (a large number); inbound (USDT → ZEC) yields
    // ZEC-per-USDT (a tiny number). The previous code always produced
    // non-ZEC-per-ZEC and labelled it inverted on inbound — surfacing a
    // headline rate that was off by orders of magnitude.
    const perSell = receive / sell;
    const decimals = perSell >= 1 ? 4 : 8;
    return perSell.toFixed(decimals);
  })();
  // The sourceAddress is the refund destination on outbound (our ephemeral
  // t-addr) — surfacing it lets the user verify before committing. On inbound
  // it's the user's own external address, also worth confirming.
  const refundAddress = quoteInput.sourceAddress;
  const sellUsd = fiatValueBasis.sellUsdUnitPrice * parseFloat(sellAmount);
  const receiveUsd =
    fiatValueBasis.receiveUsdUnitPrice * parseFloat(receiveAmount);

  return (
    <View style={{ rowGap: 12, paddingTop: 16 }}>
      <SummaryRow
        colors={colors}
        label={t('swap.you-send', 'You send')}
        primary={`${sellAmount} ${sellSymbol}`}
        secondary={
          fiatValueBasis.sellUsdUnitPrice > 0
            ? `≈ $${sellUsd.toFixed(2)}`
            : undefined
        }
      />
      <SummaryRow
        colors={colors}
        label={t('swap.you-receive', 'You receive')}
        primary={`${receiveAmount} ${receiveSymbol}`}
        secondary={
          fiatValueBasis.receiveUsdUnitPrice > 0
            ? `≈ $${receiveUsd.toFixed(2)}`
            : undefined
        }
      />
      <SummaryRow
        colors={colors}
        label={t('swap.rate', 'Rate')}
        primary={`1 ${sellSymbol} ≈ ${rateText} ${receiveSymbol}`}
      />
      <SummaryRow
        colors={colors}
        label={t('swap.provider', 'Provider')}
        primary={providerLongLabel(selectedRoute.provider)}
      />
      {selectedRoute.estimatedTimeText && (
        <SummaryRow
          colors={colors}
          label={t('swap.estimated-time', 'Estimated time')}
          primary={selectedRoute.estimatedTimeText}
        />
      )}
      {selectedRoute.warningsText && (
        <View
          style={[
            styles.warningBanner,
            { backgroundColor: colors.warning.background },
          ]}
        >
          <FontAwesomeIcon
            icon={faExclamationTriangle}
            size={14}
            color={colors.warning.text}
          />
          <RegText
            style={{
              ...styles.warningText,
              color: colors.warning.text,
            }}
          >
            {selectedRoute.warningsText}
          </RegText>
        </View>
      )}
      <AddressLine
        colors={colors}
        label={
          direction === SwapDirectionEnum.Outbound
            ? t('swap.refund-destination', 'Refund destination')
            : t('swap.your-deposit-source', 'Your deposit source')
        }
        address={refundAddress}
        onCopy={() => copyText(refundAddress, t('swap.address', 'Address'))}
        t={t}
      />

      <Pressable
        onPress={onConfirm}
        disabled={isCommitting}
        accessibilityRole="button"
        style={[
          styles.cta,
          {
            backgroundColor: isCommitting
              ? colors.primaryDisabled
              : colors.primary,
          },
        ]}
        testID="swap.review.confirm"
      >
        {isCommitting ? (
          <ActivityIndicator color={colors.background} />
        ) : (
          <BoldText style={{ ...styles.ctaText, color: colors.background }}>
            {direction === SwapDirectionEnum.Outbound
              ? t('swap.confirm-outbound', 'Send swap')
              : t('swap.confirm-inbound', 'Get deposit address')}
          </BoldText>
        )}
      </Pressable>
    </View>
  );
}

/**
 * QR + deep-link block that condenses the entire deposit instruction set
 * (vault address, exact amount, hex-encoded Maya/THORChain memo) into one
 * scannable EIP-681 URI for EVM source chains. Rendered above the manual
 * AddressLines so the user's first option is "scan or tap once" rather
 * than "copy three things in order".
 *
 * For non-EVM source chains the block returns null and the existing
 * manual flow remains the sole surface. BIP-21 for UTXO does not encode
 * the OP_RETURN memo, so emitting a partial URI there would mislead the
 * user into thinking the QR carries everything when it does not — a
 * silent step worse than the current explicit copy flow. UTXO QR is
 * tracked separately in the backlog with the memo-handling work it needs.
 */
function PaymentUriBlock(props: {
  uri: string;
  colors: ColorsType;
  t: TFn;
}): React.ReactElement {
  const { uri, colors, t } = props;
  const openInWallet = React.useCallback(async () => {
    try {
      const supported = await Linking.canOpenURL(uri);
      if (supported) await Linking.openURL(uri);
    } catch (err) {
      // Silently swallow — the user still has the QR + manual rows
      // below as fallback paths.
      const msg = err instanceof Error ? err.message : String(err);
      console.log('PaymentUriBlock: openURL failed:', msg);
    }
  }, [uri]);

  return (
    <View
      style={{
        alignItems: 'center',
        paddingVertical: 12,
        paddingHorizontal: 12,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: colors.border,
        backgroundColor: colors.bottomSheetBackground,
        rowGap: 10,
      }}
    >
      <View
        style={{
          padding: 8,
          backgroundColor: colors.text,
          borderRadius: 8,
        }}
      >
        <QRCode
          value={uri}
          size={180}
          ecl="M"
          backgroundColor={colors.text}
          color={colors.background}
        />
      </View>
      <FadeText
        style={{
          fontSize: 11,
          textAlign: 'center',
          paddingHorizontal: 8,
        }}
      >
        {t(
          'swap.payment-uri-hint',
          'Scan this from any wallet that supports payment URIs, or tap below to open the wallet on this device. Everything (address, amount, memo) is included.',
        )}
      </FadeText>
      <Pressable
        onPress={openInWallet}
        accessibilityRole="button"
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          paddingVertical: 8,
          paddingHorizontal: 14,
          borderRadius: 8,
          borderWidth: 1,
          borderColor: colors.primary,
        }}
      >
        <FontAwesomeIcon
          icon={faExternalLinkAlt}
          size={14}
          color={colors.primary}
          style={{ marginRight: 8 }}
        />
        <BoldText style={{ color: colors.primary, fontSize: 13 }}>
          {t('swap.payment-uri-open', 'Open in wallet')}
        </BoldText>
      </Pressable>
    </View>
  );
}

function PostCommitView(props: {
  instructions: DepositInstructionsType;
  record: SwapRecordType;
  txId?: string;
  colors: ColorsType;
  t: TFn;
  copyText: CopyFn;
  onDone: () => void;
}): React.ReactElement {
  const { instructions, record, txId, colors, t, copyText, onDone } = props;
  const memoText = instructions.memoText;
  const showMemoWarning =
    instructions.provider === SwapKitProviderEnum.MayachainStreaming ||
    instructions.provider === SwapKitProviderEnum.ThorchainStreaming;

  // When zingolib has broadcast the outbound deposit we hide the
  // pay-this-address layout: the user does not need to do anything more.
  // Show the txid + a short status note instead.
  if (txId) {
    return (
      <View style={{ rowGap: 12, paddingTop: 16 }}>
        <View style={{ alignItems: 'center', paddingVertical: 12 }}>
          <FontAwesomeIcon icon={faCheck} size={28} color={colors.primary} />
          <BoldText
            style={{
              color: colors.text,
              fontSize: 16,
              marginTop: 8,
              textAlign: 'center',
            }}
          >
            {t('swap.broadcast-success', 'Deposit broadcast')}
          </BoldText>
          <FadeText style={{ marginTop: 4, textAlign: 'center', fontSize: 12 }}>
            {t(
              'swap.broadcast-tracking-note',
              'The provider will release the destination asset once the deposit confirms. Progress updates automatically.',
            )}
          </FadeText>
        </View>
        <AddressLine
          colors={colors}
          label={t('swap.tx-hash', 'Transaction hash')}
          address={txId}
          onCopy={() => copyText(txId, t('swap.tx-hash', 'Transaction hash'))}
          t={t}
          emphasize
        />
        <SummaryRow
          colors={colors}
          label={t('swap.you-sent', 'You sent')}
          primary={`${instructions.amountHumanDecimal} ${
            record.sellAsset.ticker ?? record.sellAsset.symbol
          }`}
        />
        <SummaryRow
          colors={colors}
          label={t('swap.expected-receive', 'Expected to receive')}
          primary={`${record.expectedReceiveAmount} ${
            // Use the clean ticker, falling back to symbol only when the
            // catalog omits a ticker. Mirrors the "You sent" row above.
            // The previous `symbol`-only version was emitting noise like
            // `USDT-TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t` for TRON USDT — the
            // contract-address suffix is information the user already
            // committed to via the asset picker, not something the
            // confirmation row needs to repeat verbatim.
            record.receiveAsset.ticker ?? record.receiveAsset.symbol
          }`}
        />

        <Pressable
          onPress={onDone}
          accessibilityRole="button"
          style={[styles.cta, { backgroundColor: colors.primary }]}
          testID="swap.review.done"
        >
          <BoldText style={{ ...styles.ctaText, color: colors.background }}>
            {t('swap.done', 'Done')}
          </BoldText>
        </Pressable>
      </View>
    );
  }

  // Build the EIP-681 payment URI once per render. Returns null for
  // non-EVM source chains (UTXO/Cosmos/etc.) where we lack a clean way to
  // encode the memo — those keep the manual flow only.
  const paymentUri = memoText
    ? buildEip681Uri({
        chain: record.sellAsset.chain,
        chainId: record.sellAsset.chainId,
        decimals: record.sellAsset.decimals,
        vaultAddress: instructions.depositAddress,
        amountHumanDecimal: instructions.amountHumanDecimal,
        memoHexWithPrefix: memoToHexCalldata(memoText),
      })
    : null;

  return (
    <View style={{ rowGap: 12, paddingTop: 16 }}>
      {paymentUri ? (
        <PaymentUriBlock uri={paymentUri} colors={colors} t={t} />
      ) : null}
      <AddressLine
        colors={colors}
        label={t('swap.deposit-address', 'Deposit address')}
        address={instructions.depositAddress}
        onCopy={() =>
          copyText(
            instructions.depositAddress,
            t('swap.deposit-address', 'Deposit address'),
          )
        }
        t={t}
        emphasize
      />
      <AddressLine
        colors={colors}
        label={t('swap.exact-amount', 'Exact amount')}
        // Deposit instructions: the user is about to pay from an external
        // wallet, which shows assets by ticker — using the catalog's long
        // form here (e.g. `USDC-17208628…`) is noise. Fall back to `symbol`
        // only when the catalog didn't supply a clean ticker.
        address={`${instructions.amountHumanDecimal} ${
          record.sellAsset.ticker ?? record.sellAsset.symbol
        }`}
        onCopy={() =>
          copyText(instructions.amountHumanDecimal, t('swap.amount', 'Amount'))
        }
        t={t}
      />
      {/* Channel-based providers (NEAR Intents, Flashnet) mint a deposit
          address bound to an exact expected amount; if even a satoshi
          less arrives, the channel refunds without swapping. Many wallets
          have UX defaults that violate this (subtract-fee-from-amount,
          send-max rounding, low-precision input fields). Surface a
          strong warning under the Exact-amount row for these providers,
          plus a UTXO-specific hint when the source chain is BTC/UTXO
          because that is where the subtract-fee-from-amount pattern is
          most common.  Maya / THORChain swaps are tolerant of small
          over/under-payment so the warning is skipped for those. */}
      {requiresExactAmountWarning(record) ? (
        <View
          style={[
            styles.warningBanner,
            { backgroundColor: colors.warning.background },
          ]}
        >
          <FontAwesomeIcon
            icon={faExclamationTriangle}
            size={14}
            color={colors.warning.text}
          />
          <RegText
            style={{
              ...styles.warningText,
              color: colors.warning.text,
            }}
          >
            {exactAmountWarningText(record.sellAsset.chain, t)}
          </RegText>
        </View>
      ) : null}
      {memoText ? (
        <View style={{ rowGap: 6 }}>
          <AddressLine
            colors={colors}
            label={t('swap.memo', 'Memo')}
            address={memoText}
            onCopy={() => copyText(memoText, t('swap.memo', 'Memo'))}
            t={t}
          />
          {/* For EVM source chains the user has to paste the memo into the
              wallet's hex data field as a 0x-prefixed hex blob, not as the
              raw ASCII string. Render the pre-encoded value so the user
              can tap-copy it straight into the wallet's hex-data slot
              without having to convert it by hand. Skipping when the
              chain has its own native memo slot (UTXO OP_RETURN / Cosmos
              memo) — the raw `memo` line above is sufficient there. */}
          {isEvmSourceChain(record.sellAsset.chain) ? (
            <AddressLine
              colors={colors}
              label={t('swap.memo-hex-label', 'Memo (hex calldata)')}
              address={memoToHexCalldata(memoText)}
              onCopy={() =>
                copyText(
                  memoToHexCalldata(memoText),
                  t('swap.memo-hex-label', 'Memo (hex calldata)'),
                )
              }
              t={t}
            />
          ) : null}
          {showMemoWarning && (
            <View
              style={[
                styles.warningBanner,
                { backgroundColor: colors.warning.background },
              ]}
            >
              <FontAwesomeIcon
                icon={faExclamationTriangle}
                size={14}
                color={colors.warning.text}
              />
              <RegText
                style={{
                  ...styles.warningText,
                  color: colors.warning.text,
                }}
              >
                {/* The memo lives in different parts of the source-chain
                    transaction depending on the chain. ZEC / BTC / LTC /
                    BCH / DOGE / DASH expose an OP_RETURN-style null-data
                    output; EVM chains (ETH / AVAX / BSC / etc.) carry it
                    in the transaction `data` field; other chains have
                    their own conventions. Pick the right copy at render
                    time so the user is not told to use OP_RETURN on an
                    EVM source (the previous wording made a real swap
                    fail because the user sent ETH with an empty `data`
                    field, which is the default for most EVM wallets). */}
                {memoFieldHintForChain(record.sellAsset.chain, t)}
              </RegText>
            </View>
          )}
        </View>
      ) : null}
      {instructions.expiresAtMs ? (
        <SummaryRow
          colors={colors}
          label={t('swap.send-before', 'Send before')}
          primary={new Date(instructions.expiresAtMs).toLocaleString()}
        />
      ) : null}

      <Pressable
        onPress={onDone}
        accessibilityRole="button"
        style={[styles.cta, { backgroundColor: colors.primary }]}
        testID="swap.review.done"
      >
        <BoldText style={{ ...styles.ctaText, color: colors.background }}>
          {t('swap.done', 'Done')}
        </BoldText>
      </Pressable>
    </View>
  );
}

function SummaryRow(props: {
  colors: ColorsType;
  label: string;
  primary: string;
  secondary?: string;
}): React.ReactElement {
  const { colors, label, primary, secondary } = props;
  return (
    <View style={[styles.summaryRow, { borderColor: colors.border }]}>
      <FadeText style={styles.summaryLabel}>{label}</FadeText>
      <View style={{ alignItems: 'flex-end' }}>
        <BoldText style={{ color: colors.text }}>{primary}</BoldText>
        {secondary ? (
          <FadeText style={styles.summarySecondary}>{secondary}</FadeText>
        ) : null}
      </View>
    </View>
  );
}

function AddressLine(props: {
  colors: ColorsType;
  label: string;
  address: string;
  onCopy: () => void;
  t: TFn;
  emphasize?: boolean;
}): React.ReactElement {
  const { colors, label, address, onCopy, t, emphasize } = props;
  const [justCopied, setJustCopied] = useState<boolean>(false);

  useEffect(() => {
    if (!justCopied) return;
    const timeout = setTimeout(() => setJustCopied(false), 1500);
    return () => clearTimeout(timeout);
  }, [justCopied]);

  const handleCopy = useCallback(() => {
    onCopy();
    setJustCopied(true);
  }, [onCopy]);

  return (
    <View
      style={[
        styles.addressBlock,
        {
          borderColor: colors.border,
          backgroundColor: colors.bottomSheetBackground,
        },
      ]}
    >
      <FadeText style={styles.addressLabel}>{label}</FadeText>
      <View style={styles.addressRow}>
        <RegText
          style={{
            ...styles.addressValue,
            color: colors.text,
            fontSize: emphasize ? 14 : 13,
          }}
          selectable
        >
          {address}
        </RegText>
        <Pressable
          onPress={handleCopy}
          accessibilityRole="button"
          accessibilityLabel={t('swap.copy', 'Copy')}
          hitSlop={8}
          style={styles.copyBtn}
        >
          <FontAwesomeIcon
            icon={justCopied ? faCheck : faCopy}
            size={16}
            color={justCopied ? colors.primary : colors.text}
          />
        </Pressable>
      </View>
    </View>
  );
}

/**
 * Render the per-chain hint for where the Maya / THORChain memo must be
 * carried on the source-chain transaction. Returns the localised string the
 * memo-required banner shows below the memo block.
 *
 * The hint is conditional on the chain because each base layer exposes a
 * different "free bytes" slot:
 *
 *   - **UTXO chains** (BTC, BCH, LTC, DOGE, DASH, ZEC): the memo goes in a
 *     transparent `OP_RETURN` null-data output. Same hint we shipped first.
 *   - **EVM chains** (ETH, AVAX, BSC, MATIC, BASE, ARB, OP, FTM, GNOSIS,
 *     KAVA, LINEA, MNT, BERA, CRO, XLAYER): the memo goes in the
 *     transaction `data` (calldata) field as hex. Most EVM wallets hide
 *     this behind an Advanced section; some cross-chain-aware wallets
 *     surface it natively.
 *   - **Other / unknown**: fall back to the chain-agnostic phrasing
 *     ("attach this memo to the deposit transaction"). Better generic than
 *     misleading.
 *
 * Why this is critical: an earlier mainnet test (2026-06-27, 0.001 ETH to
 * deposit 0x6a16f961…) failed precisely because the banner said
 * "OP_RETURN" while the user was sending from an EVM wallet. The funds
 * landed at Maya's vault with no memo and required a refund cycle to come
 * back.
 */
// EVM / UTXO chain lists, hex memo encoder, base-units conversion and the
// EIP-681 URI builder all live in `app/swap/chainMemoEncoding.ts` so the
// commit sheet (this file) and the SwapDetail screen render the same
// deposit instructions without duplicating the rules.

/**
 * Whether the deposit instructions for this record need to surface a
 * strong "exact amount" warning. Applies to inbound swaps via providers
 * that mint a per-quote deposit channel keyed to a single expected
 * amount — currently NEAR Intents and Flashnet. Maya/THORChain are
 * tolerant of small over/under-payment and route what arrives, so the
 * warning is intentionally NOT shown for those.
 *
 * Why this exists: a real refund on 2026-06-29 happened because the
 * source-chain wallet deducted its network fee from the user-typed
 * amount instead of adding it on top, so the channel received less than
 * its quoted minimum and the swap refunded automatically. The warning
 * makes that failure mode explicit BEFORE the user pays, not after.
 */
function requiresExactAmountWarning(record: SwapRecordType): boolean {
  if (record.direction !== SwapDirectionEnum.Inbound) return false;
  return (
    record.provider === SwapKitProviderEnum.Near ||
    record.provider === SwapKitProviderEnum.Flashnet
  );
}

/**
 * Localised warning copy for the exact-amount banner. UTXO source chains
 * get an additional sentence about the subtract-fee-from-amount setting
 * because that is the most common foot-gun there; EVM and other source
 * chains get the generic version which still nails the key point ("send
 * exactly this amount, do not let your wallet adjust it").
 */
function exactAmountWarningText(
  chain: string,
  t: (key: string, fallback: string) => string,
): string {
  if (isUtxoSourceChain(chain)) {
    return t(
      'swap.exact-amount-warning-utxo',
      'Send EXACTLY this amount. Do not let your wallet subtract the network fee from it (turn off any "subtract fee from amount" / "send max" option). If less than this amount arrives, the provider will refund without swapping.',
    );
  }
  return t(
    'swap.exact-amount-warning',
    'Send EXACTLY this amount. Do not let your wallet adjust it for fees or rounding. If less than this amount arrives, the provider will refund without swapping.',
  );
}

function memoFieldHintForChain(
  chain: string,
  t: (key: string, fallback: string) => string,
): string {
  const c = chain.toUpperCase();
  if (EVM_SOURCE_CHAINS.includes(c)) {
    return t(
      'swap.memo-required-warning-evm',
      'This memo is required. Send the transaction with this exact value in the data (calldata) field — most wallets expose it under an Advanced or similar section, sometimes natively for cross-chain payments. Most wallets default the data field to empty, in which case the provider cannot route the swap and your funds will be stuck pending refund.',
    );
  }
  if (UTXO_SOURCE_CHAINS.includes(c)) {
    return t(
      'swap.memo-required-warning-utxo',
      'This memo is required. The deposit transaction must include it in an OP_RETURN output, or the provider cannot route the swap and your funds will be stuck pending refund.',
    );
  }
  return t(
    'swap.memo-required-warning',
    'This memo is required. Attach it to the deposit transaction using whatever memo / data mechanism your wallet provides on this chain; if the provider does not see it, your funds will be stuck pending refund.',
  );
}

const styles = StyleSheet.create({
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  summaryLabel: {
    fontSize: 13,
  },
  summarySecondary: {
    fontSize: 11,
    marginTop: 2,
  },
  warningBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 10,
    borderRadius: 10,
    columnGap: 8,
  },
  warningText: {
    fontSize: 12,
    flex: 1,
  },
  addressBlock: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 12,
    rowGap: 4,
  },
  addressLabel: {
    fontSize: 12,
  },
  addressRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    columnGap: 12,
  },
  addressValue: {
    flex: 1,
    fontFamily: 'monospace',
  },
  copyBtn: {
    padding: 4,
  },
  cta: {
    marginTop: 8,
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ctaText: {
    fontSize: 16,
  },
});
