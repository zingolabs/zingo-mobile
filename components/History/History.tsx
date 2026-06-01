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
  Platform,
  Pressable,
} from 'react-native';
import {
  NavigationProp,
  ParamListBase,
  useNavigation,
  useTheme,
} from '@react-navigation/native';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { faAngleUp, faXmark } from '@fortawesome/free-solid-svg-icons';

import {
  ButtonTypeEnum,
  CurrencyEnum,
  FilterEnum,
  GlobalConst,
  RouteEnum,
  ScreenEnum,
  ValueTransferKindEnum,
  //SelectServerEnum,
  //SendPageStateClass,
  //ServerType,
  ValueTransferType,
} from '../../app/AppState';
import { AppDrawerParamList, ThemeType } from '../../app/types';
import FadeText from '../Components/FadeText';
import BoldText from '../Components/BoldText';
import Button from '../Components/Button';
import ValueTransferLine from './components/ValueTransferLine';
import { ContextAppLoaded } from '../../app/context';
import Header from '../Header';
import Utils from '../../app/utils';
import {
  DataProvider,
  RecyclerListView,
  LayoutProvider,
  RecyclerListViewProps,
} from 'recyclerlistview';
import { ScrollEvent } from 'recyclerlistview/dist/reactnative/core/scrollcomponent/BaseScrollView';
import { isEqual } from 'lodash';
import { RecyclerListViewState } from 'recyclerlistview/dist/reactnative/core/RecyclerListView';
import { DrawerScreenProps } from '@react-navigation/drawer';
import { Swipeable } from 'react-native-gesture-handler';
import { RPCValueTransfersStatusEnum } from '../../app/walletBackend/enums/RPCValueTransfersStatusEnum';
import BottomSheet, {
  BottomSheetBackdrop,
  BottomSheetBackdropProps,
  BottomSheetModal,
  BottomSheetView,
} from '@gorhom/bottom-sheet';
import Filters from './components/Filters';
import { FiltersIcon } from '../Components/Icons/FiltersIcon';

const ViewTypes = {
  WITH_MONTH: 0,
  WITHOUT_MONTH: 1,
  WITH_MONTH_REFRESH: 2,
  WITHOUT_MONTH_REFRESH: 3,
};

