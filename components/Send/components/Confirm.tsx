/* eslint-disable react-native/no-inline-styles */
import React, { useContext } from 'react';
import { View, ScrollView, SafeAreaView } from 'react-native';

import FadeText from '../../Components/FadeText';
import BoldText from '../../Components/BoldText';
import RegText from '../../Components/RegText';
import ZecAmount from '../../Components/ZecAmount';
import CurrencyAmount from '../../Components/CurrencyAmount';
import Button from '../../Components/Button';
import { useTheme } from '@react-navigation/native';
import Utils from '../../../app/utils';
import { ContextAppLoaded } from '../../../app/context';
import Header from '../../Header';

type ConfirmProps = {
  defaultFee: number;
  closeModal: () => void;
  confirmSend: () => void;
  sendAllAmount: boolean;
};
const Confirm: React.FunctionComponent<ConfirmProps> = ({ closeModal, confirmSend, defaultFee, sendAllAmount }) => {
  const context = useContext(ContextAppLoaded);
  const { sendPageState, info, translate, currency, zecPrice, uaAddress, privacy } = context;
  const { colors } = useTheme();

  const sendingTotal = Number(sendPageState.toaddr.amount) + defaultFee;

  //console.log(sendPageState, price, defaultFee);

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
        title={translate('send.confirm-title') as string}
        noBalance={true}
        noSyncingStatus={true}
        noDrawMenu={true}
        noPrivacy={true}
      />
      <ScrollView
        showsVerticalScrollIndicator={true}
        persistentScrollbar={true}
        indicatorStyle={'white'}
        testID="send.confirm.scrollView"
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
          <BoldText style={{ textAlign: 'center', textTransform: 'capitalize' }}>
            {translate('send.sending-title') as string}
          </BoldText>

          <ZecAmount
            currencyName={info.currencyName ? info.currencyName : ''}
            amtZec={sendingTotal}
            privacy={privacy}
            size={36}
            smallPrefix={true}
          />
          <CurrencyAmount amtZec={sendingTotal} price={zecPrice.zecPrice} currency={currency} privacy={privacy} />
        </View>
        {[sendPageState.toaddr].map(to => {
          // 30 characters per line
          const numLines = to.to.length < 40 ? 2 : to.to.length / 30;
          return (
            <View key={to.id} style={{ margin: 10 }}>
              <FadeText>{translate('send.to') as string}</FadeText>
              {Utils.splitStringIntoChunks(to.to, Number(numLines.toFixed(0))).map((c: string, idx: number) => (
                <RegText key={idx}>{c}</RegText>
              ))}

              <FadeText style={{ marginTop: 10 }}>{translate('send.confirm-amount') as string}</FadeText>
              <View
                style={{
                  display: 'flex',
                  flexDirection: 'row',
                  justifyContent: 'space-between',
                }}>
                <ZecAmount
                  currencyName={info.currencyName ? info.currencyName : ''}
                  size={18}
                  amtZec={Number(to.amount)}
                  privacy={privacy}
                />
                <CurrencyAmount
                  style={{ fontSize: 18 }}
                  amtZec={Number(to.amount)}
                  price={zecPrice.zecPrice}
                  currency={currency}
                  privacy={privacy}
                />
              </View>
              <FadeText style={{ marginTop: 10 }}>{translate('send.confirm-memo') as string}</FadeText>
              <RegText testID="send.confirm-memo">
                {`${to.memo || ''}${to.includeUAMemo ? '\nReply to: \n' + uaAddress : ''}`}
              </RegText>
            </View>
          );
        })}

        <View style={{ margin: 10, marginBottom: 30 }}>
          <FadeText>{translate('send.fee') as string}</FadeText>
          <View
            style={{
              display: 'flex',
              flexDirection: 'row',
              justifyContent: 'space-between',
            }}>
            <ZecAmount
              currencyName={info.currencyName ? info.currencyName : ''}
              size={18}
              amtZec={defaultFee}
              privacy={privacy}
            />
            <CurrencyAmount
              style={{ fontSize: 18 }}
              amtZec={defaultFee}
              price={zecPrice.zecPrice}
              currency={currency}
              privacy={privacy}
            />
          </View>
        </View>
      </ScrollView>

      <View
        style={{
          flexGrow: 1,
          display: 'flex',
          alignItems: 'center',
          marginTop: 10,
        }}>
        <View style={{ display: 'flex', flexDirection: 'row', justifyContent: 'center' }}>
          <Button
            type="Primary"
            title={sendAllAmount ? (translate('send.confirm-button-all') as string) : (translate('confirm') as string)}
            onPress={confirmSend}
          />
          <Button
            type="Secondary"
            style={{ marginLeft: 20 }}
            title={translate('cancel') as string}
            onPress={closeModal}
          />
        </View>
      </View>
    </SafeAreaView>
  );
};

export default Confirm;
