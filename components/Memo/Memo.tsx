/* eslint-disable react-native/no-inline-styles */
import React, { useContext, useEffect, useState } from 'react';
import {
  View,
  ScrollView,
  TextInput,
  Dimensions,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  Keyboard,
  TextInputEndEditingEventData,
  NativeSyntheticEvent,
} from 'react-native';

import { useTheme } from '@react-navigation/native';
import { AppDrawerParamList, ThemeType } from '../../app/types';
import { ContextAppLoaded } from '../../app/context';
import { Header } from '../Header';
import { GlobalConst, RouteEnum, ScreenEnum } from '../../app/AppState';
import FadeText from '../Components/FadeText';
import Utils from '../../app/utils';
import Snackbars from '../Components/Snackbars';
import { ToastProvider, useToast } from 'react-native-toastier';
import { DrawerScreenProps } from '@react-navigation/drawer';
import { XIcon } from '../Components/Icons/XIcon';
import LiquidPrimaryButton from '../Components/LiquidButton/LiquidPrimaryButton';

type MemoProps = DrawerScreenProps<AppDrawerParamList, RouteEnum.Memo>;

const Memo: React.FunctionComponent<MemoProps> = ({ navigation, route }) => {
  const setMessage =
    !!route.params && route.params.setMessage !== undefined
      ? route.params.setMessage
      : () => {};
  const context = useContext(ContextAppLoaded);
  const { translate, defaultUnifiedAddress, snackbars, removeFirstSnackbar } =
    context;
  const { colors } = useTheme() as ThemeType;
  const { clear } = useToast();
  const screenName = ScreenEnum.Memo;

  const [memo, setMemo] = useState<string>(
    !!route.params && route.params.message !== undefined
      ? route.params.message
      : '',
  );
  const [includeUAMessage, setIncludeUAMessage] = useState<boolean>(
    !!route.params && route.params.includeUAMessage !== undefined
      ? route.params.includeUAMessage
      : false,
  );

  const dimensions = {
    width: Dimensions.get('window').width,
    height: Dimensions.get('window').height,
  };

  useEffect(() => {
    const _message =
      !!route.params && route.params.message !== undefined
        ? route.params.message
        : '';
    const _includeUAMessage =
      !!route.params && route.params.includeUAMessage !== undefined
        ? route.params.includeUAMessage
        : false;
    setMemo(_message);
    setIncludeUAMessage(_includeUAMessage);
  }, [
    route,
    route.params,
    route.params?.includeUAMessage,
    route.params?.message,
  ]);

  const doSaveAndClose = () => {
    setMessage(memo);
    clear();
    if (navigation.canGoBack()) {
      navigation.goBack();
    }
    Keyboard.dismiss();
  };

  return (
    <ToastProvider>
      <Snackbars
        snackbars={snackbars}
        removeFirstSnackbar={removeFirstSnackbar}
        screenName={screenName}
      />

      <KeyboardAvoidingView
        behavior={
          Platform.OS === GlobalConst.platformOSios ? 'padding' : 'height'
        }
        keyboardVerticalOffset={
          Platform.OS === GlobalConst.platformOSios ? 10 : 0
        }
        style={{
          flex: 1,
          backgroundColor: colors.background,
        }}
      >
        <View
          style={{
            flex: 1,
            backgroundColor: colors.background,
          }}
        >
          <Header
            title={translate('send.memo') as string}
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
            style={{
              height: '80%',
              maxHeight: '80%',
              minHeight: '50%',
            }}
            contentContainerStyle={{
              flexDirection: 'column',
              alignItems: 'stretch',
              justifyContent: 'flex-start',
              padding: 20,
            }}
          >
            <View
              accessible={true}
              accessibilityLabel={translate('send.memo-acc') as string}
              style={{
                flexGrow: 1,
                borderWidth: 1,
                borderRadius: 5,
                borderColor: colors.text,
                minWidth: 48,
                minHeight: 48,
                maxHeight: dimensions.height * 0.4,
                flexDirection: 'row',
              }}
            >
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
                onEndEditing={(
                  e: NativeSyntheticEvent<TextInputEndEditingEventData>,
                ) => setMemo(e.nativeEvent.text)}
                maxLength={GlobalConst.memoMaxLength}
              />
              {memo && (
                <TouchableOpacity
                  onPress={() => {
                    setMemo('');
                  }}
                >
                  <XIcon color={colors.background} width={20} height={20} />
                </TouchableOpacity>
              )}
            </View>
            <View
              style={{
                flexDirection: 'row',
                justifyContent: 'flex-end',
                alignItems: 'center',
              }}
            >
              <FadeText
                style={{
                  marginTop: 0,
                  fontWeight: 'bold',
                  color:
                    Utils.countMemoBytes(
                      memo,
                      includeUAMessage,
                      defaultUnifiedAddress,
                    ) > GlobalConst.memoMaxLength
                      ? 'red'
                      : colors.text,
                }}
              >{`${Utils.countMemoBytes(memo, includeUAMessage, defaultUnifiedAddress)} `}</FadeText>
              <FadeText style={{ marginTop: 0 }}>
                {translate('loadedapp.of') as string}
              </FadeText>
              <FadeText style={{ marginTop: 0 }}>
                {' ' + GlobalConst.memoMaxLength.toString() + ' '}
              </FadeText>
            </View>
          </ScrollView>
          <View
            style={{
              flexGrow: 1,
              flexDirection: 'row',
              justifyContent: 'center',
              alignItems: 'center',
              marginVertical: 10,
            }}
          >
            <LiquidPrimaryButton
              title={translate('save') as string}
              onPress={doSaveAndClose}
              disabled={
                Utils.countMemoBytes(
                  memo,
                  includeUAMessage,
                  defaultUnifiedAddress,
                ) > GlobalConst.memoMaxLength
              }
            />
          </View>
        </View>
      </KeyboardAvoidingView>
    </ToastProvider>
  );
};

export default Memo;
