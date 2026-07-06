/* eslint-disable react-native/no-inline-styles */
import React, {
  forwardRef,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  Keyboard,
  Linking,
  Pressable,
  TouchableOpacity,
  View,
} from 'react-native';
import {
  NavigationProp,
  ParamListBase,
  useNavigation,
  useTheme,
} from '@react-navigation/native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import Clipboard from '@react-native-clipboard/clipboard';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import {
  faChevronDown,
  faChevronLeft,
  faChevronRight,
  faChevronUp,
  faCopy,
  faExternalLinkAlt,
  faXmark,
} from '@fortawesome/free-solid-svg-icons';
import BottomSheet, {
  BottomSheetBackdrop,
  BottomSheetBackdropProps,
  BottomSheetModal,
  BottomSheetScrollView,
} from '@gorhom/bottom-sheet';

import {
  BlockExplorerEnum,
  ButtonTypeEnum,
  ChainNameEnum,
  LanguageEnum,
  RouteEnum,
  ScreenEnum,
  SnackbarDurationEnum,
} from '../../app/AppState';
import { ContextAppLoaded } from '../../app/context';
import { useFullSheetSnapPoints } from '../../app/hooks/useFullSheetSnapPoints';
import { showConfirm } from '../../app/showConfirm';
import {
  SwapDirectionEnum,
  SwapKitProviderEnum,
  SwapRecordType,
  SwapStatusEnum,
  SwapStore,
  formatAmountForDisplay,
} from '../../app/swap';
import { FiatValueBasisType } from '../../app/swap/types/FiatValueBasisType';
import { SwapAssetType } from '../../app/swap/types/SwapAssetType';
import { isRealLegHash } from '../../app/swap/providers/trackUpdateBase';
import { swapStatusLabel } from '../../app/swap/swapStatusLabel';
import {
  isEvmSourceChain,
  memoToHexCalldata,
} from '../../app/swap/chainMemoEncoding';
import { AppDrawerParamList, ThemeType } from '../../app/types';
import Utils from '../../app/utils';

import Header from '../Header';
import BoldText from '../Components/BoldText';
import Button from '../Components/Button';
import FadeText from '../Components/FadeText';
import RegText from '../Components/RegText';

import { providerLongLabel } from './components/providerLabels';

type SwapDetailProps = NativeStackScreenProps<
  AppDrawerParamList,
  RouteEnum.SwapDetail
>;

/**
 * Per-swap detail screen, mirroring the shape of `ValueTransferDetail` but
 * populated from a `SwapRecord` rather than a zingolib value transfer.
 *
 * Design:
 *   - Params carry only `recordId` (see `SwapDetailNavigationState`). The
 *     actual record is read from `context.swapRecords` on every render so
 *     poller-driven updates surface immediately while the sheet is open.
 *   - Layout follows VTD: header chevron, full-sheet BottomSheet, scrollable
 *     content, status block at the top, structured rows below.
 *   - No up/down record navigator in v1 — swaps are sparse compared to VTs
 *     and the navigator's value-add for adjacent swaps is questionable.
 *   - Single action affordance: `Remove`. Calls `SwapStore.deleteByRecordId`
 *     and bounces back to History so the user is not stuck on a deleted
 *     record. Retry-broadcast is a separate workstream (the proposal
 *     resurrection is non-trivial).
 *   - "Tracking" button opens the SwapKit explorer URL when we have any
 *     hash to key on; the source-chain hash is preferred (matches the
 *     dashboard's primary lookup), with the destination hash as fallback.
 */
