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
  RefreshControl,
  ScrollView,
  NativeScrollEvent,
  NativeSyntheticEvent,
  TouchableOpacity,
  ActivityIndicator,
  Pressable,
  StyleSheet,
} from 'react-native';
import Animated from 'react-native-reanimated';
import { useOptionsPanelSheetSlide } from '../../app/hooks/useOptionsPanelSheetSlide';

import {
  NavigationProp,
  ParamListBase,
  useNavigation,
  useTheme,
} from '@react-navigation/native';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { faChevronLeft, faAngleDown } from '@fortawesome/free-solid-svg-icons';
import BottomSheet from '@gorhom/bottom-sheet';

import {
  ButtonTypeEnum,
  RouteEnum,
  ScreenEnum,
  ValueTransferType,
} from '../../app/AppState';
import { AppDrawerParamList, ThemeType } from '../../app/types';
import FadeText from '../Components/FadeText';
import BoldText from '../Components/BoldText';
import Button from '../Components/Button';
import MessageLine from './components/MessageLine';
import { ContextAppLoaded } from '../../app/context';
import Header from '../Header';
import { useFullSheetSnapPoints } from '../../app/hooks/useFullSheetSnapPoints';
import Utils from '../../app/utils';
import { NativeStackScreenProps } from '@react-navigation/native-stack';

type MessageListProps = NativeStackScreenProps<
  AppDrawerParamList,
  RouteEnum.Messages
> & {
  toggleMenuDrawer: () => void;
  setScrollToBottom: (value: boolean) => void;
  scrollToBottom: boolean;
  closeScreen?: () => void;
};

