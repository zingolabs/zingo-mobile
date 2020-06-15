/* eslint-disable react-native/no-inline-styles */
import React, {useState} from 'react';
import {createStackNavigator} from '@react-navigation/stack';
import {RegText, ZecAmount, UsdAmount, SecondaryButton, FadeText} from '../components/Components';
import {View, ScrollView, Image, Modal, TouchableOpacity, SafeAreaView, RefreshControl, Clipboard} from 'react-native';
import Toast from 'react-native-simple-toast';
import {TotalBalance, Transaction, Info, SyncStatus} from '../app/AppState';
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
  const spendColor = tx?.confirmations === 0 ? colors.primary : (tx?.amount || 0) > 0 ? '#88ee88' : '#ff6666';

  const [expandAddress, setExpandAddress] = useState(false);
  const [expandTxid, setExpandTxid] = useState(false);

  const fee =
    tx?.type === 'sent' &&
    tx?.amount &&
    Math.abs(tx?.amount) - Math.abs(tx?.detailedTxns?.reduce((s, d) => s + d.amount, 0));

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
        }}>
        <View style={{display: 'flex', alignItems: 'center', padding: 10, backgroundColor: colors.card}}>
          <RegText style={{textTransform: 'capitalize'}} color={spendColor}>
            {tx?.type}
          </RegText>
          <ZecAmount size={36} amtZec={tx?.amount} />
          <UsdAmount amtZec={tx?.amount} price={price} />
        </View>

        <View style={{margin: 10}}>
          <View style={{display: 'flex', flexDirection: 'row', justifyContent: 'space-between', marginTop: 10}}>
            <View style={{display: 'flex'}}>
              <FadeText>Time</FadeText>
              <Moment interval={0} format="D MMM YYYY h:mm a" element={RegText}>
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
            <TouchableOpacity
              onPress={() => {
                if (tx?.txid) {
                  Clipboard.setString(tx?.txid);
                  Toast.show('Copied TxID to Clipboard', Toast.LONG);
                  setExpandTxid(true);
                }
              }}>
              <RegText>
                {!expandTxid && Utils.trimToSmall(tx?.txid, 10)}
                {expandTxid && tx?.txid}
              </RegText>
            </TouchableOpacity>
          </View>

          {tx?.detailedTxns.map((txd) => {
            return (
              <View
                key={txd.address}
                style={{
                  display: 'flex',
                  marginTop: 10,
                  paddingBottom: 15,
                  borderTopColor: colors.card,
                  borderTopWidth: 1,
                  borderBottomColor: colors.card,
                  borderBottomWidth: 1,
                }}>
                <View style={{marginTop: 10}}>
                  <FadeText>Address</FadeText>

                  <TouchableOpacity
                    onPress={() => {
                      if (txd.address) {
                        Clipboard.setString(txd.address);
                        Toast.show('Copied Address to Clipboard', Toast.LONG);
                        setExpandAddress(true);
                      }
                    }}>
                    <View style={{display: 'flex', flexDirection: 'row', flexWrap: 'wrap'}}>
                      {expandAddress &&
                        Utils.splitAddressIntoChunks(txd.address, 9).map((c, idx) => {
                          return <RegText key={idx}>{c} </RegText>;
                        })}
                      {!expandAddress && <RegText>{Utils.trimToSmall(txd.address, 10)}</RegText>}
                    </View>
                  </TouchableOpacity>
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

          {fee && (
            <View style={{display: 'flex', marginTop: 10}}>
              <FadeText>Tx Fee</FadeText>
              <ZecAmount amtZec={fee} size={18} />
            </View>
          )}

          <View style={{padding: 25}} />
        </View>
      </ScrollView>
      <View style={{flexGrow: 1, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', margin: 10}}>
        <SecondaryButton title="Close" onPress={closeModal} />
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
  const {colors} = useTheme();

  const lineColor = tx.confirmations === 0 ? colors.primary : tx.amount > 0 ? '#88ee88' : '#ff6666';
  const amountColor = tx.confirmations === 0 ? colors.primary : tx.amount > 0 ? '#88ee88' : colors.text;

  const displayAddress =
    tx.detailedTxns && tx.detailedTxns.length > 0 ? Utils.trimToSmall(tx.detailedTxns[0].address, 7) : 'Unknown';

  return (
    <TouchableOpacity
      onPress={() => {
        setTxDetail(tx);
        setTxDetailModalShowing(true);
      }}>
      <View
        style={{
          display: 'flex',
          flexDirection: 'row',
          marginTop: 15,
          paddingBottom: 15,
          borderBottomWidth: 1,
          borderBottomColor: colors.border,
        }}>
        <View
          style={{
            width: 2,
            marginRight: 15,
            backgroundColor: lineColor,
          }}
        />
        <View style={{display: 'flex'}}>
          <FadeText style={{fontSize: 18}}>
            {tx.type === 'sent' ? 'Sent to ' : 'Received to '}
            {displayAddress}
          </FadeText>
          <Moment interval={0} format="D MMM h:mm a" element={FadeText}>
            {(tx?.time || 0) * 1000}
          </Moment>
        </View>
        <ZecAmount
          style={{flexGrow: 1, alignSelf: 'baseline', justifyContent: 'flex-end', paddingRight: 5}}
          size={18}
          zecSymbol={'ᙇ'}
          color={amountColor}
          amtZec={tx.amount}
        />
      </View>
    </TouchableOpacity>
  );
};

type TransactionsScreenViewProps = {
  info: Info | null;
  totalBalance: TotalBalance;
  syncingStatus: SyncStatus | null;
  transactions: Transaction[] | null;
  toggleMenuDrawer: () => void;
  doRefresh: () => void;
};

const TransactionsScreenView: React.FunctionComponent<TransactionsScreenViewProps> = ({
  info,
  totalBalance,
  transactions,
  toggleMenuDrawer,
  syncingStatus,
  doRefresh,
}) => {
  const [isTxDetailModalShowing, setTxDetailModalShowing] = React.useState(false);
  const [txDetail, setTxDetail] = React.useState<Transaction | null>(null);

  const {colors} = useTheme();
  const zecPrice = info ? info.zecPrice : null;

  const syncStatusDisplay = syncingStatus?.isSyncing
    ? `Syncing ${syncingStatus?.walletHeight}/${syncingStatus?.toalHeight}`
    : 'Balance';

  const balanceColor = transactions?.find((t) => t.confirmations === 0) ? colors.primary : colors.text;

  return (
    <View style={{display: 'flex', flexDirection: 'column', justifyContent: 'flex-start', marginBottom: 170}}>
      <Modal
        animationType="slide"
        transparent={false}
        visible={isTxDetailModalShowing}
        onRequestClose={() => setTxDetailModalShowing(false)}>
        <TxDetail tx={txDetail} price={info?.zecPrice} closeModal={() => setTxDetailModalShowing(false)} />
      </Modal>

      <View
        style={{display: 'flex', alignItems: 'center', paddingBottom: 25, backgroundColor: colors.card, zIndex: -1}}>
        <RegText style={{marginTop: 5, padding: 5}}>{syncStatusDisplay}</RegText>
        <ZecAmount color={balanceColor} size={36} amtZec={totalBalance.total} />
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
        refreshControl={
          <RefreshControl refreshing={false} onRefresh={doRefresh} tintColor={colors.text} title="Refreshing" />
        }
        style={{flexGrow: 1, marginTop: 10, width: '100%', height: '100%'}}>
        {transactions?.flatMap((t) => {
          return (
            <TxSummaryLine
              key={`${t.txid}-${t.type}`}
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
