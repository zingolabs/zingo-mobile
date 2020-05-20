/* eslint-disable react-native/no-inline-styles */
import React from 'react';
import {RegText, ZecAmount} from '../components/Components';
import {View} from 'react-native';
import {TotalBalance, Transaction} from 'app/AppState';

type TransactionsScreenProps = {
  totalBalance: TotalBalance;
  transactions: Transaction[] | null;
};

const TransactionsScreen: React.FunctionComponent<TransactionsScreenProps> = ({totalBalance}) => {
  return (
    <View style={{flex: 1, flexDirection: 'column', alignItems: 'center'}}>
      <RegText>Balance</RegText>
      <ZecAmount amtZec={totalBalance.total} />
    </View>
  );
};

export default TransactionsScreen;