const SwapDetail: React.FunctionComponent<SwapDetailProps> = ({ route }) => {
  const navigation = useNavigation<NavigationProp<ParamListBase>>();
  const context = useContext(ContextAppLoaded);
  const {
    translate,
    language,
    addLastSnackbar,
    setPrivacyOption,
    swapRecords,
    server,
    blockExplorer,
  } = context;
  const { colors } = useTheme() as ThemeType;
  const screenName = ScreenEnum.ValueTransferDetail;

  // Mirror VTD's navigator state: the slice + current index live in local
  // state so the up/down chevrons can step without re-routing. `recordIds`
  // never mutates after mount — it is a snapshot of the History view at
  // tap time. The current record is then derived live from `swapRecords`
  // (Phase 5 listener) using the recordId at `index`, so poller-driven
  // mutations of the displayed record surface immediately even though the
  // slice itself is frozen.
  const initialIndex = route.params?.index ?? 0;
  const initialRecordIds = useMemo(
    () => route.params?.recordIds ?? [],
    [route.params?.recordIds],
  );
  const initialTotalLength = route.params?.totalLength ?? 0;
  const [recordIdIndex, setRecordIdIndex] = useState<number>(initialIndex);
  const [recordIds, setRecordIds] = useState<string[]>(initialRecordIds);
  const [totalLength, setTotalLength] = useState<number>(initialTotalLength);
  // Sync the local nav state when navigation hands us new params (back/forward
  // through the stack reuses the same component instance).
  React.useEffect(() => {
    setRecordIdIndex(route.params?.index ?? 0);
    setRecordIds(route.params?.recordIds ?? []);
    setTotalLength(route.params?.totalLength ?? 0);
  }, [route.params?.index, route.params?.recordIds, route.params?.totalLength]);

  const currentRecordId = recordIds[recordIdIndex] ?? '';
  const record: SwapRecordType | undefined = useMemo(
    () => swapRecords?.find(r => r.recordId === currentRecordId),
    [currentRecordId, swapRecords],
  );

  const moveDetail = useCallback(
    (delta: -1 | 1) => {
      const next = recordIdIndex + delta;
      if (next < 0 || next >= recordIds.length) return;
      setRecordIdIndex(next);
    },
    [recordIdIndex, recordIds.length],
  );

  // Hide the navigator when the underlying list size has changed since
  // mount — same defensive pattern VTD uses to avoid the index pointing at
  // the wrong row after a background sync inserted new items.
  const [showNavigator, setShowNavigator] = useState<boolean>(true);
  const isFirstMount = useRef(true);
  React.useEffect(() => {
    if (isFirstMount.current) {
      isFirstMount.current = false;
      return;
    }
    if (showNavigator) setShowNavigator(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [totalLength]);

  const [containerH, setContainerH] = useState<number>(0);
  const [headerH, setHeaderH] = useState<number>(0);
  const sheetRef = useRef<BottomSheet>(null);
  const snapPoints = useFullSheetSnapPoints(containerH, headerH);

  const closeScreen = useCallback(() => {
    if (navigation.canGoBack()) navigation.goBack();
  }, [navigation]);

  const copyToClipboard = useCallback(
    (value: string, snackbarKey: string) => {
      Clipboard.setString(value);
      addLastSnackbar(
        translate(snackbarKey) as string,
        SnackbarDurationEnum.short,
      );
    },
    [addLastSnackbar, translate],
  );

  const handleRemove = useCallback(() => {
    if (!record) return;
    // Pre-payment states get an explicit warning that the user might lose
    // tracking of an in-flight swap. Terminal-non-success states get the
    // plain confirmation. `Completed`/`Pending`/`Processing` don't reach
    // here because the button is hidden when `canRemoveSwap` returns false.
    const messageKey = isPrePaymentStatus(record.status)
      ? 'swapdetail.remove-message-prepay'
      : 'swapdetail.remove-message';
    showConfirm({
      title: translate('swapdetail.remove-title') as string,
      message: translate(messageKey) as string,
      buttons: [
        {
          text: translate('confirm') as string,
          onPress: async () => {
            try {
              await SwapStore.deleteByRecordId(record.recordId);
              if (navigation.canGoBack()) navigation.goBack();
            } catch (err) {
              const msg = err instanceof Error ? err.message : String(err);
              console.log('SwapDetail: deleteByRecordId failed:', msg);
              addLastSnackbar(
                translate('swapdetail.remove-failed') as string,
                SnackbarDurationEnum.short,
              );
            }
          },
        },
        { text: translate('cancel') as string, style: 'cancel' },
      ],
    });
  }, [record, navigation, addLastSnackbar, translate]);

  // Layered modal sheet that pops on top of the SwapDetail BottomSheet to
  // show the per-type fee breakdown. We use BottomSheetModal (registered
  // under the global BottomSheetModalProvider in LoadingApp) so the parent
  // sheet's pan-down-to-close gesture does not interfere with the modal's
  // own backdrop dismiss.
  const feesBreakdownRef = useRef<BottomSheetModal>(null);
  const openFeesBreakdown = useCallback(() => {
    feesBreakdownRef.current?.present();
  }, []);
  const closeFeesBreakdown = useCallback(() => {
    feesBreakdownRef.current?.dismiss();
  }, []);
  const trackersRef = useRef<BottomSheetModal>(null);
  const openTrackers = useCallback(() => {
    trackersRef.current?.present();
  }, []);
  const closeTrackers = useCallback(() => {
    trackersRef.current?.dismiss();
  }, []);
  // Precompute the tracker entries so the row can branch on whether any
  // are available (no entries → row hidden). The list is rebuilt per
  // render which is fine: the inputs are derived from `record`, the
  // computation is cheap, and `useMemo` would just trade legibility for
  // a negligible cycle saving.
  const trackerEntries = useMemo(
    () =>
      record
        ? buildTrackerEntries({
            record,
            zecChainName: server.chainName,
            zecBlockExplorer: blockExplorer,
            t: (key, fallback) => (translate(key) as string) ?? fallback ?? key,
          })
        : [],
    [record, server.chainName, blockExplorer, translate],
  );

  const renderHandle = useCallback(
    () => (
      <View
        style={{
          paddingTop: 12,
          paddingBottom: 8,
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
          <TouchableOpacity
            onPress={closeScreen}
            hitSlop={8}
            style={{ paddingHorizontal: 4, paddingVertical: 4 }}
          >
            <FontAwesomeIcon
              icon={faChevronLeft}
              size={20}
              color={colors.primary}
            />
          </TouchableOpacity>
          <BoldText
            numberOfLines={1}
            style={{
              flex: 1,
              fontSize: 16,
              lineHeight: 28,
              textAlign: 'center',
            }}
          >
            {translate('swapdetail.title') as string}
          </BoldText>
          <View style={{ width: 28 }} />
        </View>
      </View>
    ),
    [colors, closeScreen, translate],
  );

  // Empty state — the record was deleted while the sheet was open, or the
  // params recordId never matched. Show a brief notice and provide a way
  // back to History rather than a blank screen.
  const recordMissing = !record;

  return (
    <View
      style={{ flex: 1, backgroundColor: colors.background }}
      onLayout={e => setContainerH(e.nativeEvent.layout.height)}
    >
      <View onLayout={e => setHeaderH(e.nativeEvent.layout.height)}>
        <Header
          title={''}
          screenName={screenName}
          noBalance={true}
          noSyncingStatus={true}
          noDrawMenu={true}
          noUfvkIcon={true}
          setPrivacyOption={setPrivacyOption}
          addLastSnackbar={addLastSnackbar}
        />
      </View>
      <BottomSheet
        ref={sheetRef}
        snapPoints={snapPoints}
        index={0}
        enableDynamicSizing={false}
        enablePanDownToClose={false}
        enableContentPanningGesture={false}
        keyboardBehavior={'interactive'}
        keyboardBlurBehavior={'restore'}
        android_keyboardInputMode={'adjustResize'}
        backgroundStyle={{
          backgroundColor: colors.bottomSheetBackground,
          borderTopLeftRadius: 40,
          borderTopRightRadius: 40,
        }}
        handleComponent={renderHandle}
      >
        {showNavigator && recordIds.length > 1 ? (
          <View
            style={{
              flexDirection: 'row',
              justifyContent: 'flex-end',
              alignItems: 'center',
              marginRight: 30,
              marginTop: 5,
              backgroundColor: colors.bottomSheetBackground,
            }}
          >
            <TouchableOpacity
              onPress={() => moveDetail(-1)}
              style={{ marginRight: 25 }}
              disabled={recordIdIndex === 0}
            >
              <FontAwesomeIcon
                icon={faChevronUp}
                color={
                  recordIdIndex === 0 ? colors.primaryDisabled : colors.primary
                }
                size={24}
              />
            </TouchableOpacity>
            <FadeText>{(recordIdIndex + 1).toString()}</FadeText>
            <TouchableOpacity
              onPress={() => moveDetail(1)}
              style={{ marginLeft: 25 }}
              disabled={recordIdIndex === recordIds.length - 1}
            >
              <FontAwesomeIcon
                icon={faChevronDown}
                color={
                  recordIdIndex === recordIds.length - 1
                    ? colors.primaryDisabled
                    : colors.primary
                }
                size={24}
              />
            </TouchableOpacity>
          </View>
        ) : null}
        <BottomSheetScrollView
          showsVerticalScrollIndicator={true}
          persistentScrollbar={true}
          indicatorStyle={'white'}
          bounces={false}
          alwaysBounceVertical={false}
          style={{ flex: 1, backgroundColor: colors.bottomSheetBackground }}
          contentContainerStyle={{
            flexDirection: 'column',
            alignItems: 'stretch',
            justifyContent: 'flex-start',
            paddingBottom: 24,
          }}
        >
          {recordMissing ? (
            <View style={{ padding: 24, alignItems: 'center' }}>
              <RegText style={{ color: colors.text, textAlign: 'center' }}>
                {translate('swapdetail.empty') as string}
              </RegText>
            </View>
          ) : (
            <SwapDetailBody
              record={record}
              colors={colors}
              translate={translate}
              language={language}
              copyToClipboard={copyToClipboard}
              onOpenTrackers={openTrackers}
              hasTrackers={trackerEntries.length > 0}
              onOpenFeesBreakdown={openFeesBreakdown}
              onRemove={handleRemove}
              showNavigator={showNavigator && recordIds.length > 1}
            />
          )}
        </BottomSheetScrollView>
      </BottomSheet>
      {/* Fees breakdown modal sheet — registered under the global
          BottomSheetModalProvider so it portals above this screen's
          BottomSheet and dismisses on backdrop tap. Mounted always so
          the ref is live when `openFeesBreakdown` fires; the feesRaw
          prop is empty for older records (the row's `tappable` gating
          ensures we never present an empty sheet to the user). */}
      <FeesBreakdownSheet
        ref={feesBreakdownRef}
        feesRaw={record?.feesRaw ?? []}
        sellAsset={record?.sellAsset ?? null}
        receiveAsset={record?.receiveAsset ?? null}
        fiatValueBasis={record?.fiatValueBasis ?? null}
        totalLabel={translate('swapdetail.fees-total') as string}
        onClose={closeFeesBreakdown}
        colors={colors}
        t={(key, fallback) => (translate(key) as string) ?? fallback ?? key}
      />
      <TrackersSheet
        ref={trackersRef}
        entries={trackerEntries}
        onClose={closeTrackers}
        onCopyUrl={url => copyToClipboard(url, 'swapdetail.link-copied')}
        colors={colors}
        t={(key, fallback) => (translate(key) as string) ?? fallback ?? key}
      />
    </View>
  );
};

export default SwapDetail;

type ColorsType = ThemeType['colors'];
type TranslateFn = (key: string) => string | object;
type CopyFn = (value: string, snackbarKey: string) => void;

function SwapDetailBody(props: {
  record: SwapRecordType;
  colors: ColorsType;
  translate: TranslateFn;
  language: LanguageEnum;
  copyToClipboard: CopyFn;
  onOpenTrackers: () => void;
  hasTrackers: boolean;
  onOpenFeesBreakdown: () => void;
  onRemove: () => void;
  showNavigator: boolean;
}): React.ReactElement {
  const {
    record,
    colors,
    translate,
    language,
    copyToClipboard,
    onOpenTrackers,
    hasTrackers,
    onOpenFeesBreakdown,
    onRemove,
    showNavigator,
  } = props;

  const statusLabel = swapStatusLabel(record.status, translate);
  const statusColor = swapStatusColor(record.status, colors);
  const directionArrow =
    record.direction === SwapDirectionEnum.Outbound ? '→' : '←';

  const sellSymbol =
    record.sellAsset.ticker ??
    record.sellAsset.chain ??
    record.sellAsset.symbol;
  const receiveSymbol =
    record.receiveAsset.ticker ??
    record.receiveAsset.chain ??
    record.receiveAsset.symbol;

  const memo = (record.providerData as { memo?: string } | undefined)?.memo;
  // Show the tracking button whenever we can produce a SwapKit Explorer
  // URL — provider-aware because the dashboard's two query shapes mirror
  // the two SwapKit `/track` keying paths: hash for Maya/THORChain/etc.,
  // depositAddress for NEAR Intents / Flashnet (where the deposit address
  // IS the per-quote identifier the indexer keys on).
  // Defence-in-depth: even though `applyDefaultTrackUpdate` now scrubs
  // placeholder hashes when it writes back to the record, records
  // persisted by older builds may still carry an all-zero or empty
  // `destinationTxHash` / `observedDepositTxHash` until the next poller
  // tick rewrites them. Filter at render time too so the UI never
  // surfaces a dead block-explorer row.
  const hashRows: Array<{ labelKey: string; value: string; copyKey: string }> =
    [];
  if (isRealLegHash(record.observedDepositTxHash)) {
    hashRows.push({
      labelKey: 'swapdetail.hash-deposit',
      value: record.observedDepositTxHash,
      copyKey: 'swapdetail.hash-copied',
    });
  }
  if (record.broadcast?.allTxIds && record.broadcast.allTxIds.length > 0) {
    for (let i = 0; i < record.broadcast.allTxIds.length; i++) {
      const isLast = i === record.broadcast.allTxIds.length - 1;
      const hopHash = record.broadcast.allTxIds[i];
      if (!isRealLegHash(hopHash)) continue;
      hashRows.push({
        labelKey: isLast
          ? 'swapdetail.hash-broadcast-final'
          : 'swapdetail.hash-broadcast-hop',
        value: hopHash,
        copyKey: 'swapdetail.hash-copied',
      });
    }
  } else if (isRealLegHash(record.broadcast?.txId)) {
    hashRows.push({
      labelKey: 'swapdetail.hash-broadcast-final',
      value: record.broadcast.txId,
      copyKey: 'swapdetail.hash-copied',
    });
  }
  if (isRealLegHash(record.destinationTxHash)) {
    hashRows.push({
      labelKey: 'swapdetail.hash-destination',
      value: record.destinationTxHash,
      copyKey: 'swapdetail.hash-copied',
    });
  }

  return (
    <View>
      {/* STATUS BLOCK */}
      <View
        style={{
          alignItems: 'center',
          margin: 20,
          // Tighten the top margin when the navigator chevrons are
          // showing so the gap between them and the status block matches
          // VTD's "navigator-visible-snug" spacing instead of leaving the
          // default 20-pt margin that looks like dead space underneath.
          marginTop: showNavigator ? 5 : 20,
          marginBottom: 8,
          padding: 12,
          borderWidth: 1,
          borderRadius: 10,
          borderColor: statusColor,
        }}
      >
        <BoldText style={{ color: statusColor, textTransform: 'capitalize' }}>
          {statusLabel}
        </BoldText>
        <View
          style={{ flexDirection: 'row', alignItems: 'center', marginTop: 8 }}
        >
          <RegText style={{ color: colors.text, fontSize: 16 }}>
            {`${formatAmountForDisplay(record.sellAmountHumanDecimal)} ${sellSymbol}`}
          </RegText>
          <RegText
            style={{ color: colors.text, marginHorizontal: 10, fontSize: 18 }}
          >
            {directionArrow}
          </RegText>
          <RegText style={{ color: colors.text, fontSize: 16 }}>
            {`${formatAmountForDisplay(record.expectedReceiveAmount)} ${receiveSymbol}`}
          </RegText>
        </View>
        {(() => {
          // Reconstruct the USD value snapshotted at quote time from the
          // unit prices SwapKit emitted on the chosen route. Outbound and
          // inbound both anchor on the sell side because that is what
          // actually leaves the user's hand at swap time — the receive
          // side's USD is an estimate until the provider pays out.
          const sellAmount = parseFloat(record.sellAmountHumanDecimal);
          const unitPrice = record.fiatValueBasis?.sellUsdUnitPrice;
          if (
            !Number.isFinite(sellAmount) ||
            !Number.isFinite(unitPrice as number) ||
            (unitPrice as number) <= 0
          )
            return null;
          const usd = sellAmount * (unitPrice as number);
          return (
            <FadeText style={{ marginTop: 4, fontSize: 12 }}>
              {`≈ $${usd.toFixed(2)} USD`}
            </FadeText>
          );
        })()}
      </View>

      {/* META rows */}
      <View style={{ marginHorizontal: 16, marginTop: 10 }}>
        <DetailRow
          colors={colors}
          label={translate('swapdetail.provider') as string}
          value={providerLongLabel(record.provider)}
        />
        <DetailRow
          colors={colors}
          label={translate('swapdetail.created') as string}
          value={Utils.formatDate(
            record.createdAtMs,
            'yyyy MMM d h:mm aaa',
            language,
          )}
        />
        {record.updatedAtMs && record.updatedAtMs !== record.createdAtMs ? (
          <DetailRow
            colors={colors}
            label={translate('swapdetail.updated') as string}
            value={Utils.formatDate(
              record.updatedAtMs,
              'yyyy MMM d h:mm aaa',
              language,
            )}
          />
        ) : null}
        <DetailRow
          colors={colors}
          label={translate('swapdetail.direction') as string}
          value={
            record.direction === SwapDirectionEnum.Outbound
              ? (translate('swapdetail.direction-outbound') as string)
              : (translate('swapdetail.direction-inbound') as string)
          }
        />
        <DetailRow
          colors={colors}
          label={translate('swapdetail.route-id') as string}
          value={record.routeId}
          monospace
          copyable
          onCopy={() => copyToClipboard(record.routeId, 'swapdetail.copied')}
        />
      </View>

      {/* AMOUNTS */}
      <SectionHeader
        colors={colors}
        label={translate('swapdetail.amounts') as string}
      />
      <View style={{ marginHorizontal: 16 }}>
        <DetailRow
          colors={colors}
          label={translate('swapdetail.amount-sent') as string}
          value={`${formatAmountForDisplay(record.sellAmountHumanDecimal)} ${sellSymbol}`}
        />
        <DetailRow
          colors={colors}
          label={translate('swapdetail.amount-expected') as string}
          value={`${formatAmountForDisplay(record.expectedReceiveAmount)} ${receiveSymbol}`}
        />
        <DetailRow
          colors={colors}
          label={translate('swapdetail.amount-min') as string}
          value={`${formatAmountForDisplay(record.minReceiveAmount)} ${receiveSymbol}`}
        />
      </View>

      {/* FEES — headline aggregate row. Tappable when the raw breakdown
          was persisted at commit time (records minted on/after the fees
          breakdown work). Older records fall through to a static row. */}
      {record.totalFeesInReceiveAsset !== undefined &&
      record.totalFeesInReceiveAsset !== '0' &&
      record.totalFeesInReceiveAsset !== '' ? (
        <>
          <SectionHeader
            colors={colors}
            label={translate('swapdetail.fees') as string}
          />
          <View style={{ marginHorizontal: 16 }}>
            <FeesAggregateRow
              colors={colors}
              label={translate('swapdetail.fees-total') as string}
              value={`${formatAmountForDisplay(record.totalFeesInReceiveAsset)} ${receiveSymbol}`}
              tappable={
                Array.isArray(record.feesRaw) && record.feesRaw.length > 0
              }
              onPress={onOpenFeesBreakdown}
            />
          </View>
        </>
      ) : null}

      {/* ADDRESSES */}
      <SectionHeader
        colors={colors}
        label={translate('swapdetail.addresses') as string}
      />
      <View style={{ marginHorizontal: 16 }}>
        <DetailRow
          colors={colors}
          label={translate('swapdetail.address-from') as string}
          value={record.sourceAddress}
          monospace
          copyable
          onCopy={() =>
            copyToClipboard(record.sourceAddress, 'swapdetail.copied')
          }
        />
        <DetailRow
          colors={colors}
          label={translate('swapdetail.address-to') as string}
          value={record.destinationAddress}
          monospace
          copyable
          onCopy={() =>
            copyToClipboard(record.destinationAddress, 'swapdetail.copied')
          }
        />
        <DetailRow
          colors={colors}
          label={translate('swapdetail.address-vault') as string}
          value={record.depositAddress}
          monospace
          copyable
          onCopy={() =>
            copyToClipboard(record.depositAddress, 'swapdetail.copied')
          }
        />
      </View>

      {/* HASHES */}
      {hashRows.length > 0 ? (
        <>
          <SectionHeader
            colors={colors}
            label={translate('swapdetail.hashes') as string}
          />
          <View style={{ marginHorizontal: 16 }}>
            {hashRows.map((row, i) => (
              <DetailRow
                key={`${row.labelKey}-${i}`}
                colors={colors}
                label={translate(row.labelKey) as string}
                value={row.value}
                monospace
                copyable
                onCopy={() => copyToClipboard(row.value, row.copyKey)}
              />
            ))}
          </View>
        </>
      ) : null}

      {/* MEMO (Maya/THORChain only) */}
      {(record.provider === SwapKitProviderEnum.MayachainStreaming ||
        record.provider === SwapKitProviderEnum.ThorchainStreaming) &&
      memo ? (
        <>
          <SectionHeader
            colors={colors}
            label={translate('swapdetail.memo') as string}
          />
          <View style={{ marginHorizontal: 16 }}>
            <DetailRow
              colors={colors}
              label={translate('swapdetail.memo-onchain') as string}
              value={memo}
              monospace
              copyable
              onCopy={() => copyToClipboard(memo, 'swapdetail.copied')}
            />
            {/* Same EVM-only `Memo (hex calldata)` row PostCommitView
                surfaces during commit — duplicated here so the user can
                come back to this screen later (e.g. they closed the
                commit sheet without paying) and still has the hex form
                that EVM wallets need pre-encoded. Every other deposit
                field (vault address, amount, raw memo) is already shown
                by the rows above; only the hex form was missing in v1
                of SwapDetail. */}
            {isEvmSourceChain(record.sellAsset.chain) ? (
              <DetailRow
                colors={colors}
                label={translate('swapdetail.memo-hex-calldata') as string}
                value={memoToHexCalldata(memo)}
                monospace
                copyable
                onCopy={() =>
                  copyToClipboard(
                    memoToHexCalldata(memo),
                    'swapdetail.memo-hex-copied',
                  )
                }
              />
            ) : null}
          </View>
        </>
      ) : null}

      {/* TRACKING + ACTIONS */}
      <View
        style={{
          marginHorizontal: 16,
          marginTop: 24,
          gap: 12,
        }}
      >
        {hasTrackers ? (
          <TouchableOpacity
            onPress={onOpenTrackers}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              padding: 12,
              borderRadius: 8,
              borderWidth: 1,
              borderColor: colors.border,
            }}
          >
            <FontAwesomeIcon
              icon={faExternalLinkAlt}
              size={14}
              color={colors.primary}
              style={{ marginRight: 8 }}
            />
            <RegText style={{ color: colors.primary }}>
              {translate('swapdetail.trackers') as string}
            </RegText>
          </TouchableOpacity>
        ) : null}
        {canRemoveSwap(record.status) ? (
          <View style={{ alignItems: 'center', marginTop: 4 }}>
            <Button
              type={ButtonTypeEnum.Secondary}
              title={translate('swapdetail.remove') as string}
              onPress={onRemove}
            />
          </View>
        ) : null}
      </View>
    </View>
  );
}

function DetailRow(props: {
  colors: ColorsType;
  label: string;
  value: string;
  monospace?: boolean;
  copyable?: boolean;
  onCopy?: () => void;
}): React.ReactElement {
  const { colors, label, value, monospace, copyable, onCopy } = props;
  return (
    <View
      style={{
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        paddingVertical: 8,
        gap: 12,
      }}
    >
      <FadeText style={{ flexShrink: 0 }}>{label}</FadeText>
      <TouchableOpacity
        disabled={!copyable}
        onPress={copyable ? onCopy : undefined}
        style={{
          flexShrink: 1,
          flexDirection: 'row',
          alignItems: 'center',
        }}
      >
        <RegText
          style={{
            color: colors.text,
            fontSize: monospace ? 12 : 13,
            textAlign: 'right',
            flexShrink: 1,
          }}
          selectable
        >
          {value}
        </RegText>
        {copyable ? (
          <FontAwesomeIcon
            icon={faCopy}
            size={12}
            color={colors.text}
            style={{ marginLeft: 6, opacity: 0.6 }}
          />
        ) : null}
      </TouchableOpacity>
    </View>
  );
}

function SectionHeader(props: {
  colors: ColorsType;
  label: string;
}): React.ReactElement {
  const { colors, label } = props;
  return (
    <View
      style={{
        marginHorizontal: 16,
        marginTop: 18,
        paddingBottom: 4,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
      }}
    >
      <BoldText
        style={{ color: colors.text, fontSize: 13, textTransform: 'uppercase' }}
      >
        {label}
      </BoldText>
    </View>
  );
}

/**
 * Tappable variant of `DetailRow` used for the Fees aggregate row. When
 * the raw `fees[]` breakdown is persisted on the record, the row shows a
 * chevron and opens the breakdown sheet on tap; otherwise it renders a
 * plain non-tappable row (older records that pre-date the persistence
 * fall through here transparently).
 */
function FeesAggregateRow(props: {
  colors: ColorsType;
  label: string;
  value: string;
  tappable: boolean;
  onPress: () => void;
}): React.ReactElement {
  const { colors, label, value, tappable, onPress } = props;
  const content = (
    <View
      style={{
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 8,
        gap: 12,
      }}
    >
      <FadeText style={{ flexShrink: 0 }}>{label}</FadeText>
      <View
        style={{
          flexShrink: 1,
          flexDirection: 'row',
          alignItems: 'center',
        }}
      >
        <RegText
          style={{
            color: colors.text,
            fontSize: 13,
            textAlign: 'right',
            flexShrink: 1,
            textDecorationLine: tappable ? 'underline' : 'none',
          }}
        >
          {value}
        </RegText>
        {tappable ? (
          <FontAwesomeIcon
            icon={faChevronRight}
            size={12}
            color={colors.text}
            style={{ marginLeft: 6, opacity: 0.6 }}
          />
        ) : null}
      </View>
    </View>
  );
  if (!tappable) return content;
  return (
    <Pressable onPress={onPress} accessibilityRole="button">
      {content}
    </Pressable>
  );
}

/**
 * Shared handle for the SwapDetail sub-sheets (Fees breakdown + Trackers),
 * mirroring the Settings server/security sheet header used elsewhere in
 * the app so the visual language stays consistent. Left spacer is sized
 * to match the X Pressable on the right (14×2 + 20 = 48) so the title
 * stays centred regardless of locale.
 */
function renderSwapDetailSheetHandle(args: {
  title: string;
  colors: ColorsType;
  onClose: () => void;
}): () => React.ReactElement {
  const { title, colors, onClose } = args;
  return () => (
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
          style={{
            flex: 1,
            fontSize: 16,
            lineHeight: 28,
            textAlign: 'center',
          }}
        >
          {title}
        </BoldText>
        <Pressable
          onPress={onClose}
          hitSlop={8}
          style={{ paddingHorizontal: 14, paddingVertical: 4 }}
        >
          <FontAwesomeIcon icon={faXmark} size={20} color={colors.zingo} />
        </Pressable>
      </View>
    </View>
  );
}

/**
 * Bottom-sheet modal listing every fee SwapKit returned on the route at
 * commit time, broken down by `type` (liquidity / outbound / affiliate /
 * service / inbound). Each fee renders in its own asset because SwapKit
 * denominates them inconsistently (Maya tends to use the destination
 * asset; NEAR Intents tends to use the source asset; the inbound network
 * fee is always on the source chain). The receive-asset-converted total
 * is shown as the headline so the row above and the sheet agree.
 *
 * Visual format mirrors the Settings server/security sheet so the app's
 * sub-sheet language stays uniform: dynamic-sized, pan-down to close,
 * branded header with X, content wrapped in a `colors.primary`-bordered
 * card. Empty / zero-value fees are kept in the list for transparency.
 */
const FeesBreakdownSheet = forwardRef<
  BottomSheetModal,
  {
    feesRaw: ReadonlyArray<{
      type?: string;
      amount?: string;
      asset?: string;
      chain?: string;
    }>;
    sellAsset: SwapAssetType | null;
    receiveAsset: SwapAssetType | null;
    fiatValueBasis: FiatValueBasisType | null;
    totalLabel: string;
    onClose: () => void;
    colors: ColorsType;
    t: (key: string, fallback?: string) => string;
  }
>(function FeesBreakdownSheet(props, ref) {
  const {
    feesRaw,
    sellAsset,
    receiveAsset,
    fiatValueBasis,
    totalLabel,
    onClose,
    colors,
    t,
  } = props;
  // Denomination toggle. Default to the receive asset because that aligns
  // with the headline `Total fees` row above the sheet (which is also
  // receive-denominated). The user can flip to the sell asset when the
  // mental model is "how much of what I sent went to fees" instead of
  // "how much of what I would have received".
  const [denomination, setDenomination] = useState<'sell' | 'receive'>(
    'receive',
  );
  const targetAsset = denomination === 'sell' ? sellAsset : receiveAsset;
  const targetTicker = targetAsset
    ? (targetAsset.ticker ?? targetAsset.chain ?? targetAsset.symbol)
    : '';
  const sellTicker = sellAsset
    ? (sellAsset.ticker ?? sellAsset.chain ?? sellAsset.symbol)
    : '';
  const receiveTicker = receiveAsset
    ? (receiveAsset.ticker ?? receiveAsset.chain ?? receiveAsset.symbol)
    : '';

  // Per-fee conversion + total in the active denomination, recomputed on
  // every render. The math is exact (string-based BigDecimal-like via
  // `Number` is fine here because fees are always sub-unit decimals
  // representable in IEEE-754 without observable loss for this UI).
  const conversions = useMemo(
    () =>
      feesRaw.map(fee =>
        convertFeeToAsset({
          fee,
          targetAssetId: targetAsset?.swapKitId ?? '',
          sellAssetId: sellAsset?.swapKitId ?? '',
          receiveAssetId: receiveAsset?.swapKitId ?? '',
          fiatBasis: fiatValueBasis,
        }),
      ),
    [feesRaw, targetAsset, sellAsset, receiveAsset, fiatValueBasis],
  );
  const totalInTarget = useMemo(
    () =>
      conversions.reduce(
        (acc, c) => acc + (c.kind === 'unconvertible' ? 0 : c.amountInTarget),
        0,
      ),
    [conversions],
  );
  const totalValue =
    targetTicker.length > 0
      ? `${formatFeeAmount(totalInTarget)} ${targetTicker}`
      : formatFeeAmount(totalInTarget);
  const renderBackdrop = useCallback(
    (backdropProps: BottomSheetBackdropProps) => (
      <BottomSheetBackdrop
        {...backdropProps}
        appearsOnIndex={0}
        disappearsOnIndex={-1}
        pressBehavior="close"
      />
    ),
    [],
  );
  const handleComponent = useMemo(
    () =>
      renderSwapDetailSheetHandle({
        title: t('swapdetail.fees-breakdown-title', 'Fees breakdown'),
        colors,
        onClose,
      }),
    [colors, onClose, t],
  );

  return (
    <BottomSheetModal
      ref={ref}
      enableDynamicSizing={true}
      enablePanDownToClose
      stackBehavior="push"
      keyboardBehavior={'interactive'}
      keyboardBlurBehavior={'restore'}
      android_keyboardInputMode={'adjustResize'}
      onAnimate={(from, to) => {
        // Opening (from === -1) dismisses a keyboard left open by the
        // underlying screen so the sheet never renders behind it. Guard
        // avoids fighting a keyboard the sheet itself focuses later.
        if (from === -1 && to >= 0) {
          Keyboard.dismiss();
        }
      }}
      handleComponent={handleComponent}
      backdropComponent={renderBackdrop}
      backgroundStyle={{
        backgroundColor: colors.bottomSheetBackground,
        borderTopLeftRadius: 40,
        borderTopRightRadius: 40,
      }}
    >
      <BottomSheetScrollView
        bounces={false}
        alwaysBounceVertical={false}
        style={{ backgroundColor: colors.bottomSheetBackground }}
        contentContainerStyle={{
          paddingHorizontal: 16,
          paddingTop: 12,
          paddingBottom: 30,
        }}
      >
        {/* Denomination toggle. Two pill buttons (receive | sell) flip
            every fee + total between the two assets that bracket the
            swap. The conversion uses the route's fiat snapshot persisted
            on the SwapRecord, so the rates reflect the time the swap was
            created, not now. */}
        {sellAsset && receiveAsset ? (
          <View
            style={{
              flexDirection: 'row',
              alignSelf: 'center',
              marginBottom: 12,
              borderWidth: 1,
              borderColor: colors.border,
              borderRadius: 999,
              padding: 2,
            }}
          >
            {(['receive', 'sell'] as const).map(opt => {
              const active = denomination === opt;
              const label = opt === 'sell' ? sellTicker : receiveTicker;
              return (
                <Pressable
                  key={opt}
                  onPress={() => setDenomination(opt)}
                  accessibilityRole="button"
                  style={{
                    paddingVertical: 6,
                    paddingHorizontal: 14,
                    borderRadius: 999,
                    backgroundColor: active ? colors.primary : 'transparent',
                  }}
                >
                  <BoldText
                    style={{
                      color: active ? colors.background : colors.text,
                      fontSize: 12,
                    }}
                  >
                    {label}
                  </BoldText>
                </Pressable>
              );
            })}
          </View>
        ) : null}
        <View
          style={{
            borderWidth: 1,
            borderColor: colors.primary,
            borderRadius: 10,
            backgroundColor: '#031124',
            paddingHorizontal: 12,
            paddingVertical: 6,
          }}
        >
          {feesRaw.map((fee, i) => {
            const typeLabel = t(
              `swapdetail.fees-type-${(fee.type ?? '').toLowerCase()}`,
              fee.type ?? '',
            );
            const conv = conversions[i];
            const targetText =
              conv.kind === 'unconvertible'
                ? `${formatFeeAmount(parseFloat(conv.originalAmount))} ${conv.originalAsset}`.trim()
                : `${formatFeeAmount(conv.amountInTarget)} ${targetTicker}`.trim();
            // Subtitle: when we converted (original asset != target),
            // surface the original units in fade so the user can audit
            // the math at a glance. When the fee was already in the
            // target asset there is nothing to disclose; when it is
            // unconvertible we already showed the original above and add
            // a small "not convertible" marker instead.
            let subtitle: string | null = null;
            if (conv.kind === 'converted') {
              subtitle =
                (t('swapdetail.fees-was', 'was') as string) +
                ' ' +
                `${formatFeeAmount(parseFloat(conv.originalAmount))} ${conv.originalAsset}`.trim();
            } else if (conv.kind === 'unconvertible') {
              subtitle = t(
                'swapdetail.fees-not-convertible',
                'Not convertible at this rate',
              ) as string;
            }
            return (
              <View
                key={`${fee.type ?? 'fee'}-${i}`}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  paddingVertical: 6,
                  gap: 12,
                }}
              >
                <FadeText>{typeLabel}</FadeText>
                <View
                  style={{
                    flexShrink: 1,
                    alignItems: 'flex-end',
                  }}
                >
                  <RegText
                    numberOfLines={1}
                    ellipsizeMode="middle"
                    style={{ textAlign: 'right' }}
                    selectable
                  >
                    {targetText}
                  </RegText>
                  {subtitle ? (
                    <FadeText
                      style={{
                        fontSize: 11,
                        marginTop: 2,
                        textAlign: 'right',
                      }}
                    >
                      {subtitle}
                    </FadeText>
                  ) : null}
                </View>
              </View>
            );
          })}
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              paddingVertical: 8,
              gap: 12,
              borderTopWidth: 1,
              borderTopColor: colors.border,
              marginTop: 6,
            }}
          >
            <BoldText style={{ color: colors.text }}>{totalLabel}</BoldText>
            <BoldText
              style={{ color: colors.text, flexShrink: 1, textAlign: 'right' }}
              selectable
            >
              {totalValue}
            </BoldText>
          </View>
          <FadeText
            style={{
              fontSize: 11,
              textAlign: 'right',
              marginTop: 4,
            }}
          >
            {t(
              'swapdetail.fees-rate-disclaimer',
              'Converted at the rate used when the swap was created',
            )}
          </FadeText>
        </View>
      </BottomSheetScrollView>
    </BottomSheetModal>
  );
});

