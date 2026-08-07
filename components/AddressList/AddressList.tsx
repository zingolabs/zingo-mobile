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
  ScrollView,
  NativeScrollEvent,
  NativeSyntheticEvent,
  ActivityIndicator,
  Pressable,
  TouchableOpacity,
} from 'react-native';

import { useScrollToTop } from '@react-navigation/native';
import { useTheme } from '../../app/theme';
import {
  AddressKindEnum,
  ButtonTypeEnum,
  RouteEnum,
  ScreenEnum,
  TransparentAddressClass,
  UnifiedAddressClass,
} from '../../app/AppState';
import { AppDrawerParamList } from '../../app/types';
import FadeText from '../Components/FadeText';
import BoldText from '../Components/BoldText';
import Button from '../Components/Button';
import AlSummaryLine from './components/AlSummaryLine';
import { ContextAppLoaded } from '../../app/context';
import Header from '../Header';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { faAngleUp, faChevronLeft } from '@fortawesome/free-solid-svg-icons';
import BottomSheet from '@gorhom/bottom-sheet';
import { RPCAddressScopeEnum } from '../../app/walletBackend/enums/RPCAddressScopeEnum';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useFullSheetSnapPoints } from '../../app/hooks/useFullSheetSnapPoints';

type AddressListProps = NativeStackScreenProps<
  AppDrawerParamList,
  RouteEnum.AddressList
>;

