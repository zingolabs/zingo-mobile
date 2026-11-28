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
  ActivityIndicator,
} from 'react-native';

import { useNavigation } from '@react-navigation/native';
import { space8, space20, space32, useTheme } from '@app/theme';

import { Route, ValueTransferType } from '@app/AppState';
import { AppDrawerParamList, WalletNavigation } from '@app/types';
import Text from '@ui/primitives/Text';
import Header from '@ui/widgets/Header';
import { useBottomActionPad } from '@app/hooks/useBottomActionPad';
import Button from '@ui/primitives/Button';
import MessageLine from './components/MessageLine';
import { ContextAppLoaded } from '@app/context';
import Utils from '@app/utils';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useScrollEdges } from '@ui/widgets/ScrollEdges';
import { useCompact } from '@app/hooks/useCompact';

type MessageListProps = NativeStackScreenProps<AppDrawerParamList, 'Messages'>;

const PAGE_SIZE = 50;

/** Every memo in the wallet, newest first, grouped by month. */
const MessageList: React.FunctionComponent<MessageListProps> = () => {
  const navigation = useNavigation<WalletNavigation>();
  const context = useContext(ContextAppLoaded);
  const bottomPad = useBottomActionPad();
  const {
    setScrollToNewest,
    scrollToNewest,
    translate,
    messages,
    language,
    doRefresh,
  } = context;
  const { colors } = useTheme();

  const [numVt, setNumVt] = useState<number>(PAGE_SIZE);
  const [loading, setLoading] = useState<boolean>(true);

  const scrollViewRef = useRef<ScrollView>(null);
  const { edges, fades } = useScrollEdges({ surface: 'canvas' });
  const { gap } = useCompact();

  useEffect(() => {
    if (messages !== null && loading) {
      setTimeout(() => {
        setLoading(false);
      }, 500);
    }
  }, [loading, messages]);

  /** The wallet keeps messages oldest first. */
  const newestFirst = useMemo(
    () => [...(messages ?? [])].reverse(),
    [messages],
  );

  /**
   * Only the newest `numVt` render: ScrollView maps every row, and thousands
   * of them froze the return from ValueTransferDetail.
   */
  const messagesData = useMemo(
    () => newestFirst.slice(0, numVt),
    [newestFirst, numVt],
  );
  const loadMoreButton = numVt < newestFirst.length;

  /** A label above the first message of each month. */
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

  useEffect(() => {
    if (scrollToNewest) {
      scrollViewRef.current?.scrollTo({ y: 0, animated: true });
      setScrollToNewest(false);
    }
  }, [scrollToNewest, setScrollToNewest]);

  /**
   * The latest list in a ref keeps the press identity-stable across sync
   * polls, so `React.memo` on MessageLine holds.
   */
  const newestFirstRef = useRef(newestFirst);
  useEffect(() => {
    newestFirstRef.current = newestFirst;
  }, [newestFirst]);

  const setValueTransferDetailModalShow = useCallback(
    async (index: number, vt: ValueTransferType) => {
      const current = newestFirstRef.current;
      navigation.navigate(Route.ValueTransferDetail, {
        index,
        vt,
        valueTransfersSliced: current,
        totalLength: current.length,
      });
    },
    [navigation],
  );

  return (
    <View
      testID="messages"
      style={{ flex: 1, backgroundColor: colors.bgCanvas, paddingTop: 4 }}
    >
      <Header
        title={translate('messages.title') as string}
        closeScreen={() => navigation.goBack()}
        noBalance={true}
        noSyncingStatus={true}
        noDrawMenu={true}
        noPrivacy={true}
        noUfvkIcon={true}
      />
      <View style={{ flex: 1 }}>
        <ScrollView
          keyboardShouldPersistTaps="handled"
          ref={scrollViewRef}
          onScroll={edges.onScroll}
          onContentSizeChange={edges.onContentSizeChange}
          onLayout={edges.onLayout}
          scrollEventThrottle={100}
          style={{ flex: 1 }}
          contentContainerStyle={{ paddingBottom: bottomPad }}
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
                marginTop: gap(space32),
                paddingHorizontal: space20,
              }}
            >
              <Text variant="body" tone="muted">
                {translate('messages.empty') as string}
              </Text>
            </View>
          ) : (
            <>
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
              <View
                style={{
                  alignItems: 'center',
                  paddingHorizontal: space20,
                  marginTop: space8,
                  marginBottom: space20,
                }}
              >
                {loadMoreButton ? (
                  <Button
                    variant="text"
                    title={translate('history.loadmore') as string}
                    onPress={() => setNumVt(prev => prev + PAGE_SIZE)}
                  />
                ) : (
                  <Text variant="body" tone="muted">
                    {translate('history.end') as string}
                  </Text>
                )}
              </View>
            </>
          )}
        </ScrollView>
        {fades}
      </View>
    </View>
  );
};

export default React.memo(MessageList);