/**
 * Trim SwapKit's verbose asset identifier (e.g.
 * `"NEAR.USDC-17208628f84f5d6ad33f0da3bbbeb27ffcb398eac501a31bd6ad2011e36133a1"`)
 * to the human ticker (`"USDC"`). The catalog suffix after `-` is the
 * contract address (for ERC20/NEP141-like tokens) and is noise in the fee
 * breakdown context.
 */
/**
 * Bottom-sheet modal listing every tracker URL we can build for the
 * record (SwapKit + provider-native + per-tx block explorers). Tapping
 * a row opens the URL via `Linking.openURL` — same plumbing the
 * single-button predecessor used, just multiplied across all available
 * surfaces. The sheet stays mounted under the global modal provider so
 * the parent SwapDetail BottomSheet's pan-down gesture does not race
 * with the modal backdrop.
 */
const TrackersSheet = forwardRef<
  BottomSheetModal,
  {
    entries: ReadonlyArray<TrackerEntryType>;
    onClose: () => void;
    onCopyUrl: (url: string) => void;
    colors: ColorsType;
    t: (key: string, fallback?: string) => string;
  }
>(function TrackersSheet(props, ref) {
  const { entries, onClose, onCopyUrl, colors, t } = props;
  const renderBackdrop = useCallback(
    (backdropProps: BottomSheetBackdropProps) => (
      <BottomSheetBackdrop
        {...backdropProps}
        appearsOnIndex={0}
        disappearsOnIndex={-1}
        pressBehavior="close"
      />
    ),
    [],
  );
  const handleComponent = useMemo(
    () =>
      renderSwapDetailSheetHandle({
        title: t('swapdetail.trackers-title', 'Trackers'),
        colors,
        onClose,
      }),
    [colors, onClose, t],
  );
  const open = useCallback(async (url: string) => {
    try {
      const supported = await Linking.canOpenURL(url);
      if (supported) await Linking.openURL(url);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.log('TrackersSheet: openURL failed:', msg);
    }
  }, []);

  return (
    <BottomSheetModal
      ref={ref}
      enableDynamicSizing={true}
      enablePanDownToClose
      stackBehavior="push"
      keyboardBehavior={'interactive'}
      keyboardBlurBehavior={'restore'}
      android_keyboardInputMode={'adjustResize'}
      onAnimate={(from, to) => {
        // Opening (from === -1) dismisses a keyboard left open by the
        // underlying screen so the sheet never renders behind it. Guard
        // avoids fighting a keyboard the sheet itself focuses later.
        if (from === -1 && to >= 0) {
          Keyboard.dismiss();
        }
      }}
      handleComponent={handleComponent}
      backdropComponent={renderBackdrop}
      backgroundStyle={{
        backgroundColor: colors.bottomSheetBackground,
        borderTopLeftRadius: 40,
        borderTopRightRadius: 40,
      }}
    >
      <BottomSheetScrollView
        bounces={false}
        alwaysBounceVertical={false}
        style={{ backgroundColor: colors.bottomSheetBackground }}
        contentContainerStyle={{
          paddingHorizontal: 16,
          paddingTop: 12,
          paddingBottom: 30,
        }}
      >
        <View
          style={{
            borderWidth: 1,
            borderColor: colors.primary,
            borderRadius: 10,
            backgroundColor: '#031124',
            paddingHorizontal: 12,
            paddingVertical: 6,
          }}
        >
          {entries.map((entry, i) => (
            // Each tracker row has TWO independent tap targets: the label
            // + external-link icon together open the URL (primary action,
            // largest hit area), and the copy icon to the left of the
            // external-link icon copies the URL to the clipboard
            // (secondary). We model them as sibling Pressables inside a
            // row View instead of nested Pressables so the copy tap
            // doesn't bubble up and accidentally trigger the row open.
            <View
              key={entry.key}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                paddingVertical: 10,
                gap: 12,
                borderBottomWidth: i < entries.length - 1 ? 1 : 0,
                borderBottomColor: colors.border,
              }}
            >
              <Pressable
                onPress={() => open(entry.url)}
                accessibilityRole="button"
                style={{ flex: 1 }}
              >
                <RegText style={{ color: colors.text, flexShrink: 1 }}>
                  {entry.label}
                </RegText>
              </Pressable>
              <Pressable
                onPress={() => onCopyUrl(entry.url)}
                accessibilityRole="button"
                accessibilityLabel={t('swapdetail.copy-link', 'Copy link')}
                hitSlop={8}
                style={{ padding: 4 }}
              >
                <FontAwesomeIcon
                  icon={faCopy}
                  size={14}
                  color={colors.text}
                  style={{ opacity: 0.7 }}
                />
              </Pressable>
              <Pressable
                onPress={() => open(entry.url)}
                accessibilityRole="button"
                accessibilityLabel={t('swapdetail.open-link', 'Open')}
                hitSlop={8}
                style={{ padding: 4 }}
              >
                <FontAwesomeIcon
                  icon={faExternalLinkAlt}
                  size={14}
                  color={colors.primary}
                />
              </Pressable>
            </View>
          ))}
        </View>
      </BottomSheetScrollView>
    </BottomSheetModal>
  );
});

