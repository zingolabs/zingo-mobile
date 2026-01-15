/* eslint-disable react-native/no-inline-styles */
import React, { useCallback, useContext, useEffect, useRef, useState } from 'react';

import { AppDrawerParamList, ThemeType } from '../../app/types';
import { ContextAppLoaded } from '../../app/context';
import Snackbars from '../Components/Snackbars';
import { ToastProvider, useToast } from 'react-native-toastier';
import { GlobalConst, RouteEnum, ScreenEnum, SnackbarDurationEnum, StakeType } from '../../app/AppState';
import { DrawerScreenProps } from '@react-navigation/drawer';
import { HeaderTitle } from '../Header';
import { Dimensions, NativeScrollEvent, NativeSyntheticEvent, Platform, Pressable, ScrollView, TextInput, TouchableOpacity, View } from 'react-native';
import { useTheme } from '@react-navigation/native';
import RegText from '../Components/RegText';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { faAngleUp, faCircle, faMagnifyingGlass } from '@fortawesome/free-solid-svg-icons';
import FadeText from '../Components/FadeText';
import Utils from '../../app/utils';
import Clipboard from '@react-native-clipboard/clipboard';
import AddressItem from '../Components/AddressItem';
import { isLiquidGlassSupported } from '@callstack/liquid-glass';

type FinalizersProps = DrawerScreenProps<AppDrawerParamList, RouteEnum.Finalizers>;

const Finalizers: React.FunctionComponent<FinalizersProps> = ({ navigation, route }) => {
  const setFinalizer = !!route.params && route.params.setFinalizer !== undefined ? route.params.setFinalizer : () => {};
  
  const { colors } = useTheme() as unknown as ThemeType;
  const context = useContext(ContextAppLoaded);
  const { snackbars, removeFirstSnackbar, globalStaked, addLastSnackbar, translate } = context;
  const { clear } = useToast();
  const screenName = ScreenEnum.About;

  const [searchText, setSearchText] = useState<string>('');
  const [globalStakedFiltered, setGlobalStakedFiltered] = useState<StakeType[]>([]);
  const [randomColors, setRandomColors] = useState<string[]>([]);
  const [expandAddress, setExpandAddress] = useState<boolean[]>([]);
  const [isAtTop, setIsAtTop] = useState<boolean>(true);
  const [isScrollingToTop, setIsScrollingToTop] = useState<boolean>(false);

  const dimensions = {
    width: Dimensions.get('window').width,
    height: Dimensions.get('window').height,
  };

  const scrollViewRef =
    useRef<ScrollView>(
      null,
    );
  const scrollTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  useEffect(() => {
    let filtered: StakeType[];
    if (searchText) {
      filtered = globalStaked
        .filter((item: StakeType) => item.pubKey.toLowerCase().includes(searchText.toLowerCase()))
        .sort((a, b) => b.votingPower - a.votingPower);
    } else {
      filtered = globalStaked
        .sort((a, b) => b.votingPower - a.votingPower);
    }
    setGlobalStakedFiltered(filtered);
    const rc = Utils.generateColorList(filtered.length + 10);
    setRandomColors(rc);
  }, [globalStaked, searchText]);

  const selectExpandAddress = (index: number) => {
    let newExpandAddress = Array(expandAddress.length).fill(false);
    newExpandAddress[index] = true;
    setExpandAddress(newExpandAddress);
  };

  const getPercent = (percent: number) => {
    return (percent < 1 ? '<1' : percent < 100 && percent >= 99 ? '99' : percent.toFixed(0)) + '%';
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

  const line = (item: StakeType, index: number, last: boolean) => {
    const totalValue = globalStakedFiltered ? globalStakedFiltered.reduce((acc, curr) => acc + curr.votingPower, 0) : 0;
    const percent = (100 * item.votingPower) / totalValue;
    // 30 characters per line
    const numLines = item.pubKey.length < 40 ? 2 : item.pubKey.length / (dimensions.width < 500 ? 21 : 30);
    return (
      <TouchableOpacity 
        style={{ width: '100%' }} 
        key={`tag-${index}`} 
        onPress={() => {
          setFinalizer(item.pubKey);
          if (navigation.canGoBack()) {
            navigation.goBack();
          }
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
          }}>
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
            }}>
            <FontAwesomeIcon style={{ marginRight: 15 }} size={15} icon={faCircle} color={randomColors[index]} />
            <TouchableOpacity
              onPress={() => {
                Clipboard.setString(item.pubKey);
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
                <AddressItem address={item.pubKey} screenName={screenName} oneLine={true} onlyContact={true} withIcon={true} />
                {!expandAddress[index] && !!item.pubKey && (
                  <RegText>
                    {item.pubKey.length > (dimensions.width < 500 ? 10 : 20)
                      ? Utils.trimToSmall(item.pubKey, dimensions.width < 500 ? 5 : 10)
                      : item.pubKey}
                  </RegText>
                )}
                {expandAddress[index] &&
                  !!item.pubKey &&
                  Utils.splitStringIntoChunks(item.pubKey, Number(numLines.toFixed(0))).map(
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

      <HeaderTitle title='Choose finalizer' goBack={() => {
        clear();
        if (navigation.canGoBack()) {
          navigation.goBack();
        }
      }} />

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
          margin: 15
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
            paddingVertical: 0,
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
              <RegText
                style={{ color: colors.background, marginTop: -3 }}
              >
                x
              </RegText>
            </View>
          </TouchableOpacity>
        )}
      </View>

      {globalStakedFiltered && globalStakedFiltered.length > 0 && (
        <ScrollView
          ref={scrollViewRef}
          onScroll={handleScroll}
          showsVerticalScrollIndicator={true}
          persistentScrollbar={true}
          indicatorStyle={'white'}
          style={{ maxHeight: '100%' }}
          contentContainerStyle={{}}>
          <View style={{ display: 'flex', marginHorizontal: 10, padding: 5, alignItems: 'flex-start', backgroundColor: colors.secondary, borderRadius: 26 }}>
            {globalStakedFiltered
              .map((item, index) => {
                return line(item, index, (index + 1) === globalStakedFiltered.length );
              })}
          </View>
          <View style={{
            height: Platform.OS === GlobalConst.platformOSios ? 100 : 10,
            }} />
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
      
    </ToastProvider>
  );
};

export default Finalizers;
