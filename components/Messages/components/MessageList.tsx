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
  FlatList,
  NativeScrollEvent,
  NativeSyntheticEvent,
  TouchableOpacity,
  ActivityIndicator,
  Pressable,
  StyleSheet,
} from 'react-native';
import Animated from 'react-native-reanimated';
import { useOptionsPanelSheetSlide } from '../../../app/hooks/useOptionsPanelSheetSlide';

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
  RouteEnum,
  ScreenEnum,
  ValueTransferType,
} from '../../../app/AppState';
import { AppDrawerParamList, ThemeType } from '../../../app/types';
import FadeText from '../../Components/FadeText';
import BoldText from '../../Components/BoldText';
import MessageLine from './MessageLine';
import { ContextAppLoaded } from '../../../app/context';
import Header from '../../Header';
import { useFullSheetSnapPoints } from '../../../app/hooks/useFullSheetSnapPoints';
import Utils from '../../../app/utils';
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
  const [isAtBottom, setIsAtBottom] = useState<boolean>(true);
  const [loading, setLoading] = useState<boolean>(true);
  const [containerH, setContainerH] = useState<number>(0);
  const [headerH, setHeaderH] = useState<number>(0);

  const flatListRef = useRef<FlatList<ValueTransferType>>(null);
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

  // Inverted chat-style data: newest at index 0 (rendered at the visual
  // bottom by `inverted`). This is the only practical way to handle long
  // lists of variable-height items without paying the cost of measuring
  // every item up-front for a `scrollToEnd`.
  const messagesData = useMemo(
    () => (messages ?? []).slice().reverse(),
    [messages],
  );

  // Precompute the month label per index. With inverted, the item
  // visually ABOVE data[i] is data[i+1]. A label appears above an item
  // when its month differs from that of the item above it.
  const monthLabels = useMemo(() => {
    return messagesData.map((vt, i) => {
      const myMonth = vt.time
        ? Utils.formatDate(vt.time * 1000, 'MMM yyyy', language)
        : '--- ----';
      if (i === messagesData.length - 1) {
        return myMonth;
      }
      const next = messagesData[i + 1];
      const nextMonth = next.time
        ? Utils.formatDate(next.time * 1000, 'MMM yyyy', language)
        : '--- ----';
      return myMonth !== nextMonth ? myMonth : '';
    });
  }, [messagesData, language]);

  const handleScrollToBottom = useCallback(() => {
    // With `inverted`, the visual bottom corresponds to scroll offset 0.
    flatListRef.current?.scrollToOffset({ offset: 0, animated: true });
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
      // With `inverted`, the visual bottom corresponds to scroll offset
      // ≈ 0. Anything beyond a small threshold means the user has scrolled
      // up into older messages — show the jump-to-bottom pill.
      const y = Math.round(event.nativeEvent.contentOffset.y);
      setIsAtBottom(y < 100);
    },
    [],
  );

  const setValueTransferDetailModalShow = useCallback(
    async (index: number, vt: ValueTransferType) => {
      navigation.navigate(RouteEnum.ValueTransferDetail, {
        index: index,
        vt: vt,
        valueTransfersSliced: messages ?? [],
        totalLength: messages ? messages.length : 0,
        from: RouteEnum.Messages,
      });
    },
    [navigation, messages],
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
          <View
            style={{
              flex: 1,
              backgroundColor: colors.bottomSheetBackground,
            }}
          >
            <View
              style={{
                flex: 1,
                display: 'flex',
                justifyContent: 'flex-start',
                width: '100%',
              }}
            >
              {loading && (
                <ActivityIndicator
                  size="large"
                  color={colors.primary}
                  style={{ marginVertical: 20 }}
                />
              )}
              <FlatList
                ref={flatListRef}
                data={messagesData}
                inverted
                keyExtractor={(item, idx) => `${idx}-${item.txid}-${item.kind}`}
                renderItem={({ item, index }) => (
                  <MessageLine
                    index={messagesData.length - 1 - index}
                    vt={item}
                    month={monthLabels[index] ?? ''}
                    setValueTransferDetailModalShow={
                      setValueTransferDetailModalShow
                    }
                    screenName={screenName}
                  />
                )}
                onScroll={handleScroll}
                scrollEventThrottle={32}
                accessible={true}
                accessibilityLabel={translate('history.list-acc') as string}
                refreshControl={
                  <RefreshControl
                    refreshing={false}
                    onRefresh={() => doRefresh(screenName)}
                    tintColor={colors.text}
                    title={translate('history.refreshing') as string}
                  />
                }
                // With `inverted`, ListFooterComponent appears at the
                // visual TOP — that's where the "end of list" marker
                // (chronologically oldest) belongs.
                ListFooterComponent={
                  messagesData.length > 0 ? (
                    <View
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'flex-start',
                        marginTop: 10,
                        marginBottom: 10,
                      }}
                    >
                      <FadeText style={{ color: colors.primary }}>
                        {translate('history.end') as string}
                      </FadeText>
                    </View>
                  ) : null
                }
                ListEmptyComponent={
                  !loading ? (
                    <View
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'flex-start',
                        marginTop: 10,
                        marginBottom: 10,
                        // The whole list is flipped by `inverted` — flip
                        // the empty message back so the text reads
                        // upright instead of upside-down.
                        transform: [{ scaleY: -1 }],
                      }}
                    >
                      <FadeText style={{ color: colors.primary }}>
                        {translate('messages.empty') as string}
                      </FadeText>
                    </View>
                  ) : null
                }
                style={{
                  flex: 1,
                  width: '100%',
                  opacity: loading ? 0 : 1,
                }}
                // With `inverted`, the contentContainer is rendered
                // upside-down: `paddingTop` becomes visual padding at
                // the BOTTOM. Lifts data[0] (the newest message) clear
                // of the screen edge / safe-area inset that was
                // clipping it.
                contentContainerStyle={{ paddingTop: 16 }}
              />
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
            </View>
          </View>
        </BottomSheet>
      </Animated.View>
    </View>
  );
};

export default React.memo(MessageList);
