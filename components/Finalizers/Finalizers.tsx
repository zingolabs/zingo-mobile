/* eslint-disable react-native/no-inline-styles */
import React, {
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';

import { AppDrawerParamList, ThemeType } from '../../app/types';
import { ContextAppLoaded } from '../../app/context';
import Snackbars from '../Components/Snackbars';
import { ToastProvider, useToast } from 'react-native-toastier';
import {
  GlobalConst,
  RouteEnum,
  ScreenEnum,
  SnackbarDurationEnum,
  StakeType,
} from '../../app/AppState';
import { DrawerScreenProps } from '@react-navigation/drawer';
import { HeaderTitle } from '../Header';
import {
  Dimensions,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Platform,
  Pressable,
  ScrollView,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useTheme } from '@react-navigation/native';
import RegText from '../Components/RegText';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import {
  faAngleUp,
  faChevronRight,
  faCircle,
  faMagnifyingGlass,
} from '@fortawesome/free-solid-svg-icons';
import FadeText from '../Components/FadeText';
import Utils from '../../app/utils';
import Clipboard from '@react-native-clipboard/clipboard';
import AddressItem from '../Components/AddressItem';
import ChartPieIcon from '../../assets/icons/chart-pie.svg';
import ZcashIcon from '../../assets/icons/zcash.svg';
import ZecAmount from '../Components/ZecAmount';
import { XIcon } from '../Components/Icons/XIcon';

type FinalizersProps = DrawerScreenProps<
  AppDrawerParamList,
  RouteEnum.Finalizers
>;

const Finalizers: React.FunctionComponent<FinalizersProps> = ({
  navigation,
  route,
}) => {
  const setFinalizer =
    !!route.params && route.params.setFinalizer !== undefined
      ? route.params.setFinalizer
      : () => {};
  const scope =
    !!route.params && route.params.scope !== undefined
      ? route.params.scope
      : '';
  const exclude =
    !!route.params && route.params.exclude !== undefined
      ? route.params.exclude
      : '';

  const { colors } = useTheme() as unknown as ThemeType;
  const context = useContext(ContextAppLoaded);
  const {
    snackbars,
    removeFirstSnackbar,
    staked,
    globalStaked,
    addLastSnackbar,
    translate,
    info,
    valueTransfers,
  } = context;
  const { clear } = useToast();
  const screenName = ScreenEnum.About;

  const [searchText, setSearchText] = useState<string>('');
  const [stakedFiltered, setStakedFiltered] = useState<StakeType[]>([]);
  const [randomColors, setRandomColors] = useState<string[]>([]);
  const [expandAddress, _setExpandAddress] = useState<boolean[]>([]);
  const [isAtTop, setIsAtTop] = useState<boolean>(true);
  const [isScrollingToTop, setIsScrollingToTop] = useState<boolean>(false);

  const dimensions = {
    width: Dimensions.get('window').width,
    height: Dimensions.get('window').height,
  };

  const scrollViewRef = useRef<ScrollView>(null);
  const scrollTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    console.log('SCOPE', scope);

    let base: StakeType[] = scope === 'my' ? staked : globalStaked;

    console.log('BASE', base, staked, globalStaked, scope);

    if (exclude) base = base.filter(i => i.pubKey !== exclude);

    if (searchText !== '') {
      const q = searchText.toLowerCase();
      base = base.filter(i => i.pubKey.toLowerCase().includes(q));
    }

    base = base.sort((a, b) => b.votingPower - a.votingPower);

    const withdrawnKeys = new Set(
      (valueTransfers ?? [])
        .filter(vt => vt.confirmations > 0)
        .map(vt => vt.stakingAction)
        .filter((sa): sa is NonNullable<typeof sa> => !!sa)
        .filter(sa => sa.kind === 'withdraw_bond')
        .map(sa => sa.target),
    );

    const activeBondKeys = Array.from(
      new Set(
        (valueTransfers ?? [])
          .filter(vt => vt.confirmations > 0)
          .map(vt => vt.stakingAction)
          .filter((sa): sa is NonNullable<typeof sa> => !!sa)
          .filter(sa => sa.kind === 'create_bond')
          .map(sa => sa.target)
          .filter(pk => !withdrawnKeys.has(pk)),
      ),
    );

    console.log('ACTIVE', activeBondKeys);

    const finalList =
      scope === 'network'
        ? base
        : base.filter(s => {
            const pk = s.pubKey.toLowerCase();
            const rev = s.pubKey.toLowerCase();
            console.log('>>>>>>>> FILTERING PK', pk, rev);
            return activeBondKeys.includes(pk) || activeBondKeys.includes(rev);
          });

    console.log('FINAL LIST', finalList, base);

    setStakedFiltered(finalList);

    if (randomColors.length === 0) {
      setRandomColors(Utils.generateColorList(finalList.length + 10));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [globalStaked, randomColors.length, searchText, staked]); // scope won't change

  const getPercent = (percent: number) => {
    return (
      (percent < 1
        ? '<1'
        : percent < 100 && percent >= 99
          ? '99'
          : percent.toFixed(0)) + '%'
    );
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
        scrollViewRef.current.scrollTo({ y: 0, animated: true });
      } catch (error) {
        console.log('scrollToTop failed:', error);
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

  const line = (item: StakeType, index: number, last: boolean) => {
    const totalValue = stakedFiltered
      ? stakedFiltered.reduce((acc, curr) => acc + curr.votingPower, 0)
      : 0;
    const percent = (100 * item.votingPower) / totalValue;
    // 30 characters per line
    const numLines =
      item.pubKey.length < 40
        ? 2
        : item.pubKey.length / (dimensions.width < 500 ? 21 : 30);
    return (
      <TouchableOpacity
        style={{ width: '100%' }}
        key={`tag-${index}`}
        onPress={() => {
          setFinalizer(item.pubKey, item.votingPower);
          if (navigation.canGoBack()) {
            navigation.goBack();
          }
          // navigation.navigate(goBackRoute, {
          //   finalizer: item.pubKey,
          //   staked: item.votingPower,
          //   closeSheet: () => navigation.goBack(),
          // });
        }}
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
            <FontAwesomeIcon
              style={{ marginRight: 15 }}
              size={15}
              icon={faCircle}
              color={randomColors[index]}
            />
            <TouchableOpacity
              onPress={() => {
                Clipboard.setString(item.pubKey);
                addLastSnackbar({
                  message: translate('history.addresscopied') as string,
                  duration: SnackbarDurationEnum.short,
                  screenName: [screenName],
                });
              }}
            >
              <View
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  flexWrap: 'wrap',
                }}
              >
                <AddressItem
                  address={item.pubKey}
                  screenName={screenName}
                  oneLine={true}
                  onlyContact={true}
                  withIcon={true}
                />
                {!expandAddress[index] && !!item.pubKey && (
                  <RegText>
                    {item.pubKey.length > (dimensions.width < 500 ? 10 : 20)
                      ? Utils.trimToSmall(
                          item.pubKey,
                          dimensions.width < 500 ? 5 : 10,
                        )
                      : item.pubKey}
                  </RegText>
                )}
                {expandAddress[index] &&
                  !!item.pubKey &&
                  Utils.splitStringIntoChunks(
                    item.pubKey,
                    Number(numLines.toFixed(0)),
                  ).map((c: string, idx: number) => (
                    <RegText key={idx}>{c}</RegText>
                  ))}
              </View>

              <View
                style={{
                  marginTop: 10,
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'flex-start',
                  gap: 5,
                }}
              >
                <ChartPieIcon height={16} width={16} color={colors.text} />
                <FadeText style={{ marginRight: 10 }}>
                  {getPercent(percent)}
                </FadeText>
                <ZcashIcon height={16} width={16} color={colors.text} />
                <ZecAmount
                  amtZec={item.votingPower}
                  size={14}
                  currencyName={info.currencyName}
                />
              </View>
            </TouchableOpacity>
          </View>
          <View
            style={{
              flexDirection: 'column-reverse',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <FontAwesomeIcon
              style={{ marginRight: 15 }}
              size={15}
              icon={faChevronRight}
              color={colors.text}
            />
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <ToastProvider>
      <Snackbars
        snackbars={snackbars}
        removeFirstSnackbar={removeFirstSnackbar}
        screenName={screenName}
      />

      <HeaderTitle
        title="Choose finalizer"
        goBack={() => {
          clear();
          if (navigation.canGoBack()) {
            navigation.goBack();
          }
        }}
      />

      <View
        style={{
          flexDirection: 'row',
          justifyContent: 'flex-start',
          borderRadius: 20,
          marginBottom: 10,
          backgroundColor: colors.secondary,
          height: 44,
          alignItems: 'center',
          paddingHorizontal: 16,
          margin: 15,
        }}
      >
        <FontAwesomeIcon
          icon={faMagnifyingGlass}
          size={17}
          color={colors.placeholder}
          style={{ marginRight: 10 }}
        />
        <TextInput
          style={{
            flex: 1,
            color: colors.text,
            fontSize: 17,
            fontWeight: '400',
          }}
          placeholder="Search finalizer..."
          placeholderTextColor={colors.placeholder}
          keyboardType={'default'}
          value={searchText}
          onChangeText={setSearchText}
        />
        {!!searchText && (
          <TouchableOpacity
            onPress={() => {
              setSearchText('');
            }}
          >
            <View
              style={{
                justifyContent: 'center',
                alignItems: 'center',
                backgroundColor: colors.zingo,
                borderRadius: 11,
                height: 22,
                width: 22,
                padding: 0,
              }}
            >
              <XIcon color={colors.background} width={20} height={20} />
            </View>
          </TouchableOpacity>
        )}
      </View>

      {stakedFiltered && stakedFiltered.length > 0 && (
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
            {stakedFiltered.map((item, index) => {
              return line(item, index, index + 1 === stakedFiltered.length);
            })}
          </View>
          <View
            style={{
              height: Platform.OS === GlobalConst.platformOSios ? 100 : 10,
            }}
          />
        </ScrollView>
      )}

      {!isAtTop && (
        <Pressable
          onPress={handleScrollToTop}
          disabled={isScrollingToTop}
          style={({ pressed }) => ({
            position: 'absolute',
            bottom: 30,
            right: 20,
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
    </ToastProvider>
  );
};

export default Finalizers;
