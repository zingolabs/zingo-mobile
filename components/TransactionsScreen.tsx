/* eslint-disable react-native/no-inline-styles */
import React from 'react';
import {RegText, ZecAmount, UsdAmount} from '../components/Components';
import {View, ScrollView, Image} from 'react-native';
import {TotalBalance, Transaction, Info} from 'app/AppState';
import Moment from 'react-moment';
import {useTheme} from '@react-navigation/native';

type TxSummaryLineProps = {
  tx: Transaction;
};
const TxSummaryLine: React.FunctionComponent<TxSummaryLineProps> = ({tx}) => {
  const spendColor = tx.confirmations === 0 ? 'yellow' : tx.amount > 0 ? '#88ee88' : '#ff6666';
  return (
    <View style={{display: 'flex', flexDirection: 'row', marginTop: 5}}>
      <View
        style={{
          width: 2,
          marginRight: 5,
          backgroundColor: spendColor,
        }}
      />
      <Moment fromNow ago interval={0} element={RegText}>
        {tx.time * 1000}
      </Moment>
      <RegText> ago</RegText>
      <RegText style={{flexGrow: 1, textAlign: 'right', paddingRight: 5, color: spendColor}}>
        {tx.amount > 0 ? '+' : ''}
        {Math.abs(tx.amount)} ᙇ
      </RegText>
    </View>
  );
};

type TransactionsScreenProps = {
  info: Info | null;
  totalBalance: TotalBalance;
  transactions: Transaction[] | null;
};

const TransactionsScreen: React.FunctionComponent<TransactionsScreenProps> = ({info, totalBalance, transactions}) => {
  const {colors} = useTheme();
  const zecPrice = info ? info.zecPrice : null;

  return (
    <View style={{display: 'flex', flexDirection: 'column', justifyContent: 'flex-start'}}>
      <View style={{display: 'flex', alignItems: 'center', height: 150, backgroundColor: colors.card}}>
        <RegText style={{marginTop: 10}}>Balance</RegText>
        <ZecAmount size={36} amtZec={totalBalance.total} />
        <UsdAmount style={{marginTop: 5}} price={zecPrice} amtZec={totalBalance.total} />
      </View>
      <View style={{display: 'flex', alignItems: 'center', marginTop: -25}}>
        <Image source={require('../assets/img/logobig.png')} style={{width: 50, height: 50, resizeMode: 'contain'}} />
      </View>
      <ScrollView style={{flexGrow: 1, marginTop: 10, width: '100%'}}>
        {transactions?.map((t) => {
          return <TxSummaryLine key={t.txid} tx={t} />;
        })}
      </ScrollView>
    </View>
  );
};

export default TransactionsScreen;
