/* eslint-disable react-native/no-inline-styles */
import React, { useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { View, ScrollView, Modal, RefreshControl } from 'react-native';
import moment from 'moment';
import 'moment/locale/es';
import 'moment/locale/pt';
import 'moment/locale/ru';

import { useTheme } from '@react-navigation/native';

import { ButtonTypeEnum, SendPageStateClass, TransactionType } from '../../app/AppState';
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
  setPrivacyOption: (value: boolean) => Promise<void>;
  //setPoolsToShieldSelectSapling: (v: boolean) => void;
  //setPoolsToShieldSelectTransparent: (v: boolean) => void;
  setUfvkViewModalVisible?: (v: boolean) => void;
  setSendPageState: (s: SendPageStateClass) => void;
  setShieldingAmount: (value: number) => void;
};

const History: React.FunctionComponent<HistoryProps> = ({
  doRefresh,
  toggleMenuDrawer,
  poolsMoreInfoOnClick,
  syncingStatusMoreInfoOnClick,
  setZecPrice,
  setComputingModalVisible,
  setPrivacyOption,
  //setPoolsToShieldSelectSapling,
  //setPoolsToShieldSelectTransparent,
  setUfvkViewModalVisible,
  setSendPageState,
  setShieldingAmount,
}) => {
  const context = useContext(ContextAppLoaded);
  const { translate, transactions, language, setBackgroundError, addLastSnackbar } = context;
  const { colors } = useTheme() as unknown as ThemeType;
  moment.locale(language);

  const [isTxDetailModalShowing, setTxDetailModalShowing] = useState<boolean>(false);
  const [txDetail, setTxDetail] = useState<TransactionType>({} as TransactionType);
  const [numTx, setNumTx] = useState<number>(50);
  const [loadMoreButton, setLoadMoreButton] = useState<boolean>(numTx < (transactions.length || 0));
  const [transactionsSorted, setTransactionsSorted] = useState<TransactionType[]>([]);

  var lastMonth = '';

  const fetchTransactionsSorted = useMemo(() => {
    return transactions.sort((a, b) => b.time - a.time).slice(0, numTx);
  }, [transactions, numTx]);

  useEffect(() => {
    setLoadMoreButton(numTx < (transactions.length || 0));
    setTransactionsSorted(fetchTransactionsSorted);
  }, [fetchTransactionsSorted, numTx, transactions]);

  const loadMoreClicked = useCallback(() => {
    setNumTx(numTx + 50);
  }, [numTx]);

  const moveTxDetail = (txid: string, type: number) => {
    // -1 -> Prevoius transaction
    //  1 -> Next transaction
    const index = transactionsSorted.findIndex((tx: TransactionType) => tx.txid === txid);
    console.log(index);
    if ((index > 0 && type === -1) || (index < transactionsSorted.length - 1 && type === 1)) {
      console.log(transactionsSorted[index + type].txid);
      setTxDetail(transactionsSorted[index + type]);
    }
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
      <Modal
        animationType="slide"
        transparent={false}
        visible={isTxDetailModalShowing}
        onRequestClose={() => setTxDetailModalShowing(false)}>
        <TxDetail
          index={transactionsSorted.findIndex((tx: TransactionType) => tx.txid === txDetail.txid)}
          length={transactionsSorted.length}
          tx={txDetail}
          closeModal={() => setTxDetailModalShowing(false)}
          openModal={() => setTxDetailModalShowing(true)}
          setPrivacyOption={setPrivacyOption}
          setSendPageState={setSendPageState}
          moveTxDetail={moveTxDetail}
        />
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
        setPrivacyOption={setPrivacyOption}
        //setPoolsToShieldSelectSapling={setPoolsToShieldSelectSapling}
        //setPoolsToShieldSelectTransparent={setPoolsToShieldSelectTransparent}
        setUfvkViewModalVisible={setUfvkViewModalVisible}
        addLastSnackbar={addLastSnackbar}
        setShieldingAmount={setShieldingAmount}
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
        style={{ flexGrow: 1, marginTop: 10, width: '100%' }}>
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
            {!!transactions && !!transactions.length && (
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
            )}
          </>
        )}
      </ScrollView>
    </View>
  );
};

export default React.memo(History);
