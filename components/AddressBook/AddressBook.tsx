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
  TouchableOpacity,
  ActivityIndicator,
  Pressable,
} from 'react-native';

import { useTheme, useScrollToTop } from '@react-navigation/native';
import {
  AddressBookActionEnum,
  AddressBookFileClass,
  ButtonTypeEnum,
  FilterEnum,
  GlobalConst,
  RouteEnum,
  ScreenEnum,
} from '../../app/AppState';
import { AppDrawerParamList, ThemeType } from '../../app/types';
import FadeText from '../Components/FadeText';
import BoldText from '../Components/BoldText';
import Button from '../Components/Button';
import AbDetail from './components/AbDetail';
import AbSummaryLine from './components/AbSummaryLine';
import { ContextAppLoaded } from '../../app/context';
import Header from '../Header';
import AddressBookFileImpl from './AddressBookFileImpl';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import {
  faAngleUp,
  faChevronLeft,
  faXmark,
} from '@fortawesome/free-solid-svg-icons';
import BottomSheet, {
  BottomSheetBackdrop,
  BottomSheetBackdropProps,
  BottomSheetFooter,
  BottomSheetFooterProps,
  BottomSheetModal,
  BottomSheetView,
} from '@gorhom/bottom-sheet';
import Utils from '../../app/utils';
import RPCModule from '../../app/RPCModule';
import { RPCCheckAddressType } from '../../app/walletBackend/types/RPCCheckAddressType';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useFullSheetSnapPoints } from '../../app/hooks/useFullSheetSnapPoints';
import { useKeyboardHeight } from '../../app/hooks/useKeyboardHeight';
import { useDismissSheetsOnBlur } from '../../app/hooks/useDismissSheetsOnBlur';

type AddressBookProps = NativeStackScreenProps<
  AppDrawerParamList,
  RouteEnum.AddressBook
> & {
  setAddressBook: (ab: AddressBookFileClass[]) => void;
};

