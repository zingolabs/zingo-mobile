/* eslint-disable react-native/no-inline-styles */
import React from 'react';
import { View, ScrollView, SafeAreaView } from 'react-native';
import { FadeText, BoldText, RegText, ZecAmount, UsdAmount } from '../../Components';
import Button from '../../Button';
import { SendPageState } from '../../../app/AppState';
import { useTheme } from '@react-navigation/native';
import Utils from '../../../app/utils';

type ConfirmModalProps = {
  sendPageState: SendPageState;
  defaultFee: number;
  price?: number | null;
  closeModal: () => void;
  confirmSend: () => void;
  currencyName: string;
};
const ConfirmModal: React.FunctionComponent<ConfirmModalProps> = ({
  closeModal,
  confirmSend,
  sendPageState,
  price,
  defaultFee,
  currencyName,
}) => {
  const { colors } = useTheme();

  const sendingTotal =
    sendPageState.toaddrs.reduce((s, t) => s + Utils.parseLocaleFloat(t.amount || '0'), 0.0) + defaultFee;

  return (
    <SafeAreaView
      style={{
        display: 'flex',
        justifyContent: 'flex-start',
        alignItems: 'stretch',
        height: '100%',
        backgroundColor: colors.background,
      }}>
      <ScrollView contentContainerStyle={{ display: 'flex', justifyContent: 'flex-start' }}>
        <View style={{ display: 'flex', alignItems: 'center', padding: 10, backgroundColor: colors.card }}>
          <BoldText style={{ textAlign: 'center', margin: 10 }}>Confirm Transaction</BoldText>
        </View>

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
          <BoldText style={{ textAlign: 'center' }}>Sending</BoldText>

          <ZecAmount currencyName={currencyName} amtZec={sendingTotal} />
          <UsdAmount amtZec={sendingTotal} price={price} />
        </View>
        {sendPageState.toaddrs.map(to => {
          return (
            <View key={to.id} style={{ margin: 10 }}>
              <FadeText>To</FadeText>
              <RegText>{Utils.splitStringIntoChunks(to.to, 8).join(' ')}</RegText>

              <FadeText style={{ marginTop: 10 }}>Amount</FadeText>
              <View
                style={{
                  display: 'flex',
                  flexDirection: 'row',
                  justifyContent: 'space-between',
                  alignItems: 'baseline',
                  marginTop: 5,
                }}>
                <ZecAmount currencyName={currencyName} size={18} amtZec={Utils.parseLocaleFloat(to.amount)} />
                <UsdAmount style={{ fontSize: 18 }} amtZec={Utils.parseLocaleFloat(to.amount)} price={price} />
              </View>
              <RegText>{to.memo || ''}</RegText>
            </View>
          );
        })}

        <View style={{ margin: 10 }}>
          <FadeText>Fee</FadeText>
          <View
            style={{ display: 'flex', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' }}>
            <ZecAmount currencyName={currencyName} size={18} amtZec={defaultFee} />
            <UsdAmount style={{ fontSize: 18 }} amtZec={defaultFee} price={price} />
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
          <Button type="Primary" title={'Confirm'} onPress={confirmSend} />
          <Button type="Secondary" style={{ marginLeft: 20 }} title={'Cancel'} onPress={closeModal} />
        </View>
      </View>
    </SafeAreaView>
  );
};

export default ConfirmModal;
