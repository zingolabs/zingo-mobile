/* eslint-disable react-native/no-inline-styles */
import React, { useContext, useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  View,
  ScrollView,
  NativeScrollEvent,
  NativeSyntheticEvent,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import moment from 'moment';
import 'moment/locale/es';
import 'moment/locale/pt';
import 'moment/locale/ru';
import 'moment/locale/tr';
import { useTheme, useScrollToTop } from '@react-navigation/native';
import { AddressBookActionEnum, AddressBookFileClass, ButtonTypeEnum, FilterEnum, GlobalConst, ScreenEnum } from '../../app/AppState';
import { ThemeType } from '../../app/types';
import FadeText from '../Components/FadeText';
import Button from '../Components/Button';
import AbDetail from './components/AbDetail';
import AbSummaryLine from './components/AbSummaryLine';
import { ContextAppLoaded } from '../../app/context';
import Header from '../Header';
import AddressBookFileImpl from './AddressBookFileImpl';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { faAnglesUp } from '@fortawesome/free-solid-svg-icons';
import Utils from '../../app/utils';
import { useMagicModal } from 'react-native-magic-modal';
import Snackbars from '../Components/Snackbars';
import { ToastProvider, useToast } from 'react-native-toastier';
import RPCModule from '../../app/RPCModule';
import { RPCCheckAddressType } from '../../app/rpc/types/RPCCheckAddressType';

type AddressBookProps = {
  setAddressBook: (ab: AddressBookFileClass[]) => void;
  //setSecurityOption: (s: SecurityType) => Promise<void>;
};

const AddressBook: React.FunctionComponent<AddressBookProps> = ({
  setAddressBook,
  //setSecurityOption,
}) => {
  const context = useContext(ContextAppLoaded);
  const {
    translate,
    language,
    addressBook,
    addressBookCurrentAddress,
    zenniesDonationAddress,
    snackbars,
    removeFirstSnackbar,
  } = context;
  const { colors } = useTheme()  as ThemeType;
  const { hide } = useMagicModal();
  const { top, bottom, right, left } = useSafeAreaInsets();
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
  const [loading, setLoading] = useState<boolean>(true);
  const [filter, setFilter] = useState<FilterEnum>(FilterEnum.all);

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
    (async () => {
      const abf = await fetchAddressBookFiltered;
      const abp = await fetchAddressBookProtected;
      //setAddressBookFiltered(abf);
      setLoadMoreButton(numAb < abf.length);
      setAddressBookSliced(abf.slice(0, numAb));
      setAddressBookProtected(abp);
      // find the current address
      if (addressBookCurrentAddress) {
        const index: number = abf.findIndex((i: AddressBookFileClass) => i.address === addressBookCurrentAddress);
        if (index === -1) {
          setAction(AddressBookActionEnum.Add);
        } else {
          setAction(AddressBookActionEnum.Modify);
        }
        setCurrentItem(index);
      }
      setLoading(false);
    })();
  }, [addressBookCurrentAddress, fetchAddressBookProtected, fetchAddressBookFiltered, numAb, addressBook]);

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
    if (addressBookCurrentAddress) {
      hide();
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
      console.log(checkStr);
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

  const handleScrollToTop = () => {
    if (scrollViewRef.current) {
      scrollViewRef.current.scrollTo({ y: 0, animated: true });
    }
  };

  const handleScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const { contentOffset } = event.nativeEvent;
    const isTop = contentOffset.y === 0;
    setIsAtTop(isTop);
  };

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
          title={translate('addressbook.title') as string}
          screenName={screenName}
          noBalance={true}
          noSyncingStatus={true}
          noDrawMenu={true}
          noPrivacy={true}
          noUfvkIcon={true}
          closeScreen={() => {
            clear();
            hide();
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
              addressBookCurrentAddress={addressBookCurrentAddress}
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
            />
          )}
          {!addressBookCurrentAddress && addressBookSliced.length === 0 && currentItem !== -1 && !loading && (
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
              {!addressBookCurrentAddress &&
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
              {!addressBookCurrentAddress &&
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
              {!addressBookCurrentAddress &&
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
              {!addressBookCurrentAddress && !!addressBookSliced && !!addressBookSliced.length && !loading && (
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
          <TouchableOpacity onPress={handleScrollToTop} style={{ position: 'absolute', bottom: 105, right: 10 }}>
            <FontAwesomeIcon
              style={{ marginLeft: 5, marginRight: 5, marginTop: 0 }}
              size={50}
              icon={faAnglesUp}
              color={colors.zingo}
            />
          </TouchableOpacity>
        )}
        {currentItem === null && (
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
