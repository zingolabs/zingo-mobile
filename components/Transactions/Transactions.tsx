/* eslint-disable react-native/no-inline-styles */
import React, { useContext, useState } from 'react';
import { View, ScrollView, Image, Modal, RefreshControl, Text } from 'react-native';
import Toast from 'react-native-simple-toast';
import moment from 'moment';
import 'moment/locale/es';
import { useTheme } from '@react-navigation/native';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { faBars, faInfo, faCheck, faPlay, faStop } from '@fortawesome/free-solid-svg-icons';
import { TouchableOpacity } from 'react-native-gesture-handler';

import RPC from '../../app/rpc';
import { TransactionType } from '../../app/AppState';
import { ThemeType } from '../../app/types';
import RegText from '../Components/RegText';
import ZecAmount from '../Components/ZecAmount';
import CurrencyAmount from '../Components/CurrencyAmount';
import FadeText from '../Components/FadeText';
import Button from '../Button';
import TxDetail from './components/TxDetail';
import TxSummaryLine from './components/TxSummaryLine';
import { ContextAppLoaded } from '../../app/context';
import PriceFetcher from '../Components/PriceFetcher';
import ZingoLogoImage from '../ZingoLogoImage';

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
  const { translate, dimensions, transactions, totalBalance, info, syncingStatus, language, currency, zecPrice } =
    context;
  const { colors } = useTheme() as unknown as ThemeType;
  const [isTxDetailModalShowing, setTxDetailModalShowing] = useState(false);
  const [txDetail, setTxDetail] = useState<TransactionType>({} as TransactionType);

  const [numTx, setNumTx] = useState<number>(100);
  const loadMoreButton = numTx < (transactions.length || 0);
  moment.locale(language);

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

  const syncStatusDisplayLine = syncingStatus.inProgress ? `(${syncingStatus.blocks})` : '';

  //const balanceColor = transactions.find(t => t.confirmations === 0) ? colors.primary : colors.text;
  const balanceColor = colors.text;
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

      <View
        style={{
          display: 'flex',
          alignItems: 'center',
          paddingBottom: 0,
          backgroundColor: colors.card,
          zIndex: -1,
          paddingTop: 10,
        }}>
        <ZingoLogoImage />
        <View style={{ flexDirection: 'row' }}>
          <ZecAmount
            currencyName={info.currencyName ? info.currencyName : ''}
            color={balanceColor}
            size={36}
            amtZec={totalBalance.total}
          />
          {totalBalance.total > 0 && (totalBalance.privateBal > 0 || totalBalance.transparentBal > 0) && (
            <TouchableOpacity onPress={() => poolsMoreInfoOnClick()}>
              <View
                style={{
                  display: 'flex',
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: colors.card,
                  borderRadius: 10,
                  margin: 0,
                  padding: 0,
                  marginLeft: 5,
                  minWidth: 48,
                  minHeight: 48,
                }}>
                <RegText color={colors.primary}>{translate('transactions.pools')}</RegText>
                <FontAwesomeIcon icon={faInfo} size={14} color={colors.primary} />
              </View>
            </TouchableOpacity>
          )}
        </View>

        {currency === 'USD' && (
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <CurrencyAmount
              style={{ marginTop: 0, marginBottom: 5 }}
              price={zecPrice.zecPrice}
              amtZec={totalBalance.total}
              currency={currency}
            />
            <View style={{ marginLeft: 5 }}>
              <PriceFetcher setZecPrice={setZecPrice} />
            </View>
          </View>
        )}

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
            justifyContent: 'center',
            flexWrap: 'wrap',
            marginVertical: 5,
          }}>
          <View
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              flexWrap: 'wrap',
            }}>
            <RegText color={colors.money} style={{ paddingHorizontal: 5 }}>
              {translate('transactions.title')}
            </RegText>
            {/*<RegText color={colors.money} style={{ paddingHorizontal: 5 }}>
              {syncStatusDisplayLine ? translate('transactions.title-syncing') : translate('transactions.title')}
            </RegText>
          {!!syncStatusDisplayLine && <FadeText style={{ margin: 0, padding: 0 }}>{syncStatusDisplayLine}</FadeText>}*/}
          </View>
          <View
            style={{
              alignItems: 'center',
              justifyContent: 'center',
              margin: 0,
              padding: 1,
              borderColor: colors.primary,
              borderWidth: 1,
              borderRadius: 10,
              minWidth: 20,
              minHeight: 20,
            }}>
            {!syncStatusDisplayLine && syncingStatus.synced && (
              <View style={{ margin: 0, padding: 0 }}>
                <FontAwesomeIcon icon={faCheck} color={colors.primary} />
              </View>
            )}
            {!syncStatusDisplayLine && !syncingStatus.synced && (
              <TouchableOpacity onPress={() => syncingStatusMoreInfoOnClick()}>
                <FontAwesomeIcon icon={faStop} color={colors.zingo} size={12} />
              </TouchableOpacity>
            )}
            {syncStatusDisplayLine && (
              <TouchableOpacity onPress={() => syncingStatusMoreInfoOnClick()}>
                <FontAwesomeIcon icon={faPlay} color={colors.primary} size={10} />
              </TouchableOpacity>
            )}
          </View>
          {/*!!syncStatusDisplayLine && (
            <TouchableOpacity onPress={() => syncingStatusMoreInfoOnClick()}>
              <View
                style={{
                  display: 'flex',
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: colors.card,
                  borderRadius: 10,
                  margin: 0,
                  padding: 0,
                  marginLeft: 5,
                  minWidth: 48,
                  minHeight: 48,
                }}>
                <RegText color={colors.primary}>{translate('transactions.more')}</RegText>
                <FontAwesomeIcon icon={faInfo} size={14} color={colors.primary} />
              </View>
            </TouchableOpacity>
            )*/}
        </View>
      </View>

      <View style={{ backgroundColor: colors.card, padding: 10, position: 'absolute' }}>
        <TouchableOpacity accessible={true} accessibilityLabel={translate('menudrawer-acc')} onPress={toggleMenuDrawer}>
          <FontAwesomeIcon icon={faBars} size={48} color={colors.border} />
        </TouchableOpacity>
      </View>

      <View style={{ padding: 10, position: 'absolute', right: 0, alignItems: 'flex-end' }}>
        <Text style={{ fontSize: 8, color: colors.border }}>
          {'(' + dimensions.width + 'x' + dimensions.height + ')-' + dimensions.scale}
        </Text>
        <Text style={{ fontSize: 7, color: colors.border }}>
          {dimensions.orientation === 'landscape' ? translate('info.landscape') : translate('info.portrait')}
        </Text>
      </View>

      <View style={{ width: '100%', height: 1, backgroundColor: colors.primary }} />

      <View style={{
        padding: 10,
        position: 'absolute',
        right: 0,
        alignItems: 'flex-end',
      }}>
        <Text>{transactions.length}</Text>
      </View>

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

        <View
          style={{
            display: 'flex',
            alignItems: 'center',
            backgroundColor: colors.card,
            zIndex: -1,
            padding: 10,
          }}>
          <Image
            source={require('../../assets/img/logobig-zingo.png')}
            style={{ width: 80, height: 80, resizeMode: 'contain' }}
          />
          <View style={{ flexDirection: 'column', alignItems: 'center' }}>
            {totalBalance.total > 0 && (totalBalance.privateBal > 0 || totalBalance.transparentBal > 0) && (
              <TouchableOpacity onPress={() => poolsMoreInfoOnClick()}>
                <View
                  style={{
                    display: 'flex',
                    flexDirection: 'row',
                    alignItems: 'flex-end',
                    justifyContent: 'center',
                    backgroundColor: colors.card,
                    borderRadius: 10,
                    margin: 0,
                    padding: 0,
                    minWidth: 48,
                    minHeight: 48,
                  }}>
                  <RegText color={colors.primary}>{translate('transactions.pools')}</RegText>
                  <FontAwesomeIcon icon={faInfo} size={14} color={colors.primary} style={{ marginBottom: 5 }} />
                </View>
              </TouchableOpacity>
            )}
            <ZecAmount
              currencyName={info.currencyName ? info.currencyName : ''}
              color={balanceColor}
              size={36}
              amtZec={totalBalance.total}
            />
            {currency === 'USD' && (
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <CurrencyAmount
                  style={{ marginTop: 0, marginBottom: 5 }}
                  price={zecPrice.zecPrice}
                  amtZec={totalBalance.total}
                  currency={currency}
                />
                <View style={{ marginLeft: 5 }}>
                  <PriceFetcher setZecPrice={setZecPrice} />
                </View>
              </View>
            )}
          </View>

          {showShieldButton && (
            <View style={{ margin: 5 }}>
              <Button type="Primary" title={translate('transactions.shieldfunds')} onPress={shieldFunds} />
            </View>
          )}

          <View style={{ width: '100%', height: 1, backgroundColor: colors.primary, marginTop: 5 }} />

          <View
            style={{
              display: 'flex',
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              flexWrap: 'wrap',
              marginVertical: 5,
            }}>
            <View
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                flexWrap: 'wrap',
              }}>
              <RegText color={colors.money} style={{ paddingHorizontal: 5 }}>
                {translate('transactions.title')}
              </RegText>
              {/*<RegText color={colors.money} style={{ paddingHorizontal: 5 }}>
                {syncStatusDisplayLine ? translate('transactions.title-syncing') : translate('transactions.title')}
              </RegText>
              {!!syncStatusDisplayLine && (
                <FadeText style={{ margin: 0, padding: 0 }}>{syncStatusDisplayLine}</FadeText>
              )}*/}
            </View>
            <View
              style={{
                alignItems: 'center',
                justifyContent: 'center',
                margin: 0,
                padding: 1,
                borderColor: colors.primary,
                borderWidth: 1,
                borderRadius: 10,
                minWidth: 20,
                minHeight: 20,
              }}>
              {!syncStatusDisplayLine && syncingStatus.synced && (
                <View style={{ margin: 0, padding: 0 }}>
                  <FontAwesomeIcon icon={faCheck} color={colors.primary} />
                </View>
              )}
              {!syncStatusDisplayLine && !syncingStatus.synced && (
                <TouchableOpacity onPress={() => syncingStatusMoreInfoOnClick()}>
                  <FontAwesomeIcon icon={faStop} color={colors.zingo} size={12} />
                </TouchableOpacity>
              )}
              {syncStatusDisplayLine && (
                <TouchableOpacity onPress={() => syncingStatusMoreInfoOnClick()}>
                  <FontAwesomeIcon icon={faPlay} color={colors.primary} size={10} />
                </TouchableOpacity>
              )}
            </View>
            {/*!!syncStatusDisplayLine && (
              <TouchableOpacity onPress={() => syncingStatusMoreInfoOnClick()}>
                <View
                  style={{
                    display: 'flex',
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: colors.card,
                    borderRadius: 10,
                    margin: 0,
                    padding: 0,
                    marginLeft: 5,
                    minWidth: 48,
                    minHeight: 48,
                  }}>
                  <RegText color={colors.primary}>{translate('transactions.more')}</RegText>
                  <FontAwesomeIcon icon={faInfo} size={14} color={colors.primary} />
                </View>
              </TouchableOpacity>
              )*/}
          </View>

          <View style={{ width: '100%', height: 1, backgroundColor: colors.primary }} />
        </View>

        <View style={{ backgroundColor: colors.card, padding: 10, position: 'absolute' }}>
          <TouchableOpacity
            accessible={true}
            accessibilityLabel={translate('menudrawer-acc')}
            onPress={toggleMenuDrawer}>
            <FontAwesomeIcon icon={faBars} size={48} color={colors.border} />
          </TouchableOpacity>
        </View>

        <View style={{ padding: 10, position: 'absolute', right: 0, alignItems: 'flex-end' }}>
          <Text style={{ fontSize: 8, color: colors.border }}>
            {'(' + dimensions.width + 'x' + dimensions.height + ')-' + dimensions.scale}
          </Text>
          <Text style={{ fontSize: 7, color: colors.border }}>
            {dimensions.orientation === 'landscape' ? translate('info.landscape') : translate('info.portrait')}
          </Text>
        </View>
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
