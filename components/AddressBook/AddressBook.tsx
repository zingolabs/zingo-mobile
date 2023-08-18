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
};

const AddressBook: React.FunctionComponent<AddressBookProps> = ({ closeModal }) => {
  const context = useContext(ContextAppLoaded);
  const { translate, language, addLastSnackbar } = context;
  moment.locale(language);

  const { colors } = useTheme() as unknown as ThemeType;
  const [numTx, setNumTx] = useState<number>(50);
  const [loadMoreButton, setLoadMoreButton] = useState<boolean>(false);
  const [addressBookSorted, setAddressBookSorted] = useState<AddressBookFileClass[]>([]);

  const [currentItem, setCurrentItem] = useState<number | null>(null);
  const [disabled, setDisabled] = useState<boolean>();
  const [titleViewHeight, setTitleViewHeight] = useState(0);

  const slideAnim = useRef(new Animated.Value(0)).current;

  const fetchAddressBookSorted = useMemo(async () => {
    const addressBook = await AddressBookFileImpl.readAddressBook();
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
  }, [numTx]);

  useEffect(() => {
    (async () => {
      const abs = await fetchAddressBookSorted;
      setLoadMoreButton(numTx < (abs.length || 0));
      setAddressBookSorted(abs);
    })();
  }, [fetchAddressBookSorted, numTx]);

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
  };

  //console.log('render History - 4');

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
            title={translate('settings.title') as string}
            noBalance={true}
            noSyncingStatus={true}
            noDrawMenu={true}
            noPrivacy={true}
          />
        </View>
      </Animated.View>

      <ScrollView
        testID="settings.scrollView"
        style={{ maxHeight: '85%' }}
        contentContainerStyle={{
          flexDirection: 'column',
          alignItems: 'stretch',
          justifyContent: 'flex-start',
        }}>
        {addressBookSorted.flatMap((aBItem, index) => {
          return (
            <AbSummaryLine
              index={index}
              key={`${index}-${aBItem.label}`}
              item={aBItem}
              setCurrentItem={(idx: number) => setCurrentItem(idx)}
            />
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
            {!!addressBookSorted && !!addressBookSorted.length && (
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
          disabled={disabled}
          type="Primary"
          title={translate('addressbook.new') as string}
          onPress={async () => {
            await newAddressBookItem();
          }}
        />
        <Button
          disabled={disabled}
          type="Secondary"
          title={translate('cancel') as string}
          style={{ marginLeft: 10 }}
          onPress={closeModal}
        />
      </View>
    </SafeAreaView>
  );
};

export default React.memo(AddressBook);