/**
 * Result of trying to express a SwapKit fee in a target asset:
 *
 *   - `identity`:        fee was already denominated in the target asset.
 *   - `converted`:       fee was in the OTHER swap asset; we bridged
 *                        through USD using the `fiatValueBasis` snapshot.
 *                        `originalAmount` / `originalAsset` carry the
 *                        pre-conversion values so the UI can disclose
 *                        them as a fade subtitle.
 *   - `unconvertible`:   fee is in a third asset we have no price for
 *                        (rare — e.g. an exotic mid-route fee). The UI
 *                        renders the original amount and labels it
 *                        explicitly so the total stays trustworthy.
 */
type FeeConversionType =
  | { kind: 'identity'; amountInTarget: number }
  | {
      kind: 'converted';
      amountInTarget: number;
      originalAmount: string;
      originalAsset: string;
    }
  | {
      kind: 'unconvertible';
      originalAmount: string;
      originalAsset: string;
    };

/**
 * Convert a fee into a target swap asset using the swap's persisted fiat
 * snapshot. We only know unit prices for the sell and receive assets, so
 * a fee denominated in either of those can always be bridged through
 * USD; anything else falls back to `unconvertible`.
 *
 * The rates come from `record.fiatValueBasis`, captured at quote time
 * — this guarantees the historical numbers we surface match what the
 * user agreed to at swap time even if prices have moved since.
 */
