/* eslint-disable react-native/no-inline-styles */
import React, { useContext, useState } from 'react';
import { View, ScrollView, Modal, RefreshControl } from 'react-native';
import moment from 'moment';
import 'moment/locale/es';
import { useTheme } from '@react-navigation/native';

import { TransactionType } from '../../app/AppState';
import { ThemeType } from '../../app/types';
import RegText from '../Components/RegText';
import FadeText from '../Components/FadeText';
import Button from '../Button';
import TxDetail from './components/TxDetail';
import TxSummaryLine from './components/TxSummaryLine';
import { ContextAppLoaded } from '../../app/context';
import Header from '../Header';

type TransactionsProps = {
  doRefresh: () => void;
  toggleMenuDrawer: () => void;
  setComputingModalVisible: (visible: boolean) => void;
  poolsMoreInfoOnClick: () => void;
  syncingStatusMoreInfoOnClick: () => void;
  setZecPrice: (p: number, d: number) => void;
};

const Transactions: React.FunctionComponent<TransactionsProps> = ({
  doRefresh,
  toggleMenuDrawer,
  setComputingModalVisible,
  poolsMoreInfoOnClick,
  syncingStatusMoreInfoOnClick,
  setZecPrice,
}) => {
  const context = useContext(ContextAppLoaded);
  const { translate, dimensions, transactions, language } = context;
  const { colors } = useTheme() as unknown as ThemeType;
  const [isTxDetailModalShowing, setTxDetailModalShowing] = useState(false);
  const [txDetail, setTxDetail] = useState<TransactionType>({} as TransactionType);

  const [numTx, setNumTx] = useState<number>(100);
  const loadMoreButton = numTx < (transactions.length || 0);
  moment.locale(language);

  const loadMoreClicked = () => {
    setNumTx(numTx + 100);
  };

  var lastMonth = '';

  //console.log('render transaction');

  const returnPortrait = (
    <View
      accessible={true}
      accessibilityLabel={translate('transactions.title-acc')}
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
        setComputingModalVisible={setComputingModalVisible}
        toggleMenuDrawer={toggleMenuDrawer}
        setZecPrice={setZecPrice}
        title={translate('transactions.title')}
      />

      <ScrollView
        accessible={true}
        accessibilityLabel={translate('transactions.list-acc')}
        refreshControl={
          <RefreshControl
            refreshing={false}
            onRefresh={doRefresh}
            tintColor={colors.text}
            title={translate('transactions.refreshing')}
          />
        }
        style={{ flexGrow: 1, marginTop: 10, width: '100%', height: '100%' }}>
        {transactions
          .slice(0, numTx)
          .sort((a, b) => b.time - a.time)
          .flatMap(t => {
            let txmonth = moment(t.time * 1000).format('MMM YYYY');

            var month = '';
            if (txmonth !== lastMonth) {
              month = txmonth;
              lastMonth = txmonth;
            }

            return (
              <TxSummaryLine
                key={`${t.txid}-${t.type}`}
                tx={t}
                month={month}
                setTxDetail={(ttt: TransactionType) => setTxDetail(ttt)}
                setTxDetailModalShowing={(bbb: boolean) => setTxDetailModalShowing(bbb)}
              />
            );
          })}
        {!!transactions && !!transactions.length && (
          <View
            style={{
              height: 100,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'flex-start',
              marginBottom: 30,
            }}>
            <FadeText style={{ color: colors.primary }}>{translate('transactions.end')}</FadeText>
          </View>
        )}

        {loadMoreButton && (
          <View style={{ flexDirection: 'row', justifyContent: 'center', margin: 30 }}>
            <Button type="Secondary" title={translate('transactions.loadmore')} onPress={loadMoreClicked} />
          </View>
        )}
      </ScrollView>
    </View>
  );

  const returnLandscape = (
    <View style={{ flexDirection: 'row', height: '100%' }}>
      <View
        accessible={true}
        accessibilityLabel={translate('transactions.title-acc')}
        style={{
          display: 'flex',
          justifyContent: 'flex-start',
          width: '50%',
        }}>
        <Modal
          animationType="slide"
          transparent={false}
          visible={isTxDetailModalShowing}
          onRequestClose={() => setTxDetailModalShowing(false)}>
          <TxDetail tx={txDetail} closeModal={() => setTxDetailModalShowing(false)} />
        </Modal>

        <Header
          poolsMoreInfoOnClick={poolsMoreInfoOnClick}
          syncingStatusMoreInfoOnClick={syncingStatusMoreInfoOnClick}
          setComputingModalVisible={setComputingModalVisible}
          toggleMenuDrawer={toggleMenuDrawer}
          setZecPrice={setZecPrice}
          title={translate('transactions.title')}
        />
      </View>
      <View
        style={{
          borderLeftColor: colors.border,
          borderLeftWidth: 1,
          alignItems: 'center',
          padding: 10,
          height: '100%',
          width: '50%',
        }}>
        <RegText color={colors.money} style={{ paddingHorizontal: 5 }}>
          {translate('transactions.transactions')}
        </RegText>
        <View style={{ width: '100%', height: 1, backgroundColor: colors.primary, marginTop: 5 }} />
        <ScrollView
          accessible={true}
          accessibilityLabel={translate('transactions.list-acc')}
          refreshControl={
            <RefreshControl
              refreshing={false}
              onRefresh={doRefresh}
              tintColor={colors.text}
              title={translate('transactions.refreshing')}
            />
          }
          style={{ flexGrow: 1, marginTop: 0, height: '100%' }}>
          {transactions
            .slice(0, numTx)
            .sort((a, b) => b.time - a.time)
            .flatMap(t => {
              let txmonth = moment(t.time * 1000).format('MMM YYYY');

              var month = '';
              if (txmonth !== lastMonth) {
                month = txmonth;
                lastMonth = txmonth;
              }

              return (
                <TxSummaryLine
                  key={`${t.txid}-${t.type}`}
                  tx={t}
                  month={month}
                  setTxDetail={(ttt: TransactionType) => setTxDetail(ttt)}
                  setTxDetailModalShowing={(bbb: boolean) => setTxDetailModalShowing(bbb)}
                />
              );
            })}
          {!!transactions && !!transactions.length && (
            <View
              style={{
                height: 100,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'flex-start',
                marginBottom: 30,
              }}>
              <FadeText style={{ color: colors.primary }}>{translate('transactions.end')}</FadeText>
            </View>
          )}

          {loadMoreButton && (
            <View style={{ flexDirection: 'row', justifyContent: 'center', margin: 30 }}>
              <Button type="Secondary" title={translate('transactions.loadmore')} onPress={loadMoreClicked} />
            </View>
          )}
        </ScrollView>
      </View>
    </View>
  );

  //console.log(dimensions);

  if (dimensions.orientation === 'landscape') {
    return returnLandscape;
  } else {
    return returnPortrait;
  }
};

export default Transactions;
