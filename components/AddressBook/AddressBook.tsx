/* eslint-disable react-native/no-inline-styles */
import React, { useContext, useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  View,
  ScrollView,
  NativeScrollEvent,
  NativeSyntheticEvent,
  TouchableOpacity,
  ActivityIndicator,
  Pressable,
} from 'react-native';

import moment from 'moment';
import 'moment/locale/es';
import 'moment/locale/pt';
import 'moment/locale/ru';
import 'moment/locale/tr';
import { useTheme, useScrollToTop } from '@react-navigation/native';
import { AddressBookActionEnum, AddressBookFileClass, ButtonTypeEnum, FilterEnum, GlobalConst, RouteEnum, ScreenEnum } from '../../app/AppState';
import { AppDrawerParamList, ThemeType } from '../../app/types';
import FadeText from '../Components/FadeText';
import Button from '../Components/Button';
import AbDetail from './components/AbDetail';
import AbSummaryLine from './components/AbSummaryLine';
import { ContextAppLoaded } from '../../app/context';
import Header from '../Header';
import AddressBookFileImpl from './AddressBookFileImpl';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { faAngleUp } from '@fortawesome/free-solid-svg-icons';
import Utils from '../../app/utils';
import Snackbars from '../Components/Snackbars';
import { ToastProvider, useToast } from 'react-native-toastier';
import RPCModule from '../../app/RPCModule';
import { RPCCheckAddressType } from '../../app/rpc/types/RPCCheckAddressType';
import { DrawerScreenProps } from '@react-navigation/drawer';

type AddressBookProps = DrawerScreenProps<AppDrawerParamList, RouteEnum.AddressBook> & {
  setAddressBook: (ab: AddressBookFileClass[]) => void;
};

