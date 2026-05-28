/* eslint-disable react-native/no-inline-styles */
import React, {
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  View,
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
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { faChevronLeft, faXmark } from '@fortawesome/free-solid-svg-icons';
import BottomSheet, {
  BottomSheetFooter,
  BottomSheetFooterProps,
  BottomSheetScrollView,
} from '@gorhom/bottom-sheet';

import Button from '../Components/Button';
import { AppDrawerParamList, ThemeType } from '../../app/types';
import { ContextAppLoaded } from '../../app/context';
import Header from '../Header';
import BoldText from '../Components/BoldText';
import {
  ButtonTypeEnum,
  GlobalConst,
  RouteEnum,
  ScreenEnum,
} from '../../app/AppState';
import FadeText from '../Components/FadeText';
import Utils from '../../app/utils';
import { DrawerScreenProps } from '@react-navigation/drawer';
import { useFullSheetSnapPoints } from '../../app/hooks/useFullSheetSnapPoints';

type MemoProps = DrawerScreenProps<AppDrawerParamList, RouteEnum.Memo>;

const Memo: React.FunctionComponent<MemoProps> = ({ navigation, route }) => {
  const setMessage = useMemo(
    () =>
      !!route.params && route.params.setMessage !== undefined
        ? route.params.setMessage
        : () => {},
    [route.params],
  );
  const context = useContext(ContextAppLoaded);
  const { translate, defaultUnifiedAddress } = context;
  const { colors } = useTheme() as ThemeType;
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
  const [containerH, setContainerH] = useState<number>(0);
  const [headerH, setHeaderH] = useState<number>(0);
  const memoSheetRef = useRef<BottomSheet>(null);

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

  const closeScreen = useCallback(() => {
    if (navigation.canGoBack()) {
      navigation.goBack();
    }
  }, [navigation]);

  const doSaveAndClose = useCallback(() => {
    setMessage(memo);
    if (navigation.canGoBack()) {
      navigation.goBack();
    }
    Keyboard.dismiss();
  }, [memo, navigation, setMessage]);

  const memoSnapPoints = useFullSheetSnapPoints(containerH, headerH);

  const renderMemoHandle = useCallback(
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
          borderLeftWidth: 1,
          borderRightWidth: 1,
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
            onPress={closeScreen}
            hitSlop={8}
            style={{ paddingHorizontal: 4, paddingVertical: 4 }}
          >
            <FontAwesomeIcon
              icon={faChevronLeft}
              size={20}
              color={colors.primary}
            />
          </TouchableOpacity>
          <BoldText style={{ fontSize: 16, lineHeight: 28 }}>
            {translate('send.memo') as string}
          </BoldText>
          <View style={{ width: 28 }} />
        </View>
      </View>
    ),
    [colors, closeScreen, translate],
  );

  const memoDisabled =
    Utils.countMemoBytes(memo, includeUAMessage, defaultUnifiedAddress) >
    GlobalConst.memoMaxLength;

  const renderMemoFooter = useCallback(
    (props: BottomSheetFooterProps) => (
      <BottomSheetFooter {...props} bottomInset={0}>
        <View
          style={{
            backgroundColor: colors.bottomSheetBackground,
            paddingTop: 10,
            paddingBottom: 14,
            flexDirection: 'row',
            justifyContent: 'center',
            alignItems: 'center',
          }}
        >
          <Button
            type={ButtonTypeEnum.Primary}
            title={translate('save') as string}
            onPress={doSaveAndClose}
            disabled={memoDisabled}
          />
        </View>
      </BottomSheetFooter>
    ),
    [colors, translate, doSaveAndClose, memoDisabled],
  );

  return (
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
          ref={memoSheetRef}
          snapPoints={memoSnapPoints}
          index={0}
          enableDynamicSizing={false}
          enablePanDownToClose={false}
          enableContentPanningGesture={false}
          backgroundStyle={{
            backgroundColor: colors.bottomSheetBackground,
            borderTopLeftRadius: 40,
            borderTopRightRadius: 40,
          }}
          handleComponent={renderMemoHandle}
          footerComponent={renderMemoFooter}
        >
          <BottomSheetScrollView
            bounces={false}
            alwaysBounceVertical={false}
            keyboardShouldPersistTaps="handled"
            style={{
              flex: 1,
              backgroundColor: colors.bottomSheetBackground,
            }}
            contentContainerStyle={{
              flexDirection: 'column',
              alignItems: 'stretch',
              justifyContent: 'flex-start',
              padding: 20,
              paddingBottom: 80,
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
                  <FontAwesomeIcon
                    style={{ margin: 10 }}
                    size={20}
                    icon={faXmark}
                    color={colors.primaryDisabled}
                  />
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
                  color: memoDisabled ? 'red' : colors.text,
                }}
              >{`${Utils.countMemoBytes(memo, includeUAMessage, defaultUnifiedAddress)} `}</FadeText>
              <FadeText style={{ marginTop: 0 }}>
                {translate('loadedapp.of') as string}
              </FadeText>
              <FadeText style={{ marginTop: 0 }}>
                {' ' + GlobalConst.memoMaxLength.toString() + ' '}
              </FadeText>
            </View>
          </BottomSheetScrollView>
        </BottomSheet>
      </View>
    </KeyboardAvoidingView>
  );
};

export default Memo;