type HistoryProps = DrawerScreenProps<AppDrawerParamList, RouteEnum.History> & {
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
  } = context;
  const { colors } = useTheme() as ThemeType;
  const screenName = ScreenEnum.History;

  const [numVt, setNumVt] = useState<number>(50);
  const [loadMoreButton, setLoadMoreButton] = useState<boolean>(false);
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
  const [showFooter, setShowFooter] = useState<boolean>(false);
  // measured dynamically to compute history sheet snap points
  const [containerH, setContainerH] = useState<number>(0);
  const [headerH, setHeaderH] = useState<number>(0);
  const [usdRowH, setUsdRowH] = useState<number>(0);

  const bottomSheetRef = useRef<BottomSheetModal>(null);
  const historySheetRef = useRef<BottomSheet>(null);
  const scrollViewRef =
    useRef<RecyclerListView<RecyclerListViewProps, RecyclerListViewState>>(
      null,
    );
  const swipeablesRef = useRef(new Map<number, Swipeable>());

  const registerSwipeable = useCallback(
    (key: number) => (ref: Swipeable) => {
      swipeablesRef.current.set(key, ref);
    },
    [],
  );

  const closeAllSwipeables = useCallback((exceptKey?: number) => {
    swipeablesRef.current.forEach((ref, k) => {
      if (k !== exceptKey) {
        // soporta ambas APIs según versión
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
        (r1: ValueTransferType, r2: ValueTransferType) => !isEqual(r1, r2),
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
    const withUsd =
      currency === CurrencyEnum.USDCurrency ||
      currency === CurrencyEnum.USDTORCurrency;
    if (!withUsd) {
      setUsdRowH(0);
    }
  }, [currency]);

  const historySnapPoints = useMemo(() => {
    const withUsd =
      currency === CurrencyEnum.USDCurrency ||
      currency === CurrencyEnum.USDTORCurrency;
    // Until the layout reports the actual container + header heights, fall
    // back to percentages.
    if (containerH <= 0 || headerH <= 0) {
      return withUsd ? ['85%', '89%', '93%'] : ['89%', '93%'];
    }
    const snapBase = containerH - headerH - SNAP_GAP;
    const snapLow = Math.max(snapBase + BALANCE_SNAP_BUMP, 100);
    const snapMid = Math.min(
      Math.max(snapBase + usdRowH + BALANCE_SNAP_BUMP, snapLow + 1),
      containerH - TOP_ICONS_H - SNAP_GAP,
    );
    const snapMax = Math.max(containerH - TOP_ICONS_H - SNAP_GAP, snapLow + 1);
    if (withUsd && usdRowH > 0) {
      return [snapLow, snapMid, snapMax];
    }
    return [snapLow, snapMax];
  }, [currency, containerH, headerH, usdRowH]);

  const fetchValueTransfersFiltered = useMemo(() => {
    if (!valueTransfers) {
      return [] as ValueTransferType[];
    }
    if (!filterKind && !filterFailed && !filterMemos && !filterWithFunds) {
      return valueTransfers;
    }
    return valueTransfers.filter((vt: ValueTransferType) => {
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
  }, [filterFailed, filterKind, filterMemos, filterWithFunds, valueTransfers]);

  useEffect(() => {
    if (valueTransfers !== null) {
      const vtf = fetchValueTransfersFiltered;
      setValueTransfersFiltered(vtf);
      setLoadMoreButton(numVt < vtf.length);
      const vtfs = vtf.slice(0, numVt);
      setValueTransfersSliced(vtfs);
      setDataProvider(data => data.cloneWithRows(vtfs));
      setTimeout(() => {
        setLoading(false);
      }, 500);
    }
  }, [fetchValueTransfersFiltered, numVt, valueTransfers, server.chainName]);

  useEffect(() => {
    setLoadMoreButton(numVt < valueTransfersFiltered.length);
    const vtfs = valueTransfersFiltered.slice(0, numVt);
    setValueTransfersSliced(vtfs);
    setDataProvider(data => data.cloneWithRows(vtfs));
  }, [numVt, valueTransfersFiltered]);

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

  const loadMoreClicked = useCallback(() => {
    setNumVt(numVt + 50);
  }, [numVt]);

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

      setShowFooter(offsetY > 0);
    },
    [isScrollingToTop],
  );

  const setValueTransferDetailModalShow = useCallback(
    (index: number, vt: ValueTransferType) => {
      navigation.navigate(RouteEnum.ValueTransferDetail, {
        index: index,
        vt: vt,
        valueTransfersSliced: valueTransfersSliced,
        totalLength:
          valueTransfersFiltered !== null ? valueTransfersFiltered.length : 0,
      });
    },
    [navigation, valueTransfersSliced, valueTransfersFiltered],
  );

  /*
  const setMessagesAddressModalShow = (vt: ValueTransferType) => {
    navigation.navigate(RouteEnum.MessagesAddress, {
      setScrollToBottom: setScrollToBottom,
      scrollToBottom: scrollToBottom,
      address: Utils.messagesAddress(vt),
      sendTransaction: sendTransaction,
      setServerOption: setServerOption,
    });
  };
  */

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
            <FiltersIcon color={colors.zingo} size={20} />
            {(!!filterKind ||
              filterFailed ||
              filterMemos ||
              filterWithFunds) && (
              <View
                style={{
                  backgroundColor: colors.text,
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
            <FontAwesomeIcon icon={faXmark} size={20} color={colors.zingo} />
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
          />
        </View>
      </View>
      <BottomSheet
        ref={historySheetRef}
        snapPoints={historySnapPoints}
        index={0}
        enableDynamicSizing={false}
        enablePanDownToClose={false}
        enableContentPanningGesture={false}
        backgroundStyle={{
          backgroundColor: colors.bottomSheetBackground,
          borderTopLeftRadius: 40,
          borderTopRightRadius: 40,
        }}
        handleComponent={renderHistoryHandle}
      >
        <View
          style={{
            flex: 1,
            backgroundColor: colors.bottomSheetBackground,
          }}
        >
          {loading ? (
            <ActivityIndicator
              size="large"
              color={colors.primary}
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
                        tintColor={colors.text}
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
                  onEndReachedThreshold={0.75}
                  onEndReached={() => {
                    setShowFooter(true);
                  }}
                  disableRecycling={true}
                  renderFooter={() => (
                    <>
                      {showFooter ? (
                        <>
                          {loadMoreButton ? (
                            <View
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'flex-start',
                                marginTop: 20,
                                marginBottom: 60,
                              }}
                            >
                              <Button
                                type={ButtonTypeEnum.Secondary}
                                title={translate('history.loadmore') as string}
                                onPress={loadMoreClicked}
                              />
                            </View>
                          ) : (
                            <>
                              {!!valueTransfersSliced &&
                                !!valueTransfersSliced.length && (
                                  <View
                                    style={{
                                      display: 'flex',
                                      alignItems: 'center',
                                      justifyContent: 'flex-start',
                                      marginTop: 20,
                                      marginBottom: 60,
                                    }}
                                  >
                                    <FadeText style={{ color: colors.primary }}>
                                      {translate('history.end') as string}
                                    </FadeText>
                                  </View>
                                )}
                            </>
                          )}
                        </>
                      ) : null}
                    </>
                  )}
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
                  <FadeText style={{ color: colors.primary }}>
                    {translate('history.empty') as string}
                  </FadeText>
                </View>
              )}
              {!isAtTop && (
                <Pressable
                  onPress={handleScrollToTop}
                  disabled={isScrollingToTop}
                  style={({ pressed }) => ({
                    position: 'absolute',
                    bottom: 30,
                    right: 10,
                    paddingHorizontal: 5,
                    paddingVertical: 10,
                    backgroundColor: colors.sideMenuBackground,
                    borderRadius: 50,
                    transform: [{ scale: pressed ? 0.9 : 1 }],
                    borderWidth: 1,
                    borderColor: colors.zingo,
                    opacity: isScrollingToTop ? 0.5 : 1,
                  })}
                >
                  <FontAwesomeIcon
                    style={{ marginLeft: 5, marginRight: 5, marginTop: 0 }}
                    size={16}
                    icon={faAngleUp}
                    color={colors.zingo}
                  />
                </Pressable>
              )}
            </View>
          )}
        </View>
      </BottomSheet>
      <BottomSheetModal
        ref={bottomSheetRef}
        enableDynamicSizing={true}
        enablePanDownToClose
        keyboardBehavior={'interactive'}
        keyboardBlurBehavior={'restore'}
        android_keyboardInputMode={'adjustResize'}
        handleComponent={renderFiltersHandle}
        backgroundStyle={{
          backgroundColor: colors.bottomSheetBackground,
          borderTopLeftRadius: 40,
          borderTopRightRadius: 40,
        }}
        onDismiss={() => setShowFilters(false)}
        backdropComponent={renderBackdrop}
      >
        <BottomSheetView
          style={{
            backgroundColor: colors.bottomSheetBackground,
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