function convertFeeToAsset(args: {
  fee: { amount?: string; asset?: string };
  targetAssetId: string;
  sellAssetId: string;
  receiveAssetId: string;
  fiatBasis: FiatValueBasisType | null;
}): FeeConversionType {
  const { fee, targetAssetId, sellAssetId, receiveAssetId, fiatBasis } = args;
  const amount = parseFloat(fee.amount ?? '0');
  const safeAmount = Number.isFinite(amount) ? amount : 0;
  const sourceAssetId = fee.asset ?? '';

  if (sourceAssetId === targetAssetId) {
    return { kind: 'identity', amountInTarget: safeAmount };
  }

  // Bridge through USD. Only works when both the source asset of the fee
  // and the target asset have a price in `fiatBasis`.
  const sourcePriceUsd =
    sourceAssetId === sellAssetId
      ? fiatBasis?.sellUsdUnitPrice
      : sourceAssetId === receiveAssetId
        ? fiatBasis?.receiveUsdUnitPrice
        : undefined;
  const targetPriceUsd =
    targetAssetId === sellAssetId
      ? fiatBasis?.sellUsdUnitPrice
      : targetAssetId === receiveAssetId
        ? fiatBasis?.receiveUsdUnitPrice
        : undefined;
  if (
    sourcePriceUsd !== undefined &&
    sourcePriceUsd > 0 &&
    targetPriceUsd !== undefined &&
    targetPriceUsd > 0
  ) {
    const amountInTarget = (safeAmount * sourcePriceUsd) / targetPriceUsd;
    return {
      kind: 'converted',
      amountInTarget,
      originalAmount: fee.amount ?? '0',
      originalAsset: assetShortLabel(sourceAssetId),
    };
  }
  return {
    kind: 'unconvertible',
    originalAmount: fee.amount ?? '0',
    originalAsset: assetShortLabel(sourceAssetId),
  };
}

