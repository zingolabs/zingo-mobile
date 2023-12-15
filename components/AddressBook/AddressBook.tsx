/* eslint-disable react-native/no-inline-styles */
import React, { useContext, useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { View, ScrollView, SafeAreaView, Keyboard } from 'react-native';
import moment from 'moment';
import 'moment/locale/es';
import { useTheme } from '@react-navigation/native';
import Animated, { EasingNode } from 'react-native-reanimated';

import { AddressBookFileClass } from '../../app/AppState';
import { ThemeType } from '../../app/types';
import FadeText from '../Components/FadeText';
import Button from '../Components/Button';
import AbDetail from './components/AbDetail';
import AbSummaryLine from './components/AbSummaryLine';
import { ContextAppLoaded } from '../../app/context';
import Header from '../Header';
import AddressBookFileImpl from './AddressBookFileImpl';

type AddressBookProps = {
  closeModal: () => void;
  setAddressBook: (ab: AddressBookFileClass[]) => void;
};

const AddressBook: React.FunctionComponent<AddressBookProps> = ({ closeModal, setAddressBook }) => {
  const context = useContext(ContextAppLoaded);
  const { translate, language, addressBook, addressBookCurrentAddress } = context;
  moment.locale(language);

  const { colors } = useTheme() as unknown as ThemeType;
  const [numTx, setNumTx] = useState<number>(50);
  const [loadMoreButton, setLoadMoreButton] = useState<boolean>(false);
  const [addressBookSorted, setAddressBookSorted] = useState<AddressBookFileClass[]>([]);

  const [currentItem, setCurrentItem] = useState<number | null>(null);
  const [titleViewHeight, setTitleViewHeight] = useState(0);
  const [action, setAction] = useState<'Add' | 'Modify' | 'Delete' | null>(null);

  const slideAnim = useRef(new Animated.Value(0)).current;

  const fetchAddressBookSorted = useMemo(async () => {
    return addressBook.slice(0, numTx).sort((a, b) => {
      const nA = a.label.toUpperCase();
      const nB = b.label.toUpperCase();
      if (nA < nB) {
        return -1;
      } else if (nA > nB) {
        return 1;
      } else {
        return 0;
      }
    });
  }, [addressBook, numTx]);

  useEffect(() => {
    (async () => {
      const abs = await fetchAddressBookSorted;
      setLoadMoreButton(numTx < (abs.length || 0));
      setAddressBookSorted(abs);
      // find the current address
      if (addressBookCurrentAddress) {
        const index: number = abs.findIndex((i: AddressBookFileClass) => i.address === addressBookCurrentAddress);
        if (index === -1) {
          setAction('Add');
        } else {
          setAction('Modify');
        }
        setCurrentItem(index);
      }
    })();
  }, [addressBookCurrentAddress, fetchAddressBookSorted, numTx]);

  useEffect(() => {
    const keyboardDidShowListener = Keyboard.addListener('keyboardDidShow', () => {
      Animated.timing(slideAnim, {
        toValue: 0 - titleViewHeight + 25,
        duration: 100,
        easing: EasingNode.linear,
        //useNativeDriver: true,
      }).start();
    });
    const keyboardDidHideListener = Keyboard.addListener('keyboardDidHide', () => {
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 100,
        easing: EasingNode.linear,
        //useNativeDriver: true,
      }).start();
    });

    return () => {
      !!keyboardDidShowListener && keyboardDidShowListener.remove();
      !!keyboardDidHideListener && keyboardDidHideListener.remove();
    };
  }, [slideAnim, titleViewHeight]);

  const loadMoreClicked = useCallback(() => {
    setNumTx(numTx + 50);
  }, [numTx]);

  const newAddressBookItem = () => {
    setCurrentItem(-1);
    setAction('Add');
  };

  const cancel = () => {
    setCurrentItem(null);
    setAction(null);
    if (addressBookCurrentAddress) {
      closeModal();
    }
  };

  const doAction = async (a: 'Add' | 'Modify' | 'Delete', label: string, address: string) => {
    if (!label || !address) {
      return;
    }
    let ab: AddressBookFileClass[] = [];
    if (a === 'Delete') {
      ab = await AddressBookFileImpl.removeAddressBookItem(label, address);
    } else {
      ab = await AddressBookFileImpl.writeAddressBookItem(label, address);
    }
    setAddressBook(ab);
    cancel();
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
        {addressBookSorted.length === 0 && currentItem !== -1 && (
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
                {currentItem !== index && (
                  <AbSummaryLine
                    index={index}
                    key={`line-${index}-${aBItem.label}`}
                    item={aBItem}
                    setCurrentItem={setCurrentItem}
                    setAction={setAction}
                  />
                )}
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
            <Button type="Secondary" title={translate('addressbook.loadmore') as string} onPress={loadMoreClicked} />
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
            type="Primary"
            title={translate('addressbook.new') as string}
            onPress={() => newAddressBookItem()}
          />
          <Button
            type="Secondary"
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
