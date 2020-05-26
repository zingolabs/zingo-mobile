/* eslint-disable react-native/no-inline-styles */
import React from 'react';
import {createStackNavigator} from '@react-navigation/stack';
import {RegText, ZecAmount, UsdAmount, PrimaryButton, FadeText} from '../components/Components';
import {View, ScrollView, Image, Modal, TouchableOpacity, SafeAreaView, RefreshControl} from 'react-native';
import {TotalBalance, Transaction, Info} from '../app/AppState';
import Utils from '../app/utils';
import Moment from 'react-moment';
import {useTheme} from '@react-navigation/native';
import {FontAwesomeIcon} from '@fortawesome/react-native-fontawesome';
import {faBars} from '@fortawesome/free-solid-svg-icons';

type TxDetailProps = {
  tx: Transaction | null;
  price?: number | null;
  closeModal: () => void;
};
const TxDetail: React.FunctionComponent<TxDetailProps> = ({tx, price, closeModal}) => {
  const {colors} = useTheme();
  const spendColor = tx?.confirmations === 0 ? 'yellow' : (tx?.amount || 0) > 0 ? '#88ee88' : '#ff6666';

  return (
    <SafeAreaView
      style={{
        display: 'flex',
        justifyContent: 'flex-start',
        alignItems: 'stretch',
        height: '100%',
        backgroundColor: colors.background,
      }}>
      <ScrollView
        contentContainerStyle={{
          flexDirection: 'column',
          alignItems: 'stretch',
          justifyContent: 'flex-start',
          margin: 10,
        }}>
        <View style={{display: 'flex', alignItems: 'center'}}>
          <RegText color={spendColor}>{tx?.type}</RegText>
          <ZecAmount amtZec={tx?.amount} />
          <UsdAmount amtZec={tx?.amount} price={price} />
        </View>

        <View style={{display: 'flex', flexDirection: 'row', justifyContent: 'space-between', marginTop: 10}}>
          <View style={{display: 'flex'}}>
            <FadeText>Time</FadeText>
            <Moment interval={0} format="D MMM h:mm a" element={RegText}>
              {(tx?.time || 0) * 1000}
            </Moment>
          </View>
          <View style={{display: 'flex', alignItems: 'flex-end'}}>
            <FadeText>Confirmations</FadeText>
            <RegText>{tx?.confirmations}</RegText>
          </View>
        </View>

        <View style={{display: 'flex', marginTop: 10}}>
          <FadeText>TxID</FadeText>
          <RegText>{Utils.trimToSmall(tx?.txid, 10)}</RegText>
        </View>

        {tx?.detailedTxns.map((txd) => {
          return (
            <View
              key={txd.address}
              style={{display: 'flex', marginTop: 10, backgroundColor: colors.card, padding: 5, paddingBottom: 15}}>
              <View style={{marginTop: 10}}>
                <FadeText>Address</FadeText>
                <RegText>{txd.address}</RegText>
              </View>

              <View style={{marginTop: 10}}>
                <FadeText>Amount</FadeText>
                <View style={{display: 'flex', flexDirection: 'row', justifyContent: 'space-between'}}>
                  <ZecAmount amtZec={txd?.amount} size={18} />
                  <UsdAmount style={{fontSize: 18}} amtZec={txd?.amount} price={price} />
                </View>
              </View>

              {txd?.memo && (
                <View style={{marginTop: 10}}>
                  <FadeText>Memo</FadeText>
                  <RegText>{txd?.memo}</RegText>
                </View>
              )}
            </View>
          );
        })}
      </ScrollView>
      <View style={{flexGrow: 1, flexDirection: 'row', justifyContent: 'center', alignItems: 'center'}}>
        <PrimaryButton title="Close" onPress={closeModal} />
      </View>
    </SafeAreaView>
  );
};

