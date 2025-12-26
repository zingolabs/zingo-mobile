/* eslint-disable react-native/no-inline-styles */
import React, { useCallback, useContext, useMemo, useRef, useState } from 'react';
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
} from 'react-native';
import { useTheme } from '@react-navigation/native';
import { DrawerScreenProps } from '@react-navigation/drawer';

import { GlobalConst, RouteEnum, ScreenEnum, SnackbarDurationEnum, ValueTransferType } from '../../app/AppState';
import { AppDrawerParamList } from '../../app/types';
import { ThemeType } from '../../app/types/ThemeType';
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
import Clipboard from '@react-native-clipboard/clipboard';
import { faAngleUp, faCircle } from '@fortawesome/free-solid-svg-icons';
import AddressItem from '../Components/AddressItem';
import Snackbars from '../Components/Snackbars';
import { ToastProvider } from 'react-native-toastier';
import { isLiquidGlassSupported } from '@callstack/liquid-glass';

type DataType = {
  svg: {
    fill: string;
  };
  value: number;
  key: string;
  finalizer: string;
  tag: string;
};

const getPercent = (percent: number) => {
  return (percent < 1 ? '<1' : percent < 100 && percent >= 99 ? '99' : percent.toFixed(0)) + '%';
};

type StakingUiKind = 'stake' | 'unstake_request' | 'unstake_payout';

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
  const { valueTransfers, addLastSnackbar, translate, snackbars, removeFirstSnackbar } = context;

  const screenName = ScreenEnum.StakingHome;

  const [loading] = useState(false);
  const [expandAddress, setExpandAddress] = useState<boolean[]>([]);
  const [tab, setTab] = useState<'movements' | 'staked'>('movements');
  const [isAtTop, setIsAtTop] = useState<boolean>(true);
  const [isScrollingToTop, setIsScrollingToTop] = useState<boolean>(false);
  const scrollTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    
  const dimensions = {
    width: Dimensions.get('window').width,
    height: Dimensions.get('window').height,
  };

  const scrollViewRef =
    useRef<ScrollView & FlatList<StakingMovement>>(
      null,
    );
  
  const movements: StakingMovement[] = useMemo(() => {
    if (!valueTransfers) {
      return [];
    }
    const localTxids = new Set(
      valueTransfers
        .map(vt => vt.txid)
        .filter((txid): txid is string => !!txid),
    );

    const normalizeMemos = (memos: unknown): string[] => {
      if (!memos) return [];
      if (Array.isArray(memos)) {
        return memos
          .filter((m): m is string => typeof m === 'string')
          .map(m => m.replace(/\0+$/g, ''));
      }
      if (typeof memos === 'string') {
        return [memos.replace(/\0+$/g, '')];
      }
      return [];
    };

    return valueTransfers
      .map<StakingMovement | null>(vt => {
        const action = vt.stakingAction;

        if (action?.kind === 'add') {
          if (vt.amount === 0 || vt.amount !== action.val) {
            return null;
          }
          return { ...vt, stakingUiKind: 'stake' };
        }

        if (action?.kind === 'sub') {
          return { ...vt, stakingUiKind: 'unstake_request' };
        }

        const memos = normalizeMemos((vt as any).memos);
        if (!memos.length) {
          return null;
        }

        const prefix = '@UNSTAKE_RECEIVE: ';
        const matchingMemo = memos.find(m => m.startsWith(prefix));
        if (!matchingMemo) {
          return null;
        }

        const afterPrefix = matchingMemo.slice(prefix.length).trim();
        const [refTxid] = afterPrefix.split(/\s+/);

        if (!refTxid || !/^[0-9a-fA-F]{64}$/.test(refTxid)) {
          return null;
        }

        if (!localTxids.has(refTxid)) {
          return null;
        }

        if (vt.amount <= 0) {
          return null;
        }

        return { ...vt, stakingUiKind: 'unstake_payout' };
      })
      .filter((vt): vt is StakingMovement => vt !== null)
      .sort((a, b) => b.time - a.time);
  }, [valueTransfers]);

  const staked: DataType[] = useMemo(() => {
    //resultStr = await RPCModule.getTotalSpendsToAddressInfo();
    const resultStr: string = JSON.stringify([
      {pub_key: '01234567890123456789012345678901', voting_power: 1000000},
      {pub_key: '01234567890123456789012345678901', voting_power: 2000000},
      {pub_key: '01234567890123456789012345678901', voting_power: 3000000},
      {pub_key: '01234567890123456789012345678901', voting_power: 4000000},
      {pub_key: '01234567890123456789012345678901', voting_power: 5000000},
      {pub_key: '01234567890123456789012345678901', voting_power: 6000000},
      {pub_key: '01234567890123456789012345678901', voting_power: 7000000},
      {pub_key: '01234567890123456789012345678901', voting_power: 8000000},
      {pub_key: '01234567890123456789012345678901', voting_power: 9000000},
      {pub_key: '01234567890123456789012345678901', voting_power: 10000000},
      {pub_key: '01234567890123456789012345678901', voting_power: 11000000},
      {pub_key: '01234567890123456789012345678901', voting_power: 12000000},
      {pub_key: '01234567890123456789012345678901', voting_power: 13000000},
      {pub_key: '01234567890123456789012345678901', voting_power: 14000000},
      {pub_key: '01234567890123456789012345678901', voting_power: 15000000},
      {pub_key: '01234567890123456789012345678901', voting_power: 16000000},
    ]);
    let resultJSON: { pub_key: string, voting_power: number }[];
    try {
      resultJSON = JSON.parse(resultStr);
    } catch (e) {
      resultJSON = [];
    }
    console.log(resultStr, resultJSON);
    const randomColors = Utils.generateColorList(resultJSON.length + 10);
    const r = resultJSON
      .filter((i: { pub_key: string, voting_power: number }) => i.voting_power > 0 && !!i.pub_key)
      .sort((a, b) => b.voting_power - a.voting_power)
      .map((item, index) => {
        return {
          value: item.voting_power / 10 ** 8,
          finalizer: item.pub_key,
          tag: '',
          svg: { fill: randomColors[index] },
          key: `pie-${index}`,
        };
      });
      const newExpandAddress = Array(r.length).fill(false);
      setExpandAddress(newExpandAddress);
      return r;
  }, []);

  const { colors } = useTheme() as unknown as ThemeType;

  const hasMovements = !loading && movements.length > 0;
  const hasStaked = !loading && staked.length > 0;

  const monthHeader = hasMovements
    ? formatHeaderMonth(movements[0].time)
    : undefined;

  const selectExpandAddress = (index: number) => {
    let newExpandAddress = Array(expandAddress.length).fill(false);
    newExpandAddress[index] = true;
    setExpandAddress(newExpandAddress);
  };

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
        scrollViewRef.current.scrollTo({y: 0, animated: true});
      } catch (error) {
        console.log('scrollToTop failed:', error);
        scrollViewRef.current.scrollToOffset({offset: 0, animated: true});
      }
    }
  }, [isScrollingToTop]);

  const handleScroll = useCallback((event: NativeSyntheticEvent<NativeScrollEvent>) => {
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
  }, [isScrollingToTop]);
  
  const line = (item: DataType, index: number, last: boolean) => {
    const totalValue = staked ? staked.reduce((acc, curr) => acc + curr.value, 0) : 0;
    const percent = (100 * item.value) / totalValue;
    // 30 characters per line
    const numLines = item.finalizer.length < 40 ? 2 : item.finalizer.length / (dimensions.width < 500 ? 21 : 30);
    return (
      <View style={{ width: '100%' }} key={`tag-${index}`}>
        <View
          style={{
            flexDirection: 'row',
            justifyContent: 'space-between',
            marginHorizontal: 20,
            paddingVertical: 15,
            borderBottomColor: '#333333',
            borderBottomWidth: last ? 0 : 1,
          }}>
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
            }}>
            <FontAwesomeIcon style={{ marginRight: 15 }} size={15} icon={faCircle} color={item.svg.fill} />
            {!!item.tag && <FadeText style={{ marginHorizontal: 5 }}>{item.tag}</FadeText>}
            <TouchableOpacity
              onPress={() => {
                Clipboard.setString(item.finalizer);
                addLastSnackbar({
                  message: translate('history.addresscopied') as string,
                  duration: SnackbarDurationEnum.short,
                  screenName: [screenName],
                });
                selectExpandAddress(index);
              }}>
              <View
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  flexWrap: 'wrap',
                }}>
                <AddressItem address={item.finalizer} screenName={screenName} oneLine={true} onlyContact={true} withIcon={true} />
                {!expandAddress[index] && !!item.finalizer && (
                  <RegText>
                    {item.finalizer.length > (dimensions.width < 500 ? 10 : 20)
                      ? Utils.trimToSmall(item.finalizer, dimensions.width < 500 ? 5 : 10)
                      : item.finalizer}
                  </RegText>
                )}
                {expandAddress[index] &&
                  !!item.finalizer &&
                  Utils.splitStringIntoChunks(item.finalizer, Number(numLines.toFixed(0))).map(
                    (c: string, idx: number) => (
                      <RegText key={idx}>
                        {c}
                      </RegText>
                    ),
                  )}
              </View>
            </TouchableOpacity>
          </View>
          <View
            style={{
              flexDirection: 'column-reverse',
              alignItems: 'center',
              justifyContent: 'center',
            }}>
            <FadeText >{getPercent(percent)}</FadeText>
          </View>
        </View>
      </View>
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
        {/* Header + quick actions */}
        <View
          style={{
            backgroundColor: colors.card,
            paddingTop: 10,
            paddingBottom: 10,
          }}
        >
          <WalletSummaryHeader show_staked={true} />

          <View
            style={{
              position: 'absolute',
              right: 10,
              top: 10,
            }}
          >
            <SettingsButton screenName={screenName} />
          </View>

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
          }}>
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
            }}>
            <TouchableOpacity onPress={() => setTab('movements')}>
              <RegText
                style={{
                  fontWeight: tab === 'movements' ? 'bold' : 'normal',
                  fontSize: 15,
                  color: colors.text,
                }}>
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
            }}>
            <TouchableOpacity onPress={() => setTab('staked')}>
              <RegText
                style={{
                  fontWeight: tab === 'staked' ? 'bold' : 'normal',
                  fontSize: 15,
                  color: colors.text
                }}>
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

            {!loading && !hasMovements && (
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

            {!loading && !hasStaked && (
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
                renderItem={({ item }: { item: StakingMovement }) => {
                  let label: string;
                  let amountLabel: string;
                  let Icon: React.ComponentType<{
                    width: number;
                    height: number;
                  }> | null = null;

                  switch (item.stakingUiKind) {
                    case 'stake': {
                      label = 'Staked';
                      Icon = Stake;
                      amountLabel = `+${item.amount.toFixed(5)} cTAZ`;
                      break;
                    }

                    case 'unstake_request': {
                      label = 'Unstake request';
                      Icon = Unstake;

                      const valZats = item.stakingAction?.val ?? 0;
                      const valCoins = valZats / 10 ** 8;
                      amountLabel = `-${valCoins.toFixed(5)} cTAZ`;
                      break;
                    }

                    case 'unstake_payout': {
                      label = 'Unstaked';
                      Icon = Unstake;
                      amountLabel = `+${item.amount.toFixed(5)} cTAZ`;
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
              <ScrollView
                ref={scrollViewRef}
                onScroll={handleScroll}
                showsVerticalScrollIndicator={true}
                persistentScrollbar={true}
                indicatorStyle={'white'}
                style={{ maxHeight: '100%' }}
                contentContainerStyle={{}}>
                <View style={{ display: 'flex', marginHorizontal: 10, padding: 5, alignItems: 'flex-start', backgroundColor: colors.secondary, borderRadius: 26 }}>
                  {staked
                    .map((item, index) => {
                      return line(item, index, (index + 1) === staked.length );
                    })}
                </View>
              </ScrollView>
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