/**
 * Render a fee amount with sane precision: ≤ 8 significant decimals,
 * trailing zeros trimmed, never scientific notation. Fees are all
 * sub-unit decimals in practice so we never need integer formatting.
 * Returns "0" for empty / non-finite values.
 */
function formatFeeAmount(amount: number): string {
  if (!Number.isFinite(amount) || amount === 0) return '0';
  // Snap to 10 decimal digits — wider than the destination assets we
  // care about (ZEC 8 dp, ETH 18 dp but fees are always tiny) — then
  // strip trailing zeros so 0.00000007000 becomes 0.00000007.
  const fixed = amount.toFixed(10);
  return fixed.replace(/0+$/, '').replace(/\.$/, '');
}

function assetShortLabel(asset: string): string {
  // Asset format: `CHAIN.SYMBOL[-CONTRACT]`. Take the part after the dot,
  // then drop everything after the first `-` if present.
  const afterDot = asset.includes('.')
    ? asset.slice(asset.indexOf('.') + 1)
    : asset;
  const dashIdx = afterDot.indexOf('-');
  return dashIdx >= 0 ? afterDot.slice(0, dashIdx) : afterDot;
}

/**
 * Project the granular `SwapStatusEnum` (10 values) to a human-readable label
 * via i18n. Each enum value gets its own key so translations can shade the
 * differences (e.g. `processing` vs `pending` vs `awaiting-external-deposit`)
 * for the user; SwapDetail is the right place to surface that granularity
 * because the History row already collapses it for compact display.
 */
