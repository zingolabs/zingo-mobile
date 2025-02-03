/* eslint-disable react-native/no-inline-styles */
import React, { useContext, useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  View,
  ScrollView,
  SafeAreaView,
  Platform,
  NativeScrollEvent,
  NativeSyntheticEvent,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import moment from 'moment';
import 'moment/locale/es';
import 'moment/locale/pt';
import 'moment/locale/ru';
import { useTheme, useScrollToTop } from '@react-navigation/native';
import { AddressBookActionEnum, AddressBookFileClass, ButtonTypeEnum, GlobalConst } from '../../app/AppState';
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

type AddressBookProps = {
  closeModal: () => void;
  setAddressBook: (ab: AddressBookFileClass[]) => void;
};

const AddressBook: React.FunctionComponent<AddressBookProps> = ({ closeModal, setAddressBook }) => {
  const context = useContext(ContextAppLoaded);
  const {
    translate,
    language,
    addressBook,
    addressBookCurrentAddress,
    addressBookOpenPriorModal,
    zenniesDonationAddress,
  } = context;
  const { colors } = useTheme() as unknown as ThemeType;
  moment.locale(language);

  const [numAb, setNumAb] = useState<number>(50);
  const [loadMoreButton, setLoadMoreButton] = useState<boolean>(false);
  const [addressBookSorted, setAddressBookSorted] = useState<AddressBookFileClass[]>([]);
  const [addressBookProtected, setAddressBookProtected] = useState<AddressBookFileClass[]>([]);

  const [currentItem, setCurrentItem] = useState<number | null>(null);
  const [action, setAction] = useState<AddressBookActionEnum | null>(null);
  const [isAtTop, setIsAtTop] = useState<boolean>(true);
  const [loading, setLoading] = useState<boolean>(true);

  const scrollViewRef = useRef<ScrollView>(null);

  useScrollToTop(scrollViewRef);

  const fetchAddressBookSorted = useMemo(async () => {
    // excluding this address from the list
    return addressBook.filter((ab: AddressBookFileClass) => ab.address !== zenniesDonationAddress).slice(0, numAb);
  }, [addressBook, numAb, zenniesDonationAddress]);

  const fetchAddressBookProtected = useMemo(async () => {
    // only protected address to use internally ZingoLabs.
    return addressBook.filter((ab: AddressBookFileClass) => ab.address === zenniesDonationAddress);
  }, [addressBook, zenniesDonationAddress]);

  useEffect(() => {
    (async () => {
      const abs = await fetchAddressBookSorted;
      const abp = await fetchAddressBookProtected;
      setLoadMoreButton(numAb < (abs.length || 0));
      setAddressBookSorted(abs);
      setAddressBookProtected(abp);
      // find the current address
      if (addressBookCurrentAddress) {
        const index: number = abs.findIndex((i: AddressBookFileClass) => i.address === addressBookCurrentAddress);
        if (index === -1) {
          setAction(AddressBookActionEnum.Add);
        } else {
          setAction(AddressBookActionEnum.Modify);
        }
        setCurrentItem(index);
      }
      setLoading(false);
    })();
  }, [addressBookCurrentAddress, fetchAddressBookProtected, fetchAddressBookSorted, numAb]);

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
      closeModal();
      setTimeout(
        () => {
          addressBookOpenPriorModal();
        },
        Platform.OS === GlobalConst.platformOSios ? 100 : 1,
      );
    }
  };

  const doAction = async (
    a: AddressBookActionEnum,
    label: string,
    address: string,
    uOrchardAddress: string,
    color: string,
  ) => {
    if (!label || !address) {
      return;
    }
    let ab: AddressBookFileClass[] = [];
    if (a === AddressBookActionEnum.Delete) {
      ab = await AddressBookFileImpl.removeAddressBookItem(label, address);
    } else {
      ab = await AddressBookFileImpl.writeAddressBookItem(
        label,
        address,
        uOrchardAddress,
        color ? color : Utils.generateColorList(1)[0],
      );
    }
    setAddressBook(ab);
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

  console.log('render Address Book - 4', currentItem, action, addressBook);

  return (
    <SafeAreaView
      style={{
        display: 'flex',
        justifyContent: 'flex-start',
        alignItems: 'stretch',
        height: '100%',
        backgroundColor: colors.background,
      }}>
      <Header
        title={translate('addressbook.title') as string}
        noBalance={true}
        noSyncingStatus={true}
        noDrawMenu={true}
        noPrivacy={true}
        closeScreen={closeModal}
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
            key={`detail-${currentItem}-${addressBookSorted[currentItem].label}`}
            item={addressBookSorted[currentItem]}
            cancel={cancel}
            action={action}
            doAction={doAction}
          />
        )}
        {!addressBookCurrentAddress && addressBookSorted.length === 0 && currentItem !== -1 && !loading && (
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
        {loading && (
          <ActivityIndicator style={{ marginTop: 7, marginRight: 7 }} size={25} color={colors.primaryDisabled} />
        )}
        {!addressBookCurrentAddress &&
          addressBookSorted.flatMap((aBItem, index) => {
            return (
              <View key={`container-${index}-${aBItem.label}`}>
                {currentItem === index && (
                  <AbSummaryLine
                    index={index}
                    key={`line-${index}-${aBItem.label}`}
                    item={aBItem}
                    setCurrentItem={setCurrentItem}
                    setAction={setAction}
                    closeModal={closeModal}
                    handleScrollToTop={handleScrollToTop}
                    doAction={doAction}
                  />
                )}
              </View>
            );
          })}
        {!addressBookCurrentAddress &&
          addressBookSorted.flatMap((aBItem, index) => {
            return (
              <View key={`container-${index}-${aBItem.label}`}>
                {currentItem !== index && (
                  <AbSummaryLine
                    index={index}
                    key={`line-${index}-${aBItem.label}`}
                    item={aBItem}
                    setCurrentItem={setCurrentItem}
                    setAction={setAction}
                    closeModal={closeModal}
                    handleScrollToTop={handleScrollToTop}
                    doAction={doAction}
                  />
                )}
              </View>
            );
          })}
        {!addressBookCurrentAddress &&
          addressBookProtected.flatMap((aBItem, index) => {
            return (
              <View key={`container-${index}-${aBItem.label}`}>
                <AbSummaryLine
                  index={index}
                  key={`line-${index}-${aBItem.label}`}
                  item={aBItem}
                  setCurrentItem={setCurrentItem}
                  setAction={setAction}
                  closeModal={closeModal}
                  handleScrollToTop={handleScrollToTop}
                  doAction={doAction}
                  addressProtected={true}
                />
              </View>
            );
          })}
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
            {!addressBookCurrentAddress && !!addressBookSorted && !!addressBookSorted.length && (
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
    </SafeAreaView>
  );
};

export default React.memo(AddressBook);
