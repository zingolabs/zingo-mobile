/* eslint-disable react-native/no-inline-styles */
import React, { useContext, useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  View,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import moment from 'moment';
import 'moment/locale/es';
import 'moment/locale/pt';
import 'moment/locale/ru';

import { useTheme } from '@react-navigation/native';
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
import { DataProvider, RecyclerListView, LayoutProvider } from 'recyclerlistview';
import { ScrollEvent } from 'recyclerlistview/dist/reactnative/core/scrollcomponent/BaseScrollView';
import { isEqual } from 'lodash';

const ViewTypes = {
  WITH_MONTH: 0,
  WITHOUT_MONTH: 1,
};

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
  const [valueTransfersFiltered, setValueTransfersFiltered] = useState<ValueTransferType[]>([]);
  const [isAtTop, setIsAtTop] = useState<boolean>(true);
  const [loading, setLoading] = useState<boolean>(true);
  const [filter, setFilter] = useState<FilterEnum>(FilterEnum.all);
  const [showFooter, setShowFooter] = useState<boolean>(false);
  const scrollViewRef = useRef<RecyclerListView<any, any>>(null);

  const layoutProvider = useMemo(() => new LayoutProvider(
    (index: number) => {
      if (index === 0) {
        return ViewTypes.WITH_MONTH;
      }
      const lastData = valueTransfersSliced[index - 1];
      let lasttxmonth = lastData && lastData.time ? moment(lastData.time * 1000).format('MMM YYYY') : '--- ----';

      const data = valueTransfersSliced[index];
      let txmonth = data && data.time ? moment(data.time * 1000).format('MMM YYYY') : '--- ----';

      if (txmonth !== lasttxmonth) {
        return ViewTypes.WITH_MONTH;
      } else {
        return ViewTypes.WITHOUT_MONTH;
      }
    },
    (type, dim) => {
      if (type === ViewTypes.WITHOUT_MONTH) {
        dim.width = Dimensions.get('window').width;
        dim.height = 65;
      } else if (type === ViewTypes.WITH_MONTH) {
        dim.width = Dimensions.get('window').width;
        dim.height = 95;
      }
    },
  ), [valueTransfersSliced]);

  const _dataProvider = useMemo(() => new DataProvider(
    (r1: ValueTransferType, r2: ValueTransferType) => !isEqual(r1, r2)
  ), []);

  const [dataProvider, setDataProvider] = useState<DataProvider>(_dataProvider);

  const fetchValueTransfersFiltered = useMemo(() => {
    if (!valueTransfers) {
      return [] as ValueTransferType[];
    }
    // strictly show VT's with some amount on funds.
    return valueTransfers
      .filter((vt: ValueTransferType) => (filter === FilterEnum.withFunds ? vt.amount > 0 : true));
  }, [valueTransfers, filter]);

  useEffect(() => {
    if (valueTransfers !== null) {
      const vtf = fetchValueTransfersFiltered;
      setValueTransfersFiltered(vtf);
      setLoadMoreButton(numVt < vtf.length);
      const vtfs = vtf.slice(0, numVt);
      setValueTransfersSliced(vtfs);
      setDataProvider((data) => data.cloneWithRows(vtfs));
      setTimeout(() => {
        setLoading(false);
      }, 500);
    }
  }, [fetchValueTransfersFiltered, numVt, valueTransfers, server.chainName]);

  useEffect(() => {
    setLoadMoreButton(numVt < valueTransfersFiltered.length);
    const vtfs = valueTransfersFiltered.slice(0, numVt);
    setValueTransfersSliced(vtfs);
    setDataProvider((data) => data.cloneWithRows(vtfs));
  }, [numVt, valueTransfersFiltered]);

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
      scrollViewRef.current.scrollToTop(true);
    }
  };

  const handleScroll = (_rawEvent: ScrollEvent, _offsetX: number, offsetY: number) => {
    const isTop = offsetY === 0;
    setIsAtTop(isTop);
    setShowFooter(true);
  };

  const setValueTransferDetailModalShow = (index: number, vt: ValueTransferType) => {
    return magicModal.show(() => <ValueTransferDetail
        index={index}
        vt={vt}
        valueTransfersSliced={valueTransfersSliced}
        totalLength={valueTransfersFiltered !== null ? valueTransfersFiltered.length : 0}
        setPrivacyOption={setPrivacyOption}
      />, { swipeDirection: 'right', style: { flex: 1, backgroundColor: colors.background } }
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
      />, { swipeDirection: 'right', style: { flex: 1, backgroundColor: colors.background } }
    ).promise;
  };

  const _rowRenderer = (type: any, data: ValueTransferType, index: number) => {
    let txmonth = data && data.time ? moment(data.time * 1000).format('MMM YYYY') : '--- ----';

    return <ValueTransferLine
      index={index}
      vt={data}
      month={type === ViewTypes.WITH_MONTH ? txmonth : ''}
      setValueTransferDetailModalShow={setValueTransferDetailModalShow}
      nextLineWithSameTxid={
        index >= valueTransfersSliced.length - 1
          ? false
          : valueTransfersSliced[index + 1].txid === data.txid
      }
      setMessagesAddressModalShow={setMessagesAddressModalShow}
      addressProtected={data.address === zenniesDonationAddress}
    />;
  };

  console.log('render History - 4', valueTransfers?.length);

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
              setShowFooter(false);
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
              setShowFooter(false);
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
          {valueTransfersSliced &&
            valueTransfersSliced.length > 0 && (
            <RecyclerListView
              ref={scrollViewRef}
              renderAheadOffset={1000}
              scrollViewProps={{
                refreshControl: (
                  <RefreshControl
                    refreshing={false}
                    onRefresh={() => doRefresh(RefreshScreenEnum.History)}
                    tintColor={colors.text}
                    title={translate('history.refreshing') as string}
                  />
                ),
                style: {
                  flexGrow: 1,
                  marginTop: 10,
                  width: '100%',
                },
              }}
              onScroll={handleScroll}
              scrollThrottle={100}
              layoutProvider={layoutProvider}
              dataProvider={dataProvider}
              rowRenderer={_rowRenderer}
              onEndReachedThreshold={0.75}
              onEndReached={() => {
                setShowFooter(true);
              }}
              disableRecycling={true}
              renderFooter={() => (
                <>
                  {showFooter ? (
                    <>
                      {loadMoreButton ? (
                        <View
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'flex-start',
                            marginTop: 20,
                            marginBottom: 60,
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
                                marginTop: 20,
                                marginBottom: 60,
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
                              }}>
                              <FadeText style={{ color: colors.primary }}>{translate('history.empty') as string}</FadeText>
                            </View>
                          )}
                        </>
                      )}
                    </>
                  ) : null}
                </>
              )}
            />)
          }
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
