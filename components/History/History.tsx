/* eslint-disable react-native/no-inline-styles */
import React, { useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { View, ScrollView, Modal, RefreshControl } from 'react-native';
import moment from 'moment';
import 'moment/locale/es';
import { useTheme } from '@react-navigation/native';

import { TransactionType } from '../../app/AppState';
import { ThemeType } from '../../app/types';
import FadeText from '../Components/FadeText';
import Button from '../Components/Button';
import TxDetail from './components/TxDetail';
import TxSummaryLine from './components/TxSummaryLine';
import { ContextAppLoaded } from '../../app/context';
import Header from '../Header';

type HistoryProps = {
  doRefresh: () => void;
  toggleMenuDrawer: () => void;
  poolsMoreInfoOnClick: () => void;
  syncingStatusMoreInfoOnClick: () => void;
  setZecPrice: (p: number, d: number) => void;
  setComputingModalVisible: (visible: boolean) => void;
  setBackgroundError: (title: string, error: string) => void;
  set_privacy_option: (
    name: 'server' | 'currency' | 'language' | 'sendAll' | 'privacy',
    value: boolean,
  ) => Promise<void>;
  setPoolsToShieldSelectSapling: (v: boolean) => void;
  setPoolsToShieldSelectTransparent: (v: boolean) => void;
};

const History: React.FunctionComponent<HistoryProps> = ({
  doRefresh,
  toggleMenuDrawer,
  poolsMoreInfoOnClick,
  syncingStatusMoreInfoOnClick,
  setZecPrice,
  setComputingModalVisible,
  setBackgroundError,
  set_privacy_option,
  setPoolsToShieldSelectSapling,
  setPoolsToShieldSelectTransparent,
}) => {
  const context = useContext(ContextAppLoaded);
  const { translate, transactions, language } = context;
  moment.locale(language);

  const { colors } = useTheme() as unknown as ThemeType;
  const [isTxDetailModalShowing, setTxDetailModalShowing] = useState(false);
  const [txDetail, setTxDetail] = useState<TransactionType>({} as TransactionType);
  const [numTx, setNumTx] = useState<number>(50);
  const [loadMoreButton, setLoadMoreButton] = useState<boolean>(numTx < (transactions.length || 0));
  const [transactionsSorted, setTransactionsSorted] = useState<TransactionType[]>([]);

  var lastMonth = '';

  const fetchTransactionsSorted = useMemo(() => {
    return transactions.slice(0, numTx).sort((a, b) => b.time - a.time);
  }, [transactions, numTx]);

  useEffect(() => {
    setLoadMoreButton(numTx < (transactions.length || 0));
    setTransactionsSorted(fetchTransactionsSorted);
  }, [fetchTransactionsSorted, numTx, transactions]);

  const loadMoreClicked = useCallback(() => {
    setNumTx(numTx + 50);
  }, [numTx]);

  //console.log('render History - 4');

  return (
    <View
      accessible={true}
      accessibilityLabel={translate('history.title-acc') as string}
      style={{
        display: 'flex',
        justifyContent: 'flex-start',
        marginBottom: 140,
        width: '100%',
      }}>
      <Modal
        animationType="slide"
        transparent={false}
        visible={isTxDetailModalShowing}
        onRequestClose={() => setTxDetailModalShowing(false)}>
        <TxDetail tx={txDetail} closeModal={() => setTxDetailModalShowing(false)} />
      </Modal>

      <Header
        testID="transaction text"
        poolsMoreInfoOnClick={poolsMoreInfoOnClick}
        syncingStatusMoreInfoOnClick={syncingStatusMoreInfoOnClick}
        toggleMenuDrawer={toggleMenuDrawer}
        setZecPrice={setZecPrice}
        title={translate('history.title') as string}
        setComputingModalVisible={setComputingModalVisible}
        setBackgroundError={setBackgroundError}
        set_privacy_option={set_privacy_option}
        setPoolsToShieldSelectSapling={setPoolsToShieldSelectSapling}
        setPoolsToShieldSelectTransparent={setPoolsToShieldSelectTransparent}
      />

      <ScrollView
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
        style={{ flexGrow: 1, marginTop: 10, width: '100%', height: '100%' }}>
        {transactionsSorted.flatMap((t, index) => {
          let txmonth = t.time ? moment(t.time * 1000).format('MMM YYYY') : '--- ----';

          var month = '';
          if (txmonth !== lastMonth) {
            month = txmonth;
            lastMonth = txmonth;
          }

          return (
            <TxSummaryLine
              index={index}
              key={`${t.txid}-${t.type}`}
              tx={t}
              month={month}
              setTxDetail={(ttt: TransactionType) => setTxDetail(ttt)}
              setTxDetailModalShowing={(bbb: boolean) => setTxDetailModalShowing(bbb)}
            />
          );
        })}
        {loadMoreButton ? (
          <View
            style={{
              height: 150,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'flex-start',
              marginTop: 5,
              marginBottom: 30,
            }}>
            <Button type="Secondary" title={translate('history.loadmore') as string} onPress={loadMoreClicked} />
          </View>
        ) : (
          <>
            {!!transactions && !!transactions.length && (
              <View
                style={{
                  height: 150,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'flex-start',
                  marginTop: 5,
                  marginBottom: 30,
                }}>
                <FadeText style={{ color: colors.primary }}>{translate('history.end') as string}</FadeText>
              </View>
            )}
          </>
        )}
      </ScrollView>
    </View>
  );
};

export default React.memo(History);