const AddressList: React.FunctionComponent<AddressListProps> = ({
  navigation,
  route,
}) => {
  const setIndex =
    !!route.params && route.params.setIndex !== undefined
      ? route.params.setIndex
      : () => {};
  const context = useContext(ContextAppLoaded);
  const { translate, addresses } = context;
  const { colors } = useTheme();
  const screenName = ScreenEnum.AddressList;

  const [numAl, setNumAl] = useState<number>(50);
  const [loadMoreButton, setLoadMoreButton] = useState<boolean>(false);
  const [addressesSliced, setAddressesSliced] = useState<
    (UnifiedAddressClass | TransparentAddressClass)[]
  >([]);

  const [isAtTop, setIsAtTop] = useState<boolean>(true);
  const [isScrollingToTop, setIsScrollingToTop] = useState<boolean>(false);
  const scrollTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  const [addressKind, setAddressKind] = useState<AddressKindEnum>(
    !!route.params && route.params.addressKind !== undefined
      ? route.params.addressKind
      : AddressKindEnum.u,
  );
  const [containerH, setContainerH] = useState<number>(0);
  const [headerH, setHeaderH] = useState<number>(0);

  const scrollViewRef = useRef<ScrollView>(null);
  const addressListSheetRef = useRef<BottomSheet>(null);

  useScrollToTop(scrollViewRef as unknown as React.RefObject<ScrollView>);

  const closeScreen = useCallback(() => {
    if (navigation.canGoBack()) {
      navigation.goBack();
    }
  }, [navigation]);

  const addressListSnapPoints = useFullSheetSnapPoints(containerH, headerH);

  const handleTitle = useMemo(
    () =>
      `${translate('addresslist.title')} - ${
        addressKind === AddressKindEnum.u
          ? translate('addresslist.unified')
          : translate('addresslist.transparent')
      }`,
    [addressKind, translate],
  );

  const renderAddressListHandle = useCallback(
    () => (
      <View
        style={{
          paddingTop: 12,
          paddingBottom: 8,
          paddingHorizontal: 16,
          backgroundColor: colors.bgSurface,
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
          <TouchableOpacity
            onPress={closeScreen}
            hitSlop={8}
            style={{ paddingHorizontal: 4, paddingVertical: 4 }}
          >
            <FontAwesomeIcon
              icon={faChevronLeft}
              size={20}
              color={colors.fgAccent}
            />
          </TouchableOpacity>
          <BoldText
            numberOfLines={1}
            style={{
              flex: 1,
              fontSize: 16,
              lineHeight: 28,
              textAlign: 'center',
            }}
          >
            {handleTitle}
          </BoldText>
          <View style={{ width: 28 }} />
        </View>
      </View>
    ),
    [colors, closeScreen, handleTitle],
  );

  useEffect(() => {
    const _addressKind =
      !!route.params && route.params.addressKind !== undefined
        ? route.params.addressKind
        : AddressKindEnum.u;
    setAddressKind(_addressKind);
  }, [route, route.params, route.params?.addressKind]);

  const fetchAddressBookFiltered = useMemo(async () => {
    if (!addresses) {
      return [];
    }
    if (addressKind === AddressKindEnum.u) {
      return addresses.filter(
        (a: UnifiedAddressClass | TransparentAddressClass) =>
          a.addressKind === addressKind,
      );
    } else {
      return addresses.filter(
        (a: UnifiedAddressClass | TransparentAddressClass) =>
          a.addressKind === addressKind &&
          a.scope === RPCAddressScopeEnum.external,
      );
    }
  }, [addressKind, addresses]);

  useEffect(() => {
    (async () => {
      const abf = await fetchAddressBookFiltered;
      setLoadMoreButton(numAl < abf.length);
      setAddressesSliced(abf.slice(0, numAl));
      setLoading(false);
    })();
  }, [fetchAddressBookFiltered, numAl]);

  const loadMoreClicked = useCallback(() => {
    setNumAl(numAl + 50);
  }, [numAl]);

  const handleScrollToTop = useCallback(() => {
    if (scrollViewRef.current && !isScrollingToTop) {
      setIsScrollingToTop(true);

      // Clear any existing timeout
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
      }

      // Force set to top immediately for UI feedback
      setIsAtTop(true);

      // Scroll to top
      scrollViewRef.current.scrollTo({ y: 0, animated: true });

      // Set timeout to reset scrolling state
      scrollTimeoutRef.current = setTimeout(() => {
        setIsScrollingToTop(false);
        // Double-check position after scroll animation
        if (scrollViewRef.current) {
          setIsAtTop(true); // For ScrollView, assume success
        }
      }, 800);
    }
  }, [isScrollingToTop]);

  const handleScroll = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      const { contentOffset } = event.nativeEvent;
      const isTop = contentOffset.y <= 100;

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

  //console.log('render Address Book - 4', currentItem, action, addressBook);

  return (
    <View
      style={{
        flex: 1,
        backgroundColor: colors.bgCanvas,
      }}
      onLayout={e => setContainerH(e.nativeEvent.layout.height)}
    >
      <View onLayout={e => setHeaderH(e.nativeEvent.layout.height)}>
        <Header
          title={''}
          screenName={screenName}
          noBalance={true}
          noSyncingStatus={true}
          noDrawMenu={true}
          noPrivacy={true}
          noUfvkIcon={true}
        />
      </View>
      <BottomSheet
        ref={addressListSheetRef}
        snapPoints={addressListSnapPoints}
        index={0}
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
        handleComponent={renderAddressListHandle}
      >
        <ScrollView
          ref={scrollViewRef}
          onScroll={handleScroll}
          scrollEventThrottle={100}
          testID="addressbook.scroll-view"
          keyboardShouldPersistTaps="handled"
          bounces={false}
          alwaysBounceVertical={false}
          style={{
            flex: 1,
            backgroundColor: colors.bgSurface,
          }}
          contentContainerStyle={{
            flexDirection: 'column',
            alignItems: 'stretch',
            justifyContent: 'flex-start',
          }}
        >
          {addressesSliced.length === 0 && !loading && (
            <View
              style={{
                height: 150,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'flex-start',
                marginTop: 30,
              }}
            >
              <FadeText style={{ color: colors.fgAccent }}>
                {translate('addressbook.empty') as string}
              </FadeText>
            </View>
          )}
          {loading ? (
            <ActivityIndicator
              style={{ marginTop: 7, marginRight: 7 }}
              size={20}
              color={colors.fgAccentDisabled}
            />
          ) : (
            <>
              {addressesSliced.map((alItem, index) => {
                return (
                  <View key={`container-${index}-${alItem.address}`}>
                    <AlSummaryLine
                      key={`line-${index}-${alItem.address}`}
                      index={index}
                      setIndex={setIndex}
                      item={alItem}
                      closeScreen={() => {
                        if (navigation.canGoBack()) {
                          navigation.goBack();
                        }
                      }}
                    />
                  </View>
                );
              })}
            </>
          )}
          {loadMoreButton ? (
            <View
              style={{
                height: 150,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'flex-start',
                marginTop: 5,
                marginBottom: 30,
              }}
            >
              <Button
                type={ButtonTypeEnum.Secondary}
                title={translate('addressbook.loadmore') as string}
                onPress={loadMoreClicked}
              />
            </View>
          ) : (
            <>
              {!!addressesSliced && !!addressesSliced.length && !loading && (
                <View
                  style={{
                    height: 150,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'flex-start',
                    marginTop: 5,
                    marginBottom: 30,
                  }}
                >
                  <FadeText style={{ color: colors.fgAccent }}>
                    {translate('addressbook.end') as string}
                  </FadeText>
                </View>
              )}
            </>
          )}
        </ScrollView>
      </BottomSheet>
      {!isAtTop && (
        <Pressable
          onPress={handleScrollToTop}
          disabled={isScrollingToTop}
          style={({ pressed }) => ({
            position: 'absolute',
            bottom: 105,
            right: 10,
            paddingHorizontal: 5,
            paddingVertical: 10,
            backgroundColor: colors.bgChrome,
            borderRadius: 50,
            transform: [{ scale: pressed ? 0.9 : 1 }],
            borderWidth: 1,
            borderColor: colors.borderMuted,
            opacity: isScrollingToTop ? 0.5 : 1,
          })}
        >
          <FontAwesomeIcon
            style={{ marginLeft: 5, marginRight: 5, marginTop: 0 }}
            size={16}
            icon={faAngleUp}
            color={colors.fgMuted}
          />
        </Pressable>
      )}
    </View>
  );
};

export default React.memo(AddressList);
