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
import moment from 'moment';
import { useNavigation, useTheme } from '@react-navigation/native';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { faAngleUp } from '@fortawesome/free-solid-svg-icons';

import {
  GlobalConst,
  RouteEnum,
  ScreenEnum,
  ValueTransferType,
} from '../../app/AppState';
import { AppDrawerParamList, ThemeType } from '../../app/types';
import FadeText from '../Components/FadeText';
import ValueTransferLine from './components/ValueTransferLine';
import { ContextAppLoaded } from '../../app/context';
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
import WalletSummaryHeader from './components/WalletSummaryHeader';
import QuickActionsRow from './components/QuickActionsRow';
import SettingsButton from './components/SettingsButton';
import { Swipeable } from 'react-native-gesture-handler';
import { isLiquidGlassSupported } from '@callstack/liquid-glass';
import RegText from '../Components/RegText';
import EmptyList from '../../assets/icons/empty-cardboard-box.svg';
import { SafeAreaView } from 'react-native-safe-area-context';
import Button from '../Components/Button';

const ViewTypes = {
  WITH_MONTH: 0,
  WITHOUT_MONTH: 1,
  WITH_MONTH_ADDRESS: 2,
  WITHOUT_MONTH_ADDRESS: 3,
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
  setScrollToTop,
  scrollToTop,
  //scrollToBottom,
  //sendTransaction,
  //setServerOption,
}) => {
  const navigation: any = useNavigation();
  const context = useContext(ContextAppLoaded);
  const {
    translate,
    valueTransfers,
    language,
    indexerServer,
    doRefresh,
    zenniesDonationAddress,
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
  const [showFooter, setShowFooter] = useState<boolean>(false);
  const scrollViewRef =
    useRef<RecyclerListView<RecyclerListViewProps, RecyclerListViewState>>(
      null,
    );

  const swipeablesRef = new Map<number, Swipeable>();

  const registerSwipeable = (key: number) => (ref: Swipeable) => {
    swipeablesRef.set(key, ref);
  };

  const closeAllSwipeables = (exceptKey?: number) => {
    swipeablesRef.forEach((ref, k) => {
      if (k !== exceptKey) {
        ref.close();
      }
    });
  };

  const layoutProvider = useMemo(
    () =>
      new LayoutProvider(
        (index: number) => {
          const lastData = valueTransfersSliced[index - 1];
          const data = valueTransfersSliced[index];

          if (index === 0) {
            if (data.address) {
              return ViewTypes.WITH_MONTH_ADDRESS;
            } else {
              return ViewTypes.WITH_MONTH;
            }
          }

          let lasttxmonth =
            lastData && lastData.time
              ? moment(lastData.time * 1000).format('MMM YYYY')
              : '--- ----';
          let txmonth =
            data && data.time
              ? moment(data.time * 1000).format('MMM YYYY')
              : '--- ----';

          if (txmonth !== lasttxmonth) {
            if (data.address) {
              return ViewTypes.WITH_MONTH_ADDRESS;
            } else {
              return ViewTypes.WITH_MONTH;
            }
          } else {
            if (data.address) {
              return ViewTypes.WITHOUT_MONTH_ADDRESS;
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
              Platform.OS === GlobalConst.platformOSandroid ? 65 : 57;
          } else if (type === ViewTypes.WITHOUT_MONTH_ADDRESS) {
            // three lines
            dim.width = Dimensions.get('window').width;
            dim.height =
              (Platform.OS === GlobalConst.platformOSandroid ? 65 : 52) + 25;
          } else if (type === ViewTypes.WITH_MONTH) {
            // two lines with month
            dim.width = Dimensions.get('window').width;
            dim.height =
              (Platform.OS === GlobalConst.platformOSandroid ? 105 : 88) + 45;
          } else if (type === ViewTypes.WITH_MONTH_ADDRESS) {
            // three lines with month
            dim.width = Dimensions.get('window').width;
            dim.height =
              (Platform.OS === GlobalConst.platformOSandroid ? 105 : 85) +
              45 +
              25;
          }
        },
      ),
    [valueTransfersSliced],
  );

  const _dataProvider = useMemo(
    () =>
      new DataProvider(
        (r1: ValueTransferType, r2: ValueTransferType) => !isEqual(r1, r2),
      ),
    [],
  );

  const [dataProvider, setDataProvider] = useState<DataProvider>(_dataProvider);

  const fetchValueTransfersFiltered = useMemo(() => {
    if (!valueTransfers) {
      return [] as ValueTransferType[];
    }
    // strictly show VT's with some amount on funds.
    return valueTransfers;
  }, [valueTransfers]);

  useEffect(() => {
    Utils.setMomentLocale(language);
  }, [language]);

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
  }, [
    fetchValueTransfersFiltered,
    numVt,
    valueTransfers,
    indexerServer.chainName,
  ]);

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

  const setValueTransferDetailModalShow = (
    index: number,
    vt: ValueTransferType,
  ) => {
    navigation.navigate(RouteEnum.ValueTransferDetail, {
      vt: vt,
      totalLength:
        valueTransfersFiltered !== null ? valueTransfersFiltered.length : 0,
    });
  };

  const rowRenderer = (
    type: string | number,
    data: ValueTransferType,
    index: number,
  ) => {
    let txmonth =
      data && data.time
        ? moment(data.time * 1000).format('MMM YYYY')
        : '--- ----';

    return (
      <ValueTransferLine
        index={index}
        vt={data}
        month={
          type === ViewTypes.WITH_MONTH || type === ViewTypes.WITH_MONTH_ADDRESS
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

  return (
    <View
      accessible={true}
      accessibilityLabel={translate('history.title-acc') as string}
      style={{
        display: 'flex',
        justifyContent: 'flex-start',
        width: '100%',
        height: '100%',
      }}
    >
      <SafeAreaView
        style={{
          backgroundColor: colors.background,
          paddingTop: 10,
          paddingBottom: 10,
        }}
      >
        <WalletSummaryHeader show_staked={false} />

        <SafeAreaView
          style={{
            position: 'absolute',
            right: 10,
            top: 10,
          }}
        >
          <SettingsButton screenName={screenName} />
        </SafeAreaView>

        <QuickActionsRow />
      </SafeAreaView>
      {loading ? (
        <ActivityIndicator
          size="large"
          color={colors.primary}
          style={{ marginVertical: 20 }}
        />
      ) : (
        <>
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
                  marginTop: 10,
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
                            marginTop: 5,
                            marginBottom:
                              Platform.OS === GlobalConst.platformOSios
                                ? 100
                                : 10,
                          }}
                        >
                          <Button
                            variant="secondary"
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
                                  marginBottom:
                                    Platform.OS === GlobalConst.platformOSios
                                      ? 100
                                      : 10,
                                }}
                              />
                            )}
                        </>
                      )}
                    </>
                  ) : null}
                </>
              )}
            />
          ) : (
            <View style={{ marginHorizontal: 10 }}>
              <View
                style={{
                  marginTop: 20,
                  borderTopLeftRadius: 25,
                  borderTopRightRadius: 25,
                  paddingVertical: 20,
                  paddingHorizontal: 30,
                  backgroundColor: '#78788029',
                }}
              >
                <RegText>Activity</RegText>
              </View>
              <View
                style={{
                  paddingHorizontal: 5,
                  backgroundColor: '#62626929',
                  borderBottomLeftRadius: 25,
                  borderBottomRightRadius: 25,
                  height: '100%',
                }}
              >
                <View
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    padding: 50,
                    borderBottomWidth: 1,
                    borderBottomColor: 'transparent',
                    borderStyle: 'solid',
                  }}
                >
                  <EmptyList width={100} height={100} color={colors.text} />
                  <FadeText style={{ color: colors.text }}>
                    {'There are no transactions yet.'}
                  </FadeText>
                </View>
              </View>
            </View>
          )}
          {!isAtTop && (
            <Pressable
              onPress={handleScrollToTop}
              disabled={isScrollingToTop}
              style={({ pressed }) => ({
                position: 'absolute',
                bottom:
                  !isLiquidGlassSupported &&
                  Platform.OS === GlobalConst.platformOSandroid
                    ? 30
                    : 60,
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
        </>
      )}
    </View>
  );
};

export default React.memo(History);