/**
 * Build the SwapKit Explorer URL for a record, choosing the right query
 * shape per provider. SwapKit's REST `/track` endpoint accepts two
 * keying paths (verified empirically 2026-06-28):
 *
 *   - `{hash, chainId}` for Maya/THORChain/Chainflip and any provider
 *     whose tracker indexes by source-chain tx hash
 *   - `{depositAddress, chainId}` for NEAR Intents / Flashnet, where the
 *     deposit address is the per-quote identifier (not a vault) and the
 *     tracker keys on it directly
 *
 * The public dashboard at `track.swapkit.dev` accepts the same two query
 * shapes (both confirmed `HTTP 200` against the live dashboard). Returns
 * null when the record has neither a usable hash nor a depositAddress
 * for one of the depositAddress-keyed providers — in that state there
 * is genuinely nothing to look up and hiding the button is the honest
 * UI signal.
 */
/**
 * Per-chain block-explorer URL builders. Each entry returns a tx URL for
 * the named chain or `null` when we have no canonical explorer for it.
 * The lookup is by SwapKit's `chain` short symbol (e.g. `"ETH"`, `"BTC"`,
 * `"ZEC"`) — same key shape we already use in `chainMemoEncoding`.
 *
 * The list is intentionally short: only the chains we have actually
 * swapped through. Adding a chain is one line. We keep this static
 * rather than wiring it through SwapKit's catalog because the catalog
 * does not surface an explorer field and the URLs change rarely.
 */
const CHAIN_EXPLORER_TX_URL: Record<string, (hash: string) => string> = {
  ETH: h => `https://etherscan.io/tx/${h}`,
  AVAX: h => `https://snowtrace.io/tx/${h}`,
  BSC: h => `https://bscscan.com/tx/${h}`,
  BASE: h => `https://basescan.org/tx/${h}`,
  ARB: h => `https://arbiscan.io/tx/${h}`,
  OP: h => `https://optimistic.etherscan.io/tx/${h}`,
  MATIC: h => `https://polygonscan.com/tx/${h}`,
  POL: h => `https://polygonscan.com/tx/${h}`,
  FTM: h => `https://ftmscan.com/tx/${h}`,
  GNOSIS: h => `https://gnosisscan.io/tx/${h}`,
  LINEA: h => `https://lineascan.build/tx/${h}`,
  BTC: h => `https://mempool.space/tx/${h}`,
  BCH: h => `https://blockchair.com/bitcoin-cash/transaction/${h}`,
  LTC: h => `https://blockchair.com/litecoin/transaction/${h}`,
  DOGE: h => `https://blockchair.com/dogecoin/transaction/${h}`,
  DASH: h => `https://blockchair.com/dash/transaction/${h}`,
  NEAR: h => `https://nearblocks.io/txns/${h}`,
  MAYA: h => `https://www.mayascan.org/tx/${h}`,
  THOR: h => `https://viewblock.io/thorchain/tx/${h}`,
};

/**
 * Build a block-explorer URL for a (chain, hash) pair. ZEC is routed
 * through `Utils.getBlockExplorerTxIDURL` so the link respects the
 * user-selected explorer in Settings (Zcashexplorer / Cipherscan /
 * Zypherscan) — same util VTD uses for the "View in explorer" affordance,
 * so the two screens always agree. Every other chain uses the static
 * default in `CHAIN_EXPLORER_TX_URL`.
 */
function buildChainExplorerUrl(args: {
  chain: string;
  hash: string;
  zecChainName: ChainNameEnum;
  zecBlockExplorer: BlockExplorerEnum;
}): string | null {
  const upper = args.chain.toUpperCase();
  if (upper === 'ZEC') {
    const url = Utils.getBlockExplorerTxIDURL(
      args.hash,
      args.zecChainName,
      args.zecBlockExplorer,
    );
    return url.length > 0 ? url : null;
  }
  const builder = CHAIN_EXPLORER_TX_URL[upper];
  return builder ? builder(args.hash) : null;
}

/**
 * Provider-native lookup endpoints. These are the URLs the providers
 * themselves expose for status/forensic deep-dives — they often surface
 * more detail than a plain block explorer (memo parsing, refund state,
 * streaming-swap step counters). Returns null when we have no canonical
 * URL for the provider, or when the provider keys on something other
 * than a tx hash (Chainflip → depositChannelId, etc.).
 */
