/* eslint-disable react-native/no-inline-styles */
import React, {
  useContext,
  useState,
  useEffect,
  useCallback,
  useMemo,
  useRef,
} from 'react';
import Pressable from '@ui/primitives/Pressable';
import {
  View,
  RefreshControl,
  ScrollView,
  NativeScrollEvent,
  NativeSyntheticEvent,
  ActivityIndicator,
} from 'react-native';

import { useNavigation } from '@react-navigation/native';
import {
  iconSizeMd,
  radiusPill,
  slopFor,
  space8,
  space20,
  space32,
  useTheme,
} from '@app/theme';

import { Route, ValueTransferType } from '@app/AppState';
import { AppDrawerParamList, WalletNavigation } from '@app/types';
import Text from '@ui/primitives/Text';
import FullPanel from '@ui/widgets/FullPanel';
import { useBottomActionPad } from '@app/hooks/useBottomActionPad';
import Button from '@ui/primitives/Button';
import MessageLine from './components/MessageLine';
import { ContextAppLoaded } from '@app/context';
import Utils from '@app/utils';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { ChevronDown } from '@ui/primitives/Icons/Chevron';

type MessageListProps = NativeStackScreenProps<AppDrawerParamList, 'Messages'>;

const MessageList: React.FunctionComponent<MessageListProps> = () => {
  const navigation = useNavigation<WalletNavigation>();
  const context = useContext(ContextAppLoaded);
  const bottomPad = useBottomActionPad();
  const {
    setScrollToBottom,
    scrollToBottom,
    translate,
    messages,
    language,
    doRefresh,
  } = context;
  const { colors } = useTheme();

  // With FlatList + `inverted`, the visual bottom (newest messages)
  // corresponds to contentOffset.y ≈ 0. We surface a jump-to-bottom
  // button when the user has scrolled "up" (i.e. y > threshold).
  const PAGE_SIZE = 50;
  const [numVt, setNumVt] = useState<number>(PAGE_SIZE);
  const [loadMoreButton, setLoadMoreButton] = useState<boolean>(false);
  const [isAtBottom, setIsAtBottom] = useState<boolean>(true);
  const [loading, setLoading] = useState<boolean>(true);

  const scrollViewRef = useRef<ScrollView>(null);

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

  // Auto-scroll to end on the first layout of the messages themselves (not
  // the loading spinner before them) so the newest message is visible.
  // Re-scroll on later content or viewport size changes only if the user
  // is already pinned at the bottom (don't yank them away while they read
  // older messages); the panel still rising changes the viewport.
  const didInitialScrollRef = useRef<boolean>(false);
  const isAtBottomRef = useRef<boolean>(true);
  const loadingRef = useRef<boolean>(true);
  loadingRef.current = loading;
  const onContentSizeChange = useCallback(() => {
    if (loadingRef.current) {
      return;
    }
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
      navigation.navigate(Route.ValueTransferDetail, {
        index,
        vt,
        valueTransfersSliced: current ?? [],
        totalLength: current ? current.length : 0,
      });
    },
    [navigation],
  );

  return (
    <FullPanel
      title={translate('messages.title') as string}
      onBack={() => navigation.goBack()}
      ownScroll
      testID="messages"
    >
      <ScrollView
        ref={scrollViewRef}
        onScroll={handleScroll}
        onContentSizeChange={onContentSizeChange}
        onLayout={() => {
          if (!loadingRef.current && isAtBottomRef.current) {
            scrollViewRef.current?.scrollToEnd({ animated: false });
          }
        }}
        scrollEventThrottle={100}
        bounces={false}
        alwaysBounceVertical={false}
        style={{
          flex: 1,
        }}
        contentContainerStyle={{
          flexDirection: 'column',
          alignItems: 'stretch',
          justifyContent: 'flex-start',
        }}
        refreshControl={
          <RefreshControl
            refreshing={false}
            onRefresh={() => doRefresh('messages')}
            tintColor={colors.fgDefault}
            title={translate('history.refreshing') as string}
          />
        }
      >
        {loading ? (
          <ActivityIndicator
            size="large"
            color={colors.fgMuted}
            style={{ marginVertical: 20 }}
          />
        ) : messagesData.length === 0 ? (
          <View
            style={{
              alignItems: 'center',
              marginTop: space32,
              paddingHorizontal: space20,
            }}
          >
            <Text variant="body" tone="muted">
              {translate('messages.empty') as string}
            </Text>
          </View>
        ) : (
          <>
            {loadMoreButton ? (
              <View
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'flex-start',
                  paddingHorizontal: space20,
                  marginTop: space20,
                  marginBottom: space8,
                }}
              >
                <Button
                  variant="text"
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
                  marginTop: space20,
                  marginBottom: space8,
                }}
              >
                <Text variant="body" tone="muted">
                  {translate('history.end') as string}
                </Text>
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
              />
            ))}
            {/* Breathing room below the newest message so it doesn't
                    sit flush against the bottom edge of the sheet. */}
            <View style={{ height: space20 }} />
          </>
        )}
      </ScrollView>
      {!isAtBottom && !loading && (
        <Pressable
          kind="button"
          hitSlop={slopFor(36)}
          onPress={handleScrollToBottom}
          accessibilityRole="button"
          accessibilityLabel={translate('messages.bottom-acc') as string}
          style={{
            position: 'absolute',
            bottom: bottomPad,
            right: space20,
            width: 36,
            height: 36,
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: colors.bgSurface,
            borderRadius: radiusPill,
            borderWidth: 1,
            borderColor: colors.borderMuted,
          }}
        >
          <ChevronDown size={iconSizeMd} color={colors.fgMuted} />
        </Pressable>
      )}
    </FullPanel>
  );
};

export default React.memo(MessageList);
