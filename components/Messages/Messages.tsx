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

import { ButtonTypeEnum, SendPageStateClass, ValueTransferType } from '../../app/AppState';
import { ThemeType } from '../../app/types';
import FadeText from '../Components/FadeText';
import Button from '../Components/Button';
import ValueTransferDetail from '../History/components/ValueTransferDetail';
import MessageLine from './components/MessageLine';
import { ContextAppLoaded } from '../../app/context';
import Header from '../Header';

type MessagesProps = {
  doRefresh: () => void;
  toggleMenuDrawer: () => void;
  poolsMoreInfoOnClick: () => void;
  syncingStatusMoreInfoOnClick: () => void;
  setZecPrice: (p: number, d: number) => void;
  setComputingModalVisible: (visible: boolean) => void;
  setPrivacyOption: (value: boolean) => Promise<void>;
  setUfvkViewModalVisible?: (v: boolean) => void;
  setSendPageState: (s: SendPageStateClass) => void;
  setShieldingAmount: (value: number) => void;
  setScrollToBottom: (value: boolean) => void;
  scrollToBottom: boolean;
};

const Messages: React.FunctionComponent<MessagesProps> = ({
  doRefresh,
  toggleMenuDrawer,
  poolsMoreInfoOnClick,
  syncingStatusMoreInfoOnClick,
  setZecPrice,
  setComputingModalVisible,
  setPrivacyOption,
  setUfvkViewModalVisible,
  setSendPageState,
  setShieldingAmount,
  setScrollToBottom,
  scrollToBottom,
}) => {
  const context = useContext(ContextAppLoaded);
  const { translate, valueTransfers, language, setBackgroundError, addLastSnackbar } = context;
  const { colors } = useTheme() as unknown as ThemeType;
  moment.locale(language);

  const [isValueTransferDetailModalShowing, setValueTransferDetailModalShowing] = useState<boolean>(false);
  const [valueTransferDetail, setValueTransferDetail] = useState<ValueTransferType>({} as ValueTransferType);
  const [valueTransferDetailIndex, setValueTransferDetailIndex] = useState<number>(-1);
  const [numVt, setNumVt] = useState<number>(50);
  const [loadMoreButton, setLoadMoreButton] = useState<boolean>(false);
  const [valueTransfersSorted, setValueTransfersSorted] = useState<ValueTransferType[]>([]);
  const [isAtBottom, setIsAtBottom] = useState<boolean>(true);
  const [loading, setLoading] = useState<boolean>(true);
  const [firstScrollToBottomDone, setFirstScrollToBottomDone] = useState<boolean>(false);
  const scrollViewRef = useRef<ScrollView>(null);

  var lastMonth = '';

  const fetchValueTransfersSorted = useMemo(() => {
    // we need to sort the array properly.
    // by:
    // - time (reverse)
    // - txid
    // - address
    // - pool
    if (!valueTransfers) {
      return [] as ValueTransferType[];
    }
    return valueTransfers
      .filter((a: ValueTransferType) => a.memos && a.memos.length > 0)
      .sort((a: ValueTransferType, b: ValueTransferType) => {
        const timeComparison = a.time - b.time;
        if (timeComparison === 0) {
          // same time
          const txidComparison = a.txid.localeCompare(b.txid);
          if (txidComparison === 0) {
            // same txid
            const aAddress = a.address?.toString() || '';
            const bAddress = b.address?.toString() || '';
            const addressComparison = aAddress.localeCompare(bAddress);
            if (addressComparison === 0) {
              // same address
              const aPoolType = a.poolType?.toString() || '';
              const bPoolType = b.poolType?.toString() || '';
              // last one sort criteria - poolType.
              return aPoolType.localeCompare(bPoolType);
            } else {
              // different address
              return addressComparison;
            }
          } else {
            // different txid
            return txidComparison;
          }
        } else {
          // different time
          return timeComparison;
        }
      })
      .slice(-numVt);
  }, [valueTransfers, numVt]);

  useEffect(() => {
    setLoadMoreButton(numVt < (valueTransfers ? valueTransfers.length : 0));
    setValueTransfersSorted(fetchValueTransfersSorted);
    setTimeout(() => {
      setLoading(false);
    }, 500);
  }, [fetchValueTransfersSorted, numVt, valueTransfers]);

  useEffect(() => {
    if (scrollToBottom) {
      handleScrollToBottom();
      setScrollToBottom(false);
    }
  }, [scrollToBottom, setScrollToBottom]);

  useEffect(() => {
    if (!loading) {
      console.log('scroll bottom');
      handleScrollToBottom();
    }
  }, [loading]);

  const loadMoreClicked = useCallback(() => {
    setNumVt(numVt + 50);
  }, [numVt]);

  const moveValueTransferDetail = (index: number, type: number) => {
    // -1 -> Previous ValueTransfer
    //  1 -> Next ValueTransfer
    if ((index > 0 && type === -1) || (index < valueTransfersSorted.length - 1 && type === 1)) {
      setValueTransferDetail(valueTransfersSorted[index + type]);
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
    const isBottom = Math.round(contentOffset.y) >= Math.round(contentSize.height - layoutMeasurement.height);
    console.log(Math.round(contentOffset.y), Math.round(contentSize.height - layoutMeasurement.height), isBottom);
    setIsAtBottom(isBottom);
    if (isBottom && !firstScrollToBottomDone) {
      console.log('first scroll bottom done');
      setFirstScrollToBottomDone(true);
    }
  };

  //console.log('render History - 4', !!scrollViewRef.current);

  return (
    <View
      accessible={true}
      accessibilityLabel={translate('history.title-acc') as string}
      style={{
        display: 'flex',
        justifyContent: 'flex-start',
        width: '100%',
        height: '100%',
      }}>
      <Modal
        animationType="slide"
        transparent={false}
        visible={isValueTransferDetailModalShowing}
        onRequestClose={() => setValueTransferDetailModalShowing(false)}>
        <ValueTransferDetail
          index={valueTransferDetailIndex}
          length={valueTransfersSorted.length}
          totalLength={valueTransfers ? valueTransfers.length : 0}
          vt={valueTransferDetail}
          closeModal={() => setValueTransferDetailModalShowing(false)}
          openModal={() => setValueTransferDetailModalShowing(true)}
          setPrivacyOption={setPrivacyOption}
          setSendPageState={setSendPageState}
          moveValueTransferDetail={moveValueTransferDetail}
        />
      </Modal>

      <Header
        testID=""
        poolsMoreInfoOnClick={poolsMoreInfoOnClick}
        syncingStatusMoreInfoOnClick={syncingStatusMoreInfoOnClick}
        toggleMenuDrawer={toggleMenuDrawer}
        setZecPrice={setZecPrice}
        title={translate('messages.title') as string}
        setComputingModalVisible={setComputingModalVisible}
        setBackgroundError={setBackgroundError}
        setPrivacyOption={setPrivacyOption}
        setUfvkViewModalVisible={setUfvkViewModalVisible}
        addLastSnackbar={addLastSnackbar}
        setShieldingAmount={setShieldingAmount}
        setScrollToBottom={setScrollToBottom}
      />

      {(loading || !firstScrollToBottomDone || valueTransfersSorted.length === 0) && (
        <ActivityIndicator size="large" color={colors.primary} style={{ marginVertical: 20 }} />
      )}
      <ScrollView
        ref={scrollViewRef}
        onScroll={handleScroll}
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
          opacity: loading || !firstScrollToBottomDone || valueTransfersSorted.length === 0 ? 0 : 1,
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
            {!!valueTransfersSorted && !!valueTransfersSorted.length && (
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
            )}
          </>
        )}

        {valueTransfersSorted.flatMap((vt, index) => {
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
            />
          );
        })}
        <View style={{ marginBottom: 30 }} />
      </ScrollView>
      {!isAtBottom && (
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

export default React.memo(Messages);