function buildProviderExplorerUrl(
  provider: SwapKitProviderEnum,
  hash: string,
): string | null {
  switch (provider) {
    case SwapKitProviderEnum.MayachainStreaming:
      return `https://mayanode.mayachain.info/mayachain/tx/details/${hash}`;
    case SwapKitProviderEnum.ThorchainStreaming:
      return `https://thornode.ninerealms.com/thorchain/tx/details/${hash}`;
    default:
      return null;
  }
}

type TrackerEntryType = {
  key: string;
  label: string;
  url: string;
};

/**
 * Build the ordered list of tracker URLs we can offer for a swap record.
 * Ordering reflects perceived utility: SwapKit first (normalised cross-
 * provider view), then the provider's own deep-link (richer details),
 * then per-tx block explorers (raw on-chain truth). Entries we cannot
 * build (missing hash, unknown chain, unknown provider) are silently
 * omitted — the sheet only renders rows we can actually open.
 */
function buildTrackerEntries(args: {
  record: SwapRecordType;
  zecChainName: ChainNameEnum;
  zecBlockExplorer: BlockExplorerEnum;
  t: (key: string, fallback?: string) => string;
}): TrackerEntryType[] {
  const { record, zecChainName, zecBlockExplorer, t } = args;
  const entries: TrackerEntryType[] = [];

  const swapKitUrl = buildSwapKitTrackerUrl(record);
  if (swapKitUrl) {
    entries.push({
      key: 'swapkit',
      label: t('swapdetail.tracker-swapkit', 'SwapKit Explorer'),
      url: swapKitUrl,
    });
  }

  // Provider-native tracker. Prefer the explicit URL the provider sent
  // via `/track` (Flashnet's Orchestra explorer link points directly at
  // the order id, which is richer than what a hash-keyed URL could
  // reach). Fall back to the per-provider hash-based URL for Maya/THOR.
  // The hash is filtered through `isRealLegHash` so a stale all-zero
  // placeholder persisted by an older build never tries to build a
  // bogus explorer URL.
  const broadcastHash = isRealLegHash(record.broadcast?.txId)
    ? record.broadcast!.txId
    : undefined;
  const observedHash = isRealLegHash(record.observedDepositTxHash)
    ? record.observedDepositTxHash
    : undefined;
  const sourceHash = broadcastHash ?? observedHash ?? null;
  const providerUrl =
    record.providerExplorerUrl ??
    (sourceHash ? buildProviderExplorerUrl(record.provider, sourceHash) : null);
  if (providerUrl) {
    entries.push({
      key: 'provider',
      label: t(
        `swapdetail.tracker-provider-${record.provider.toLowerCase()}`,
        providerLongLabel(record.provider),
      ),
      url: providerUrl,
    });
  }

  // Block explorer for the source-chain deposit.
  if (sourceHash) {
    const sourceExplorerUrl = buildChainExplorerUrl({
      chain: record.sellAsset.chain,
      hash: sourceHash,
      zecChainName,
      zecBlockExplorer,
    });
    if (sourceExplorerUrl) {
      entries.push({
        key: 'source-explorer',
        label: t('swapdetail.tracker-source-explorer', 'Source chain explorer'),
        url: sourceExplorerUrl,
      });
    }
  }

  // Multi-hop hops (outbound ZIP-320, omit the last because it's the same
  // hash already surfaced as `source-explorer` above). Skip any hop that
  // somehow ended up as the all-zero placeholder.
  if (record.broadcast?.allTxIds && record.broadcast.allTxIds.length > 1) {
    for (let i = 0; i < record.broadcast.allTxIds.length - 1; i++) {
      const hop = record.broadcast.allTxIds[i];
      if (!isRealLegHash(hop)) continue;
      const url = buildChainExplorerUrl({
        chain: record.sellAsset.chain,
        hash: hop,
        zecChainName,
        zecBlockExplorer,
      });
      if (url) {
        entries.push({
          key: `source-hop-${i}`,
          label:
            (t('swapdetail.tracker-source-hop', 'Source chain hop') as string) +
            ' ' +
            (i + 1),
          url,
        });
      }
    }
  }

  // Block explorer for the destination payout. Same `isRealLegHash`
  // guard so a stale all-zero placeholder cannot emit a dead row.
  if (isRealLegHash(record.destinationTxHash)) {
    const destExplorerUrl = buildChainExplorerUrl({
      chain: record.receiveAsset.chain,
      hash: record.destinationTxHash,
      zecChainName,
      zecBlockExplorer,
    });
    if (destExplorerUrl) {
      entries.push({
        key: 'dest-explorer',
        label: t(
          'swapdetail.tracker-dest-explorer',
          'Destination chain explorer',
        ),
        url: destExplorerUrl,
      });
    }
  }

  return entries;
}

function buildSwapKitTrackerUrl(record: SwapRecordType): string | null {
  // SwapKit's public Explorer SPA (`track.swapkit.dev`) only renders a
  // usable timeline when it receives `?hash=...&chainId=...`. Passing
  // `?depositAddress=...` returns a 200 from the underlying API but the
  // dashboard does not populate the visual swap state (verified
  // empirically against a Flashnet inbound swap on 2026-06-29) — the
  // user would tap into a blank view. Build the URL only when we have a
  // real source-chain hash; for hash-less providers in flight, the
  // provider-native row in the Trackers sheet (mayanode, Orchestra,
  // etc.) is the right surface instead.
  const hash = record.broadcast?.txId ?? record.observedDepositTxHash;
  if (!hash) return null;
  return (
    'https://track.swapkit.dev/?hash=' +
    encodeURIComponent(hash) +
    '&chainId=' +
    encodeURIComponent(record.sellAsset.chainId)
  );
}

/**
 * Whether the user is allowed to prune a record at this status. The rule:
 * money in flight (`Pending`, `Processing`) and confirmed history
 * (`Completed`) stay immutable; everything else — terminal non-success
 * (Failed/Refunded/Expired/IncompleteDeposit), opaque providers
 * (ProviderStatusUnknown), and the two pre-payment states — is removable
 * because the user has either abandoned the swap or the network has
 * already produced its terminal verdict and no more state will arrive.
 */
function canRemoveSwap(status: SwapStatusEnum): boolean {
  switch (status) {
    case SwapStatusEnum.Completed:
    case SwapStatusEnum.Pending:
    case SwapStatusEnum.Processing:
      return false;
    default:
      return true;
  }
}

/**
 * Whether the record sits BEFORE the on-chain evidence we need for tracking.
 * Both inbound (`AwaitingExternalDeposit`) and outbound (`PendingDeposit`)
 * fall here. SwapDetail uses this to swap the Remove-confirm message for a
 * version that warns the user the swap might still resolve on-chain even
 * after the local record is gone.
 */
function isPrePaymentStatus(status: SwapStatusEnum): boolean {
  return (
    status === SwapStatusEnum.AwaitingExternalDeposit ||
    status === SwapStatusEnum.PendingDeposit
  );
}

function swapStatusColor(status: SwapStatusEnum, colors: ColorsType): string {
  switch (status) {
    case SwapStatusEnum.Completed:
      return colors.primary;
    // Terminal failures use the same coral red that ValueTransferDetail
    // uses for VT-status=failed (its status-block border and warning
    // sub-line). Keeps the two detail surfaces visually consistent for
    // "this transaction did not succeed".
    case SwapStatusEnum.Failed:
    case SwapStatusEnum.Refunded:
    case SwapStatusEnum.Expired:
      return 'coral';
    // `IncompleteDeposit` is transitional, not failed (provider will
    // refund or accept a top-up). Keep the existing warning hue so the
    // user understands "attention needed" without reading it as
    // permanently lost.
    case SwapStatusEnum.IncompleteDeposit:
      return colors.warning.text;
    default:
      return colors.text;
  }
}
