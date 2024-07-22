/* eslint-disable react-native/no-inline-styles */
import React, { useContext, useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  View,
  ScrollView,
  SafeAreaView,
  Keyboard,
  Platform,
  NativeScrollEvent,
  NativeSyntheticEvent,
  TouchableOpacity,
} from 'react-native';
import moment from 'moment';
import 'moment/locale/es';
import 'moment/locale/pt';
import 'moment/locale/ru';

import { useTheme, useScrollToTop } from '@react-navigation/native';
import Animated, { Easing, useSharedValue, withTiming } from 'react-native-reanimated';

import {
  AddressBookActionEnum,
  AddressBookFileClass,
  ButtonTypeEnum,
  GlobalConst,
  SendPageStateClass,
} from '../../app/AppState';
import { ThemeType } from '../../app/types';
import FadeText from '../Components/FadeText';
import Button from '../Components/Button';
import AbDetail from './components/AbDetail';
import AbSummaryLine from './components/AbSummaryLine';
import { ContextAppLoaded } from '../../app/context';
import Header from '../Header';
import AddressBookFileImpl from './AddressBookFileImpl';
import RPC from '../../app/rpc';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { faAnglesUp } from '@fortawesome/free-solid-svg-icons';
import Utils from '../../app/utils';

type AddressBookProps = {
  closeModal: () => void;
  setAddressBook: (ab: AddressBookFileClass[]) => void;
  setSendPageState: (s: SendPageStateClass) => void;
};

const AddressBook: React.FunctionComponent<AddressBookProps> = ({ closeModal, setAddressBook, setSendPageState }) => {
  const context = useContext(ContextAppLoaded);
  const { translate, language, addressBook, addressBookCurrentAddress, addressBookOpenPriorModal, server } = context;
  const { colors } = useTheme() as unknown as ThemeType;
  moment.locale(language);

  const [numAb, setNumAb] = useState<number>(50);
  const [loadMoreButton, setLoadMoreButton] = useState<boolean>(false);
  const [addressBookSorted, setAddressBookSorted] = useState<AddressBookFileClass[]>([]);
  const [addressBookProtected, setAddressBookProtected] = useState<AddressBookFileClass[]>([]);

  const [currentItem, setCurrentItem] = useState<number | null>(null);
  const [titleViewHeight, setTitleViewHeight] = useState<number>(0);
  const [action, setAction] = useState<AddressBookActionEnum | null>(null);
  const [isAtTop, setIsAtTop] = useState<boolean>(true);

  const slideAnim = useSharedValue(0);
  const scrollViewRef = useRef<ScrollView>(null);

  useScrollToTop(scrollViewRef);

  const fetchAddressBookSorted = useMemo(async () => {
    // excluding this address from the list
    const zennyTips = await Utils.getZenniesDonationAddress(server.chainName);
    return addressBook
      .filter((ab: AddressBookFileClass) => ab.address !== zennyTips)
      .sort((a, b) => {
        const aLabel = a.label;
        const bLabel = b.label;
        return aLabel.localeCompare(bLabel);
      })
      .slice(0, numAb);
  }, [addressBook, numAb, server.chainName]);

  const fetchAddressBookProtected = useMemo(async () => {
    // only protected address to use internally ZingoLabs.
    const zennyTips = await Utils.getZenniesDonationAddress(server.chainName);
    return addressBook
      .filter((ab: AddressBookFileClass) => ab.address === zennyTips)
      .sort((a, b) => {
        const aLabel = a.label;
        const bLabel = b.label;
        return aLabel.localeCompare(bLabel);
      });
  }, [addressBook, server.chainName]);

  // because this screen is fired from more places than the menu.
  useEffect(() => {
    (async () => await RPC.rpcSetInterruptSyncAfterBatch(GlobalConst.false))();
  }, []);

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
    })();
  }, [addressBookCurrentAddress, fetchAddressBookProtected, fetchAddressBookSorted, numAb]);

  useEffect(() => {
    const keyboardDidShowListener = Keyboard.addListener('keyboardDidShow', () => {
      slideAnim.value = withTiming(0 - titleViewHeight + 25, { duration: 100, easing: Easing.linear });
    });
    const keyboardDidHideListener = Keyboard.addListener('keyboardDidHide', () => {
      slideAnim.value = withTiming(0, { duration: 100, easing: Easing.linear });
    });

    return () => {
      !!keyboardDidShowListener && keyboardDidShowListener.remove();
      !!keyboardDidHideListener && keyboardDidHideListener.remove();
    };
  }, [slideAnim, titleViewHeight]);

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

  const doAction = async (a: AddressBookActionEnum, label: string, address: string) => {
    if (!label || !address) {
      return;
    }
    let ab: AddressBookFileClass[] = [];
    if (a === AddressBookActionEnum.Delete) {
      ab = await AddressBookFileImpl.removeAddressBookItem(label, address);
    } else {
      ab = await AddressBookFileImpl.writeAddressBookItem(label, address);
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

  //console.log('render Address Book - 4', currentItem, action);

  return (
    <SafeAreaView
      style={{
        display: 'flex',
        justifyContent: 'flex-start',
        alignItems: 'stretch',
        height: '100%',
        backgroundColor: colors.background,
      }}>
      <Animated.View style={{ marginTop: slideAnim }}>
        <View
          onLayout={e => {
            const { height } = e.nativeEvent.layout;
            setTitleViewHeight(height);
          }}>
          <Header
            title={translate('addressbook.title') as string}
            noBalance={true}
            noSyncingStatus={true}
            noDrawMenu={true}
            noPrivacy={true}
          />
        </View>
      </Animated.View>

      <ScrollView
        ref={scrollViewRef}
        onScroll={handleScroll}
        scrollEventThrottle={100}
        testID="addressbook.scrollView"
        keyboardShouldPersistTaps="handled"
        style={{ maxHeight: '85%' }}
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
        {!addressBookCurrentAddress && addressBookSorted.length === 0 && currentItem !== -1 && (
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
                    setSendPageState={setSendPageState}
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
                    setSendPageState={setSendPageState}
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
                  setSendPageState={setSendPageState}
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
        <TouchableOpacity onPress={handleScrollToTop} style={{ position: 'absolute', bottom: 70, right: 10 }}>
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
          <Button
            type={ButtonTypeEnum.Secondary}
            title={translate('cancel') as string}
            style={{ marginLeft: 10 }}
            onPress={closeModal}
          />
        </View>
      )}
    </SafeAreaView>
  );
};

export default React.memo(AddressBook);
