/* eslint-disable react-native/no-inline-styles */
import React, { useContext, useState, useEffect, useCallback, useMemo, useRef } from 'react';
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
import { faAngleUp, faLayerGroup } from '@fortawesome/free-solid-svg-icons';

import {
  ButtonTypeEnum,
  GlobalConst,
  RouteEnum,
  ScreenEnum,
  //SelectServerEnum,
  //SendPageStateClass,
  //ServerType,
  ValueTransferType,
} from '../../app/AppState';
import { AppDrawerParamList, ThemeType } from '../../app/types';
import FadeText from '../Components/FadeText';
import Button from '../Components/Button';
import ValueTransferLine from './components/ValueTransferLine';
import { ContextAppLoaded } from '../../app/context';
import Header from '../Header';
import Utils from '../../app/utils';
import { DataProvider, RecyclerListView, LayoutProvider, RecyclerListViewProps } from 'recyclerlistview';
import { ScrollEvent } from 'recyclerlistview/dist/reactnative/core/scrollcomponent/BaseScrollView';
import { isEqual } from 'lodash';
import { RecyclerListViewState } from 'recyclerlistview/dist/reactnative/core/RecyclerListView';
import { ToastProvider } from 'react-native-toastier';
import Snackbars from '../Components/Snackbars';
import { DrawerScreenProps } from '@react-navigation/drawer';
import { Swipeable } from 'react-native-gesture-handler';
import { faHome } from '@fortawesome/free-regular-svg-icons';

const ViewTypes = {
  WITH_MONTH: 0,
  WITHOUT_MONTH: 1,
  WITH_MONTH_REFRESH: 2,
  WITHOUT_MONTH_REFRESH: 3,
};

