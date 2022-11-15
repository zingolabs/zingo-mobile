/* eslint-disable react-native/no-inline-styles */
import React from 'react';
import { View, ScrollView, Image, Modal, TouchableOpacity, RefreshControl } from 'react-native';
import Toast from 'react-native-simple-toast';
import moment from 'moment';
import { useTheme } from '@react-navigation/native';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { faBars, faInfo } from '@fortawesome/free-solid-svg-icons';
import { TranslateOptions } from 'i18n-js';

import RPC from '../../../app/rpc';
import { TotalBalance, Transaction, InfoType, SyncStatus } from '../../../app/AppState';
import { ThemeType } from '../../../app/types';
import RegText from '../../Components/RegText';
import ZecAmount from '../../Components/ZecAmount';
import UsdAmount from '../../Components/UsdAmount';
import FadeText from '../../Components/FadeText';
import Button from '../../Button';
import TxDetail from './TxDetail';
import TxSummaryLine from './TxSummaryLine';

type TransactionsViewProps = {
  info: InfoType | null;
  totalBalance: TotalBalance;
  syncingStatus: SyncStatus | null;
  transactions: Transaction[] | null;
  toggleMenuDrawer: () => void;
  doRefresh: () => void;
  setComputingModalVisible: (visible: boolean) => void;
  syncingStatusMoreInfoOnClick: () => void;
  translate: (key: string, config?: TranslateOptions) => any;
};

const TransactionsView: React.FunctionComponent<TransactionsViewProps> = ({
  info,
  totalBalance,
  transactions,
  toggleMenuDrawer,
  syncingStatus,
  doRefresh,
  setComputingModalVisible,
  syncingStatusMoreInfoOnClick,
  translate,
}) => {
  const { colors } = useTheme() as unknown as ThemeType;
  const [isTxDetailModalShowing, setTxDetailModalShowing] = React.useState(false);
  const [txDetail, setTxDetail] = React.useState<Transaction | null>(null);

  const [numTx, setNumTx] = React.useState<number>(100);
  const loadMoreButton = numTx < (transactions?.length || 0);

  const loadMoreClicked = () => {
    setNumTx(numTx + 100);
  };

  const showShieldButton = totalBalance && totalBalance.transparentBal > 0;
  const shieldFunds = async () => {
    setComputingModalVisible(true);

    const shieldStr = await RPC.rpc_shieldTransparent();

    setComputingModalVisible(false);
    if (shieldStr) {
      setTimeout(() => {
        const shieldJSON = JSON.parse(shieldStr);

        if (shieldJSON.error) {
          Toast.show(`${translate('transactions.shield-error')} ${shieldJSON.error}`, Toast.LONG);
        } else {
          Toast.show(`${translate('transactions.shield-message')} ${shieldJSON.txid}`);
        }
      }, 1000);
    }
  };

  const zecPrice = info ? info.zecPrice : null;
  const currencyName = info ? info.currencyName : undefined;

  const syncStatusDisplayLine = syncingStatus?.inProgress ? `(${syncingStatus?.blocks})` : '';

  const balanceColor = transactions?.find(t => t.confirmations === 0) ? colors.primary : colors.text;
  var lastMonth = '';

  console.log('render transaction view');

  return (
    <View
      style={{
        display: 'flex',
        justifyContent: 'flex-start',
        marginBottom: 170,
        width: '100%',
      }}>
      <Modal
        animationType="slide"
        transparent={false}
        visible={isTxDetailModalShowing}
        onRequestClose={() => setTxDetailModalShowing(false)}>
        <TxDetail
          currencyName={currencyName}
          tx={txDetail}
          closeModal={() => setTxDetailModalShowing(false)}
          translate={translate}
        />
      </Modal>

      <View
        style={{
          display: 'flex',
          alignItems: 'center',
          paddingBottom: 0,
          backgroundColor: colors.card,
          zIndex: -1,
          paddingTop: 10,
        }}>
        <Image
          source={require('../../../assets/img/logobig-zingo.png')}
          style={{ width: 80, height: 80, resizeMode: 'contain' }}
        />
        <ZecAmount currencyName={currencyName} color={balanceColor} size={36} amtZec={totalBalance.total} />
        <UsdAmount style={{ marginTop: 0, marginBottom: 5 }} price={zecPrice} amtZec={totalBalance.total} />

        {showShieldButton && (
          <View style={{ margin: 5 }}>
            <Button type="Primary" title={translate('transactions.shieldfunds')} onPress={shieldFunds} />
          </View>
        )}

        <View
          style={{
            display: 'flex',
            flexDirection: 'row',
            alignItems: 'center',
          }}>
          <RegText color={colors.money} style={{ marginTop: 5, padding: 5 }}>
            {syncStatusDisplayLine ? translate('transactions.title-syncing') : translate('transactions.title')}
          </RegText>
          <FadeText style={{ marginTop: 5, padding: 0 }}>{syncStatusDisplayLine ? syncStatusDisplayLine : ''}</FadeText>
          {!!syncStatusDisplayLine && (
            <TouchableOpacity onPress={() => syncingStatusMoreInfoOnClick()}>
              <View
                style={{
                  display: 'flex',
                  flexDirection: 'row',
                  alignItems: 'center',
                  marginTop: 5,
                  backgroundColor: colors.card,
                  padding: 5,
                  borderRadius: 10,
                }}>
                <FadeText style={{ color: colors.primary }}>{translate('transactions.more')}</FadeText>
                <FontAwesomeIcon icon={faInfo} size={14} color={colors.primary} />
              </View>
            </TouchableOpacity>
          )}
        </View>
      </View>

      <View style={{ backgroundColor: colors.card, padding: 10, position: 'absolute' }}>
        <TouchableOpacity onPress={toggleMenuDrawer}>
          <FontAwesomeIcon icon={faBars} size={20} color={colors.border} />
        </TouchableOpacity>
      </View>

      <View style={{ width: '100%', height: 1, backgroundColor: colors.primary }} />

      <ScrollView
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
          ?.slice(0, numTx)
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
                setTxDetail={setTxDetail}
                setTxDetailModalShowing={setTxDetailModalShowing}
              />
            );
          })}
        {!!transactions && !!transactions.length && (
          <View style={{ height: 100, display: 'flex', alignItems: 'center', justifyContent: 'flex-start' }}>
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
};

export default TransactionsView;
