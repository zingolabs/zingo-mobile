/* eslint-disable react-native/no-inline-styles */
import React, {
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  ActivityIndicator,
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  ScrollView,
  Platform,
  Pressable,
  NativeSyntheticEvent,
  NativeScrollEvent,
  Image,
} from 'react-native';
import { useNavigation, useTheme } from '@react-navigation/native';
import { DrawerScreenProps } from '@react-navigation/drawer';

import {
  GlobalConst,
  RouteEnum,
  ScheduledActionType,
  ScreenEnum,
  StakeType,
  StakingActionKindEnum,
  WalletBondsType,
} from '../../app/AppState';
import { AppDrawerParamList } from '../../app/types';
import { ThemeType } from '../../app/types';
import WalletSummaryHeader from '../History/components/WalletSummaryHeader';
import SettingsButton from '../History/components/SettingsButton';
import StakingActions from './StakingActions';
import { ContextAppLoaded } from '../../app/context';
import Stake from '../../assets/icons/stake-white.svg';
import Unstake from '../../assets/icons/unstake-white.svg';
import RegText from '../Components/RegText';
import FadeText from '../Components/FadeText';
import Utils from '../../app/utils';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { faAngleUp, faChevronRight } from '@fortawesome/free-solid-svg-icons';
import Snackbars from '../Components/Snackbars';
import { ToastProvider } from 'react-native-toastier';
import { isLiquidGlassSupported } from '@callstack/liquid-glass';
import BottomSheet, {
  BottomSheetBackdrop,
  BottomSheetBackdropProps,
  BottomSheetView,
} from '@gorhom/bottom-sheet';
import FinalizerDetail from './components/FinalizerDetail';
import { lifehashDataUrlFromStringSync } from '../../app/utils/lifehash';
import ZecAmount from '../Components/ZecAmount';
import { WalletBondsStatusEnum } from '../../app/AppState/enums/WalletBondsStatusEnum';
import Button from '../Components/Button';
import StakingDayStatusBar from './components/StakingDayStatusBar';
import LinearGradient from 'react-native-linear-gradient';

type DataType = {
  svg: {
    data: string;
  };
  value: number;
  key: string;
  finalizer: string;
  tag: string;
};

const formatMovementDate = (unixSeconds: number | undefined) => {
  if (!unixSeconds) return '-';
  const d = new Date(unixSeconds * 1000);
  return d.toLocaleString(undefined, {
    month: 'short', // "Oct"
    day: 'numeric', // "10"
    hour: 'numeric',
    minute: '2-digit',
  }); // "Oct 10, 4:30 PM"
};

type StakingProps = DrawerScreenProps<
  AppDrawerParamList,
  RouteEnum.StakingHome
>;

