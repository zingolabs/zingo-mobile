/* eslint-disable react-native/no-inline-styles */
import React, { useContext, useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  View,
  ScrollView,
  Modal,
  RefreshControl,
  NativeScrollEvent,
  NativeSyntheticEvent,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import moment from 'moment';
import 'moment/locale/es';
import 'moment/locale/pt';
import 'moment/locale/ru';

import { useTheme } from '@react-navigation/native';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { faAnglesDown } from '@fortawesome/free-solid-svg-icons';

import { ButtonTypeEnum, SendPageStateClass, ValueTransferType } from '../../../app/AppState';
import { ThemeType } from '../../../app/types';
import FadeText from '../../Components/FadeText';
import Button from '../../Components/Button';
import ValueTransferDetail from '../../History/components/ValueTransferDetail';
import MessageLine from './MessageLine';
import { ContextAppLoaded } from '../../../app/context';
import Header from '../../Header';
import AddressItem from '../../Components/AddressItem';

type MessageListProps = {
  doRefresh: () => void;
  toggleMenuDrawer: () => void;
  syncingStatusMoreInfoOnClick: () => void;
  setPrivacyOption: (value: boolean) => Promise<void>;
  setUfvkViewModalVisible?: (v: boolean) => void;
  setSendPageState: (s: SendPageStateClass) => void;
  setScrollToBottom: (value: boolean) => void;
  scrollToBottom: boolean;
  address?: string;
  closeModal?: () => void;
  openModal?: () => void;
};

const MessageList: React.FunctionComponent<MessageListProps> = ({
  doRefresh,
  toggleMenuDrawer,
  syncingStatusMoreInfoOnClick,
  setPrivacyOption,
  setUfvkViewModalVisible,
  setSendPageState,
  setScrollToBottom,
  scrollToBottom,
  address,
  closeModal,
  openModal,
}) => {
  const context = useContext(ContextAppLoaded);
  const { translate, messages, language, addLastSnackbar } = context;
  const { colors } = useTheme() as unknown as ThemeType;
  moment.locale(language);

  const [isValueTransferDetailModalShowing, setValueTransferDetailModalShowing] = useState<boolean>(false);
  const [valueTransferDetail, setValueTransferDetail] = useState<ValueTransferType>({} as ValueTransferType);
  const [valueTransferDetailIndex, setValueTransferDetailIndex] = useState<number>(-1);
  const [numVt, setNumVt] = useState<number>(50);
  const [loadMoreButton, setLoadMoreButton] = useState<boolean>(false);
  const [messagesSliced, setMessagesSliced] = useState<ValueTransferType[]>([]);
  const [messagesFiltered, setMessagesFiltered] = useState<ValueTransferType[]>([]);
  const [isAtBottom, setIsAtBottom] = useState<boolean>(true);
  const [loading, setLoading] = useState<boolean>(true);
  const [firstScrollToBottomDone, setFirstScrollToBottomDone] = useState<boolean>(false);
  const [scrollViewHeight, setScrollViewHeight] = useState<number>(0);
  const [contentScrollViewHeight, setContentScrollViewHeight] = useState<number>(0);
  const [scrollable, setScrollable] = useState<boolean>(false);
  const scrollViewRef = useRef<ScrollView>(null);

  var lastMonth = '';

  const addressFilter = useMemo(
    () => (addr: string | undefined, memos: string[]) => {
      // if no memo -> ignore this VT.
      const memoTotal = memos && memos.length > 0 && memos.join('') ? memos.join('\n') : '';
      if (!memoTotal) {
        return false;
      }
      // if general mode (no address) -> include this VT.
      if (!address) {
        return true;
      }
      let memoAddress;
      if (memoTotal.includes('\nReply to: \n')) {
        let memoArray = memoTotal.split('\nReply to: \n');
        memoAddress = memoArray.pop();
      }
      return addr === address || memoAddress === address;
    },
    [address],
  );

  const fetchMessagesFiltered = useMemo(() => {
    if (!messages) {
      return [] as ValueTransferType[];
    }
    return messages.filter(
      (a: ValueTransferType) => a.memos && a.memos.length > 0 && addressFilter(a.address, a.memos),
    );
  }, [messages, addressFilter]);

  useEffect(() => {
    if (messages !== null) {
      const vtf = fetchMessagesFiltered;
      setLoadMoreButton(numVt < vtf.length);
      setMessagesFiltered(vtf);
      setMessagesSliced(vtf.slice(-numVt));
      if (loading) {
        setTimeout(() => {
          setLoading(false);
        }, 500);
      }
    }
    // if change numVt don't need to apply the filter
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [addressFilter, loading, messages, fetchMessagesFiltered]);

  useEffect(() => {
    setLoadMoreButton(numVt < messagesFiltered.length);
    setMessagesSliced(messagesFiltered.slice(-numVt));
  }, [numVt, messagesFiltered]);

  useEffect(() => {
    if (scrollToBottom) {
      handleScrollToBottom();
      setScrollToBottom(false);
    }
  }, [scrollToBottom, setScrollToBottom]);

  useEffect(() => {
    if (!loading) {
      if (!messagesSliced || !messagesSliced.length) {
        setFirstScrollToBottomDone(true);
      } else {
        //console.log('scroll bottom');
        handleScrollToBottom();
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading]);

  useEffect(() => {
    //console.log(scrollViewHeight, contentScrollViewHeight);
    if (contentScrollViewHeight > 0 && scrollViewHeight > 0) {
      //setIsAtBottom(false);
      if (contentScrollViewHeight >= scrollViewHeight) {
        //console.log('SCROLLABLE >>>>>>>>>>>>>');
        setScrollable(true);
      } else {
        setScrollable(false);
      }
      //console.log('first scroll bottom done');
      setFirstScrollToBottomDone(true);
    }
  }, [contentScrollViewHeight, scrollViewHeight]);

  const loadMoreClicked = useCallback(() => {
    setNumVt(numVt + 50);
  }, [numVt]);

  const moveValueTransferDetail = (index: number, type: number) => {
    // -1 -> Previous ValueTransfer
    //  1 -> Next ValueTransfer
    if ((index > 0 && type === -1) || (index < messagesSliced.length - 1 && type === 1)) {
      setValueTransferDetail(messagesSliced[index + type]);
      setValueTransferDetailIndex(index + type);
    }
  };

  const handleScrollToBottom = () => {
    if (scrollViewRef.current) {
      scrollViewRef.current.scrollToEnd({ animated: true });
    }
  };

  const handleScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const { contentOffset, contentSize, layoutMeasurement } = event.nativeEvent;
    const isBottom =
      Math.round(contentOffset.y) >= Math.round(contentSize.height - layoutMeasurement.height) && scrollable;
    //console.log(Math.round(contentOffset.y), Math.round(contentSize.height - layoutMeasurement.height), isBottom);
    setIsAtBottom(isBottom);
    if (isBottom && !firstScrollToBottomDone) {
      //console.log('first scroll bottom done');
      setFirstScrollToBottomDone(true);
    }
  };

  //if (address) {
  //  console.log('render Messages - 4', messagesSliced);
  //}

  return (
    <View
      accessible={true}
      accessibilityLabel={translate('history.title-acc') as string}
      style={{
        display: 'flex',
        justifyContent: 'flex-start',
        width: '100%',
        height: address ? '90%' : '100%',
      }}>
      <Modal
        animationType="slide"
        transparent={false}
        visible={isValueTransferDetailModalShowing}
        onRequestClose={() => setValueTransferDetailModalShowing(false)}>
        <ValueTransferDetail
          index={valueTransferDetailIndex}
          length={messagesSliced.length}
          totalLength={messagesFiltered ? messagesFiltered.length : 0}
          vt={valueTransferDetail}
          closeModal={() => setValueTransferDetailModalShowing(false)}
          openModal={() => setValueTransferDetailModalShowing(true)}
          setPrivacyOption={setPrivacyOption}
          setSendPageState={setSendPageState}
          moveValueTransferDetail={moveValueTransferDetail}
        />
      </Modal>

      {address && closeModal && openModal ? (
        <>
          <Header
            title={translate('messages.title') as string}
            noBalance={true}
            noSyncingStatus={true}
            noDrawMenu={true}
            setPrivacyOption={setPrivacyOption}
            addLastSnackbar={addLastSnackbar}
          />
          <View
            style={{
              display: 'flex',
              alignItems: 'center',
              marginHorizontal: 10,
              marginTop: 20,
              marginBottom: 10,
            }}>
            <AddressItem
              address={address}
              oneLine={true}
              withIcon={true}
              closeModal={closeModal}
              openModal={openModal}
            />
          </View>
        </>
      ) : (
        <Header
          toggleMenuDrawer={toggleMenuDrawer}
          syncingStatusMoreInfoOnClick={syncingStatusMoreInfoOnClick}
          title={translate('messages.title') as string}
          noBalance={true}
          setUfvkViewModalVisible={setUfvkViewModalVisible}
          setPrivacyOption={setPrivacyOption}
          addLastSnackbar={addLastSnackbar}
        />
      )}

      {(loading || !firstScrollToBottomDone) && (
        <ActivityIndicator size="large" color={colors.primary} style={{ marginVertical: 20 }} />
      )}
      <ScrollView
        ref={scrollViewRef}
        onScroll={handleScroll}
        onLayout={e => {
          const { height } = e.nativeEvent.layout;
          //console.log('layout HEIGHT >>>>>>>>>>>>>', height);
          setScrollViewHeight(height);
        }}
        onContentSizeChange={(_w: number, h: number) => {
          //console.log('content HEIGHT >>>>>>>>>>>>>', h);
          setContentScrollViewHeight(h);
        }}
        scrollEventThrottle={100}
        accessible={true}
        accessibilityLabel={translate('history.list-acc') as string}
        refreshControl={
          <RefreshControl
            refreshing={false}
            onRefresh={doRefresh}
            tintColor={colors.text}
            title={translate('history.refreshing') as string}
          />
        }
        style={{
          flexGrow: 1,
          marginTop: 10,
          width: '100%',
          opacity: loading || !firstScrollToBottomDone ? 0 : 1,
        }}>
        {loadMoreButton ? (
          <View
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'flex-start',
              marginTop: 10,
              marginBottom: 10,
            }}>
            <Button
              type={ButtonTypeEnum.Secondary}
              title={translate('history.loadmore') as string}
              onPress={loadMoreClicked}
            />
          </View>
        ) : (
          <>
            {!!messagesSliced && !!messagesSliced.length ? (
              <View
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'flex-start',
                  marginTop: 10,
                  marginBottom: 10,
                }}>
                <FadeText style={{ color: colors.primary }}>{translate('history.end') as string}</FadeText>
              </View>
            ) : (
              <View
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'flex-start',
                  marginTop: 10,
                  marginBottom: 10,
                }}>
                <FadeText style={{ color: colors.primary }}>{translate('messages.empty') as string}</FadeText>
              </View>
            )}
          </>
        )}

        {messagesSliced.flatMap((vt, index) => {
          let txmonth = vt.time ? moment(vt.time * 1000).format('MMM YYYY') : '--- ----';

          var month = '';
          if (txmonth !== lastMonth) {
            month = txmonth;
            lastMonth = txmonth;
          }

          return (
            <MessageLine
              key={`${index}-${vt.txid}-${vt.kind}`}
              index={index}
              vt={vt}
              month={month}
              setValueTransferDetail={(ttt: ValueTransferType) => setValueTransferDetail(ttt)}
              setValueTransferDetailIndex={(iii: number) => setValueTransferDetailIndex(iii)}
              setValueTransferDetailModalShowing={(bbb: boolean) => setValueTransferDetailModalShowing(bbb)}
              fromMessageAddress={!!address}
            />
          );
        })}
        <View style={{ marginBottom: 30 }} />
      </ScrollView>
      {!isAtBottom && scrollable && !loading && firstScrollToBottomDone && (
        <TouchableOpacity onPress={handleScrollToBottom} style={{ position: 'absolute', bottom: 30, right: 10 }}>
          <FontAwesomeIcon
            style={{ marginLeft: 5, marginRight: 5, marginTop: 0 }}
            size={50}
            icon={faAnglesDown}
            color={colors.border}
          />
        </TouchableOpacity>
      )}
    </View>
  );
};

export default React.memo(MessageList);
