/* eslint-disable react-native/no-inline-styles */
import React, { useContext, useEffect, useRef, useState } from 'react';
import { View, ScrollView, SafeAreaView, TextInput, Dimensions, Keyboard, Platform } from 'react-native';
import { useTheme } from '@react-navigation/native';
import Animated, { EasingNode } from 'react-native-reanimated';

import Button from '../Components/Button';
import { ThemeType } from '../../app/types';
import { ContextAppLoaded } from '../../app/context';
import Header from '../Header';
import moment from 'moment';
import 'moment/locale/es';
import 'moment/locale/pt';

type MemoProps = {
  closeModal: () => void;
  updateToField: (
    address: string | null,
    amount: string | null,
    amountCurrency: string | null,
    memo: string | null,
    includeUAMemo: boolean | null,
  ) => void;
};
const Memo: React.FunctionComponent<MemoProps> = ({ closeModal, updateToField }) => {
  const context = useContext(ContextAppLoaded);
  const { translate, sendPageState, language } = context;
  const { colors } = useTheme() as unknown as ThemeType;
  moment.locale(language);

  const [memo, setMemo] = useState<string>(sendPageState.toaddr.memo);
  const [titleViewHeight, setTitleViewHeight] = useState(0);

  const slideAnim = useRef(new Animated.Value(0)).current;

  const dimensions = {
    width: Dimensions.get('screen').width,
    height: Dimensions.get('screen').height,
  };

  const doSaveAndClose = () => {
    updateToField(null, null, null, memo, null);
    closeModal();
  };

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
            title={translate('send.memo') as string}
            noBalance={true}
            noSyncingStatus={true}
            noDrawMenu={true}
            noPrivacy={true}
          />
        </View>
      </Animated.View>

      <ScrollView
        style={{
          maxHeight: Platform.OS === 'android' ? '80%' : '70%',
          minHeight: Platform.OS === 'android' ? '80%' : '70%',
        }}
        contentContainerStyle={{
          flexDirection: 'column',
          alignItems: 'stretch',
          justifyContent: 'flex-start',
          padding: 20,
        }}>
        <View
          accessible={true}
          accessibilityLabel={translate('send.memo-acc') as string}
          style={{
            flexGrow: 1,
            borderWidth: 1,
            borderRadius: 5,
            borderColor: colors.text,
            minWidth: 48,
            minHeight: dimensions.height * 0.5,
            maxHeight: dimensions.height * 0.5,
          }}>
          <TextInput
            testID="send.memo-field"
            multiline
            style={{
              flex: 1,
              color: colors.text,
              fontWeight: '600',
              fontSize: 14,
              minWidth: 48,
              minHeight: 48,
              margin: 5,
              backgroundColor: 'transparent',
              textAlignVertical: 'top',
            }}
            value={memo}
            onChangeText={(text: string) => setMemo(text)}
            editable={true}
          />
        </View>
      </ScrollView>
      <View
        style={{
          flexGrow: 1,
          flexDirection: 'row',
          justifyContent: 'center',
          alignItems: 'center',
          marginVertical: 5,
        }}>
        <Button type="Primary" title={translate('save') as string} onPress={doSaveAndClose} />
        <Button
          type="Secondary"
          title={translate('cancel') as string}
          style={{ marginLeft: 10 }}
          onPress={closeModal}
        />
      </View>
    </SafeAreaView>
  );
};

export default Memo;
