import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';

import { TotalBalance, Transaction, Info, SyncStatus } from '../../app/AppState';
import TransactionsView from './components/TransactionsView';

const Stack = createStackNavigator();

type TransactionsViewProps = {
  info: Info | null;
  totalBalance: TotalBalance;
  syncingStatus: SyncStatus | null;
  transactions: Transaction[] | null;
  toggleMenuDrawer: () => void;
  doRefresh: () => void;
  setComputingModalVisible: (visible: boolean) => void;
  syncingStatusMoreInfoOnClick: () => void;
};

const Transactions: React.FunctionComponent<TransactionsViewProps> = iprops => {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="TransactionsView">{props => <TransactionsView {...props} {...iprops} />}</Stack.Screen>
    </Stack.Navigator>
  );
};

export default Transactions;
