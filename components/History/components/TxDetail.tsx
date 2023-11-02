/* eslint-disable react-native/no-inline-styles */
import React, { useContext, useState } from 'react';
import { View, ScrollView, TouchableOpacity, SafeAreaView, Linking, Text } from 'react-native';
import Clipboard from '@react-native-community/clipboard';
import moment from 'moment';
import 'moment/locale/es';
import { useTheme } from '@react-navigation/native';

import { TransactionType, TxDetailType } from '../../../app/AppState';
import Utils from '../../../app/utils';
import RegText from '../../Components/RegText';
import ZecAmount from '../../Components/ZecAmount';
import FadeText from '../../Components/FadeText';
import Button from '../../Components/Button';
import { ThemeType } from '../../../app/types';
import { ContextAppLoaded } from '../../../app/context';
import Header from '../../Header';
import BoldText from '../../Components/BoldText';
import CurrencyAmount from '../../Components/CurrencyAmount';

type TxDetailProps = {
  tx: TransactionType;
  closeModal: () => void;
  set_privacy_option: (name: 'privacy', value: boolean) => Promise<void>;
};

const TxDetail: React.FunctionComponent<TxDetailProps> = ({ tx, closeModal, set_privacy_option }) => {
  const context = useContext(ContextAppLoaded);
  const { info, translate, language, privacy, addLastSnackbar, server, currency } = context;
  const { colors } = useTheme() as unknown as ThemeType;
  const spendColor =
    tx.confirmations === 0 ? colors.primaryDisabled : tx.type === 'Received' ? colors.primary : colors.text;
  const [expandAddress, setExpandAddress] = useState(false);
  const [expandTxid, setExpandTxid] = useState(false);
  moment.locale(language);

  const handleTxIDClick = (txid?: string) => {
    if (!txid) {
      return;
    }

    const url = Utils.getBlockExplorerTxIDURL(txid, server.chain_name);
    Linking.canOpenURL(url).then(supported => {
      if (supported) {
        Linking.openURL(url);
      } else {
        console.log("Don't know how to open URI: " + url);
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
      <Header
        title={translate('history.details') as string}
        noBalance={true}
        noSyncingStatus={true}
        noDrawMenu={true}
        set_privacy_option={set_privacy_option}
        addLastSnackbar={addLastSnackbar}
      />
      <ScrollView
        showsVerticalScrollIndicator={true}
        persistentScrollbar={true}
        indicatorStyle={'white'}
        contentContainerStyle={{
          flexDirection: 'column',
          alignItems: 'stretch',
          justifyContent: 'flex-start',
        }}>
        <View
          style={{
            display: 'flex',
            alignItems: 'center',
            margin: 25,
            padding: 10,
            borderWidth: 1,
            borderRadius: 10,
            borderColor: colors.border,
          }}>
          <BoldText style={{ textAlign: 'center', textTransform: 'capitalize', color: spendColor }}>
            {tx.type === 'Sent'
              ? (translate('history.sent') as string)
              : tx.type === 'Received'
              ? (translate('history.receive') as string)
              : (translate('history.sendtoself') as string)}
          </BoldText>
          <ZecAmount
            currencyName={info.currencyName ? info.currencyName : ''}
            size={36}
            amtZec={tx.txDetails.reduce((s, d) => s + d.amount, 0)}
            privacy={privacy}
            smallPrefix={true}
          />
          {!!tx.zec_price && (
            <CurrencyAmount
              price={tx.zec_price}
              amtZec={tx.txDetails.reduce((s, d) => s + d.amount, 0)}
              currency={currency}
              privacy={privacy}
            />
          )}
        </View>

        <View style={{ margin: 10 }}>
          <View style={{ display: 'flex', flexDirection: 'row', justifyContent: 'space-between', marginTop: 10 }}>
            <View style={{ display: 'flex' }}>
              <FadeText>{translate('history.time') as string}</FadeText>
              <RegText>{tx.time ? moment((tx.time || 0) * 1000).format('YYYY MMM D h:mm a') : '--'}</RegText>
            </View>
            <View style={{ display: 'flex', alignItems: 'flex-end' }}>
              <FadeText>{translate('history.confirmations') as string}</FadeText>
              <RegText>{tx.confirmations.toString()}</RegText>
            </View>
          </View>

          <View style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', marginTop: 10 }}>
            <FadeText>{translate('history.txid') as string}</FadeText>
            <TouchableOpacity
              onPress={() => {
                if (tx.txid) {
                  Clipboard.setString(tx.txid);
                  addLastSnackbar({
                    message: translate('history.txcopied') as string,
                    type: 'Primary',
                    duration: 'short',
                  });
                  setExpandTxid(true);
                }
              }}>
              {!tx.txid && <RegText>{'Unknown'}</RegText>}
              {!expandTxid && !!tx.txid && <RegText>{Utils.trimToSmall(tx.txid, 10)}</RegText>}
              {expandTxid && !!tx.txid && (
                <>
                  <RegText>{tx.txid}</RegText>
                  {server.chain_name !== 'regtest' && (
                    <TouchableOpacity onPress={() => handleTxIDClick(tx.txid)}>
                      <Text style={{ color: colors.text, textDecorationLine: 'underline', margin: 15 }}>
                        {translate('history.viewexplorer') as string}
                      </Text>
                    </TouchableOpacity>
                  )}
                </>
              )}
            </TouchableOpacity>
          </View>

          {!!tx.fee && tx.fee > 0 && (
            <View style={{ display: 'flex', marginTop: 10 }}>
              <FadeText>{translate('history.txfee') as string}</FadeText>
              <View style={{ display: 'flex', flexDirection: 'row', justifyContent: 'space-between' }}>
                <ZecAmount
                  amtZec={tx.fee}
                  size={18}
                  currencyName={info.currencyName ? info.currencyName : ''}
                  privacy={privacy}
                />
              </View>
            </View>
          )}

          {tx.txDetails.map((txd: TxDetailType) => {
            // 30 characters per line
            const numLines = txd.address ? (txd.address.length < 40 ? 2 : txd.address.length / 30) : 0;

            return (
              <View
                key={txd.address + txd.pool}
                style={{
                  display: 'flex',
                  marginTop: tx.txDetails.length > 1 ? 10 : 0,
                  paddingBottom: 15,
                  borderTopColor: colors.text,
                  borderTopWidth: tx.txDetails.length > 1 ? 1 : 0,
                }}>
                {!!txd.address && (
                  <View style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', marginTop: 10 }}>
                    <FadeText>{translate('history.address') as string}</FadeText>
                    <TouchableOpacity
                      onPress={() => {
                        if (txd.address) {
                          Clipboard.setString(txd.address);
                          addLastSnackbar({
                            message: translate('history.addresscopied') as string,
                            type: 'Primary',
                            duration: 'short',
                          });
                          setExpandAddress(true);
                        }
                      }}>
                      <View style={{ display: 'flex', flexDirection: 'column', flexWrap: 'wrap' }}>
                        {!txd.address && <RegText>{'Unknown'}</RegText>}
                        {!expandAddress && !!txd.address && <RegText>{Utils.trimToSmall(txd.address, 10)}</RegText>}
                        {expandAddress &&
                          !!txd.address &&
                          Utils.splitStringIntoChunks(txd.address, Number(numLines.toFixed(0))).map(
                            (c: string, idx: number) => <RegText key={idx}>{c}</RegText>,
                          )}
                      </View>
                    </TouchableOpacity>
                  </View>
                )}

                {!!txd.pool && (
                  <View style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', marginTop: 10 }}>
                    <FadeText>{translate('history.pool') as string}</FadeText>
                    <RegText>{txd.pool}</RegText>
                  </View>
                )}

                <View style={{ marginTop: 10 }}>
                  <FadeText>{translate('history.amount') as string}</FadeText>
                  <View style={{ display: 'flex', flexDirection: 'row', justifyContent: 'space-between' }}>
                    <ZecAmount
                      amtZec={txd.amount}
                      size={18}
                      currencyName={info.currencyName ? info.currencyName : ''}
                      privacy={privacy}
                    />
                    {!!tx.zec_price && (
                      <CurrencyAmount price={tx.zec_price} amtZec={txd.amount} currency={currency} privacy={privacy} />
                    )}
                  </View>
                </View>

                {txd.memos && (
                  <View style={{ marginTop: 10 }}>
                    <FadeText>{translate('history.memo') as string}</FadeText>
                    <TouchableOpacity
                      onPress={() => {
                        if (txd.memos) {
                          Clipboard.setString(txd.memos.join(' '));
                          addLastSnackbar({
                            message: translate('history.memocopied') as string,
                            type: 'Primary',
                            duration: 'short',
                          });
                        }
                      }}>
                      <RegText>{txd.memos.join(' ')}</RegText>
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            );
          })}
        </View>
      </ScrollView>
      <View style={{ flexGrow: 1, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', margin: 10 }}>
        <Button type="Secondary" title={translate('close') as string} onPress={closeModal} />
      </View>
    </SafeAreaView>
  );
};

export default TxDetail;
