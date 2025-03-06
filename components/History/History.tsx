/* eslint-disable react-native/no-inline-styles */
import React, { useContext, useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  View,
  ScrollView,
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

import { useScrollToTop, useTheme } from '@react-navigation/native';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { faAnglesUp } from '@fortawesome/free-solid-svg-icons';

import {
  ButtonTypeEnum,
  FilterEnum,
  RefreshScreenEnum,
  SelectServerEnum,
  SendPageStateClass,
  ServerType,
  ValueTransferType,
} from '../../app/AppState';
import { ThemeType } from '../../app/types';
import FadeText from '../Components/FadeText';
import Button from '../Components/Button';
import ValueTransferDetail from './components/ValueTransferDetail';
import ValueTransferLine from './components/ValueTransferLine';
import { ContextAppLoaded } from '../../app/context';
import Header from '../Header';
import { MessagesAddress } from '../Messages';
import Utils from '../../app/utils';
import { magicModal } from 'react-native-magic-modal';

type HistoryProps = {
  // side menu
  toggleMenuDrawer: () => void;
  // privacy
  setPrivacyOption: (value: boolean) => Promise<void>;
  // addLastSnackbar from context
  // shielding / sending
  setShieldingAmount: (value: number) => void;
  setScrollToTop: (value: boolean) => void;
  scrollToTop: boolean;
  setScrollToBottom: (value: boolean) => void;
  scrollToBottom: boolean;
  // for messages
  sendTransaction: (s: SendPageStateClass) => Promise<String>;
  setServerOption: (
    value: ServerType,
    selectServer: SelectServerEnum,
    toast: boolean,
    sameServerChainName: boolean,
  ) => Promise<void>;
};

const History: React.FunctionComponent<HistoryProps> = ({
  toggleMenuDrawer,
  setPrivacyOption,
  setShieldingAmount,
  setScrollToTop,
  scrollToTop,
  setScrollToBottom,
  scrollToBottom,
  sendTransaction,
  setServerOption,
}) => {
  const context = useContext(ContextAppLoaded);
  const {
    translate,
    valueTransfers,
    language,
    setBackgroundError,
    addLastSnackbar,
    server,
    doRefresh,
    zenniesDonationAddress,
  } = context;
  const { colors } = useTheme()  as ThemeType;
  moment.locale(language);

  const [numVt, setNumVt] = useState<number>(50);
  const [loadMoreButton, setLoadMoreButton] = useState<boolean>(false);
  const [valueTransfersSliced, setValueTransfersSliced] = useState<ValueTransferType[]>([]);
  const [isAtTop, setIsAtTop] = useState<boolean>(true);
  const [loading, setLoading] = useState<boolean>(true);
  const [filter, setFilter] = useState<FilterEnum>(FilterEnum.all);
  const scrollViewRef = useRef<ScrollView>(null);

  useScrollToTop(scrollViewRef as unknown as React.RefObject<ScrollView>);

  var lastMonth = '';

  const fetchValueTransfersSliced = useMemo(() => {
    if (!valueTransfers) {
      return [] as ValueTransferType[];
    }
    // strictly show VT's with some amount on it.
    return valueTransfers
      .filter((vt: ValueTransferType) => (filter === FilterEnum.withFunds ? vt.amount > 0 : true))
      .slice(0, numVt);
  }, [valueTransfers, numVt, filter]);

  useEffect(() => {
    if (valueTransfers !== null) {
      const vts = fetchValueTransfersSliced;
      setLoadMoreButton(numVt < (vts ? vts.length : 0));
      setValueTransfersSliced(vts);
      setTimeout(() => {
        setLoading(false);
      }, 500);
    }
  }, [fetchValueTransfersSliced, numVt, valueTransfers, server.chainName]);

  useEffect(() => {
    if (scrollToTop) {
      handleScrollToTop();
      setScrollToTop(false);
    }
  }, [scrollToTop, setScrollToTop]);

  const loadMoreClicked = useCallback(() => {
    setNumVt(numVt + 50);
  }, [numVt]);

  const handleScrollToTop = () => {
    if (scrollViewRef.current) {
      scrollViewRef.current.scrollTo({ y: 0, animated: true });
    }
  };

  const handleScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const { contentOffset } = event.nativeEvent;
    const isTop = contentOffset.y === 0;
    setIsAtTop(isTop);
  };

  const setValueTransferDetailModalShow = (index: number, vt: ValueTransferType) => {
    return magicModal.show(() => <ValueTransferDetail
        index={index}
        vt={vt}
        valueTransfersSliced={valueTransfersSliced}
        totalLength={valueTransfers !== null ? valueTransfers.length : 0}
        setPrivacyOption={setPrivacyOption}
      />, { swipeDirection: undefined }
    ).promise;
  };

  const setMessagesAddressModalShow = (vt: ValueTransferType) => {
    return magicModal.show(() => <MessagesAddress
        setPrivacyOption={setPrivacyOption}
        setScrollToBottom={setScrollToBottom}
        scrollToBottom={scrollToBottom}
        address={Utils.messagesAddress(vt)}
        sendTransaction={sendTransaction}
        setServerOption={setServerOption}
      />, { swipeDirection: undefined }
    ).promise;
  };

  //console.log('render History - 4');

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
      <Header
        testID="valuetransfer text"
        title={translate('history.title') as string}
        toggleMenuDrawer={toggleMenuDrawer}
        setPrivacyOption={setPrivacyOption}
        addLastSnackbar={addLastSnackbar /* context */}
        setShieldingAmount={setShieldingAmount}
        setScrollToTop={setScrollToTop}
        setScrollToBottom={setScrollToBottom}
        setBackgroundError={setBackgroundError /* context */}
      />
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          width: '100%',
          marginHorizontal: 5,
          marginBottom: 2,
        }}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{
            width: '100%',
            marginTop: 10,
            alignItems: 'center',
            justifyContent: 'center',
          }}>
          <TouchableOpacity
            onPress={() => {
              setFilter(FilterEnum.all);
              setLoading(true);
            }}>
            <View
              style={{
                backgroundColor: filter === FilterEnum.all ? colors.primary : colors.sideMenuBackground,
                borderRadius: 15,
                borderColor: filter === FilterEnum.all ? colors.primary : colors.zingo,
                borderWidth: 1,
                paddingHorizontal: 10,
                paddingVertical: 5,
                marginHorizontal: 10,
              }}>
              <FadeText
                style={{
                  color: filter === FilterEnum.all ? colors.sideMenuBackground : colors.zingo,
                  fontWeight: 'bold',
                }}>
                {translate('messages.filter-all') as string}
              </FadeText>
            </View>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => {
              setFilter(FilterEnum.withFunds);
              setLoading(true);
            }}>
            <View
              style={{
                backgroundColor: filter === FilterEnum.withFunds ? colors.primary : colors.sideMenuBackground,
                borderRadius: 15,
                borderColor: filter === FilterEnum.withFunds ? colors.primary : colors.zingo,
                borderWidth: 1,
                paddingHorizontal: 10,
                paddingVertical: 5,
                marginHorizontal: 0,
              }}>
              <FadeText
                style={{
                  color: filter === FilterEnum.withFunds ? colors.sideMenuBackground : colors.zingo,
                  fontWeight: 'bold',
                }}>
                {translate('history.filter-withfunds') as string}
              </FadeText>
            </View>
          </TouchableOpacity>
        </ScrollView>
      </View>
      {loading ? (
        <ActivityIndicator size="large" color={colors.primary} style={{ marginVertical: 20 }} />
      ) : (
        <>
          <ScrollView
            ref={scrollViewRef}
            onScroll={handleScroll}
            scrollEventThrottle={100}
            accessible={true}
            accessibilityLabel={translate('history.list-acc') as string}
            refreshControl={
              <RefreshControl
                refreshing={false}
                onRefresh={() => doRefresh(RefreshScreenEnum.History)}
                tintColor={colors.text}
                title={translate('history.refreshing') as string}
              />
            }
            style={{
              flexGrow: 1,
              marginTop: 10,
              width: '100%',
            }}>
            {valueTransfersSliced &&
              valueTransfersSliced.length > 0 &&
              valueTransfersSliced.flatMap((vt, index) => {
                let txmonth = vt && vt.time ? moment(vt.time * 1000).format('MMM YYYY') : '--- ----';

                var month = '';
                if (txmonth !== lastMonth) {
                  month = txmonth;
                  lastMonth = txmonth;
                }

                return (
                  <ValueTransferLine
                    key={`${index}-${vt.txid}-${vt.kind}`}
                    index={index}
                    vt={vt}
                    month={month}
                    setValueTransferDetailModalShow={setValueTransferDetailModalShow}
                    nextLineWithSameTxid={
                      index >= valueTransfersSliced.length - 1
                        ? false
                        : valueTransfersSliced[index + 1].txid === vt.txid
                    }
                    setMessagesAddressModalShow={setMessagesAddressModalShow}
                    addressProtected={vt.address === zenniesDonationAddress}
                  />
                );
              })}
            {loadMoreButton ? (
              <View
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'flex-start',
                  marginTop: 10,
                  marginBottom: 30,
                }}>
                <Button
                  type={ButtonTypeEnum.Secondary}
                  title={translate('history.loadmore') as string}
                  onPress={loadMoreClicked}
                />
              </View>
            ) : (
              <>
                {!!valueTransfersSliced && !!valueTransfersSliced.length ? (
                  <View
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'flex-start',
                      marginTop: 10,
                      marginBottom: 30,
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
                    <FadeText style={{ color: colors.primary }}>{translate('history.empty') as string}</FadeText>
                  </View>
                )}
              </>
            )}
          </ScrollView>
          {!isAtTop && (
            <TouchableOpacity onPress={handleScrollToTop} style={{ position: 'absolute', bottom: 30, right: 10 }}>
              <FontAwesomeIcon
                style={{ marginLeft: 5, marginRight: 5, marginTop: 0 }}
                size={50}
                icon={faAnglesUp}
                color={colors.zingo}
              />
            </TouchableOpacity>
          )}
        </>
      )}
    </View>
  );
};

export default React.memo(History);