const MessageList: React.FunctionComponent<MessageListProps> = ({
  toggleMenuDrawer,
  setScrollToBottom,
  scrollToBottom,
  closeScreen,
}) => {
  const navigation = useNavigation<NavigationProp<ParamListBase>>();
  const context = useContext(ContextAppLoaded);
  const {
    translate,
    messages,
    language,
    doRefresh,
    setPrivacyOption,
    addLastSnackbar,
  } = context;
  const { colors } = useTheme() as ThemeType;
  const screenName = ScreenEnum.MessagesList;

  // With FlatList + `inverted`, the visual bottom (newest messages)
  // corresponds to contentOffset.y ≈ 0. We surface a jump-to-bottom
  // button when the user has scrolled "up" (i.e. y > threshold).
  const PAGE_SIZE = 50;
  const [numVt, setNumVt] = useState<number>(PAGE_SIZE);
  const [loadMoreButton, setLoadMoreButton] = useState<boolean>(false);
  const [isAtBottom, setIsAtBottom] = useState<boolean>(true);
  const [loading, setLoading] = useState<boolean>(true);
  const [containerH, setContainerH] = useState<number>(0);
  const [headerH, setHeaderH] = useState<number>(0);

  const scrollViewRef = useRef<ScrollView>(null);
  const messagesSheetRef = useRef<BottomSheet>(null);
  const sheetSlideStyle = useOptionsPanelSheetSlide();

  const messagesSnapPoints = useFullSheetSnapPoints(containerH, headerH);

  const renderMessagesHandle = useCallback(
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
          {closeScreen ? (
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
          ) : (
            <View style={{ width: 28 }} />
          )}
          <BoldText
            numberOfLines={1}
            style={{
              flex: 1,
              fontSize: 16,
              lineHeight: 28,
              textAlign: 'center',
            }}
          >
            {translate('messages.title') as string}
          </BoldText>
          <View style={{ width: 28 }} />
        </View>
      </View>
    ),
    [closeScreen, colors, translate],
  );

  useEffect(() => {
    if (messages !== null && loading) {
      setTimeout(() => {
        setLoading(false);
      }, 500);
    }
  }, [loading, messages]);

  // Chat-style pagination: only render the newest `numVt` messages.
  // "Load more" loads OLDER ones (prepended at the top). Keeps the
  // render cheap when there are thousands of messages — without this,
  // ScrollView's non-virtualized .map() would re-build every row on
  // each context update, freezing the main thread on return from
  // ValueTransferDetail.
  const messagesData = useMemo(() => {
    return (messages ?? []).slice(-numVt);
  }, [messages, numVt]);

  useEffect(() => {
    setLoadMoreButton(numVt < (messages?.length ?? 0));
  }, [messages, numVt]);

  const loadMoreClicked = useCallback(() => {
    setNumVt(prev => prev + PAGE_SIZE);
  }, [PAGE_SIZE]);

  // Precompute the month label per index. A label appears above an item
  // when its month differs from the previous (older) item, or it's the
  // first item.
  const monthLabels = useMemo(() => {
    let last = '';
    return messagesData.map(vt => {
      const myMonth = vt.time
        ? Utils.formatDate(vt.time * 1000, 'MMM yyyy', language)
        : '--- ----';
      if (myMonth !== last) {
        last = myMonth;
        return myMonth;
      }
      return '';
    });
  }, [messagesData, language]);

  // Auto-scroll to end on first content layout so the newest message is
  // visible. Re-scroll on later content size changes only if the user
  // is already pinned at the bottom (don't yank them away while they
  // read older messages).
  const didInitialScrollRef = useRef<boolean>(false);
  const isAtBottomRef = useRef<boolean>(true);
  const onContentSizeChange = useCallback(() => {
    if (!didInitialScrollRef.current) {
      scrollViewRef.current?.scrollToEnd({ animated: false });
      didInitialScrollRef.current = true;
      return;
    }
    if (isAtBottomRef.current) {
      scrollViewRef.current?.scrollToEnd({ animated: true });
    }
  }, []);

  const handleScrollToBottom = useCallback(() => {
    scrollViewRef.current?.scrollToEnd({ animated: true });
    isAtBottomRef.current = true;
    setIsAtBottom(true);
  }, []);

  useEffect(() => {
    if (scrollToBottom) {
      handleScrollToBottom();
      setScrollToBottom(false);
    }
  }, [scrollToBottom, handleScrollToBottom, setScrollToBottom]);

  const handleScroll = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      const { contentOffset, contentSize, layoutMeasurement } =
        event.nativeEvent;
      const distanceFromBottom =
        contentSize.height - layoutMeasurement.height - contentOffset.y;
      const atBottom = distanceFromBottom < 100;
      isAtBottomRef.current = atBottom;
      setIsAtBottom(atBottom);
    },
    [],
  );

  // Keep a ref to the latest messages so the callback below stays
  // identity-stable across context updates. Without this, every sync
  // poll allocates a new `messages` reference, the useCallback returns
  // a new function, and `React.memo` on MessageLine is bypassed for
  // every row — re-rendering thousands of items on the main thread
  // (the 7-second freeze observed on back-from-ValueTransferDetail).
  const messagesRef = useRef(messages);
  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

  const setValueTransferDetailModalShow = useCallback(
    async (index: number, vt: ValueTransferType) => {
      const current = messagesRef.current;
      navigation.navigate(RouteEnum.ValueTransferDetail, {
        index,
        vt,
        valueTransfersSliced: current ?? [],
        totalLength: current ? current.length : 0,
      });
    },
    [navigation],
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
          toggleMenuDrawer={toggleMenuDrawer}
          noBalance={true}
          setPrivacyOption={setPrivacyOption}
          addLastSnackbar={addLastSnackbar /* context */}
        />
      </View>
      <Animated.View
        pointerEvents="box-none"
        style={[StyleSheet.absoluteFill, sheetSlideStyle]}
      >
        <BottomSheet
          ref={messagesSheetRef}
          snapPoints={messagesSnapPoints}
          index={0}
          enableDynamicSizing={false}
          enablePanDownToClose={false}
          enableContentPanningGesture={false}
          backgroundStyle={{
            backgroundColor: colors.bottomSheetBackground,
            borderTopLeftRadius: 40,
            borderTopRightRadius: 40,
          }}
          handleComponent={renderMessagesHandle}
        >
          <ScrollView
            ref={scrollViewRef}
            onScroll={handleScroll}
            onContentSizeChange={onContentSizeChange}
            scrollEventThrottle={100}
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
            }}
            refreshControl={
              <RefreshControl
                refreshing={false}
                onRefresh={() => doRefresh(screenName)}
                tintColor={colors.text}
                title={translate('history.refreshing') as string}
              />
            }
          >
            {loading ? (
              <ActivityIndicator
                size="large"
                color={colors.primary}
                style={{ marginVertical: 20 }}
              />
            ) : messagesData.length === 0 ? (
              <View
                style={{
                  height: 150,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'flex-start',
                  marginTop: 30,
                }}
              >
                <FadeText style={{ color: colors.primary }}>
                  {translate('messages.empty') as string}
                </FadeText>
              </View>
            ) : (
              <>
                {loadMoreButton ? (
                  <View
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'flex-start',
                      marginTop: 20,
                      marginBottom: 10,
                    }}
                  >
                    <Button
                      type={ButtonTypeEnum.Secondary}
                      title={translate('history.loadmore') as string}
                      onPress={loadMoreClicked}
                    />
                  </View>
                ) : (
                  <View
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'flex-start',
                      marginTop: 20,
                      marginBottom: 10,
                    }}
                  >
                    <FadeText style={{ color: colors.primary }}>
                      {translate('history.end') as string}
                    </FadeText>
                  </View>
                )}
                {messagesData.map((vt, index) => (
                  <MessageLine
                    key={`${index}-${vt.txid}-${vt.kind}`}
                    index={index}
                    vt={vt}
                    month={monthLabels[index] ?? ''}
                    setValueTransferDetailModalShow={
                      setValueTransferDetailModalShow
                    }
                    screenName={screenName}
                  />
                ))}
                {/* Breathing room below the newest message so it doesn't
                    sit flush against the bottom edge of the sheet. */}
                <View style={{ height: 20 }} />
              </>
            )}
          </ScrollView>
        </BottomSheet>
        {!isAtBottom && !loading && (
          <Pressable
            onPress={handleScrollToBottom}
            style={({ pressed }) => ({
              position: 'absolute',
              bottom: 30,
              right: 10,
              paddingHorizontal: 5,
              paddingVertical: 10,
              backgroundColor: colors.sideMenuBackground,
              borderRadius: 50,
              transform: [{ scale: pressed ? 0.9 : 1 }],
              borderWidth: 1,
              borderColor: colors.zingo,
            })}
          >
            <FontAwesomeIcon
              style={{ marginLeft: 5, marginRight: 5, marginTop: 0 }}
              size={16}
              icon={faAngleDown}
              color={colors.zingo}
            />
          </Pressable>
        )}
      </Animated.View>
    </View>
  );
};

export default React.memo(MessageList);
