/* eslint-disable react-native/no-inline-styles */
import React, {
  useContext,
  useState,
  useEffect,
  useCallback,
  useMemo,
  useRef,
} from 'react';
import {
  Keyboard,
  View,
  RefreshControl,
  ActivityIndicator,
  Dimensions,
  Platform,
  Pressable,
  StyleSheet,
} from 'react-native';
import Animated from 'react-native-reanimated';
import {
  NavigationProp,
  ParamListBase,
  useNavigation,
} from '@react-navigation/native';
import { useTheme } from '@app/theme';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { faAngleUp, faXmark } from '@fortawesome/free-solid-svg-icons';

import {
  ChainNameEnum,
  CurrencyEnum,
  FilterEnum,
  GlobalConst,
  isIronwoodActive,
  RouteEnum,
  ScreenEnum,
  ValueTransferKindEnum,
  //SelectServerEnum,
  //SendPageStateClass,
  //ServerType,
  ValueTransferType,
} from '@app/AppState';
import { AppDrawerParamList } from '@app/types';
import FadeText from '@ui/primitives/FadeText';
import BoldText from '@ui/primitives/BoldText';
import SheetRim from '@ui/primitives/SheetRim';
import RingBorder from '@ui/primitives/RingBorder';
import ValueTransferLine from './components/ValueTransferLine';
import IronwoodMigrationBanner from './components/IronwoodMigrationBanner';
import { ContextAppLoaded } from '@app/context';
import { useDismissSheetsOnBlur } from '@app/hooks/useDismissSheetsOnBlur';
import { useOptionsPanelSheetSlide } from '@app/hooks/useOptionsPanelSheetSlide';
import { usePriceSnapAutoClose } from '@app/hooks/usePriceSnapAutoClose';
import { safeSnapToIndex } from '@app/utils/safeSnapToIndex';
import Header from '@ui/widgets/Header';
import Utils from '@app/utils';
import {
  DataProvider,
  RecyclerListView,
  LayoutProvider,
  RecyclerListViewProps,
} from 'recyclerlistview';
import { ScrollEvent } from 'recyclerlistview/dist/reactnative/core/scrollcomponent/BaseScrollView';
import { RecyclerListViewState } from 'recyclerlistview/dist/reactnative/core/RecyclerListView';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Swipeable } from 'react-native-gesture-handler';
import { RPCValueTransfersStatusEnum } from '@app/walletBackend/enums/RPCValueTransfersStatusEnum';
import BottomSheet, {
  BottomSheetBackdrop,
  BottomSheetBackdropProps,
  BottomSheetModal,
  BottomSheetView,
} from '@gorhom/bottom-sheet';
import Filters from './components/Filters';
import { FiltersIcon } from '@ui/primitives/Icons/FiltersIcon';

const ViewTypes = {
  WITH_MONTH: 0,
  WITHOUT_MONTH: 1,
  WITH_MONTH_REFRESH: 2,
  WITHOUT_MONTH_REFRESH: 3,
};

type HistoryProps = NativeStackScreenProps<
  AppDrawerParamList,
  RouteEnum.History
> & {
  // side menu
  toggleMenuDrawer: () => void;
  // privacy
  // addLastSnackbar from context
  // shielding / sending
  setShieldingAmount: (value: number) => void;
  setScrollToTop: (value: boolean) => void;
  scrollToTop: boolean;
  setScrollToBottom: (value: boolean) => void;
  //scrollToBottom: boolean;
  // for messages
  //sendTransaction: (s: SendPageStateClass) => Promise<String>;
  //setServerOption: (
  //  value: ServerType,
  //  selectServer: SelectServerEnum,
  //  toast: boolean,
  //  sameServerChainName: boolean,
  //) => Promise<void>;
};