const Staking: React.FC<StakingProps> = ({}) => {
  const navigation: any = useNavigation();
  const context = useContext(ContextAppLoaded);
  const {
    snackbars,
    removeFirstSnackbar,
    staked,
    info,
    privacy,
    stakingDay,
    timeToStakingDay,
    timeLeftStakingDay,
    scheduledActions,
    walletBonds,
    valueTransfers,
  } = context;

  const screenName = ScreenEnum.StakingHome;

  const [loading] = useState(false);
  const [tab, setTab] = useState<'scheduled' | 'active' | 'my'>('active');
  const [isAtTop, setIsAtTop] = useState<boolean>(true);
  const [isScrollingToTop, setIsScrollingToTop] = useState<boolean>(false);
  const [heightLayout, setHeightLayout] = useState<number>(10);
  const [currentItem, setCurrentItem] = useState<DataType | null>(null);

  const bottomSheetRef = useRef<BottomSheet>(null);
  const scrollTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const dimensions = {
    width: Dimensions.get('window').width,
    height: Dimensions.get('window').height,
  };

  const scrollViewRef = useRef<ScrollView & FlatList<any>>(null);

  const snapPoints = useMemo(() => {
    let snap1: number = (heightLayout * 100) / Dimensions.get('window').height;
    if (snap1 < 1) {
      snap1 = 1;
    }
    let snap2: number = 80;
    if (snap1 < 80) {
      snap2 = snap1 + 20;
    }
    return [`${snap1}%`, `${snap2}%`];
  }, [heightLayout]);

  const show = useCallback((item: DataType) => {
    bottomSheetRef.current?.snapToIndex(0);
    setCurrentItem(item);
  }, []);

  const hide = useCallback(() => {
    bottomSheetRef.current?.snapToIndex(-1);
    bottomSheetRef.current?.close();
    setHeightLayout(10);
    setCurrentItem(null);
  }, []);

  const renderBackdrop = (props: BottomSheetBackdropProps) => (
    <BottomSheetBackdrop
      {...props}
      disappearsOnIndex={-1}
      appearsOnIndex={0}
      pressBehavior="close"
    />
  );

  const movements: WalletBondsType[] = useMemo(() => {
    if (!walletBonds) {
      return [];
    }

    return walletBonds
      .filter(b => {
        // all bonds
        if (b.status === WalletBondsStatusEnum.Withdrawn) return false;
        return true;
      })
      .sort((a, b) => b.amount - a.amount);
  }, [walletBonds]);

  const stakedData: DataType[] = useMemo(() => {
    const resultJSON: StakeType[] = staked;
    // const randomColors = Utils.generateColorList(resultJSON.length + 10);
    const r = resultJSON
      .filter((i: StakeType) => i.votingPower > 0 && !!i.finalizer)
      .sort((a, b) => b.votingPower - a.votingPower)
      .map((item, index) => {
        return {
          value: item.votingPower,
          finalizer: item.finalizer,
          tag: '',
          svg: {
            data: lifehashDataUrlFromStringSync(item.finalizer),
          },
          key: `pie-${index}`,
        };
      });
    return r;
  }, [staked]);

  const { colors } = useTheme() as ThemeType;

  const hasMovements = movements.length > 0;
  const hasStaked = stakedData.length > 0;
  const hasScheduledActions = scheduledActions.length > 0;

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
        scrollViewRef.current.scrollTo({ y: 0, animated: true });
      } catch (error) {
        console.log('scrollToTop failed:', error);
        scrollViewRef.current.scrollToOffset({ offset: 0, animated: true });
      }
    }
  }, [isScrollingToTop]);

  const handleScroll = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      const { contentOffset } = event.nativeEvent;
      const isTop = contentOffset.y <= 100;

      // Always update isAtTop for manual scrolling
      setIsAtTop(isTop);

      // If we're scrolling to top and we've reached the top, stop the scrolling state
      if (isScrollingToTop && isTop) {
        setIsScrollingToTop(false);
        if (scrollTimeoutRef.current) {
          clearTimeout(scrollTimeoutRef.current);
          scrollTimeoutRef.current = null;
        }
      }
    },
    [isScrollingToTop],
  );

  const line = (item: DataType, index: number, last: boolean) => {
    return (
      <TouchableOpacity
        style={{ width: '100%' }}
        key={`tag-${index}`}
        onPress={() => show(item)}
      >
        <View
          style={{
            flexDirection: 'row',
            justifyContent: 'space-between',
            marginHorizontal: 20,
            paddingVertical: 15,
            borderBottomColor: '#333333',
            borderBottomWidth: last ? 0 : 1,
          }}
        >
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Image
              source={{ uri: item.svg.data }}
              style={{
                width: 28,
                height: 28,
                marginRight: 10,
                borderRadius: 12,
              }}
              resizeMode="contain"
            />
            {!!item.tag && (
              <FadeText style={{ marginHorizontal: 5 }}>{item.tag}</FadeText>
            )}

            <View
              style={{
                display: 'flex',
                flexDirection: 'column',
                flexWrap: 'wrap',
              }}
            >
              <RegText>
                {item.finalizer.length > (dimensions.width < 500 ? 10 : 20)
                  ? Utils.trimToSmall(
                      item.finalizer,
                      dimensions.width < 500 ? 5 : 10,
                    )
                  : item.finalizer}
              </RegText>
              <View
                style={{
                  display: 'flex',
                  flexDirection: 'row',
                  alignItems: 'center',
                }}
              >
                <Stake width={15} height={15} style={{ opacity: 0.7 }} />
                <ZecAmount
                  amtZec={item.value}
                  size={14}
                  currencyName={info.currencyName}
                />
              </View>
            </View>
          </View>
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <FontAwesomeIcon
              style={{ marginRight: 10, marginLeft: 15 }}
              size={15}
              icon={faChevronRight}
              color={colors.text}
            />
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  console.log('scheduled actions', scheduledActions);

  console.log(
    'render staking',
    stakingDay,
    timeToStakingDay,
    timeLeftStakingDay,
  );

  return (
    <ToastProvider>
      <Snackbars
        snackbars={snackbars}
        removeFirstSnackbar={removeFirstSnackbar}
        screenName={screenName}
      />

      <View
        accessible={true}
        style={{
          flex: 1,
          backgroundColor: colors.background,
        }}
      >
        <View
          style={{
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
            zIndex: 999,
          }}
        >
          <StakingDayStatusBar />
          <SettingsButton screenName={screenName} />
        </View>

        {/* Header + quick actions */}
        <View
          style={{
            backgroundColor: colors.background,
            paddingTop: 10,
            paddingBottom: 10,
          }}
        >
          <WalletSummaryHeader show_staked={true} />

          <StakingActions />
        </View>

        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginTop: 20,
            borderRadius: 20,
            backgroundColor: 'rgba(118, 118, 128, 0.24)',
            padding: 5,
            marginHorizontal: 20,
          }}
        >
          <View
            style={{
              flexGrow: 1,
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: 20,
              backgroundColor: tab === 'scheduled' ? '#6C6C71' : 'transparent',
              padding: 5,
              overflow: 'hidden',
            }}
          >
            <TouchableOpacity onPress={() => setTab('scheduled')}>
              <RegText
                style={{
                  fontWeight: tab === 'scheduled' ? 'bold' : 'normal',
                  fontSize: 15,
                  color: colors.text,
                }}
              >
                {'Scheduled'}
              </RegText>
            </TouchableOpacity>
          </View>
          <View
            style={{
              flexGrow: 1,
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: 20,
              backgroundColor: tab === 'active' ? '#6C6C71' : 'transparent',
              padding: 5,
              overflow: 'hidden',
            }}
          >
            <TouchableOpacity onPress={() => setTab('active')}>
              <RegText
                style={{
                  fontWeight: tab === 'active' ? 'bold' : 'normal',
                  fontSize: 15,
                  color: colors.text,
                }}
              >
                {'Active Stake'}
              </RegText>
            </TouchableOpacity>
          </View>
          <View
            style={{
              flexGrow: 1,
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: 20,
              backgroundColor: tab === 'my' ? '#6C6C71' : 'transparent',
              padding: 5,
              overflow: 'hidden',
            }}
          >
            <TouchableOpacity onPress={() => setTab('my')}>
              <RegText
                style={{
                  fontWeight: tab === 'my' ? 'bold' : 'normal',
                  fontSize: 15,
                  color: colors.text,
                }}
              >
                {'My Finalizers'}
              </RegText>
            </TouchableOpacity>
          </View>
        </View>

        <View
          style={{
            flex: 1,
            paddingHorizontal: 10,
            paddingTop: 15,
          }}
        >
          <View
            style={{
              flex: 1,
            }}
          >
            {loading && (
              <View style={styles.centerContent}>
                <ActivityIndicator size="small" color={colors.text} />
              </View>
            )}

            {!loading && !hasScheduledActions && tab === 'scheduled' && (
              <View style={styles.centerContent}>
                <View
                  style={{
                    width: 64,
                    height: 64,
                    borderRadius: 32,
                    borderWidth: 2,
                    borderStyle: 'dashed',
                    borderColor: colors.placeholder,
                  }}
                />
                <Text
                  style={{
                    color: colors.placeholder,
                    fontSize: 14,
                  }}
                >
                  There are no scheduled actions yet.
                </Text>
              </View>
            )}

            {!loading && !hasMovements && tab === 'active' && (
              <View style={styles.centerContent}>
                <View
                  style={{
                    width: 64,
                    height: 64,
                    borderRadius: 32,
                    borderWidth: 2,
                    borderStyle: 'dashed',
                    borderColor: colors.placeholder,
                  }}
                />
                <Text
                  style={{
                    color: colors.placeholder,
                    fontSize: 14,
                  }}
                >
                  There are no active stake yet.
                </Text>
              </View>
            )}

            {!loading && !hasStaked && tab === 'my' && (
              <View style={styles.centerContent}>
                <View
                  style={{
                    width: 64,
                    height: 64,
                    borderRadius: 32,
                    borderWidth: 2,
                    borderStyle: 'dashed',
                    borderColor: colors.placeholder,
                  }}
                />
                <Text
                  style={{
                    color: colors.placeholder,
                    fontSize: 14,
                  }}
                >
                  There are no active finalizers yet.
                </Text>
              </View>
            )}

            {!loading && hasScheduledActions && tab === 'scheduled' && (
              <>
                <FadeText
                  style={{
                    fontSize: 12,
                    fontStyle: 'normal',
                    fontWeight: 400,
                    lineHeight: 22,
                    letterSpacing: -0.43,
                    paddingHorizontal: 5,
                    marginBottom: 5,
                  }}
                >
                  Scheduled actions execute automatically when the next staking
                  day begins.
                </FadeText>
                <FlatList
                  ref={scrollViewRef}
                  onScroll={handleScroll}
                  data={scheduledActions}
                  keyExtractor={item => `scheduledActions-${item.id}`}
                  contentContainerStyle={{ paddingTop: 8, paddingBottom: 4 }}
                  ListHeaderComponent={
                    <View
                      style={{
                        borderTopLeftRadius: 25,
                        borderTopRightRadius: 25,
                        paddingVertical: 10,
                        paddingHorizontal: 25,
                        paddingTop: 15,
                        backgroundColor: '#181818',
                        borderTopColor: stakingDay ? '#004300' : '#594111',
                        borderLeftColor: stakingDay ? '#004300' : '#594111',
                        borderRightColor: stakingDay ? '#004300' : '#594111',
                        borderTopWidth: 1,
                        borderLeftWidth: 1,
                        borderRightWidth: 1,
                      }}
                    >
                      <Text
                        style={{
                          color: stakingDay ? '#00B800' : '#FFAF02',
                          fontSize: 12,
                        }}
                      >
                        {'Scheduled'}
                      </Text>
                    </View>
                  }
                  ListFooterComponent={
                    <>
                      <View
                        style={{
                          borderBottomLeftRadius: 25,
                          borderBottomRightRadius: 25,
                          paddingBottom: 15,
                          backgroundColor: '#181818',
                          borderBottomColor: stakingDay ? '#004300' : '#594111',
                          borderLeftColor: stakingDay ? '#004300' : '#594111',
                          borderRightColor: stakingDay ? '#004300' : '#594111',
                          borderBottomWidth: 1,
                          borderLeftWidth: 1,
                          borderRightWidth: 1,
                        }}
                      />
                      <View
                        style={{
                          height:
                            Platform.OS === GlobalConst.platformOSios
                              ? 100
                              : 10,
                        }}
                      />
                    </>
                  }
                  renderItem={({ item }: { item: ScheduledActionType }) => {
                    let label: string = '';
                    let Icon: React.ComponentType<{
                      width: number;
                      height: number;
                    }> | null = null;

                    switch (item.kind) {
                      case StakingActionKindEnum.CreateBond: {
                        label = 'Stake';
                        Icon = Stake;
                        break;
                      }

                      case StakingActionKindEnum.BeginUnbonding: {
                        // the txid have to be from a create_bond kind
                        if (
                          item.txid &&
                          walletBonds.filter(wb => wb.txid === item.txid)
                            .length > 0 &&
                          walletBonds.filter(wb => wb.txid === item.txid)[0]
                            .status === WalletBondsStatusEnum.Active
                        ) {
                          label = 'Unstake';
                        } else {
                          label = 'Unstake (transaction issue)';
                        }
                        Icon = Unstake;
                        break;
                      }

                      case StakingActionKindEnum.WithdrawBond: {
                        // the txid have to be from a unbonding kind
                        if (
                          item.txid &&
                          walletBonds.filter(wb => wb.txid === item.txid)
                            .length > 0 &&
                          walletBonds.filter(wb => wb.txid === item.txid)[0]
                            .status === WalletBondsStatusEnum.Unbonding
                        ) {
                          label = 'Withdraw';
                        } else {
                          label = 'Withdraw (transaction issue)';
                        }
                        Icon = Unstake;
                        break;
                      }

                      case StakingActionKindEnum.Move: {
                        // the txid have to be from a create_bond kind
                        if (
                          item.txid &&
                          walletBonds.filter(wb => wb.txid === item.txid)
                            .length > 0 &&
                          walletBonds.filter(wb => wb.txid === item.txid)[0]
                            .status === WalletBondsStatusEnum.Active
                        ) {
                          label = 'Redelegate';
                        } else {
                          label = 'Redelegate (transaction issue)';
                        }
                        Icon = Unstake;
                        break;
                      }
                    }

                    return (
                      <View
                        style={{
                          backgroundColor: '#181818',
                          flexDirection: 'row',
                          alignItems: 'center',
                          paddingVertical: 10,
                          paddingHorizontal: 10,
                          borderLeftColor: stakingDay ? '#004300' : '#594111',
                          borderRightColor: stakingDay ? '#004300' : '#594111',
                          borderLeftWidth: 1,
                          borderRightWidth: 1,
                        }}
                      >
                        <TouchableOpacity
                          style={{ width: '100%' }}
                          onPress={() => {
                            navigation.navigate(
                              RouteEnum.ScheduledActionDetail,
                              {
                                item,
                              },
                            );
                          }}
                        >
                          <LinearGradient
                            colors={[
                              stakingDay ? '#002309' : '#1F1F1F',
                              stakingDay ? '#272727' : '#1F1F1F',
                            ]}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 1 }}
                            style={{
                              flexDirection: 'row',
                              justifyContent: 'space-between',
                              alignItems: 'center',
                              paddingVertical: 10,
                              paddingHorizontal: 10,
                              borderRadius: 16,
                            }}
                          >
                            <View
                              style={{
                                flexDirection: 'row',
                                alignItems: 'center',
                              }}
                            >
                              {Icon && <Icon width={20} height={20} />}

                              <View>
                                <Text
                                  style={{
                                    color: colors.text,
                                    fontWeight: '500',
                                    fontSize: 14,
                                    marginBottom: 2,
                                    marginLeft: 10,
                                  }}
                                >
                                  {label}
                                </Text>
                                <View
                                  style={{
                                    flexDirection: 'row',
                                    marginLeft: 5,
                                  }}
                                >
                                  <ZecAmount
                                    style={{
                                      flexGrow: 1,
                                      alignSelf: 'auto',
                                      justifyContent: 'flex-end',
                                    }}
                                    size={12}
                                    currencyName={info.currencyName}
                                    color={colors.text}
                                    amtZec={
                                      item.txid &&
                                      walletBonds.filter(
                                        wb => wb.txid === item.txid,
                                      ).length > 0
                                        ? walletBonds.filter(
                                            wb => wb.txid === item.txid,
                                          )[0].amount
                                        : item.amount / 10 ** 8
                                    }
                                    privacy={privacy}
                                  />
                                  <Text
                                    style={{
                                      color: colors.placeholder,
                                      fontSize: 12,
                                      marginLeft: 5,
                                    }}
                                  >
                                    {'with '}
                                    {item.finalizer.length >
                                    (dimensions.width < 500 ? 10 : 20)
                                      ? Utils.trimToSmall(
                                          item.finalizer,
                                          dimensions.width < 500 ? 5 : 10,
                                        )
                                      : item.finalizer}
                                  </Text>
                                </View>
                              </View>
                            </View>
                            <View
                              style={{ flexGrow: 1, alignItems: 'flex-end' }}
                            >
                              {stakingDay ? (
                                <>
                                  <RegText
                                    style={{
                                      color: '#00B800',
                                      fontSize:
                                        timeLeftStakingDay === '0min 0sec'
                                          ? 10
                                          : 15,
                                    }}
                                  >
                                    {'Now'}
                                  </RegText>
                                  <FadeText style={{ fontSize: 12 }}>
                                    Click to execute
                                  </FadeText>
                                </>
                              ) : (
                                <>
                                  <RegText
                                    style={{
                                      color: '#FFAF02',
                                      fontSize:
                                        timeToStakingDay === '0min 0sec'
                                          ? 10
                                          : 15,
                                    }}
                                  >
                                    {timeToStakingDay === '0min 0sec'
                                      ? 'calculating...'
                                      : timeToStakingDay}
                                  </RegText>
                                </>
                              )}
                            </View>
                          </LinearGradient>
                        </TouchableOpacity>
                      </View>
                    );
                  }}
                />
              </>
            )}

            {!loading && hasMovements && tab === 'active' && (
              <FlatList
                ref={scrollViewRef}
                onScroll={handleScroll}
                data={movements}
                keyExtractor={item => `movements-${item.txid}`}
                contentContainerStyle={{ paddingTop: 8, paddingBottom: 4 }}
                ListHeaderComponent={
                  <View
                    style={{
                      borderTopLeftRadius: 25,
                      borderTopRightRadius: 25,
                      paddingVertical: 10,
                      paddingHorizontal: 25,
                      paddingTop: 15,
                      backgroundColor: '#181818',
                      borderTopColor: '#3B3B3C',
                      borderLeftColor: '#3B3B3C',
                      borderRightColor: '#3B3B3C',
                      borderTopWidth: 1,
                      borderLeftWidth: 1,
                      borderRightWidth: 1,
                    }}
                  >
                    <Text
                      style={{
                        color: colors.text,
                        fontSize: 16,
                        fontWeight: 600,
                      }}
                    >
                      {'Staking Positions'}
                    </Text>
                  </View>
                }
                ListFooterComponent={
                  <>
                    <View
                      style={{
                        borderBottomLeftRadius: 25,
                        borderBottomRightRadius: 25,
                        paddingBottom: 15,
                        backgroundColor: '#181818',
                        borderBottomColor: '#3B3B3C',
                        borderLeftColor: '#3B3B3C',
                        borderRightColor: '#3B3B3C',
                        borderBottomWidth: 1,
                        borderLeftWidth: 1,
                        borderRightWidth: 1,
                      }}
                    />
                    <View
                      style={{
                        height:
                          Platform.OS === GlobalConst.platformOSios ? 100 : 10,
                      }}
                    />
                  </>
                }
                renderItem={({ item }: { item: WalletBondsType }) => {
                  return (
                    <View
                      style={{
                        backgroundColor: '#181818',
                        alignItems: 'center',
                        paddingVertical: 10,
                        paddingHorizontal: 10,
                        borderLeftColor: '#3B3B3C',
                        borderRightColor: '#3B3B3C',
                        borderLeftWidth: 1,
                        borderRightWidth: 1,
                      }}
                    >
                      <View
                        style={{
                          backgroundColor: '#1F1F1F',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          paddingVertical: 10,
                          paddingHorizontal: 10,
                          borderRadius: 16,
                        }}
                      >
                        <View
                          style={{ flexDirection: 'row', alignItems: 'center' }}
                        >
                          <View
                            style={{
                              flexDirection: 'row',
                              alignItems: 'center',
                            }}
                          >
                            <View>
                              <Text
                                style={{
                                  color: colors.text,
                                  fontWeight: '500',
                                  fontSize: 14,
                                  marginBottom: 2,
                                  marginLeft: 5,
                                }}
                              >
                                {item.finalizer.length >
                                (dimensions.width < 500 ? 10 : 20)
                                  ? Utils.trimToSmall(
                                      item.finalizer,
                                      dimensions.width < 500 ? 5 : 10,
                                    )
                                  : item.finalizer}
                              </Text>
                              <Text
                                style={{
                                  color: colors.placeholder,
                                  fontSize: 12,
                                  marginLeft: 5,
                                }}
                              >
                                {formatMovementDate(
                                  valueTransfers?.filter(
                                    vt => vt.txid === item.txid,
                                  )[0].time,
                                )}
                              </Text>
                            </View>
                          </View>

                          <ZecAmount
                            style={{
                              flexGrow: 1,
                              alignSelf: 'auto',
                              justifyContent: 'flex-end',
                            }}
                            size={14}
                            currencyName={info.currencyName}
                            color={colors.text}
                            amtZec={item.amount}
                            privacy={privacy}
                          />
                        </View>
                        <View
                          style={{
                            flexDirection: 'row',
                            justifyContent: 'center',
                            alignItems: 'center',
                            marginTop: 10,
                          }}
                        >
                          {item.status === WalletBondsStatusEnum.Active && (
                            <Button
                              variant="primary"
                              title={'Redelegate'}
                              style={{ width: 'auto' }}
                              onPress={() => {
                                navigation.navigate(RouteEnum.Redelegate, {
                                  finalizer: item.finalizer,
                                  txid: item.txid,
                                  staked: item.amount,
                                  closeSheet: () => {},
                                });
                              }}
                            />
                          )}
                          {item.status === WalletBondsStatusEnum.Active && (
                            <Button
                              variant="secondary"
                              title={'Unstake'}
                              style={{ width: '40%', marginLeft: 10 }}
                              onPress={() => {
                                navigation.navigate(RouteEnum.Unstake, {
                                  finalizer: item.finalizer,
                                  txid: item.txid,
                                  staked: item.amount,
                                  closeSheet: () => {},
                                });
                              }}
                            />
                          )}
                          {item.status === WalletBondsStatusEnum.Unbonding && (
                            <Button
                              variant="primary"
                              title={'Withdraw'}
                              style={{ width: '40%', marginLeft: 10 }}
                              onPress={() => {
                                navigation.navigate(RouteEnum.Unstake, {
                                  finalizer: item.finalizer,
                                  txid: item.txid,
                                  staked: item.amount,
                                  closeSheet: () => {},
                                });
                              }}
                            />
                          )}
                        </View>
                      </View>
                    </View>
                  );
                }}
              />
            )}

            {!loading && hasStaked && tab === 'my' && (
              <>
                <ScrollView
                  ref={scrollViewRef}
                  onScroll={handleScroll}
                  showsVerticalScrollIndicator={true}
                  persistentScrollbar={true}
                  indicatorStyle={'white'}
                  style={{ maxHeight: '100%' }}
                  contentContainerStyle={{}}
                >
                  <View
                    style={{
                      marginTop: 5,
                      display: 'flex',
                      marginHorizontal: 10,
                      padding: 5,
                      alignItems: 'flex-start',
                      backgroundColor: colors.secondary,
                      borderRadius: 26,
                    }}
                  >
                    {stakedData.map((item, index) => {
                      return line(item, index, index + 1 === stakedData.length);
                    })}
                  </View>
                  <View
                    style={{
                      height:
                        Platform.OS === GlobalConst.platformOSios ? 100 : 10,
                    }}
                  />
                </ScrollView>
              </>
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
          </View>
        </View>
      </View>
      <BottomSheet
        ref={bottomSheetRef}
        index={-1}
        snapPoints={snapPoints}
        enableDynamicSizing={false}
        enablePanDownToClose
        keyboardBehavior={'interactive'}
        handleStyle={{ display: 'none' }}
        backgroundStyle={{ backgroundColor: colors.background }}
        backdropComponent={renderBackdrop}
      >
        <BottomSheetView
          style={{
            backgroundColor: 'rgba(36, 36, 38, 1)',
            height: '100%',
            borderTopLeftRadius: 38,
            borderTopRightRadius: 38,
          }}
        >
          {tab === 'my' && currentItem && (
            <>
              <FinalizerDetail
                item={currentItem}
                closeSheet={hide}
                setHeightLayout={setHeightLayout}
              />
              <View
                style={{
                  height: Platform.OS === GlobalConst.platformOSios ? 100 : 10,
                }}
              />
            </>
          )}
        </BottomSheetView>
      </BottomSheet>
    </ToastProvider>
  );
};

const styles = StyleSheet.create({
  centerContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default Staking;