type HistoryProps = DrawerScreenProps<AppDrawerParamList, RouteEnum.History> &  {
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
  const navigation: any = useNavigation();
  const context = useContext(ContextAppLoaded);
  const {
    translate,
    valueTransfers,
    language,
    addLastSnackbar,
    indexerServer,
    doRefresh,
    zenniesDonationAddress,
    snackbars,
    removeFirstSnackbar,
    setPrivacyOption,
  } = context;
  const { colors } = useTheme() as ThemeType;
  const screenName = ScreenEnum.History;

  const [numVt, setNumVt] = useState<number>(50);
  const [loadMoreButton, setLoadMoreButton] = useState<boolean>(false);
  const [valueTransfersSliced, setValueTransfersSliced] = useState<ValueTransferType[]>([]);
  const [valueTransfersFiltered, setValueTransfersFiltered] = useState<ValueTransferType[]>([]);
  const [isAtTop, setIsAtTop] = useState<boolean>(true);
  const [isScrollingToTop, setIsScrollingToTop] = useState<boolean>(false);
  const scrollTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [showFooter, setShowFooter] = useState<boolean>(false);
  const scrollViewRef = useRef<RecyclerListView<RecyclerListViewProps, RecyclerListViewState>>(null);

  const swipeablesRef = new Map<number, Swipeable>();

  const registerSwipeable = (key: number) => (ref: Swipeable) => {
    swipeablesRef.set(key, ref);
  };

  const closeAllSwipeables = (exceptKey?: number) => {
    swipeablesRef.forEach((ref, k) => {
      if (k !== exceptKey) {
        // soporta ambas APIs según versión
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
            if (data.confirmations === 0 ) {
              return ViewTypes.WITH_MONTH_REFRESH;
            } else {
              return ViewTypes.WITH_MONTH;
            }
          }

          let lasttxmonth = lastData && lastData.time ? moment(lastData.time * 1000).format('MMM YYYY') : '--- ----';
          let txmonth = data && data.time ? moment(data.time * 1000).format('MMM YYYY') : '--- ----';

          if (txmonth !== lasttxmonth) {
            if (data.confirmations === 0 ) {
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
            dim.height = Platform.OS === GlobalConst.platformOSandroid ? 70 : 60;
          } else if (type === ViewTypes.WITHOUT_MONTH_REFRESH) {
            // three lines
            dim.width = Dimensions.get('window').width;
            dim.height = (Platform.OS === GlobalConst.platformOSandroid ? 70 : 55) + 15;
          } else if (type === ViewTypes.WITH_MONTH) {
            // two lines with month
            dim.width = Dimensions.get('window').width;
            dim.height = Platform.OS === GlobalConst.platformOSandroid ? 105 : 90;
          } else if (type === ViewTypes.WITH_MONTH_REFRESH) {
            // three lines with month
            dim.width = Dimensions.get('window').width;
            dim.height = (Platform.OS === GlobalConst.platformOSandroid ? 105 : 85) + 15;
          }
        },
      ),
    [valueTransfersSliced],
  );

  const _dataProvider = useMemo(
    () => new DataProvider((r1: ValueTransferType, r2: ValueTransferType) => !isEqual(r1, r2)),
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
    Utils.setMomentLocale(language)
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
  }, [fetchValueTransfersFiltered, numVt, valueTransfers, indexerServer.chainName]);

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

  const setValueTransferDetailModalShow = (index: number, vt: ValueTransferType) => {
    navigation.navigate(RouteEnum.ValueTransferDetailStack, {
      screen: RouteEnum.ValueTransferDetail,
      params: { 
        index: index, 
        vt: vt,
        valueTransfersSliced: valueTransfersSliced,
        totalLength: valueTransfersFiltered !== null ? valueTransfersFiltered.length : 0
      }
    });
  };

  const rowRenderer = (type: string | number, data: ValueTransferType, index: number) => {
    let txmonth = data && data.time ? moment(data.time * 1000).format('MMM YYYY') : '--- ----';

    return (
      <ValueTransferLine
        index={index}
        vt={data}
        month={type === ViewTypes.WITH_MONTH || type === ViewTypes.WITH_MONTH_REFRESH ? txmonth : ''}
        setValueTransferDetailModalShow={setValueTransferDetailModalShow}
        nextLineWithSameTxid={
          index >= valueTransfersSliced.length - 1 ? false : valueTransfersSliced[index + 1].txid === data.txid
        }
        addressProtected={data.address === zenniesDonationAddress}
        screenName={screenName}
        registerSwipeable={registerSwipeable(index)}
        closeAllSwipeables={() => closeAllSwipeables()}
        closeOtherSwipeables={() => closeAllSwipeables(index)}
      />
    );
  };

  const goStaking = () => {
    navigation.navigate(RouteEnum.Staking);
  };

  //console.log('render History - 4', valueTransfersSliced.length);
  //console.log(valueTransfersSliced[0]);

  return (
    <ToastProvider>
      <Snackbars snackbars={snackbars} removeFirstSnackbar={removeFirstSnackbar} screenName={screenName} />

      <View
        accessible={true}
        accessibilityLabel={translate('history.title-acc') as string}
        style={{
          display: 'flex',
          justifyContent: 'flex-start',
          width: '100%',
          height: '100%',
        }}>
        <Header
          testID="valuetransfer text"
          title={translate('history.title') as string}
          toggleMenuDrawer={toggleMenuDrawer}
          setPrivacyOption={setPrivacyOption}
          addLastSnackbar={addLastSnackbar /* context */}
          screenName={screenName}
          setShieldingAmount={setShieldingAmount}
          setScrollToTop={setScrollToTop}
          setScrollToBottom={setScrollToBottom}
        />
        {loading ? (
          <ActivityIndicator size="large" color={colors.primary} style={{ marginVertical: 20 }} />
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
                              marginTop: 20,
                              marginBottom: 60,
                            }}>
                            <Button
                              type={ButtonTypeEnum.Secondary}
                              title={translate('history.loadmore') as string}
                              onPress={loadMoreClicked}
                            />
                          </View>
                        ) : (
                          <>
                            {!!valueTransfersSliced && !!valueTransfersSliced.length && (
                              <View
                                style={{
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'flex-start',
                                  marginTop: 20,
                                  marginBottom: 60,
                                }}>
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
                }}>
                <FadeText style={{ color: colors.primary }}>{translate('history.empty') as string}</FadeText>
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
                })}>
                <FontAwesomeIcon
                  style={{ marginLeft: 5, marginRight: 5, marginTop: 0 }}
                  size={20}
                  icon={faAngleUp}
                  color={colors.zingo}
                />
              </Pressable>
            )}
            <View 
              style={{
                position: 'absolute',
                bottom: 30,
                flexDirection: 'row',
                alignSelf: 'center',
                gap: 10,
            }}>
              <Pressable
                onPress={() => {}}
                disabled={true}
                style={({ pressed }) => ({
                  justifyContent: 'center',
                  alignItems: 'center',
                  paddingHorizontal: 25,
                  paddingVertical: 10,
                  backgroundColor: colors.sideMenuBackground,
                  borderRadius: 50,
                  transform: [{ scale: pressed ? 0.9 : 1 }],
                  borderWidth: 1,
                  borderColor: colors.zingo,
                  opacity: isScrollingToTop ? 0.5 : 1,
                })}>
                <FontAwesomeIcon
                  style={{ marginLeft: 5, marginRight: 5, marginTop: 0 }}
                  size={20}
                  icon={faHome}
                  color={colors.primary}
                />
                <FadeText style={{ color: colors.primary, fontSize: 12, opacity: 1 }}>Home</FadeText>
              </Pressable>
                <Pressable
                onPress={goStaking}
                disabled={false}
                style={({ pressed }) => ({
                  justifyContent: 'center',
                  alignItems: 'center',
                  paddingHorizontal: 25,
                  paddingVertical: 10,
                  backgroundColor: colors.sideMenuBackground,
                  borderRadius: 50,
                  transform: [{ scale: pressed ? 0.9 : 1 }],
                  borderWidth: 1,
                  borderColor: colors.zingo,
                  opacity: isScrollingToTop ? 0.5 : 1,
                })}>
                <FontAwesomeIcon
                  style={{ marginLeft: 5, marginRight: 5, marginTop: 0 }}
                  size={20}
                  icon={faLayerGroup}
                  color={colors.zingo}
                />
                <FadeText style={{ color: colors.zingo, fontSize: 12, opacity: 1 }}>Staking</FadeText>
              </Pressable>
            </View>
          </>
        )}
      </View>
    </ToastProvider>
  );
};

export default React.memo(History);