const History: React.FunctionComponent<HistoryProps> = ({
  toggleMenuDrawer,
  setShieldingAmount,
  setScrollToTop,
  scrollToTop,
  setScrollToBottom,
  //scrollToBottom,
  //sendTransaction,
  //setServerOption,
}) => {
  const navigation = useNavigation<NavigationProp<ParamListBase>>();
  const context = useContext(ContextAppLoaded);
  const {
    translate,
    valueTransfers,
    language,
    setBackgroundError,
    addLastSnackbar,
    server,
    doRefresh,
    zenniesDonationAddress,
    setPrivacyOption,
    currency,
    totalBalance,
    readOnly,
    info,
  } = context;
  const { colors } = useTheme();
  const screenName = ScreenEnum.History;

  const PAGE_SIZE = 50;
  const [numVt, setNumVt] = useState<number>(PAGE_SIZE);
  const [valueTransfersSliced, setValueTransfersSliced] = useState<
    ValueTransferType[]
  >([]);
  const [valueTransfersFiltered, setValueTransfersFiltered] = useState<
    ValueTransferType[]
  >([]);
  const [isAtTop, setIsAtTop] = useState<boolean>(true);
  const [isScrollingToTop, setIsScrollingToTop] = useState<boolean>(false);
  const scrollTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [filterWithFunds, setFilterWithFunds] = useState<boolean>(false);
  const [filterKind, setFilterKind] = useState<FilterEnum | null>(null);
  const [filterFailed, setFilterFailed] = useState<boolean>(false);
  const [filterMemos, setFilterMemos] = useState<boolean>(false);
  const [showFilters, setShowFilters] = useState<boolean>(false);
  // measured dynamically to compute history sheet snap points
  const [containerH, setContainerH] = useState<number>(0);
  const [headerH, setHeaderH] = useState<number>(0);
  const [usdRowH, setUsdRowH] = useState<number>(0);
  const [priceRowH, setPriceRowH] = useState<number>(0);
  const [bannerH, setBannerH] = useState<number>(0);
  const [handleH, setHandleH] = useState<number>(0);
  // The BottomSheet sizes its content wrapper (and therefore the list's scroll
  // frame) to the HIGHEST snap point, not the current one. A plain
  // RecyclerListView, unlike gorhom's own scrollables, never compensates, so at
  // any snap below the top the frame runs past the visible window (off-screen,
  // behind the tab bar), stranding the list's tail where it can't be scrolled
  // up. Track the settled snap to clamp the list to the visible height instead.
  const [snapIndex, setSnapIndex] = useState<number>(0);

  // Persistent "migrate Orchard → Ironwood" call-to-action. It stands or falls
  // on funds alone: shown for as long as the wallet holds anything left to
  // migrate, and gone the moment it doesn't. Deliberately independent of
  // `ironwoodOnboardSeen` — having been through the onboarding once does not
  // migrate the funds, so the way back in has to stay put.
  //
  // zingolib's confirmed_orchard_balance excludes dust, so `> 0` means at
  // least one note worth migrating; a wallet left holding only dust reads as
  // done. The two other conditions are hard blocks, not preferences: NU6.3
  // must have activated for the migration to be possible at all, and
  // watch-only wallets cannot spend.
  const showIronwoodBanner =
    !readOnly &&
    isIronwoodActive(info) &&
    !!totalBalance &&
    totalBalance.confirmedOrchardBalance > 0;
  const orchardAmount = totalBalance ? totalBalance.totalOrchardBalance : 0;

  const bottomSheetRef = useRef<BottomSheetModal>(null);
  const historySheetRef = useRef<BottomSheet>(null);
  const internalSnapIndexRef = useRef<number>(0);

  type SnapId = 'price' | 'balance' | 'usd' | 'max';
  const currentSnapIdRef = useRef<SnapId>('balance');
  useDismissSheetsOnBlur();
  const sheetSlideStyle = useOptionsPanelSheetSlide();
  const scrollViewRef =
    useRef<RecyclerListView<RecyclerListViewProps, RecyclerListViewState>>(
      null,
    );
  const swipeablesRef = useRef(new Map<number, Swipeable>());

  const registerSwipeable = useCallback(
    (key: number) => (ref: Swipeable | null) => {
      // React invokes the callback ref with null on unmount and on recycle;
      // storing null in the map would crash closeAllSwipeables when it tries
      // to call .close() on a recycled or unmounted row.
      if (ref === null) {
        swipeablesRef.current.delete(key);
      } else {
        swipeablesRef.current.set(key, ref);
      }
    },
    [],
  );

  const closeAllSwipeables = useCallback((exceptKey?: number) => {
    swipeablesRef.current.forEach((ref, k) => {
      if (k !== exceptKey && ref) {
        ref.close();
      }
    });
  }, []);

  const layoutProvider = useMemo(
    () =>
      new LayoutProvider(
        (index: number) => {
          const lastData = valueTransfersSliced[index - 1];
          const data = valueTransfersSliced[index];

          if (index === 0) {
            if (data.confirmations === 0) {
              return ViewTypes.WITH_MONTH_REFRESH;
            } else {
              return ViewTypes.WITH_MONTH;
            }
          }

          let lasttxmonth =
            lastData && lastData.time
              ? Utils.formatDate(lastData.time * 1000, 'MMM yyyy', language)
              : '--- ----';
          let txmonth =
            data && data.time
              ? Utils.formatDate(data.time * 1000, 'MMM yyyy', language)
              : '--- ----';

          if (txmonth !== lasttxmonth) {
            if (data.confirmations === 0) {
              return ViewTypes.WITH_MONTH_REFRESH;
            } else {
              return ViewTypes.WITH_MONTH;
            }
          } else {
            if (data.confirmations === 0) {
              return ViewTypes.WITHOUT_MONTH_REFRESH;
            } else {
              return ViewTypes.WITHOUT_MONTH;
            }
          }
        },
        (type, dim) => {
          if (type === ViewTypes.WITHOUT_MONTH) {
            // two lines
            dim.width = Dimensions.get('window').width;
            dim.height =
              Platform.OS === GlobalConst.platformOSandroid ? 70 : 60;
          } else if (type === ViewTypes.WITHOUT_MONTH_REFRESH) {
            // three lines
            dim.width = Dimensions.get('window').width;
            dim.height =
              (Platform.OS === GlobalConst.platformOSandroid ? 70 : 55) + 15;
          } else if (type === ViewTypes.WITH_MONTH) {
            // two lines with month
            dim.width = Dimensions.get('window').width;
            dim.height =
              Platform.OS === GlobalConst.platformOSandroid ? 105 : 90;
          } else if (type === ViewTypes.WITH_MONTH_REFRESH) {
            // three lines with month
            dim.width = Dimensions.get('window').width;
            dim.height =
              (Platform.OS === GlobalConst.platformOSandroid ? 105 : 85) + 15;
          }
        },
      ),
    [language, valueTransfersSliced],
  );

  const _dataProvider = useMemo(
    () =>
      new DataProvider(
        // RecyclerListView's diff fires on every poll (every 5s) with up to
        // N×N row comparisons; a deep lodash.isEqual here is what was making
        // the list freeze. Only fields that can actually change for an
        // existing transfer matter visually: status (pending → confirmed)
        // and confirmations (advance with each new block). txid is the
        // identity guard.
        (r1: ValueTransferType, r2: ValueTransferType) =>
          r1.txid !== r2.txid ||
          r1.status !== r2.status ||
          r1.confirmations !== r2.confirmations,
      ),
    [],
  );

  const [dataProvider, setDataProvider] = useState<DataProvider>(_dataProvider);

  // Bottom-sheet that hosts the history list itself. Snap points are ordered
  // from smallest sheet height (most balance area visible above) to largest
  // (only the top icons row visible above). Computed in absolute pixels from
  // the Header's measured height + the USD row's measured height when shown.
  //   - With USD: 3 snaps -> [ZEC+USD visible, only ZEC visible, only top icons visible]
  //   - Without USD: 2 snaps -> [ZEC visible, only top icons visible]
  // Top icons strip height is a code-side constant (~55 px) — same on any phone.
  const TOP_ICONS_H = 55;
  const SNAP_GAP = 4;
  // Bump applied to the snaps that sit just below a balance row (low + mid);
  // the max snap (just below the top icons strip) doesn't need it.
  const BALANCE_SNAP_BUMP = 10;

  useEffect(() => {
    const isMainChain = server.chainName === ChainNameEnum.mainChainName;
    const withUsd = isMainChain && currency === CurrencyEnum.USDCurrency;
    if (!withUsd) {
      setUsdRowH(0);
    }
  }, [currency, server.chainName]);

  const snapEntries = useMemo<{ id: SnapId; value: number | string }[]>(() => {
    const isMainChain = server.chainName === ChainNameEnum.mainChainName;
    const withUsd = isMainChain && currency === CurrencyEnum.USDCurrency;
    // Until the layout reports the actual container + header heights, fall
    // back to percentages.
    if (containerH <= 0 || headerH <= 0) {
      return withUsd
        ? [
            { id: 'balance', value: '85%' },
            { id: 'usd', value: '89%' },
            { id: 'max', value: '93%' },
          ]
        : [
            { id: 'balance', value: '89%' },
            { id: 'max', value: '93%' },
          ];
    }
    // The banner (when shown) sits between the header and the sheet in normal
    // flow, so the sheet's low/mid snaps must shrink by its height to leave it
    // uncovered; the max snap still climbs over both.
    const snapBase = containerH - headerH - bannerH - SNAP_GAP;
    // Smallest sheet: full header visible, including the PriceRow at the
    // bottom of the Header (only present when zecPrice > 0).
    const snapPrice = Math.max(snapBase + BALANCE_SNAP_BUMP, 100);
    // "Balance visible" snap covers the PriceRow but keeps balance + USD
    // showing — when there's no PriceRow, this collapses back to the
    // original snapLow value.
    const snapLow = Math.max(snapBase + priceRowH + BALANCE_SNAP_BUMP, 100);
    const snapMid = Math.min(
      Math.max(snapBase + priceRowH + usdRowH + BALANCE_SNAP_BUMP, snapLow + 1),
      containerH - TOP_ICONS_H - SNAP_GAP,
    );
    const snapMax = Math.max(containerH - TOP_ICONS_H - SNAP_GAP, snapLow + 1);

    if (bannerH > 0) {
      const bannerSafe = Math.min(Math.max(snapBase, 100), snapMax - 1);
      return [
        { id: 'balance', value: bannerSafe },
        { id: 'max', value: snapMax },
      ];
    }
    const entries: { id: SnapId; value: number }[] = [];
    if (priceRowH > 0) {
      entries.push({ id: 'price', value: snapPrice });
    }
    entries.push({ id: 'balance', value: snapLow });
    if (withUsd && usdRowH > 0) {
      entries.push({ id: 'usd', value: snapMid });
    }
    entries.push({ id: 'max', value: snapMax });
    return entries;
  }, [
    currency,
    server.chainName,
    containerH,
    headerH,
    usdRowH,
    priceRowH,
    bannerH,
  ]);

  const historySnapPoints = useMemo(
    () => snapEntries.map(e => e.value),
    [snapEntries],
  );
  const historySnapIds = useMemo(
    () => snapEntries.map(e => e.id),
    [snapEntries],
  );

  const priceIdx = historySnapIds.indexOf('price');
  const priceSnapIndex = priceIdx >= 0 ? priceIdx : null;
  const balanceIdx = Math.max(historySnapIds.indexOf('balance'), 0);
  const onPriceSnapChange = usePriceSnapAutoClose(
    historySheetRef,
    priceSnapIndex,
    balanceIdx,
    historySnapPoints.length,
  );

  // Tapping the price fetch button reveals the header PriceRow (smallest snap).
  // The auto-close timer armed by usePriceSnapAutoClose returns it afterwards.
  const revealPrice = useCallback(() => {
    if (priceSnapIndex === null) return;
    safeSnapToIndex(historySheetRef, priceSnapIndex, historySnapPoints.length);
  }, [priceSnapIndex, historySnapPoints.length]);

  useEffect(() => {
    let target = historySnapIds.indexOf(currentSnapIdRef.current);
    if (target < 0) {
      target = historySnapIds.indexOf('balance');
    }
    if (target >= 0 && target !== internalSnapIndexRef.current) {
      safeSnapToIndex(historySheetRef, target, historySnapPoints.length);
    }
  }, [historySnapPoints, historySnapIds]);

  // Height of the list's visible window at the settled snap: the snap's sheet
  // height minus the handle. Clamping the RecyclerListView's frame to this
  // (instead of letting it fill the max-snap-sized content wrapper) keeps its
  // scroll range inside what's actually on screen, so the last row is always
  // reachable. Stays `undefined` until the layout is measured (snap points are
  // still percentage strings), when the list falls back to `flex: 1`.
  const activeSnap =
    historySnapPoints[Math.min(snapIndex, historySnapPoints.length - 1)];
  const listAreaH =
    typeof activeSnap === 'number' && handleH > 0
      ? Math.max(activeSnap - handleH, 0)
      : undefined;

  const mergedValueTransfers = useMemo(() => {
    return valueTransfers ?? [];
  }, [valueTransfers]);

  const fetchValueTransfersFiltered = useMemo(() => {
    if (mergedValueTransfers.length === 0 && valueTransfers === null) {
      return [] as ValueTransferType[];
    }
    if (!filterKind && !filterFailed && !filterMemos && !filterWithFunds) {
      return mergedValueTransfers;
    }
    return mergedValueTransfers.filter((vt: ValueTransferType) => {
      let selectedKind: boolean = true;
      let selectedFailed: boolean = true;
      let selectedMemos: boolean = true;
      let selectedWithFunds: boolean = true;
      if (filterKind) {
        selectedKind = false;
        if (
          filterKind === FilterEnum.sent &&
          (vt.kind === ValueTransferKindEnum.Sent ||
            vt.kind === ValueTransferKindEnum.SendToSelf ||
            vt.kind === ValueTransferKindEnum.MemoToSelf ||
            vt.kind === ValueTransferKindEnum.Migration ||
            vt.kind === ValueTransferKindEnum.Rejection)
        ) {
          selectedKind = true;
        } else if (
          filterKind === FilterEnum.received &&
          vt.kind === ValueTransferKindEnum.Received
        ) {
          selectedKind = true;
        } else if (
          filterKind === FilterEnum.shielded &&
          vt.kind === ValueTransferKindEnum.Shield
        ) {
          selectedKind = true;
        }
      }
      if (filterFailed) {
        selectedFailed = false;
        if (vt.status === RPCValueTransfersStatusEnum.failed) {
          selectedFailed = true;
        }
      }
      if (filterMemos) {
        selectedMemos = false;
        const haveMemo = vt.memos && vt.memos.length > 0 && !!vt.memos.join('');
        if (haveMemo) {
          selectedMemos = true;
        }
      }
      if (filterWithFunds) {
        selectedWithFunds = false;
        if (vt.amount > 0) {
          selectedWithFunds = true;
        }
      }
      return (
        selectedKind && selectedFailed && selectedMemos && selectedWithFunds
      );
    });
  }, [
    filterFailed,
    filterKind,
    filterMemos,
    filterWithFunds,
    mergedValueTransfers,
    valueTransfers,
  ]);

  useEffect(() => {
    if (valueTransfers !== null) {
      const vtf = fetchValueTransfersFiltered;
      setValueTransfersFiltered(vtf);
      const vtfs = vtf.slice(0, numVt);
      setValueTransfersSliced(vtfs);
      setDataProvider(data => data.cloneWithRows(vtfs));
      setLoading(false);
    }
  }, [fetchValueTransfersFiltered, numVt, valueTransfers, server.chainName]);

  const hasMore = numVt < valueTransfersFiltered.length;

  // Auto-pagination: RecyclerListView fires onEndReached when the user
  // approaches the bottom of the list — bump `numVt` so the next page
  // appears without any user action.
  const onEndReached = useCallback(() => {
    if (hasMore) {
      setNumVt(prev => prev + PAGE_SIZE);
    }
  }, [hasMore]);

  const handleScrollToTop = useCallback(() => {
    if (scrollViewRef.current && !isScrollingToTop) {
      setIsScrollingToTop(true);

      // Clear any existing timeout
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
      }

      // Force set to top immediately for UI feedback
      setIsAtTop(true);

      // Try multiple scroll methods for reliability
      try {
        // Method 1: Use scrollToTop
        scrollViewRef.current.scrollToTop(true);

        // Method 2: Fallback to scrollToIndex if scrollToTop fails
        setTimeout(() => {
          if (scrollViewRef.current) {
            try {
              scrollViewRef.current.scrollToIndex(0, true);
            } catch (e) {
              console.log('scrollToIndex fallback failed:', e);
            }
          }
        }, 100);
      } catch (error) {
        console.log('scrollToTop failed:', error);
      }

      // Set timeout to reset scrolling state - longer timeout for animation
      scrollTimeoutRef.current = setTimeout(() => {
        setIsScrollingToTop(false);
        // Double-check position after scroll animation
        if (scrollViewRef.current) {
          const offset = scrollViewRef.current.getCurrentScrollOffset();
          setIsAtTop(offset <= 100);
        }
      }, 800);
    }
  }, [isScrollingToTop]);

  useEffect(() => {
    if (scrollToTop) {
      handleScrollToTop();
      setScrollToTop(false);
    }
  }, [scrollToTop, handleScrollToTop, setScrollToTop]);

  const handleScroll = useCallback(
    (_rawEvent: ScrollEvent, _offsetX: number, offsetY: number) => {
      const isTop = offsetY <= 100;

      // If we're scrolling to top and we've reached the top, stop the scrolling state
      if (isScrollingToTop && isTop) {
        setIsScrollingToTop(false);
        if (scrollTimeoutRef.current) {
          clearTimeout(scrollTimeoutRef.current);
          scrollTimeoutRef.current = null;
        }
      }

      // Always update isAtTop for manual scrolling
      setIsAtTop(isTop);
    },
    [isScrollingToTop],
  );

  const setValueTransferDetailModalShow = useCallback(
    (_index: number, vt: ValueTransferType) => {
      const targetIndex = valueTransfersSliced.indexOf(vt);
      const totalLength =
        valueTransfersFiltered !== null
          ? valueTransfersFiltered.length
          : valueTransfersSliced.length;
      navigation.navigate(RouteEnum.ValueTransferDetail, {
        index: targetIndex >= 0 ? targetIndex : 0,
        vt: vt,
        valueTransfersSliced: valueTransfersSliced,
        totalLength,
      });
    },
    [navigation, valueTransfersSliced, valueTransfersFiltered],
  );

  const rowRenderer = (
    type: string | number,
    data: ValueTransferType,
    index: number,
  ) => {
    let txmonth =
      data && data.time
        ? Utils.formatDate(data.time * 1000, 'MMM yyyy', language)
        : '--- ----';

    return (
      <ValueTransferLine
        index={index}
        vt={data}
        month={
          type === ViewTypes.WITH_MONTH || type === ViewTypes.WITH_MONTH_REFRESH
            ? txmonth
            : ''
        }
        setValueTransferDetailModalShow={setValueTransferDetailModalShow}
        nextLineWithSameTxid={
          index >= valueTransfersSliced.length - 1
            ? false
            : valueTransfersSliced[index + 1].txid === data.txid
        }
        addressProtected={data.address === zenniesDonationAddress}
        screenName={screenName}
        registerSwipeable={registerSwipeable(index)}
        closeAllSwipeables={() => closeAllSwipeables()}
        closeOtherSwipeables={() => closeAllSwipeables(index)}
      />
    );
  };

  const renderBackdrop = (props: BottomSheetBackdropProps) => (
    <BottomSheetBackdrop
      {...props}
      disappearsOnIndex={-1}
      appearsOnIndex={0}
      pressBehavior="close"
    />
  );

  const renderHistoryHandle = useCallback(
    () => (
      <View
        onLayout={e => setHandleH(e.nativeEvent.layout.height)}
        style={{
          paddingTop: 8,
          paddingBottom: 6,
          paddingHorizontal: 16,
          backgroundColor: colors.bgSurface,
          borderTopLeftRadius: 40,
          borderTopRightRadius: 40,
        }}
      >
        <SheetRim />
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          {/* Left spacer matches the filter Pressable width
              (paddingHorizontal: 14 × 2 + icon 20 = 48) so the title
              stays perfectly centered. flex/textAlign/numberOfLines on
              the BoldText keep a long translation from being clipped. */}
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
            {translate('history.title') as string}
          </BoldText>
          <Pressable
            onPress={() => {
              setShowFilters(true);
              bottomSheetRef.current?.present();
            }}
            hitSlop={8}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              paddingHorizontal: 14,
              paddingVertical: 4,
            }}
          >
            <FiltersIcon color={colors.fgMuted} size={20} />
            {(!!filterKind ||
              filterFailed ||
              filterMemos ||
              filterWithFunds) && (
              <View
                style={{
                  backgroundColor: colors.fgDefault,
                  width: 7,
                  height: 7,
                  borderRadius: 7,
                  marginLeft: -3,
                  marginTop: -8,
                }}
              />
            )}
          </Pressable>
        </View>
      </View>
    ),
    [colors, translate, filterKind, filterFailed, filterMemos, filterWithFunds],
  );

  const renderFiltersHandle = useCallback(
    () => (
      <View
        style={{
          paddingTop: 8,
          paddingBottom: 6,
          paddingHorizontal: 16,
          backgroundColor: colors.bgSurface,
          borderTopLeftRadius: 40,
          borderTopRightRadius: 40,
        }}
      >
        <SheetRim />
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          {/* Left spacer matches the X Pressable width
              (paddingHorizontal: 14 × 2 + icon 20 = 48) so the title
              stays perfectly centered. */}
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
            {translate('history.filters') as string}
          </BoldText>
          <Pressable
            onPress={() => bottomSheetRef.current?.dismiss()}
            hitSlop={8}
            style={{
              paddingHorizontal: 14,
              paddingVertical: 4,
            }}
          >
            <FontAwesomeIcon icon={faXmark} size={20} color={colors.fgMuted} />
          </Pressable>
        </View>
      </View>
    ),
    [colors, translate],
  );

  const hide = useCallback(() => {
    bottomSheetRef.current?.dismiss();
    setShowFilters(false);
  }, []);

  return (
    <View
      style={{ flex: 1 }}
      onLayout={e => setContainerH(e.nativeEvent.layout.height)}
    >
      <View
        accessible={true}
        accessibilityLabel={translate('history.title-acc') as string}
        style={{
          flex: 1,
          display: 'flex',
          justifyContent: 'flex-start',
          width: '100%',
        }}
      >
        <View onLayout={e => setHeaderH(e.nativeEvent.layout.height)}>
          <Header
            testID="valuetransfer text"
            title={''}
            toggleMenuDrawer={toggleMenuDrawer}
            setPrivacyOption={setPrivacyOption}
            addLastSnackbar={addLastSnackbar /* context */}
            screenName={screenName}
            setShieldingAmount={setShieldingAmount}
            setScrollToTop={setScrollToTop}
            setScrollToBottom={setScrollToBottom}
            setBackgroundError={setBackgroundError /* context */}
            showMessagesIcon={true}
            onUsdRowLayout={setUsdRowH}
            onPriceRowLayout={setPriceRowH}
            onManualFetchPrice={revealPrice}
          />
        </View>
        {/* Measured so the history sheet's snap points sit just below it. An
            empty wrapper reports height 0 when the banner is hidden. */}
        <View
          onLayout={e => setBannerH(e.nativeEvent.layout.height)}
          pointerEvents="box-none"
        >
          {showIronwoodBanner && (
            <IronwoodMigrationBanner
              amount={orchardAmount}
              currencyName={info.currencyName}
              onStart={() => navigation.navigate(RouteEnum.MeetIronwood)}
              onResume={route => navigation.navigate(route)}
            />
          )}
        </View>
      </View>
      <Animated.View
        pointerEvents="box-none"
        style={[StyleSheet.absoluteFill, sheetSlideStyle]}
      >
        <BottomSheet
          ref={historySheetRef}
          snapPoints={historySnapPoints}
          index={0}
          onChange={i => {
            internalSnapIndexRef.current = i;
            setSnapIndex(i);
            if (i >= 0 && historySnapIds[i]) {
              currentSnapIdRef.current = historySnapIds[i];
            }
            onPriceSnapChange(i);
          }}
          enableDynamicSizing={false}
          enablePanDownToClose={false}
          enableContentPanningGesture={false}
          keyboardBehavior={'interactive'}
          keyboardBlurBehavior={'restore'}
          android_keyboardInputMode={'adjustResize'}
          backgroundStyle={{
            backgroundColor: colors.bgSurface,
            borderTopLeftRadius: 40,
            borderTopRightRadius: 40,
          }}
          handleComponent={renderHistoryHandle}
        >
          <View
            style={
              listAreaH != null
                ? {
                    height: listAreaH,
                    backgroundColor: colors.bgSurface,
                  }
                : {
                    flex: 1,
                    backgroundColor: colors.bgSurface,
                  }
            }
          >
            {loading ? (
              <ActivityIndicator
                size="large"
                color={colors.fgAccent}
                style={{ marginVertical: 20 }}
              />
            ) : (
              <View style={{ flex: 1, width: '100%' }}>
                {valueTransfersSliced && valueTransfersSliced.length > 0 ? (
                  <RecyclerListView
                    ref={scrollViewRef}
                    renderAheadOffset={500}
                    scrollViewProps={{
                      refreshControl: (
                        <RefreshControl
                          refreshing={false}
                          onRefresh={() => doRefresh(screenName)}
                          tintColor={colors.fgDefault}
                          title={translate('history.refreshing') as string}
                        />
                      ),
                      style: {
                        flexGrow: 1,
                        width: '100%',
                      },
                    }}
                    onScroll={handleScroll}
                    scrollThrottle={100}
                    layoutProvider={layoutProvider}
                    dataProvider={dataProvider}
                    rowRenderer={rowRenderer}
                    onEndReached={onEndReached}
                    onEndReachedThreshold={0.5}
                    renderFooter={() =>
                      // Generous bottom margin so the last transaction (and
                      // the loading spinner / "end of list" label) can be
                      // scrolled clear of the bottom tab bar on small
                      // screens — otherwise the final row sits hidden
                      // behind the navigator chrome.
                      hasMore ? (
                        <View
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'flex-start',
                            marginTop: 20,
                            marginBottom: 200,
                          }}
                        >
                          <ActivityIndicator
                            size="small"
                            color={colors.fgAccent}
                          />
                        </View>
                      ) : !!valueTransfersSliced &&
                        !!valueTransfersSliced.length ? (
                        <View
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'flex-start',
                            marginTop: 20,
                            marginBottom: 200,
                          }}
                        >
                          <FadeText style={{ color: colors.fgAccent }}>
                            {translate('history.end') as string}
                          </FadeText>
                        </View>
                      ) : null
                    }
                  />
                ) : (
                  <View
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      marginTop: 30,
                    }}
                  >
                    <FadeText style={{ color: colors.fgAccent }}>
                      {translate('history.empty') as string}
                    </FadeText>
                  </View>
                )}
              </View>
            )}
          </View>
        </BottomSheet>
        {/* Floating "back to top" anchored to the Animated.View (full
            screen) instead of the BottomSheet content. On Android, the
            inner container ends above the system nav bar; anchoring there
            pushed the button visibly higher than on iOS. Pinning it to
            the outer wrapper keeps it at the same visual offset across
            platforms. */}
        {!isAtTop && (
          <Pressable
            onPress={handleScrollToTop}
            disabled={isScrollingToTop}
            style={({ pressed }) => ({
              position: 'absolute',
              // Raised so the button clears the bottom tab bar on every
              // platform — matches the offset used by AddressList. The
              // previous `30` left it visually overlapping the tabs.
              bottom: 105,
              right: 10,
              width: 36,
              height: 36,
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: colors.bgChrome,
              borderRadius: 50,
              transform: [{ scale: pressed ? 0.9 : 1 }],
              opacity: isScrollingToTop ? 0.5 : 1,
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 3 },
              shadowOpacity: 0.8,
              shadowRadius: 14,
              elevation: 9,
            })}
          >
            <RingBorder size={36} />
            <FontAwesomeIcon
              size={16}
              icon={faAngleUp}
              color={colors.fgMuted}
            />
          </Pressable>
        )}
      </Animated.View>
      <BottomSheetModal
        ref={bottomSheetRef}
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
        handleComponent={renderFiltersHandle}
        backgroundStyle={{
          backgroundColor: colors.bgSurface,
          borderTopLeftRadius: 40,
          borderTopRightRadius: 40,
        }}
        onDismiss={() => setShowFilters(false)}
        backdropComponent={renderBackdrop}
      >
        <BottomSheetView
          style={{
            backgroundColor: colors.bgSurface,
            paddingBottom: 30,
          }}
        >
          {showFilters && (
            <Filters
              closeSheet={hide}
              filterKind={filterKind}
              setFilterKind={setFilterKind}
              filterFailed={filterFailed}
              setFilterFailed={setFilterFailed}
              filterMemos={filterMemos}
              setFilterMemos={setFilterMemos}
              filterWithFunds={filterWithFunds}
              setFilterWithFunds={setFilterWithFunds}
            />
          )}
        </BottomSheetView>
      </BottomSheetModal>
    </View>
  );
};

export default React.memo(History);
