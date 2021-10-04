/* eslint-disable react-native/no-inline-styles */
import React, {useState} from 'react';
import {createStackNavigator} from '@react-navigation/stack';
import {
  RegText,
  ZecAmount,
  UsdAmount,
  SecondaryButton,
  FadeText,
  ZecPrice,
  ClickableText,
} from '../components/Components';
import {
  View,
  ScrollView,
  Image,
  Modal,
  TouchableOpacity,
  SafeAreaView,
  RefreshControl,
  Clipboard,
  Linking,
} from 'react-native';
import Toast from 'react-native-simple-toast';
import {TotalBalance, Transaction, Info, SyncStatus} from '../app/AppState';
import Utils from '../app/utils';
import Moment from 'react-moment';
import moment from 'moment';
import {useTheme} from '@react-navigation/native';
import {FontAwesomeIcon} from '@fortawesome/react-native-fontawesome';
import {faArrowDown, faArrowUp, faBars, faChevronLeft} from '@fortawesome/free-solid-svg-icons';

type TxDetailProps = {
  tx: Transaction | null;
  closeModal: () => void;
};
const TxDetail: React.FunctionComponent<TxDetailProps> = ({tx, closeModal}) => {
  const {colors} = useTheme();
  const spendColor = tx?.confirmations === 0 ? colors.primary : (tx?.amount || 0) > 0 ? '#88ee88' : '#ff6666';

  const [expandAddress, setExpandAddress] = useState(false);
  const [expandTxid, setExpandTxid] = useState(false);

  const fee =
    tx?.type === 'sent' &&
    tx?.amount &&
    Math.abs(tx?.amount) - Math.abs(tx?.detailedTxns?.reduce((s, d) => s + d.amount, 0));

  const handleTxIDClick = (txid?: string) => {
    if (!txid) {
      return;
    }

    const url = Utils.getBlockExplorerTxIDURL(txid);
    Linking.canOpenURL(url).then(supported => {
      if (supported) {
        Linking.openURL(url);
      } else {
        //console.log("Don't know how to open URI: " + url);
      }
    });
  };

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
        <TouchableOpacity onPress={closeModal}>
          <View style={{display: 'flex', flexDirection: 'row', backgroundColor: colors.card}}>
            <FontAwesomeIcon style={{marginTop: 3}} icon={faChevronLeft} color={colors.text} size={20} />
            <RegText> Back</RegText>
          </View>
        </TouchableOpacity>
        <View style={{display: 'flex', alignItems: 'center', padding: 10, backgroundColor: colors.card}}>
          <RegText style={{textTransform: 'capitalize'}} color={spendColor}>
            {tx?.type}
          </RegText>
          <ZecAmount size={36} amtZec={tx?.amount} />
          <UsdAmount amtZec={tx?.amount} price={tx?.zec_price} />
        </View>

        <View style={{margin: 10}}>
          <View style={{display: 'flex', flexDirection: 'row', justifyContent: 'space-between', marginTop: 10}}>
            <View style={{display: 'flex'}}>
              <FadeText>Time</FadeText>
              <Moment interval={0} format="YYYY MMM D h:mm a" element={RegText}>
                {(tx?.time || 0) * 1000}
              </Moment>
            </View>
            <View style={{display: 'flex', alignItems: 'flex-end'}}>
              <FadeText>Confirmations</FadeText>
              <RegText>{tx?.confirmations}</RegText>
            </View>
          </View>

          <View style={{display: 'flex', flexDirection: 'column', alignItems: 'flex-start', marginTop: 10}}>
            <FadeText>TxID</FadeText>
            <TouchableOpacity
              onPress={() => {
                if (tx?.txid) {
                  Clipboard.setString(tx?.txid);
                  Toast.show('Copied TxID to Clipboard', Toast.LONG);
                  setExpandTxid(true);
                }
              }}>
              {!expandTxid && <RegText>{Utils.trimToSmall(tx?.txid, 10)}</RegText>}
              {expandTxid && (
                <>
                  <RegText>{tx?.txid}</RegText>
                  <ClickableText onPress={() => handleTxIDClick(tx?.txid)}>View on block explorer</ClickableText>
                </>
              )}
            </TouchableOpacity>
          </View>

          {tx?.detailedTxns.map(txd => {
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
                        Utils.splitStringIntoChunks(txd.address, 9).map((c, idx) => {
                          return <RegText key={idx}>{c} </RegText>;
                        })}
                      {!expandAddress && <RegText>{Utils.trimToSmall(txd.address, 10)}</RegText>}
                    </View>
                  </TouchableOpacity>
                </View>

                <View style={{marginTop: 10}}>
                  <FadeText>Amount</FadeText>
                  <View style={{display: 'flex', flexDirection: 'row', justifyContent: 'space-between'}}>
                    <ZecAmount amtZec={txd?.amount} size={18} zecSymbol={'ᙇ'} />
                    <UsdAmount style={{fontSize: 18}} amtZec={txd?.amount} price={tx?.zec_price} />
                  </View>
                  <View style={{display: 'flex', flexDirection: 'row', justifyContent: 'flex-end'}}>
                    <ZecPrice price={tx?.zec_price} />
                  </View>
                </View>

                {txd?.memo && (
                  <View style={{marginTop: 10}}>
                    <FadeText>Memo</FadeText>
                    <TouchableOpacity
                      onPress={() => {
                        if (txd?.memo) {
                          Clipboard.setString(txd?.memo);
                          Toast.show('Copied Memo to Clipboard', Toast.LONG);
                        }
                      }}>
                      <RegText>{txd?.memo}</RegText>
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            );
          })}

          {fee && (
            <View style={{display: 'flex', marginTop: 10}}>
              <FadeText>Tx Fee</FadeText>
              <View style={{display: 'flex', flexDirection: 'row', justifyContent: 'space-between'}}>
                <ZecAmount amtZec={fee} size={18} zecSymbol={'ᙇ'} />
                <UsdAmount style={{fontSize: 18}} amtZec={fee} price={tx?.zec_price} />
              </View>
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
  month: string;
  tx: Transaction;
  setTxDetail: React.Dispatch<React.SetStateAction<Transaction | null>>;
  setTxDetailModalShowing: React.Dispatch<React.SetStateAction<boolean>>;
};
const TxSummaryLine: React.FunctionComponent<TxSummaryLineProps> = ({
  tx,
  month,
  setTxDetail,
  setTxDetailModalShowing,
}) => {
  const {colors} = useTheme();

  const amountColor = tx.confirmations === 0 ? colors.primary : tx.amount > 0 ? '#88ee88' : colors.text;
  const txIcon = tx.amount > 0 ? faArrowDown : faArrowUp;

  const displayAddress =
    tx.detailedTxns && tx.detailedTxns.length > 0 ? Utils.trimToSmall(tx.detailedTxns[0].address, 7) : 'Unknown';

  return (
    <View style={{display: 'flex', flexDirection: 'column'}}>
      {month !== '' && (
        <View
          style={{
            paddingLeft: 15,
            paddingTop: 5,
            paddingBottom: 5,
            borderTopWidth: 1,
            borderBottomWidth: 1,
            borderColor: colors.card,
            backgroundColor: '#272727',
          }}>
          <FadeText>{month}</FadeText>
        </View>
      )}
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
          <FontAwesomeIcon
            style={{marginLeft: 15, marginRight: 15, marginTop: 5}}
            size={24}
            icon={txIcon}
            color={amountColor}
          />
          <View style={{display: 'flex'}}>
            <FadeText style={{fontSize: 18}}>{displayAddress}</FadeText>
            <View style={{display: 'flex', flexDirection: 'row'}}>
              <FadeText>{tx.type === 'sent' ? 'Sent ' : 'Received '}</FadeText>
              <Moment interval={0} format="MMM D, h:mm a" element={FadeText}>
                {(tx?.time || 0) * 1000}
              </Moment>
            </View>
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
    </View>
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

  const [numTx, setNumTx] = React.useState<number>(100);
  const loadMoreButton = numTx < (transactions?.length || 0);

  const loadMoreClicked = () => {
    setNumTx(numTx + 100);
  };

  const {colors} = useTheme();
  const zecPrice = info ? info.zecPrice : null;

  const syncStatusDisplay = syncingStatus?.inProgress ? `Syncing ${syncingStatus?.progress.toFixed(2)}%` : 'Balance';

  const balanceColor = transactions?.find(t => t.confirmations === 0) ? colors.primary : colors.text;
  var lastMonth = '';

  return (
    <View style={{display: 'flex', flexDirection: 'column', justifyContent: 'flex-start', marginBottom: 170}}>
      <Modal
        animationType="slide"
        transparent={false}
        visible={isTxDetailModalShowing}
        onRequestClose={() => setTxDetailModalShowing(false)}>
        <TxDetail tx={txDetail} closeModal={() => setTxDetailModalShowing(false)} />
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
        {transactions?.slice(0, numTx).flatMap(t => {
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
              setTxDetail={setTxDetail}
              setTxDetailModalShowing={setTxDetailModalShowing}
            />
          );
        })}

        {loadMoreButton && (
          <View style={{flexDirection: 'row', justifyContent: 'center', margin: 30}}>
            <SecondaryButton title="Load More" onPress={loadMoreClicked} />
          </View>
        )}
      </ScrollView>
    </View>
  );
};

const Stack = createStackNavigator();

const TransactionsScreen: React.FunctionComponent<TransactionsScreenViewProps> = iprops => {
  return (
    <Stack.Navigator headerMode="none">
      <Stack.Screen name="TransactionsView">{props => <TransactionsScreenView {...props} {...iprops} />}</Stack.Screen>
    </Stack.Navigator>
  );
};

export default TransactionsScreen;
