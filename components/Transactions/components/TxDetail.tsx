/* eslint-disable react-native/no-inline-styles */
import React, { useContext, useState } from 'react';
import { View, ScrollView, TouchableOpacity, SafeAreaView, Linking, Text } from 'react-native';
import Clipboard from '@react-native-community/clipboard';
import Toast from 'react-native-simple-toast';
import Moment from 'react-moment';
import { useTheme } from '@react-navigation/native';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { faChevronLeft } from '@fortawesome/free-solid-svg-icons';

import { Transaction, TxDetailType } from '../../../app/AppState';
import Utils from '../../../app/utils';
import RegText from '../../Components/RegText';
import ZecAmount from '../../Components/ZecAmount';
import UsdAmount from '../../Components/UsdAmount';
import FadeText from '../../Components/FadeText';
import ZecPrice from '../../Components/ZecPrice';
import Button from '../../Button';
import { ThemeType } from '../../../app/types';
import { ContextLoaded } from '../../../app/context';

type TxDetailProps = {
  tx: Transaction | null;
  closeModal: () => void;
};

const TxDetail: React.FunctionComponent<TxDetailProps> = ({ tx, closeModal }) => {
  const context = useContext(ContextLoaded);
  const { info, translate } = context;
  const { colors } = useTheme() as unknown as ThemeType;
  const spendColor =
    tx?.confirmations === 0 ? colors.primaryDisabled : (tx?.amount || 0) > 0 ? colors.primary : colors.text;

  const [expandAddress, setExpandAddress] = useState(false);
  const [expandTxid, setExpandTxid] = useState(false);

  const fee =
    tx?.type === 'sent' &&
    tx?.amount &&
    Math.abs(tx?.amount) - Math.abs(tx?.detailedTxns?.reduce((s: number, d: TxDetailType) => s + d.amount, 0));

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
          <View style={{ display: 'flex', flexDirection: 'row', backgroundColor: colors.card }}>
            <FontAwesomeIcon style={{ marginTop: 3 }} icon={faChevronLeft} color={colors.text} size={20} />
            <RegText>{translate('transactions.back')}</RegText>
          </View>
        </TouchableOpacity>
        <View style={{ display: 'flex', alignItems: 'center', padding: 10, backgroundColor: colors.card }}>
          <RegText style={{ textTransform: 'capitalize' }} color={spendColor}>
            {!!tx?.type && (tx.type === 'sent' ? translate('transactions.sent') : translate('transactions.receive'))}
          </RegText>
          <ZecAmount currencyName={info?.currencyName ? info.currencyName : ''} size={36} amtZec={tx?.amount} />
          <UsdAmount amtZec={tx?.amount} price={tx?.zec_price} />
        </View>

        <View style={{ margin: 10 }}>
          <View style={{ display: 'flex', flexDirection: 'row', justifyContent: 'space-between', marginTop: 10 }}>
            <View style={{ display: 'flex' }}>
              <FadeText>{translate('transactions.time')}</FadeText>
              <Moment interval={0} format="YYYY MMM D h:mm a" element={RegText}>
                {(tx?.time || 0) * 1000}
              </Moment>
            </View>
            <View style={{ display: 'flex', alignItems: 'flex-end' }}>
              <FadeText>{translate('transactions.confirmations')}</FadeText>
              <RegText>{tx?.confirmations}</RegText>
            </View>
          </View>

          <View style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', marginTop: 10 }}>
            <FadeText>{translate('transactions.txid')}</FadeText>
            <TouchableOpacity
              onPress={() => {
                if (tx?.txid) {
                  Clipboard.setString(tx?.txid);
                  Toast.show(translate('transactions.txcopied'), Toast.LONG);
                  setExpandTxid(true);
                }
              }}>
              {!expandTxid && <RegText>{Utils.trimToSmall(tx?.txid, 10)}</RegText>}
              {expandTxid && (
                <>
                  <RegText>{tx?.txid}</RegText>
                  <TouchableOpacity onPress={() => handleTxIDClick(tx?.txid)}>
                    <Text style={{ color: colors.text, textDecorationLine: 'underline', margin: 15 }}>
                      {translate('transactions.viewexplorer')}
                    </Text>
                  </TouchableOpacity>
                </>
              )}
            </TouchableOpacity>
          </View>

          {tx?.detailedTxns.map((txd: TxDetailType) => {
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
                <View style={{ marginTop: 10 }}>
                  <FadeText>{translate('transactions.address')}</FadeText>

                  <TouchableOpacity
                    onPress={() => {
                      if (txd.address) {
                        Clipboard.setString(txd.address);
                        Toast.show(translate('transactions.addresscopied'), Toast.LONG);
                        setExpandAddress(true);
                      }
                    }}>
                    <View style={{ display: 'flex', flexDirection: 'row', flexWrap: 'wrap' }}>
                      {expandAddress &&
                        Utils.splitStringIntoChunks(txd.address, 9).map((c: string, idx: number) => {
                          return <RegText key={idx}>{c} </RegText>;
                        })}
                      {!expandAddress && <RegText>{Utils.trimToSmall(txd.address, 10)}</RegText>}
                    </View>
                  </TouchableOpacity>
                </View>

                <View style={{ marginTop: 10 }}>
                  <FadeText>{translate('transactions.amount')}</FadeText>
                  <View style={{ display: 'flex', flexDirection: 'row', justifyContent: 'space-between' }}>
                    <ZecAmount amtZec={txd?.amount} size={18} currencyName={'ᙇ'} />
                    <UsdAmount style={{ fontSize: 18 }} amtZec={txd?.amount} price={tx?.zec_price} />
                  </View>
                  <View style={{ display: 'flex', flexDirection: 'row', justifyContent: 'flex-end' }}>
                    <ZecPrice
                      price={tx?.zec_price ? tx.zec_price : 0}
                      currencyName={info?.currencyName ? info.currencyName : ''}
                    />
                  </View>
                </View>

                {txd?.memo && (
                  <View style={{ marginTop: 10 }}>
                    <FadeText>{translate('transactions.memo')}</FadeText>
                    <TouchableOpacity
                      onPress={() => {
                        if (txd?.memo) {
                          Clipboard.setString(txd?.memo);
                          Toast.show(translate('transactions.memocopied'), Toast.LONG);
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
            <View style={{ display: 'flex', marginTop: 10 }}>
              <FadeText>{translate('transactions.txfee')}</FadeText>
              <View style={{ display: 'flex', flexDirection: 'row', justifyContent: 'space-between' }}>
                <ZecAmount amtZec={fee} size={18} currencyName={'ᙇ'} />
                <UsdAmount style={{ fontSize: 18 }} amtZec={fee} price={tx?.zec_price} />
              </View>
            </View>
          )}

          <View style={{ padding: 25 }} />
        </View>
      </ScrollView>
      <View style={{ flexGrow: 1, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', margin: 10 }}>
        <Button type="Secondary" title={translate('close')} onPress={closeModal} />
      </View>
    </SafeAreaView>
  );
};

export default TxDetail;
