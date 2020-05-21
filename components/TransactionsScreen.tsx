/* eslint-disable react-native/no-inline-styles */
import React from 'react';
import {RegText, ZecAmount} from '../components/Components';
import {View, ScrollView} from 'react-native';
import {TotalBalance, Transaction} from 'app/AppState';

type TxSummaryLineProps = {
  tx: Transaction;
};
const TxSummaryLine: React.FunctionComponent<TxSummaryLineProps> = ({tx}) => {
  return (
    <View style={{display: 'flex', flexDirection: 'row'}}>
      <RegText>{tx.type}</RegText>
      <RegText>{tx.amount}</RegText>
    </View>
  );
};

type TransactionsScreenProps = {
  totalBalance: TotalBalance;
  transactions: Transaction[] | null;
};

const TransactionsScreen: React.FunctionComponent<TransactionsScreenProps> = ({totalBalance, transactions}) => {
  return (
    <View style={{flex: 1, flexDirection: 'column', alignItems: 'center'}}>
      <RegText>Balance</RegText>
      <ZecAmount amtZec={totalBalance.total} />
      <ScrollView style={{width: '100%'}}>
        {transactions?.map((t) => {
          return <TxSummaryLine key={t.txid} tx={t} />;
        })}
      </ScrollView>
    </View>
  );
};

export default TransactionsScreen;