const AddressBook: React.FunctionComponent<AddressBookProps> = ({
  navigation,
  route,
  setAddressBook,
}) => {
  const context = useContext(ContextAppLoaded);
  const { translate, addressBook, zenniesDonationAddress } = context;
  const { colors } = useTheme() as ThemeType;
  const screenName = ScreenEnum.AddressBook;

  const [numAb, setNumAb] = useState<number>(50);
  const [loadMoreButton, setLoadMoreButton] = useState<boolean>(false);
  //const [addressBookFiltered, setAddressBookFiltered] = useState<AddressBookFileClass[]>([]);
  const [addressBookSliced, setAddressBookSliced] = useState<
    AddressBookFileClass[]
  >([]);
  const [addressBookProtected, setAddressBookProtected] = useState<
    AddressBookFileClass[]
  >([]);

  const [currentItem, setCurrentItem] = useState<number | null>(null);
  const [action, setAction] = useState<AddressBookActionEnum | null>(null);
  const [isAtTop, setIsAtTop] = useState<boolean>(true);
  const [isScrollingToTop, setIsScrollingToTop] = useState<boolean>(false);
  const scrollTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [filter, setFilter] = useState<FilterEnum>(FilterEnum.all);
  const [currentAddress, setCurrentAddress] = useState<string>(
    !!route.params && route.params.currentAddress !== undefined
      ? route.params.currentAddress
      : '',
  );
  const [routeStack, setRouteStack] = useState<RouteEnum>(
    !!route.params && route.params.routeStack !== undefined
      ? route.params.routeStack
      : RouteEnum.AddressBook,
  );
  const [containerH, setContainerH] = useState<number>(0);
  const [headerH, setHeaderH] = useState<number>(0);

  const scrollViewRef = useRef<ScrollView>(null);
  const addressBookSheetRef = useRef<BottomSheet>(null);
  const abDetailSheetRef = useRef<BottomSheetModal>(null);
  const keyboardHeight = useKeyboardHeight();
  useDismissSheetsOnBlur();

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
    return addressBook.filter(
      (ab: AddressBookFileClass) =>
        ab.address !== zenniesDonationAddress && filterApply(ab),
    );
  }, [addressBook, filter, zenniesDonationAddress]);

  const fetchAddressBookProtected = useMemo(async () => {
    // only protected address to use internally ZingoLabs.
    return addressBook.filter(
      (ab: AddressBookFileClass) => ab.address === zenniesDonationAddress,
    );
  }, [addressBook, zenniesDonationAddress]);

  useEffect(() => {
    const _currentAddress =
      !!route.params && route.params.currentAddress !== undefined
        ? route.params.currentAddress
        : '';
    const _routeStack =
      !!route.params && route.params.routeStack !== undefined
        ? route.params.routeStack
        : RouteEnum.AddressBook;
    setCurrentAddress(_currentAddress);
    setRouteStack(_routeStack);
  }, [route, route.params, route.params?.currentAddress]);

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
        const index: number = abf.findIndex(
          (i: AddressBookFileClass) => i.address === currentAddress,
        );
        if (index === -1) {
          setAction(AddressBookActionEnum.Add);
        } else {
          setAction(AddressBookActionEnum.Modify);
        }
        setCurrentItem(index);
      }
      setLoading(false);
    })();
  }, [
    currentAddress,
    fetchAddressBookProtected,
    fetchAddressBookFiltered,
    numAb,
    addressBook,
  ]);

  const loadMoreClicked = useCallback(() => {
    setNumAb(numAb + 50);
  }, [numAb]);

  // Counter bumped on each open so the inner AbDetail remounts (form state
  // resets) without us having to mutate currentItem/action during dismiss —
  // mutating those during the close animation broke subsequent presents on
  // Android. Same shape as the Send → Memo modal.
  const [abDetailKey, setAbDetailKey] = useState<number>(0);

  const openAbDetail = useCallback(
    (newItem: number, newAction: AddressBookActionEnum) => {
      setCurrentItem(newItem);
      setAction(newAction);
      setAbDetailKey(k => k + 1);
      abDetailSheetRef.current?.present();
    },
    [],
  );

  const newAddressBookItem = useCallback(() => {
    openAbDetail(-1, AddressBookActionEnum.Add);
  }, [openAbDetail]);

  const cancel = () => {
    abDetailSheetRef.current?.dismiss();
    setCurrentItem(null);
    setAction(null);
    if (currentAddress) {
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

  const addressBookSnapPoints = useFullSheetSnapPoints(containerH, headerH);

  const closeScreenAction = useCallback(() => {
    setCurrentItem(null);
    setAction(null);
    setCurrentAddress('');
    if (navigation.canGoBack()) {
      navigation.goBack();
    }
  }, [navigation]);

  const renderAddressBookHandle = useCallback(
    () => (
      <View
        style={{
          paddingTop: 12,
          paddingBottom: 8,
          paddingHorizontal: 16,
          backgroundColor: colors.bottomSheetBackground,
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
            onPress={closeScreenAction}
            hitSlop={8}
            style={{ paddingHorizontal: 4, paddingVertical: 4 }}
          >
            <FontAwesomeIcon
              icon={faChevronLeft}
              size={20}
              color={colors.primary}
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
            {translate('addressbook.title') as string}
          </BoldText>
          <View style={{ width: 28 }} />
        </View>
      </View>
    ),
    [colors, closeScreenAction, translate],
  );

  const renderAddressBookFooter = useCallback(
    (props: BottomSheetFooterProps) => (
      <BottomSheetFooter {...props} bottomInset={0}>
        <View
          style={{
            backgroundColor: colors.bottomSheetBackground,
            paddingTop: 10,
            paddingBottom: 24,
            flexDirection: 'row',
            justifyContent: 'center',
            alignItems: 'center',
          }}
        >
          <Button
            testID="addressbook.button.new"
            type={ButtonTypeEnum.Primary}
            title={translate('addressbook.new') as string}
            onPress={() => newAddressBookItem()}
          />
        </View>
      </BottomSheetFooter>
    ),
    [colors, translate, newAddressBookItem],
  );

  const abDetailTitle =
    action === AddressBookActionEnum.Add
      ? (translate('addressbook.add') as string)
      : action === AddressBookActionEnum.Modify
        ? (translate('addressbook.modify') as string)
        : action === AddressBookActionEnum.Delete
          ? (translate('addressbook.delete') as string)
          : '';

  const renderAbDetailBackdrop = useCallback(
    (props: BottomSheetBackdropProps) => (
      <BottomSheetBackdrop
        {...props}
        disappearsOnIndex={-1}
        appearsOnIndex={0}
        pressBehavior="close"
      />
    ),
    [],
  );

  const renderAbDetailHandle = useCallback(
    () => (
      <View
        style={{
          paddingTop: 8,
          paddingBottom: 6,
          paddingHorizontal: 16,
          backgroundColor: colors.bottomSheetBackground,
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
          {/* Left spacer matches the X Pressable width (14×2 + 20 = 48)
              so the title is geometrically centered in the row. */}
          <View style={{ width: 48 }} />
          <BoldText
            numberOfLines={1}
            style={{
              flex: 1,
              fontSize: 16,
              lineHeight: 28,
              textAlign: 'center',
            }}
          >
            {abDetailTitle}
          </BoldText>
          <Pressable
            onPress={() => abDetailSheetRef.current?.dismiss()}
            hitSlop={8}
            style={{ paddingHorizontal: 14, paddingVertical: 4 }}
          >
            <FontAwesomeIcon icon={faXmark} size={20} color={colors.zingo} />
          </Pressable>
        </View>
      </View>
    ),
    [colors, abDetailTitle],
  );

  return (
    <View
      style={{
        flex: 1,
        backgroundColor: colors.background,
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
        ref={addressBookSheetRef}
        accessible={false}
        snapPoints={addressBookSnapPoints}
        index={0}
        enableDynamicSizing={false}
        enablePanDownToClose={false}
        enableContentPanningGesture={false}
        backgroundStyle={{
          backgroundColor: colors.bottomSheetBackground,
          borderTopLeftRadius: 40,
          borderTopRightRadius: 40,
        }}
        handleComponent={renderAddressBookHandle}
        footerComponent={renderAddressBookFooter}
      >
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            width: '100%',
            marginHorizontal: 5,
            marginBottom: 2,
          }}
        >
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{
              width: '100%',
              marginTop: 10,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <TouchableOpacity
              onPress={() => {
                cancel();
                setFilter(FilterEnum.all);
                setLoading(true);
              }}
            >
              <View
                style={{
                  backgroundColor:
                    filter === FilterEnum.all
                      ? colors.primary
                      : colors.sideMenuBackground,
                  borderRadius: 15,
                  borderColor:
                    filter === FilterEnum.all ? colors.primary : colors.zingo,
                  borderWidth: 1,
                  paddingHorizontal: 10,
                  paddingVertical: 5,
                  marginRight: 10,
                }}
              >
                <FadeText
                  style={{
                    color:
                      filter === FilterEnum.all
                        ? colors.sideMenuBackground
                        : colors.zingo,
                    fontWeight: 'bold',
                  }}
                >
                  {translate('messages.filter-all') as string}
                </FadeText>
              </View>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => {
                cancel();
                setFilter(FilterEnum.contacts);
                setLoading(true);
              }}
            >
              <View
                style={{
                  backgroundColor:
                    filter === FilterEnum.contacts
                      ? colors.primary
                      : colors.sideMenuBackground,
                  borderRadius: 15,
                  borderColor:
                    filter === FilterEnum.contacts
                      ? colors.primary
                      : colors.zingo,
                  borderWidth: 1,
                  paddingHorizontal: 10,
                  paddingVertical: 5,
                  marginRight: 10,
                }}
              >
                <FadeText
                  style={{
                    color:
                      filter === FilterEnum.contacts
                        ? colors.sideMenuBackground
                        : colors.zingo,
                    fontWeight: 'bold',
                  }}
                >
                  {translate('messages.filter-contacts') as string}
                </FadeText>
              </View>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => {
                cancel();
                setFilter(FilterEnum.wallet);
                setLoading(true);
              }}
            >
              <View
                style={{
                  backgroundColor:
                    filter === FilterEnum.wallet
                      ? colors.primary
                      : colors.sideMenuBackground,
                  borderRadius: 15,
                  borderColor:
                    filter === FilterEnum.wallet
                      ? colors.primary
                      : colors.zingo,
                  borderWidth: 1,
                  paddingHorizontal: 10,
                  paddingVertical: 5,
                  marginRight: 0,
                }}
              >
                <FadeText
                  style={{
                    color:
                      filter === FilterEnum.wallet
                        ? colors.sideMenuBackground
                        : colors.zingo,
                    fontWeight: 'bold',
                  }}
                >
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
          bounces={false}
          alwaysBounceVertical={false}
          style={{
            flex: 1,
            backgroundColor: colors.bottomSheetBackground,
          }}
          contentContainerStyle={{
            flexDirection: 'column',
            alignItems: 'stretch',
            justifyContent: 'flex-start',
            paddingBottom: 80,
          }}
        >
          {!currentAddress && addressBookSliced.length === 0 && !loading && (
            <View
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginTop: 30,
                marginBottom: 30,
              }}
            >
              <FadeText style={{ color: colors.primary }}>
                {translate('addressbook.empty') as string}
              </FadeText>
            </View>
          )}
          {loading ? (
            <ActivityIndicator
              style={{ marginTop: 7, marginRight: 7 }}
              size={20}
              color={colors.primaryDisabled}
            />
          ) : (
            <>
              {!currentAddress &&
                addressBookSliced.map((aBItem, index) => (
                  <View key={`container-${index}-${aBItem.label}`}>
                    <AbSummaryLine
                      index={index}
                      key={`line-${index}-${aBItem.label}`}
                      item={aBItem}
                      openAbDetail={openAbDetail}
                      handleScrollToTop={handleScrollToTop}
                      doAction={doAction}
                    />
                  </View>
                ))}
              {!currentAddress &&
                addressBookProtected.map((aBItem, index) => {
                  return (
                    <View key={`container-${index}-${aBItem.label}`}>
                      <AbSummaryLine
                        index={index}
                        key={`line-${index}-${aBItem.label}`}
                        item={aBItem}
                        openAbDetail={openAbDetail}
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
              {!currentAddress &&
                !!addressBookSliced &&
                !!addressBookSliced.length &&
                !loading && (
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
                    <FadeText style={{ color: colors.primary }}>
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
      <BottomSheetModal
        ref={abDetailSheetRef}
        enableDynamicSizing={true}
        enablePanDownToClose
        stackBehavior="push"
        keyboardBehavior={'interactive'}
        keyboardBlurBehavior={'restore'}
        android_keyboardInputMode={'adjustResize'}
        handleComponent={renderAbDetailHandle}
        backgroundStyle={{
          backgroundColor: colors.bottomSheetBackground,
          borderTopLeftRadius: 40,
          borderTopRightRadius: 40,
        }}
        backdropComponent={renderAbDetailBackdrop}
      >
        <BottomSheetView
          style={{
            backgroundColor: colors.bottomSheetBackground,
            paddingBottom: keyboardHeight > 0 ? keyboardHeight + 20 : 30,
          }}
        >
          <AbDetail
            // AbDetail is always mounted so the BottomSheetView has measurable
            // content from the first render — Android's dynamic sizing
            // refused to animate up if the content was conditionally added
            // only on the user gesture. The counter-based key forces a remount
            // each time the modal opens so internal form state resets, and is
            // independent of currentItem/action so dismissing doesn't bump it
            // mid-animation.
            key={`detail-${abDetailKey}`}
            index={currentItem ?? -1}
            item={
              currentItem !== null &&
              currentItem > -1 &&
              addressBookSliced[currentItem]
                ? addressBookSliced[currentItem]
                : ({} as AddressBookFileClass)
            }
            cancel={cancel}
            action={action ?? AddressBookActionEnum.Add}
            doAction={doAction}
            currentAddress={currentAddress}
            screenName={screenName}
            routeStack={routeStack}
            navigation={navigation}
          />
        </BottomSheetView>
      </BottomSheetModal>
    </View>
  );
};

export default React.memo(AddressBook);