const AddressBook: React.FunctionComponent<AddressBookProps> = ({
  navigation,
  route,
  setAddressBook,
}) => {
  const context = useContext(ContextAppLoaded);
  const {
    translate,
    language,
    addressBook,
    zenniesDonationAddress,
    snackbars,
    removeFirstSnackbar,
  } = context;
  const { colors } = useTheme()  as ThemeType;
  moment.locale(language);
  const { clear } = useToast();
  const screenName = ScreenEnum.AddressBook;

  const [numAb, setNumAb] = useState<number>(50);
  const [loadMoreButton, setLoadMoreButton] = useState<boolean>(false);
  //const [addressBookFiltered, setAddressBookFiltered] = useState<AddressBookFileClass[]>([]);
  const [addressBookSliced, setAddressBookSliced] = useState<AddressBookFileClass[]>([]);
  const [addressBookProtected, setAddressBookProtected] = useState<AddressBookFileClass[]>([]);

  const [currentItem, setCurrentItem] = useState<number | null>(null);
  const [action, setAction] = useState<AddressBookActionEnum | null>(null);
  const [isAtTop, setIsAtTop] = useState<boolean>(true);
  const [isScrollingToTop, setIsScrollingToTop] = useState<boolean>(false);
  const scrollTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [filter, setFilter] = useState<FilterEnum>(FilterEnum.all);
  const [currentAddress, setCurrentAddress] = useState<string>(!!route.params && route.params.currentAddress !== undefined ? route.params.currentAddress : '');
  const [routeStack, setRouteStack] = useState<RouteEnum>(!!route.params && route.params.routeStack !== undefined ? route.params.routeStack : RouteEnum.AddressBookStack);

  const scrollViewRef = useRef<ScrollView>(null);

  useScrollToTop(scrollViewRef as unknown as React.RefObject<ScrollView>);

  const fetchAddressBookFiltered = useMemo(async () => {
      const filterApply = (ab: AddressBookFileClass) => {
        if (filter === FilterEnum.all) {
          return true;
        } else if (filter === FilterEnum.contacts) {
          return !ab.own;
        } else if (filter === FilterEnum.wallet) {
          return ab.own;
        }
      };
    // excluding this address from the list
    return addressBook.filter((ab: AddressBookFileClass) => ab.address !== zenniesDonationAddress && filterApply(ab));
  }, [addressBook, filter, zenniesDonationAddress]);

  const fetchAddressBookProtected = useMemo(async () => {
    // only protected address to use internally ZingoLabs.
    return addressBook.filter((ab: AddressBookFileClass) => ab.address === zenniesDonationAddress);
  }, [addressBook, zenniesDonationAddress]);

  useEffect(() => {
    const _currentAddress = !!route.params && route.params.currentAddress !== undefined ? route.params.currentAddress : '';
    const _routeStack = !!route.params && route.params.routeStack !== undefined ? route.params.routeStack : RouteEnum.AddressBookStack;
    setCurrentAddress(_currentAddress);
    setRouteStack(_routeStack);
  }, [
    route, 
    route.params,
    route.params?.currentAddress,
  ]);

  useEffect(() => {
    (async () => {
      const abf = await fetchAddressBookFiltered;
      const abp = await fetchAddressBookProtected;
      //setAddressBookFiltered(abf);
      setLoadMoreButton(numAb < abf.length);
      setAddressBookSliced(abf.slice(0, numAb));
      setAddressBookProtected(abp);
      // find the current address
      if (currentAddress) {
        const index: number = abf.findIndex((i: AddressBookFileClass) => i.address === currentAddress);
        if (index === -1) {
          setAction(AddressBookActionEnum.Add);
        } else {
          setAction(AddressBookActionEnum.Modify);
        }
        setCurrentItem(index);
      }
      setLoading(false);
    })();
  }, [currentAddress, fetchAddressBookProtected, fetchAddressBookFiltered, numAb, addressBook]);

  const loadMoreClicked = useCallback(() => {
    setNumAb(numAb + 50);
  }, [numAb]);

  const newAddressBookItem = () => {
    setCurrentItem(-1);
    setAction(AddressBookActionEnum.Add);
  };

  const cancel = () => {
    setCurrentItem(null);
    setAction(null);
    if (currentAddress) {
      clear();
      setCurrentAddress('');
      if (navigation.canGoBack()) {
        navigation.goBack();
      }
    }
  };

  const doAction = async (
    a: AddressBookActionEnum,
    label: string,
    address: string,
    color: string,
  ) => {
    if (!label || !address) {
      return;
    }
    let ab: AddressBookFileClass[] = [];
    if (a === AddressBookActionEnum.Delete) {
      ab = await AddressBookFileImpl.removeAddressBookItem(label, address);
    } else {
      let own: boolean;
      // verify this address as own or not
      const checkStr = await RPCModule.checkMyAddressInfo(address);
      //console.log(checkStr);
      if (checkStr && !checkStr.toLowerCase().startsWith(GlobalConst.error)) {
        const checkJSON: RPCCheckAddressType = await JSON.parse(checkStr);
        own = checkJSON.is_wallet_address;
      } else {
        // error
        own = false;
      }
      ab = await AddressBookFileImpl.writeAddressBookItem(
        label,
        address,
        color ? color : Utils.generateColorList(1)[0],
        own,
      );
    }
    const abSorted = ab.sort((aa, bb) => {
      const aLabel = aa.label;
      const bLabel = bb.label;
      return aLabel.localeCompare(bLabel);
    });
    setAddressBook(abSorted);
    await AddressBookFileImpl.writeAddressBook(abSorted);
    cancel();
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
          flex: 1,
          backgroundColor: colors.background,
        }}>
        <Header
          title={translate('addressbook.title') as string}
          screenName={screenName}
          noBalance={true}
          noSyncingStatus={true}
          noDrawMenu={true}
          noPrivacy={true}
          noUfvkIcon={true}
          closeScreen={() => {
            setCurrentItem(null);
            setAction(null);
            setCurrentAddress('');
            clear();
            if (navigation.canGoBack()) {
              navigation.goBack();
            }
          }}
        />
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            width: '100%',
            marginHorizontal: 5,
            marginBottom: 2,
          }}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{
              width: '100%',
              marginTop: 10,
              alignItems: 'center',
              justifyContent: 'center',
            }}>
            <TouchableOpacity
              onPress={() => {
                cancel();
                setFilter(FilterEnum.all);
                setLoading(true);
              }}>
              <View
                style={{
                  backgroundColor: filter === FilterEnum.all ? colors.primary : colors.sideMenuBackground,
                  borderRadius: 15,
                  borderColor: filter === FilterEnum.all ? colors.primary : colors.zingo,
                  borderWidth: 1,
                  paddingHorizontal: 10,
                  paddingVertical: 5,
                  marginRight: 10,
                }}>
                <FadeText
                  style={{
                    color: filter === FilterEnum.all ? colors.sideMenuBackground : colors.zingo,
                    fontWeight: 'bold',
                  }}>
                  {translate('messages.filter-all') as string}
                </FadeText>
              </View>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => {
                cancel();
                setFilter(FilterEnum.contacts);
                setLoading(true);
              }}>
              <View
                style={{
                  backgroundColor: filter === FilterEnum.contacts ? colors.primary : colors.sideMenuBackground,
                  borderRadius: 15,
                  borderColor: filter === FilterEnum.contacts ? colors.primary : colors.zingo,
                  borderWidth: 1,
                  paddingHorizontal: 10,
                  paddingVertical: 5,
                  marginRight: 10,
                }}>
                <FadeText
                  style={{
                    color: filter === FilterEnum.contacts ? colors.sideMenuBackground : colors.zingo,
                    fontWeight: 'bold',
                  }}>
                  {translate('messages.filter-contacts') as string}
                </FadeText>
              </View>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => {
                cancel();
                setFilter(FilterEnum.wallet);
                setLoading(true);
              }}>
              <View
                style={{
                  backgroundColor: filter === FilterEnum.wallet ? colors.primary : colors.sideMenuBackground,
                  borderRadius: 15,
                  borderColor: filter === FilterEnum.wallet ? colors.primary : colors.zingo,
                  borderWidth: 1,
                  paddingHorizontal: 10,
                  paddingVertical: 5,
                  marginRight: 0,
                }}>
                <FadeText
                  style={{
                    color: filter === FilterEnum.wallet ? colors.sideMenuBackground : colors.zingo,
                    fontWeight: 'bold',
                  }}>
                  {translate('addressbook.filter-wallet') as string}
                </FadeText>
              </View>
            </TouchableOpacity>
          </ScrollView>
        </View>
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
          {currentItem === -1 && action !== null && (
            <AbDetail
              index={-1}
              key={'detail-new'}
              item={{} as AddressBookFileClass}
              cancel={cancel}
              action={action}
              doAction={doAction}
              currentAddress={currentAddress}
              screenName={screenName}
              routeStack={routeStack}
            />
          )}
          {currentItem !== null && currentItem > -1 && action !== null && (
            <AbDetail
              index={currentItem}
              key={`detail-${currentItem}-${addressBookSliced[currentItem].label}`}
              item={addressBookSliced[currentItem]}
              cancel={cancel}
              action={action}
              doAction={doAction}
              screenName={screenName}
              routeStack={routeStack}
            />
          )}
          {!currentAddress && addressBookSliced.length === 0 && currentItem !== -1 && !loading && (
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
              {!currentAddress &&
                addressBookSliced.map((aBItem, index) => {
                  return (
                    <View key={`container-${index}-${aBItem.label}`}>
                      {currentItem === index && (
                        <AbSummaryLine
                          index={index}
                          key={`line-${index}-${aBItem.label}`}
                          item={aBItem}
                          setCurrentItem={setCurrentItem}
                          setAction={setAction}
                          handleScrollToTop={handleScrollToTop}
                          doAction={doAction}
                        />
                      )}
                    </View>
                  );
                })}
              {!currentAddress &&
                addressBookSliced.map((aBItem, index) => {
                  return (
                    <View key={`container-${index}-${aBItem.label}`}>
                      {currentItem !== index && (
                        <AbSummaryLine
                          index={index}
                          key={`line-${index}-${aBItem.label}`}
                          item={aBItem}
                          setCurrentItem={setCurrentItem}
                          setAction={setAction}
                          handleScrollToTop={handleScrollToTop}
                          doAction={doAction}
                        />
                      )}
                    </View>
                  );
                })}
              {!currentAddress &&
                addressBookProtected.map((aBItem, index) => {
                  return (
                    <View key={`container-${index}-${aBItem.label}`}>
                      <AbSummaryLine
                        index={index}
                        key={`line-${index}-${aBItem.label}`}
                        item={aBItem}
                        setCurrentItem={setCurrentItem}
                        setAction={setAction}
                        handleScrollToTop={handleScrollToTop}
                        doAction={doAction}
                        addressProtected={true}
                      />
                    </View>
                  );
                })}
            </>
          )}
          {loadMoreButton && !currentAddress ? (
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
              {!currentAddress && !!addressBookSliced && !!addressBookSliced.length && !loading && (
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
        {currentItem === null && !loading && (
          <View
            style={{
              flexGrow: 1,
              flexDirection: 'row',
              justifyContent: 'center',
              alignItems: 'center',
              marginVertical: 5,
            }}>
            <Button
              testID="addressbook.button.new"
              type={ButtonTypeEnum.Primary}
              title={translate('addressbook.new') as string}
              onPress={() => newAddressBookItem()}
            />
          </View>
        )}
      </View>
    </ToastProvider>
  );
};

export default React.memo(AddressBook);
