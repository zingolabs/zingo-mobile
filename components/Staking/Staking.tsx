/* eslint-disable react-native/no-inline-styles */
import React, {
  useCallback,
  useContext,
  useEffect,
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
import { useTheme } from '@react-navigation/native';
import { DrawerScreenProps } from '@react-navigation/drawer';

import {
  GlobalConst,
  RouteEnum,
  ScreenEnum,
  StakeType,
  ValueTransferKindEnum,
  ValueTransferType,
} from '../../app/AppState';
import { AppDrawerParamList } from '../../app/types';
import { ThemeType } from '../../app/types/ThemeType';
import WalletSummaryHeader from '../History/components/WalletSummaryHeader';
import SettingsButton from '../History/components/SettingsButton';
import StakingActions from './StakingActions';
import { ContextAppLoaded } from '../../app/context';
import Stake from '../../assets/icons/stake-white.svg';
import Unstake from '../../assets/icons/unstake-white.svg';
import Refresh from '../../assets/icons/refresh.svg';
import RegText from '../Components/RegText';
import FadeText from '../Components/FadeText';
import Utils from '../../app/utils';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { faAngleUp } from '@fortawesome/free-solid-svg-icons';
import AddressItem from '../Components/AddressItem';
import Snackbars from '../Components/Snackbars';
import { ToastProvider } from 'react-native-toastier';
import { isLiquidGlassSupported } from '@callstack/liquid-glass';
import ClockActive from '../../assets/icons/clock-active.svg';
import ClockInactive from '../../assets/icons/clock-inactive.svg';
import BottomSheet, {
  BottomSheetBackdrop,
  BottomSheetBackdropProps,
  BottomSheetView,
} from '@gorhom/bottom-sheet';
import FinalizerDetail from './components/FinalizerDetail';
import { lifehashDataUrlFromStringSync } from '../../app/utils/lifehash';

type DataType = {
  svg: {
    data: string;
  };
  value: number;
  key: string;
  finalizer: string;
  tag: string;
};

const getPercent = (percent: number) => {
  return (
    (percent < 1
      ? '<1'
      : percent < 100 && percent >= 99
        ? '99'
        : percent.toFixed(0)) + '%'
  );
};

type StakingUiKind =
  | 'create_bond'
  | 'begin_unbonding'
  | 'withdraw_bond'
  | 'redelegate';

type StakingMovement = ValueTransferType & {
  stakingUiKind: StakingUiKind;
};

const formatMovementDate = (unixSeconds: number) => {
  const d = new Date(unixSeconds * 1000);
  return d.toLocaleString(undefined, {
    month: 'short', // "Oct"
    day: 'numeric', // "10"
    hour: 'numeric',
    minute: '2-digit',
  }); // "Oct 10, 4:30 PM"
};

const formatHeaderMonth = (unixSeconds: number) => {
  const d = new Date(unixSeconds * 1000);
  return d.toLocaleString(undefined, {
    month: 'long', // "October"
    year: 'numeric', // "2025"
  }); // "October 2025"
};

function Separator() {
  return (
    <View
      style={{
        borderBottomWidth: 1,
        borderBottomColor: '#333333',
        borderStyle: 'solid',
      }}
    />
  );
}

type StakingProps = DrawerScreenProps<
  AppDrawerParamList,
  RouteEnum.StakingHome
>;

const Staking: React.FC<StakingProps> = () => {
  const context = useContext(ContextAppLoaded);
  const { valueTransfers, snackbars, removeFirstSnackbar, staked, info } =
    context;

  const screenName = ScreenEnum.StakingHome;

  const [loading] = useState(false);
  const [expandAddress, setExpandAddress] = useState<boolean[]>([]);
  const [tab, setTab] = useState<'movements' | 'staked'>('movements');
  const [stakingDay, setStakingDay] = useState<boolean>(true);
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

  const scrollViewRef = useRef<ScrollView & FlatList<StakingMovement>>(null);

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

  useEffect(() => {
    // TODO: fetching staking day info
    const isStakingDay: boolean = info.latestBlock
      ? info.latestBlock % 150 < 70
      : false;
    setStakingDay(isStakingDay);
  }, [info.latestBlock]);

  const movements: StakingMovement[] = useMemo(() => {
    if (!valueTransfers) {
      return [];
    }

    return valueTransfers
      .map(vt => {
        if (vt.kind === ValueTransferKindEnum.CreateBond) {
          return { ...vt, stakingUiKind: 'create_bond' };
        }

        if (vt.kind === ValueTransferKindEnum.beginUnbond) {
          return { ...vt, stakingUiKind: 'begin_unbonding' };
        }

        if (vt.kind === ValueTransferKindEnum.WithdrawBond) {
          return { ...vt, stakingUiKind: 'withdraw_bond' };
        }

        if (vt.kind === ValueTransferKindEnum.RetargetDelegationBond) {
          return { ...vt, stakingUiKind: 'redelegate' };
        }

        if (vt.amount <= 0) {
          return null;
        }

        console.log(vt);

        return null;
      })
      .filter((vt): vt is StakingMovement => vt !== null)
      .sort((a, b) => b.time - a.time);
  }, [valueTransfers]);

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
    const newExpandAddress = Array(r.length).fill(false);
    setExpandAddress(newExpandAddress);
    return r;
  }, [staked]);

  const { colors } = useTheme() as unknown as ThemeType;

  const hasMovements = !loading && movements.length > 0;
  const hasStaked = !loading && stakedData.length > 0;

  const monthHeader = hasMovements
    ? formatHeaderMonth(movements[0].time)
    : undefined;

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
    const totalValue = stakedData
      ? stakedData.reduce((acc, curr) => acc + curr.value, 0)
      : 0;
    const percent = (100 * item.value) / totalValue;
    // 30 characters per line
    const numLines =
      item.finalizer.length < 40
        ? 2
        : item.finalizer.length / (dimensions.width < 500 ? 21 : 30);
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
              <AddressItem
                address={item.finalizer}
                screenName={screenName}
                oneLine={true}
                onlyContact={true}
                withIcon={true}
              />
              {!expandAddress[index] && !!item.finalizer && (
                <RegText>
                  {item.finalizer.length > (dimensions.width < 500 ? 10 : 20)
                    ? Utils.trimToSmall(
                        item.finalizer,
                        dimensions.width < 500 ? 5 : 10,
                      )
                    : item.finalizer}
                </RegText>
              )}
              {expandAddress[index] &&
                !!item.finalizer &&
                Utils.splitStringIntoChunks(
                  item.finalizer,
                  Number(numLines.toFixed(0)),
                ).map((c: string, idx: number) => (
                  <RegText key={idx}>{c}</RegText>
                ))}
            </View>
          </View>
          <View
            style={{
              flexDirection: 'column-reverse',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <FadeText>{getPercent(percent)}</FadeText>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  //console.log('movements', movements);

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
            position: 'absolute',
            right: 10,
            top: 10,
            zIndex: 999,
          }}
        >
          <SettingsButton screenName={screenName} />
        </View>

        <View style={{ justifyContent: 'center', alignItems: 'center' }}>
          <View
            style={{
              minWidth: '50%',
              maxWidth: '60%',
              marginTop: 30,
              paddingHorizontal: 15,
              paddingRight: 20,
              paddingVertical: 7,
              justifyContent: 'center',
              alignItems: 'center',
              backgroundColor: stakingDay
                ? 'rgba(52, 199, 89, 0.2)'
                : 'rgba(65, 65, 65, 1)',
              borderRadius: 25,
            }}
          >
            <View
              style={{
                flexDirection: 'row',
                gap: 10,
                justifyContent: 'center',
                alignItems: 'center',
              }}
            >
              {stakingDay ? (
                <ClockActive width={24} height={24} />
              ) : (
                <ClockInactive width={24} height={24} />
              )}
              <View>
                <RegText>{`Staking day ${stakingDay ? 'active' : 'inactive'}`}</RegText>
                {/* <FadeText
                  style={{ color: stakingDay ? '#34c759' : '#8e8e93' }}
                >{`${stakingDay ? 'Permitted actions' : 'Opening in 2 days'}`}</FadeText> */}
              </View>
            </View>
          </View>
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

          <StakingActions stakingDay={stakingDay} />
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
              backgroundColor: tab === 'movements' ? '#6C6C71' : 'transparent',
              padding: 5,
              overflow: 'hidden',
            }}
          >
            <TouchableOpacity onPress={() => setTab('movements')}>
              <RegText
                style={{
                  fontWeight: tab === 'movements' ? 'bold' : 'normal',
                  fontSize: 15,
                  color: colors.text,
                }}
              >
                {'Movements'}
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
              backgroundColor: tab === 'staked' ? '#6C6C71' : 'transparent',
              padding: 5,
              overflow: 'hidden',
            }}
          >
            <TouchableOpacity onPress={() => setTab('staked')}>
              <RegText
                style={{
                  fontWeight: tab === 'staked' ? 'bold' : 'normal',
                  fontSize: 15,
                  color: colors.text,
                }}
              >
                {'Staked'}
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

            {!loading && !hasMovements && tab === 'movements' && (
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
                  There are no movements yet.
                </Text>
              </View>
            )}

            {!loading && !hasStaked && tab === 'staked' && (
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
                  There are no finalizers yet.
                </Text>
              </View>
            )}

            {!loading && hasMovements && tab === 'movements' && (
              <FlatList
                ref={scrollViewRef}
                onScroll={handleScroll}
                data={movements}
                keyExtractor={item => item.txid}
                contentContainerStyle={{ paddingTop: 8, paddingBottom: 4 }}
                ItemSeparatorComponent={Separator}
                ListHeaderComponent={
                  <View
                    style={{
                      marginTop: 20,
                      borderTopLeftRadius: 25,
                      borderTopRightRadius: 25,
                      paddingVertical: 10,
                      paddingHorizontal: 25,
                      backgroundColor: '#78788029',
                    }}
                  >
                    {monthHeader && (
                      <Text
                        style={{
                          color: colors.placeholder,
                          fontSize: 12,
                        }}
                      >
                        {monthHeader}
                      </Text>
                    )}
                  </View>
                }
                ListFooterComponent={
                  <View
                    style={{
                      height:
                        Platform.OS === GlobalConst.platformOSios ? 100 : 10,
                    }}
                  />
                }
                renderItem={({ item }: { item: StakingMovement }) => {
                  let label: string = '';
                  let amountLabel: string = '';
                  let Icon: React.ComponentType<{
                    width: number;
                    height: number;
                  }> | null = null;

                  switch (item.stakingUiKind) {
                    case 'create_bond': {
                      label = 'Bond created';
                      Icon = item.confirmations === 0 ? Refresh : Stake;
                      const fee = item.fee ?? 0;
                      amountLabel = `+${(fee - 0.0001).toFixed(2)} cTAZ`;
                      break;
                    }

                    case 'begin_unbonding': {
                      label = 'Begin unbonding';
                      Icon = item.confirmations === 0 ? Refresh : Unstake;
                      amountLabel = `${item.stakingAction?.val.toFixed(5)} cTAZ`;
                      break;
                    }

                    case 'withdraw_bond': {
                      label = 'Withdraw bond';
                      Icon = item.confirmations === 0 ? Refresh : Unstake;
                      amountLabel = `-${item.amount.toFixed(5)} cTAZ`;
                      break;
                    }

                    case 'redelegate': {
                      label = 'Redelegate bond';
                      Icon = item.confirmations === 0 ? Refresh : Unstake;
                      amountLabel = `${item.amount.toFixed(5)} cTAZ`;
                      break;
                    }
                  }

                  return (
                    <View
                      style={{
                        backgroundColor: colors.secondary,
                        flexDirection: 'row',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        paddingVertical: 10,
                        paddingHorizontal: 10,
                      }}
                    >
                      <View
                        style={{ flexDirection: 'row', alignItems: 'center' }}
                      >
                        {Icon && <Icon width={20} height={20} />}

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
                            {label}
                          </Text>
                          <Text
                            style={{
                              color: colors.placeholder,
                              fontSize: 12,
                              marginLeft: 5,
                            }}
                          >
                            {formatMovementDate(item.time)}
                          </Text>
                        </View>
                      </View>

                      <Text
                        style={{
                          color: colors.text,
                          fontSize: 14,
                          fontWeight: '500',
                        }}
                      >
                        {amountLabel}
                      </Text>
                    </View>
                  );
                }}
              />
            )}

            {!loading && hasStaked && tab === 'staked' && (
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
          {tab === 'staked' && currentItem && (
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
