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
  View,
  RefreshControl,
  ActivityIndicator,
  Dimensions,
  Pressable,
  StyleSheet,
} from 'react-native';
import Animated from 'react-native-reanimated';
import { useIsFocused, useNavigation } from '@react-navigation/native';
import { useTheme, slopFor } from '@app/theme';

import {
  ChainNameEnum,
  FilterEnum,
  isIronwoodActive,
  Route,
  ValueTransferKindEnum,
  //SelectServerEnum,
  //SendPageStateClass,
  //ServerType,
  ValueTransferType,
} from '@app/AppState';
import { HomeTabNavigation, HomeTabScreenProps } from '@app/types';
import FadeText from '@ui/primitives/FadeText';
import BoldText from '@ui/primitives/BoldText';
import AppSheet from '@ui/primitives/AppSheet';
import AppSheetModal from '@ui/primitives/AppSheetModal';
import RingBorder from '@ui/primitives/RingBorder';
import ValueTransferLine from './components/ValueTransferLine';
import SwapLine from './components/SwapLine';
import LegLine from './components/LegLine';
import MonthHeader from './components/MonthHeader';
import { ITEM_HEIGHT, buildHistoryItems, monthAt } from './historyItems';
import type { HistoryItem } from './historyItems';
import IronwoodMigrationBanner from './components/IronwoodMigrationBanner';
import SeedBackupNotice from './components/SeedBackupNotice';
import TransparentNotice from './components/TransparentNotice';
import ShieldSheet from './components/ShieldSheet';
import { useShieldFunds } from '@app/hooks/useShieldFunds';
import ViewOnlyNotice from './components/ViewOnlyNotice';
import NoticeStack, { Notice, NOTICE_RADIUS } from '@ui/widgets/NoticeStack';
import { PriceCard } from '@ui/widgets/Header/components/PriceRow';
import { fiatQuote } from '@app/price/fiatQuote';
import {
  ContextAppLoaded,
  useSwapRecords,
  useValueTransfersWithSwaps,
} from '@app/context';
import { useDismissSheetsOnBlur } from '@app/hooks/useDismissSheetsOnBlur';
import { useOptionsPanelSheetSlide } from '@app/hooks/useOptionsPanelSheetSlide';
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
import { Swipeable } from 'react-native-gesture-handler';
import { RPCValueTransfersStatusEnum } from '@app/walletBackend/enums/RPCValueTransfersStatusEnum';
import BottomSheet, { BottomSheetModal } from '@gorhom/bottom-sheet';
import Filters, { HISTORY_FILTERS, filterOf } from './components/Filters';
import Text from '@ui/primitives/Text';
import FreshGlow from './components/FreshGlow';
import { useFreshRows } from './useFreshRows';
import { FiltersIcon } from '@ui/primitives/Icons/FiltersIcon';
import { XIcon } from '@ui/primitives/Icons/XIcon';
import { ChevronUp } from '@ui/primitives/Icons/Chevron';

/** How long a finished backup keeps its green pill before the card leaves. */
const SEED_LEAVE_MS = 900;

const ViewTypes = {
  MONTH: 0,
  ROW: 1,
  LEG: 2,
};

type HistoryProps = HomeTabScreenProps<'History'>;