type TxSummaryLineProps = {
  tx: Transaction;
  setTxDetail: React.Dispatch<React.SetStateAction<Transaction | null>>;
  setTxDetailModalShowing: React.Dispatch<React.SetStateAction<boolean>>;
};
const TxSummaryLine: React.FunctionComponent<TxSummaryLineProps> = ({tx, setTxDetail, setTxDetailModalShowing}) => {
  const spendColor = tx.confirmations === 0 ? 'yellow' : tx.amount > 0 ? '#88ee88' : '#ff6666';
  return (
    <TouchableOpacity
      onPress={() => {
        setTxDetail(tx);
        setTxDetailModalShowing(true);
      }}>
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
        <ZecAmount
          style={{flexGrow: 1, alignSelf: 'baseline', justifyContent: 'flex-end', paddingRight: 5}}
          size={18}
          zecSymbol={'ᙇ'}
          color={spendColor}
          amtZec={tx.amount}
        />
      </View>
    </TouchableOpacity>
  );
};

type TransactionsScreenViewProps = {
  info: Info | null;
  totalBalance: TotalBalance;
  transactions: Transaction[] | null;
  toggleMenuDrawer: () => void;
  doRefresh: () => void;
};

const TransactionsScreenView: React.FunctionComponent<TransactionsScreenViewProps> = ({
  info,
  totalBalance,
  transactions,
  toggleMenuDrawer,
  doRefresh,
}) => {
  const [isTxDetailModalShowing, setTxDetailModalShowing] = React.useState(false);
  const [txDetail, setTxDetail] = React.useState<Transaction | null>(null);

  const {colors} = useTheme();
  const zecPrice = info ? info.zecPrice : null;

  return (
    <View style={{display: 'flex', flexDirection: 'column', justifyContent: 'flex-start', marginBottom: 170}}>
      <Modal
        animationType="slide"
        transparent={false}
        visible={isTxDetailModalShowing}
        onRequestClose={() => setTxDetailModalShowing(false)}>
        <TxDetail tx={txDetail} price={info?.zecPrice} closeModal={() => setTxDetailModalShowing(false)} />
      </Modal>

      <View style={{display: 'flex', alignItems: 'center', height: 140, backgroundColor: colors.card, zIndex: -1}}>
        <RegText style={{marginTop: 10, marginBottom: 5}}>Balance</RegText>
        <ZecAmount size={36} amtZec={totalBalance.total} />
        <UsdAmount style={{marginTop: 5}} price={zecPrice} amtZec={totalBalance.total} />
      </View>

      <View style={{backgroundColor: '#353535', padding: 10, position: 'absolute'}}>
        <TouchableOpacity onPress={toggleMenuDrawer}>
          <FontAwesomeIcon icon={faBars} size={20} color={'#ffffff'} />
        </TouchableOpacity>
      </View>

      <View style={{display: 'flex', alignItems: 'center', marginTop: -25}}>
        <Image source={require('../assets/img/logobig.png')} style={{width: 50, height: 50, resizeMode: 'contain'}} />
      </View>
      <ScrollView
        refreshControl={<RefreshControl refreshing={false} onRefresh={doRefresh} />}
        style={{flexGrow: 1, marginTop: 10, width: '100%', height: '100%'}}>
        {transactions?.map((t) => {
          return (
            <TxSummaryLine
              key={t.txid}
              tx={t}
              setTxDetail={setTxDetail}
              setTxDetailModalShowing={setTxDetailModalShowing}
            />
          );
        })}
      </ScrollView>
    </View>
  );
};

const Stack = createStackNavigator();

const TransactionsScreen: React.FunctionComponent<TransactionsScreenViewProps> = (iprops) => {
  return (
    <Stack.Navigator headerMode="none">
      <Stack.Screen name="TransactionsView">
        {(props) => <TransactionsScreenView {...props} {...iprops} />}
      </Stack.Screen>
    </Stack.Navigator>
  );
};

export default TransactionsScreen;
