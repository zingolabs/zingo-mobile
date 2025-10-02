/* eslint-disable react-native/no-inline-styles */
import React, { useContext, useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  View,
  ScrollView,
  NativeScrollEvent,
  NativeSyntheticEvent,
  ActivityIndicator,
  Pressable,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import moment from 'moment';
import 'moment/locale/es';
import 'moment/locale/pt';
import 'moment/locale/ru';
import 'moment/locale/tr';
import { useTheme, useScrollToTop } from '@react-navigation/native';
import { AddressKindEnum, ButtonTypeEnum, RouteEnum, ScreenEnum, TransparentAddressClass, UnifiedAddressClass } from '../../app/AppState';
import { AppDrawerParamList, ThemeType } from '../../app/types';
import FadeText from '../Components/FadeText';
import Button from '../Components/Button';
import AlSummaryLine from './components/AlSummaryLine';
import { ContextAppLoaded } from '../../app/context';
import Header from '../Header';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { faAngleUp } from '@fortawesome/free-solid-svg-icons';
import Snackbars from '../Components/Snackbars';
import { ToastProvider, useToast } from 'react-native-toastier';
import { RPCAddressScopeEnum } from '../../app/rpc/enums/RPCAddressScopeEnum';
import { DrawerScreenProps } from '@react-navigation/drawer';

type AddressListProps = DrawerScreenProps<AppDrawerParamList, RouteEnum.AddressList>;

const AddressList: React.FunctionComponent<AddressListProps> = ({
  navigation,
  route,
}) => {
  const context = useContext(ContextAppLoaded);
  const {
    translate,
    language,
    addresses,
    snackbars,
    removeFirstSnackbar,
  } = context;
  const { colors } = useTheme()  as ThemeType;
  const { top, bottom, right, left } = useSafeAreaInsets();
  moment.locale(language);
  const { clear } = useToast();
  const screenName = ScreenEnum.AddressList;

  const [numAl, setNumAl] = useState<number>(50);
  const [loadMoreButton, setLoadMoreButton] = useState<boolean>(false);
  const [addressesSliced, setAddressesSliced] = useState<(UnifiedAddressClass | TransparentAddressClass)[]>([]);

  const [isAtTop, setIsAtTop] = useState<boolean>(true);
  const [isScrollingToTop, setIsScrollingToTop] = useState<boolean>(false);
  const scrollTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  const [addressKind, setAddressKind] = useState<AddressKindEnum>(route && route.params ? route.params.addressKind : AddressKindEnum.u);
  const [setIndex, setSetIndex] = useState<(n: number) => void>(route && route.params ? route.params.setIndex : () => {});

  const scrollViewRef = useRef<ScrollView>(null);

  useScrollToTop(scrollViewRef as unknown as React.RefObject<ScrollView>);

  useEffect(() => {
    const _addressKind = route && route.params ? route.params.addressKind : AddressKindEnum.u;
    const _setIndex = route && route.params ? route.params.setIndex : () => {};
    setAddressKind(_addressKind);
    setSetIndex(_setIndex);
  }, [route, route.params, route.params?.addressKind, route.params?.setIndex]);
  
  const fetchAddressBookFiltered = useMemo(async () => {
    if (!addresses) {
      return [];
    }
    if (addressKind === AddressKindEnum.u) {
      return addresses.filter((a: UnifiedAddressClass | TransparentAddressClass) => a.addressKind === addressKind);
    } else {
      return addresses.filter((a: UnifiedAddressClass | TransparentAddressClass) => a.addressKind === addressKind && a.scope === RPCAddressScopeEnum.external);
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

  const handleScroll = useCallback((event: NativeSyntheticEvent<NativeScrollEvent>) => {
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
  }, [isScrollingToTop]);

  //console.log('render Address Book - 4', currentItem, action, addressBook);

  return (
    <ToastProvider>
      <Snackbars
        snackbars={snackbars}
        removeFirstSnackbar={removeFirstSnackbar}
        screenName={screenName}
      />

      <View
        style={{
          marginTop: top,
          marginBottom: bottom,
          marginRight: right,
          marginLeft: left,
          flex: 1,
          backgroundColor: colors.background,
        }}>
        <Header
          title={`${translate('addresslist.title')} - ${addressKind === AddressKindEnum.u
            ? translate('addresslist.unified')
            : translate('addresslist.transparent')}`}
          screenName={screenName}
          noBalance={true}
          noSyncingStatus={true}
          noDrawMenu={true}
          noPrivacy={true}
          noUfvkIcon={true}
          closeScreen={() => {
            clear();
            if (navigation.canGoBack()) {
              navigation.goBack();
            }
          }}
        />
        <ScrollView
          ref={scrollViewRef}
          onScroll={handleScroll}
          scrollEventThrottle={100}
          testID="addressbook.scroll-view"
          keyboardShouldPersistTaps="handled"
          style={{ height: '80%', maxHeight: '80%' }}
          contentContainerStyle={{
            flexDirection: 'column',
            alignItems: 'stretch',
            justifyContent: 'flex-start',
          }}>
          {addressesSliced.length === 0 && !loading && (
            <View
              style={{
                height: 150,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'flex-start',
                marginTop: 30,
              }}>
              <FadeText style={{ color: colors.primary }}>{translate('addressbook.empty') as string}</FadeText>
            </View>
          )}
          {loading ? (
            <ActivityIndicator style={{ marginTop: 7, marginRight: 7 }} size={25} color={colors.primaryDisabled} />
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
                        clear();
                        if (navigation.canGoBack()) {
                          navigation.goBack();
                        }
                      }}
                      screenName={screenName}
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
              }}>
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
                  }}>
                  <FadeText style={{ color: colors.primary }}>{translate('addressbook.end') as string}</FadeText>
                </View>
              )}
            </>
          )}
        </ScrollView>
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
      </View>
    </ToastProvider>
  );
};

export default React.memo(AddressList);