const History: React.FunctionComponent<HistoryProps> = () => {
  const navigation = useNavigation<HomeTabNavigation<'History'>>();
  const context = useContext(ContextAppLoaded);
  const {
    setScrollToTop,
    scrollToTop,
    setShieldingAmount,
    translate,
    valueTransfers,
    language,
    setBackgroundError,
    addLastSnackbar,
    server,
    doRefresh,
    setPrivacyOption,
    totalBalance,
    readOnly,
    info,
    zecPrice,
    seedBackedUp,
    viewOnlyNoticeDismissed,
    dismissViewOnlyNotice,
    somePending,
    shieldingAmount,
    mixnetView,
    sendPermitNow,
    setScrollToBottom,
  } = context;
  const shieldSheetRef = useRef<BottomSheetModal>(null);
  const { showShieldButton, shieldingFee, shieldNow } = useShieldFunds({
    readOnly,
    setShieldingAmount,
    server,
    somePending,
    totalBalance,
    shieldingAmount,
    translate,
    addLastSnackbar,
    setBackgroundError,
    setScrollToTop,
    setScrollToBottom,
    sendPermitNow,
  });
  const { colors } = useTheme();

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
  // The seed notice steps aside while the backup flow grows out of it.
  const focused = useIsFocused();
  const [backingUp, setBackingUp] = useState<boolean>(false);
  useEffect(() => {
    if (focused) {
      setBackingUp(false);
    }
  }, [focused]);
  // A backup finished while the flow was open: the card stays a moment once
  // History is back, so its pill can turn green before it leaves.
  const [seedLeaving, setSeedLeaving] = useState<boolean>(false);
  const seedWasPending = useRef<boolean>(!seedBackedUp);
  useEffect(() => {
    if (!seedBackedUp) {
      seedWasPending.current = true;
      return;
    }
    if (!focused || !seedWasPending.current) {
      return;
    }
    seedWasPending.current = false;
    setSeedLeaving(true);
    const timer = setTimeout(() => setSeedLeaving(false), SEED_LEAVE_MS);
    return () => clearTimeout(timer);
  }, [seedBackedUp, focused]);
  const showSeedNotice = !readOnly && (!seedBackedUp || seedLeaving);

  const showPrice = fiatQuote(zecPrice, server, info.chainName).kind !== 'none';

  const notices: Notice[] = [];
  if (showShieldButton) {
    notices.push({
      key: 'transparent',
      node: (
        <TransparentNotice
          amount={shieldingAmount}
          onShield={() => shieldSheetRef.current?.present()}
        />
      ),
    });
  }
  if (readOnly && !viewOnlyNoticeDismissed) {
    notices.push({
      key: 'viewonly',
      node: (
        <ViewOnlyNotice
          onDismiss={dismissViewOnlyNotice}
          onViewKey={from =>
            navigation.navigate(Route.ViewingKey, {
              entry: { kind: 'card', from },
            })
          }
        />
      ),
    });
  }
  if (showIronwoodBanner) {
    notices.push({
      key: 'ironwood',
      node: (
        <IronwoodMigrationBanner
          amount={orchardAmount}
          currencyName={info.currencyName}
          onStart={() => navigation.navigate(Route.MeetIronwood)}
          onResume={route => navigation.navigate(route)}
        />
      ),
    });
  }
  if (showSeedNotice) {
    notices.push({
      key: 'seed',
      node: (
        <SeedBackupNotice
          covered={backingUp && !focused}
          backedUp={seedBackedUp}
          onBackUp={from => {
            setBackingUp(true);
            navigation.navigate(Route.SeedBackup, {
              entry: { kind: 'card', from },
            });
          }}
        />
      ),
    });
  }
  if (showPrice) {
    notices.push({
      key: 'price',
      node: (
        <PriceCard
          translate={translate}
          zecPrice={zecPrice}
          info={info}
          server={server}
          style={{ borderRadius: NOTICE_RADIUS }}
        />
      ),
    });
  }

  const bottomSheetRef = useRef<BottomSheetModal>(null);
  const historySheetRef = useRef<BottomSheet>(null);
  const internalSnapIndexRef = useRef<number>(0);

  type SnapId = 'balance' | 'usd' | 'header' | 'max';
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

  const _dataProvider = useMemo(
    () =>
      new DataProvider(
        // RecyclerListView's diff fires on every poll (every 5s) with up to
        // N×N row comparisons; a deep lodash.isEqual here is what was making
        // the list freeze. Only fields that can actually change for an
        // existing transfer matter visually: status (pending → confirmed)
        // and confirmations (advance with each new block). txid is the
        // identity guard.
        (r1: HistoryItem, r2: HistoryItem) =>
          r1.key !== r2.key ||
          (r1.kind !== 'month' &&
            r2.kind !== 'month' &&
            (r1.vt.status !== r2.vt.status ||
              r1.vt.confirmations !== r2.vt.confirmations ||
              r1.vt.swapStatus !== r2.vt.swapStatus)) ||
          (r1.kind === 'swap' &&
            r2.kind === 'swap' &&
            (r1.open !== r2.open || r1.legCount !== r2.legCount)),
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
    if (!isMainChain) {
      setUsdRowH(0);
    }
  }, [server.chainName]);

  const snapEntries = useMemo<{ id: SnapId; value: number | string }[]>(() => {
    const isMainChain = server.chainName === ChainNameEnum.mainChainName;
    // Until the layout reports the actual container + header heights, fall
    // back to percentages.
    if (containerH <= 0 || headerH <= 0) {
      return isMainChain
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
    // The notice stack (when shown) sits between the header and the sheet in
    // normal flow, so the sheet's low/mid snaps must shrink by its height to
    // leave it uncovered; the max snap still climbs over both.
    const snapBase = containerH - headerH - bannerH - SNAP_GAP;
    const snapLow = Math.max(snapBase + BALANCE_SNAP_BUMP, 100);
    const snapMid = Math.min(
      Math.max(snapBase + usdRowH + BALANCE_SNAP_BUMP, snapLow + 1),
      containerH - TOP_ICONS_H - SNAP_GAP,
    );
    const snapMax = Math.max(containerH - TOP_ICONS_H - SNAP_GAP, snapLow + 1);

    if (bannerH > 0) {
      // Three stops, as the redesign has them: under the notices, under the
      // balance (over the notices) and under the top bar.
      const bannerSafe = Math.min(Math.max(snapBase, 100), snapMax - 2);
      const underBalance = Math.min(
        Math.max(containerH - headerH - SNAP_GAP, bannerSafe + 1),
        snapMax - 1,
      );
      return [
        { id: 'balance', value: bannerSafe },
        { id: 'header', value: underBalance },
        { id: 'max', value: snapMax },
      ];
    }
    const entries: { id: SnapId; value: number }[] = [
      { id: 'balance', value: snapLow },
    ];
    if (isMainChain && usdRowH > 0) {
      entries.push({ id: 'usd', value: snapMid });
    }
    entries.push({ id: 'max', value: snapMax });
    return entries;
  }, [server.chainName, containerH, headerH, usdRowH, bannerH]);

  const historySnapPoints = useMemo(
    () => snapEntries.map(e => e.value),
    [snapEntries],
  );
  const historySnapIds = useMemo(
    () => snapEntries.map(e => e.id),
    [snapEntries],
  );

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

  const mergedValueTransfers = useValueTransfersWithSwaps(
    useMemo(() => valueTransfers ?? [], [valueTransfers]),
  );

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
            vt.kind === ValueTransferKindEnum.Rejection ||
            (vt.kind === ValueTransferKindEnum.Swap && !vt.swapIsInbound))
        ) {
          selectedKind = true;
        } else if (
          filterKind === FilterEnum.received &&
          (vt.kind === ValueTransferKindEnum.Received ||
            (vt.kind === ValueTransferKindEnum.Swap && vt.swapIsInbound))
        ) {
          selectedKind = true;
        } else if (
          filterKind === FilterEnum.shielded &&
          vt.kind === ValueTransferKindEnum.Shield
        ) {
          selectedKind = true;
        } else if (
          filterKind === FilterEnum.swaps &&
          vt.kind === ValueTransferKindEnum.Swap
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
      setLoading(false);
    }
  }, [fetchValueTransfersFiltered, numVt, valueTransfers, server.chainName]);

  const hasMore = numVt < valueTransfersFiltered.length;

  // The swaps whose Zcash transactions are unfolded under their row.
  const swapRecords = useSwapRecords();
  const [openSwaps, setOpenSwaps] = useState<ReadonlySet<string>>(new Set());
  const toggleSwap = useCallback((recordId: string) => {
    setOpenSwaps(previous => {
      const next = new Set(previous);
      if (next.has(recordId)) {
        next.delete(recordId);
      } else {
        next.add(recordId);
      }
      return next;
    });
  }, []);
  const historyItems = useMemo(
    () =>
      buildHistoryItems({
        rows: valueTransfersSliced,
        all: mergedValueTransfers,
        records: swapRecords,
        open: openSwaps,
        monthOf: timeSec =>
          Utils.formatDate(timeSec * 1000, 'MMM yyyy', language),
      }),
    [
      valueTransfersSliced,
      mergedValueTransfers,
      swapRecords,
      openSwaps,
      language,
    ],
  );
  // The month pinned over the list while its rows scroll under it.
  const [pinnedMonth, setPinnedMonth] = useState<string>('');
  const historyItemsRef = useRef<HistoryItem[]>([]);
  historyItemsRef.current = historyItems;
  useEffect(() => {
    setDataProvider(data => data.cloneWithRows(historyItems));
  }, [historyItems]);

  const layoutProvider = useMemo(
    () =>
      new LayoutProvider(
        (index: number) => {
          const item = historyItems[index];
          return item?.kind === 'month'
            ? ViewTypes.MONTH
            : item?.kind === 'leg'
              ? ViewTypes.LEG
              : ViewTypes.ROW;
        },
        (type, dim) => {
          dim.width = Dimensions.get('window').width;
          dim.height =
            type === ViewTypes.MONTH
              ? ITEM_HEIGHT.month
              : type === ViewTypes.LEG
                ? ITEM_HEIGHT.leg
                : ITEM_HEIGHT.transfer;
        },
      ),
    [historyItems],
  );

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

  // A press on the tab while it is open scrolls the list to the top.
  useEffect(
    () =>
      navigation.addListener('tabPress', event => {
        if (navigation.isFocused() && !event.defaultPrevented) {
          handleScrollToTop();
        }
      }),
    [navigation, handleScrollToTop],
  );

  const handleScroll = useCallback(
    (_rawEvent: ScrollEvent, _offsetX: number, offsetY: number) => {
      setPinnedMonth(monthAt(historyItemsRef.current, offsetY));
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
      navigation.navigate(Route.ValueTransferDetail, {
        index: targetIndex >= 0 ? targetIndex : 0,
        vt: vt,
        valueTransfersSliced: valueTransfersSliced,
        totalLength,
      });
    },
    [navigation, valueTransfersSliced, valueTransfersFiltered],
  );

  /** Transactions that turned up while History is open, lit for a moment. */
  const freshRows = useFreshRows(valueTransfers);

  const rowRenderer = (
    _type: string | number,
    item: HistoryItem,
    index: number,
  ) => {
    switch (item.kind) {
      case 'month':
        return <MonthHeader label={item.label} />;
      case 'leg':
        return <LegLine vt={item.vt} recordId={item.recordId} />;
      case 'swap':
        return item.record ? (
          <SwapLine
            index={index}
            record={item.record}
            hairline={!item.first}
            legCount={item.legCount}
            open={item.open}
            onToggle={() => toggleSwap(item.record?.recordId ?? '')}
          />
        ) : (
          <ValueTransferLine
            index={index}
            vt={item.vt}
            hairline={!item.first}
            setValueTransferDetailModalShow={setValueTransferDetailModalShow}
            registerSwipeable={registerSwipeable(index)}
            closeAllSwipeables={() => closeAllSwipeables()}
            closeOtherSwipeables={() => closeAllSwipeables(index)}
          />
        );
      default:
        return (
          <FreshGlow fresh={freshRows.has(item.vt.txid)}>
            <ValueTransferLine
              index={index}
              vt={item.vt}
              hairline={!item.first}
              setValueTransferDetailModalShow={setValueTransferDetailModalShow}
              registerSwipeable={registerSwipeable(index)}
              closeAllSwipeables={() => closeAllSwipeables()}
              closeOtherSwipeables={() => closeAllSwipeables(index)}
            />
          </FreshGlow>
        );
    }
  };

  const historyHeader = (
    <View
      onLayout={e => setHandleH(e.nativeEvent.layout.height)}
      style={{
        paddingTop: 8,
        paddingBottom: 6,
        paddingHorizontal: 16,
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
          {(!!filterKind || filterFailed || filterMemos || filterWithFunds) && (
            <View
              testID="history.filter.dot"
              style={{
                backgroundColor: colors.fgPriceUp,
                width: 8,
                height: 8,
                borderRadius: 4,
                marginLeft: -3,
                marginTop: -8,
                borderWidth: 2,
                borderColor: colors.bgSurface,
              }}
            />
          )}
        </Pressable>
      </View>
    </View>
  );

  /** The one filter on, for the bar over the list. */
  const activeFilter = filterOf(filterKind, filterFailed, filterMemos);

  const filtersXHeader = (
    <View
      style={{
        paddingTop: 8,
        paddingBottom: 6,
        paddingHorizontal: 16,
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
        <XIcon size={20} color={colors.fgMuted} />
      </Pressable>
    </View>
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
            setPrivacyOption={setPrivacyOption}
            addLastSnackbar={addLastSnackbar /* context */}
            setShieldingAmount={setShieldingAmount}
            setBackgroundError={setBackgroundError /* context */}
            showMessagesIcon={true}
            onUsdRowLayout={setUsdRowH}
            noPriceRow
          />
        </View>
        <NoticeStack notices={notices} onHeight={setBannerH} />
      </View>
      <Animated.View
        pointerEvents="box-none"
        style={[StyleSheet.absoluteFill, sheetSlideStyle]}
      >
        <AppSheet
          ref={historySheetRef}
          snapPoints={historySnapPoints}
          header={historyHeader}
          onChange={i => {
            internalSnapIndexRef.current = i;
            setSnapIndex(i);
            if (i >= 0 && historySnapIds[i]) {
              currentSnapIdRef.current = historySnapIds[i];
            }
          }}
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
                {activeFilter !== 'all' && (
                  <View
                    testID="history.filter.bar"
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      marginHorizontal: 20,
                      marginTop: 4,
                      marginBottom: 4,
                      paddingVertical: 8,
                      paddingLeft: 16,
                      paddingRight: 8,
                      borderRadius: 12,
                      borderWidth: 1,
                      borderColor: colors.borderAccent,
                      backgroundColor: colors.bgAccentSubtle,
                    }}
                  >
                    <Text variant="caption" tone="muted">
                      {`${translate('history.filter-showing') as string} `}
                      <Text variant="caption" style={{ fontWeight: '700' }}>
                        {(
                          translate(
                            HISTORY_FILTERS.find(
                              ([key]) => key === activeFilter,
                            )?.[1] ?? 'history.filter-all',
                          ) as string
                        ).trim()}
                      </Text>
                    </Text>
                    <Pressable
                      testID="history.filter.clear"
                      accessibilityRole="button"
                      hitSlop={8}
                      onPress={() => {
                        setFilterKind(null);
                        setFilterFailed(false);
                        setFilterMemos(false);
                        setFilterWithFunds(false);
                      }}
                      style={{ paddingHorizontal: 8, paddingVertical: 4 }}
                    >
                      <Text
                        variant="caption"
                        style={{ fontWeight: '700', color: colors.fgPriceUp }}
                      >
                        {translate('clear') as string}
                      </Text>
                    </Pressable>
                  </View>
                )}
                {valueTransfersSliced && valueTransfersSliced.length > 0 ? (
                  <RecyclerListView
                    ref={scrollViewRef}
                    renderAheadOffset={500}
                    scrollViewProps={{
                      refreshControl: (
                        <RefreshControl
                          refreshing={false}
                          onRefresh={() => doRefresh('valueTransfers')}
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
                    extendedState={{ freshRows }}
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
                          <FadeText>
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
                {!!pinnedMonth && (
                  <View
                    pointerEvents="none"
                    style={{ position: 'absolute', top: 0, left: 0, right: 0 }}
                  >
                    <MonthHeader label={pinnedMonth} />
                  </View>
                )}
              </View>
            )}
          </View>
        </AppSheet>
        {/* Floating "back to top" anchored to the Animated.View (full
            screen) instead of the BottomSheet content. On Android, the
            inner container ends above the system nav bar; anchoring there
            pushed the button visibly higher than on iOS. Pinning it to
            the outer wrapper keeps it at the same visual offset across
            platforms. */}
        {!isAtTop && (
          <Pressable
            hitSlop={slopFor(36)}
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
              borderWidth: 1,
              borderColor: colors.bottomSheetBorder,
            })}
          >
            <RingBorder size={36} />
            <ChevronUp size={16} color={colors.fgMuted} />
          </Pressable>
        )}
      </Animated.View>
      <AppSheetModal
        ref={bottomSheetRef}
        header={filtersXHeader}
        contentStyle={{ paddingBottom: 30 }}
        onDismiss={() => setShowFilters(false)}
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
      </AppSheetModal>
      <ShieldSheet
        ref={shieldSheetRef}
        amount={shieldingAmount}
        fee={shieldingFee}
        mixnetView={mixnetView}
        onShield={shieldNow}
      />
    </View>
  );
};

export default React.memo(History);
