/* eslint-disable react-native/no-inline-styles */
import React, { useCallback, useContext, useEffect, useState } from 'react';
import { View, ScrollView, SafeAreaView } from 'react-native';

import FadeText from '../../Components/FadeText';
import BoldText from '../../Components/BoldText';
import RegText from '../../Components/RegText';
import ZecAmount from '../../Components/ZecAmount';
import CurrencyAmount from '../../Components/CurrencyAmount';
import Button from '../../Components/Button';
import { useTheme } from '@react-navigation/native';
import { ContextAppLoaded } from '../../../app/context';
import Header from '../../Header';
import { RPCParseAddressType } from '../../../app/rpc/types/RPCParseAddressType';
import RPCModule from '../../../app/RPCModule';
import AddressItem from '../../Components/AddressItem';

type ConfirmProps = {
  defaultFee: number;
  closeModal: () => void;
  confirmSend: () => void;
  sendAllAmount: boolean;
};
const Confirm: React.FunctionComponent<ConfirmProps> = ({ closeModal, confirmSend, defaultFee, sendAllAmount }) => {
  const context = useContext(ContextAppLoaded);
  const {
    sendPageState,
    info,
    translate,
    currency,
    zecPrice,
    uaAddress,
    privacy,
    totalBalance,
    netInfo,
    addLastSnackbar,
    server,
  } = context;
  const { colors } = useTheme();
  const [privacyLevel, setPrivacyLevel] = useState('-');

  const sendingTotal = Number(sendPageState.toaddr.amount) + defaultFee;

  const getPrivacyLevel = useCallback(async () => {
    if (!netInfo.isConnected) {
      addLastSnackbar({ message: translate('loadedapp.connection-error') as string, type: 'Primary' });
      return '-';
    }

    let from: 'orchard' | 'orchard+sapling' | 'sapling' | '' = '';
    // amount + fee
    if (Number(sendPageState.toaddr.amount) + defaultFee <= totalBalance.spendableOrchard) {
      from = 'orchard';
    } else if (
      totalBalance.spendableOrchard > 0 &&
      Number(sendPageState.toaddr.amount) + defaultFee <= totalBalance.spendableOrchard + totalBalance.spendablePrivate
    ) {
      from = 'orchard+sapling';
    } else if (Number(sendPageState.toaddr.amount) + defaultFee <= totalBalance.spendablePrivate) {
      from = 'sapling';
    }

    if (from === '') {
      return '-';
    }

    const result: string = await RPCModule.execute('parse_address', sendPageState.toaddr.to);
    if (result) {
      if (result.toLowerCase().startsWith('error') || result.toLowerCase() === 'null') {
        return '-';
      }
    } else {
      return '-';
    }
    let resultJSON = {} as RPCParseAddressType;
    try {
      resultJSON = await JSON.parse(result);
    } catch (e) {
      return '-';
    }

    //console.log('parse-address', address, resultJSON.status === 'success');

    if (resultJSON.status !== 'success' || resultJSON.chain_name !== server.chain_name) {
      return '-';
    }

    //console.log(from, result, resultJSON);

    // Private -> orchard to orchard (UA with orchard receiver)
    if (
      from === 'orchard' &&
      resultJSON.address_kind === 'unified' &&
      resultJSON.receivers_available?.includes('orchard')
    ) {
      return translate('send.private') as string;
    }

    // Private -> sapling to sapling (ZA or UA with sapling receiver and NO orchard receiver)
    if (
      from === 'sapling' &&
      (resultJSON.address_kind === 'sapling' ||
        (resultJSON.address_kind === 'unified' &&
          resultJSON.receivers_available?.includes('sapling') &&
          !resultJSON.receivers_available?.includes('orchard')))
    ) {
      return translate('send.private') as string;
    }

    // Amount Revealed -> orchard to sapling (ZA or UA with sapling receiver)
    if (
      from === 'orchard' &&
      (resultJSON.address_kind === 'sapling' ||
        (resultJSON.address_kind === 'unified' && resultJSON.receivers_available?.includes('sapling')))
    ) {
      return translate('send.amountrevealed') as string;
    }

    // Amount Revealed -> sapling to orchard (UA with orchard receiver)
    if (
      from === 'sapling' &&
      resultJSON.address_kind === 'unified' &&
      resultJSON.receivers_available?.includes('orchard')
    ) {
      return translate('send.amountrevealed') as string;
    }

    // Amount Revealed -> sapling+orchard to orchard or sapling (UA with orchard receiver or ZA or
    // UA with sapling receiver)
    if (
      from === 'orchard+sapling' &&
      (resultJSON.address_kind === 'sapling' ||
        (resultJSON.address_kind === 'unified' &&
          (resultJSON.receivers_available?.includes('orchard') || resultJSON.receivers_available?.includes('sapling'))))
    ) {
      return translate('send.amountrevealed') as string;
    }

    // Deshielded -> orchard or sapling or orchard+sapling to transparent
    if (
      (from === 'orchard' || from === 'sapling' || from === 'orchard+sapling') &&
      resultJSON.address_kind === 'transparent'
    ) {
      return translate('send.deshielded') as string;
    }

    // whatever else
    return '-';
  }, [
    addLastSnackbar,
    defaultFee,
    netInfo.isConnected,
    sendPageState.toaddr.amount,
    sendPageState.toaddr.to,
    server.chain_name,
    totalBalance.spendableOrchard,
    totalBalance.spendablePrivate,
    translate,
  ]);

  useEffect(() => {
    (async () => {
      setPrivacyLevel(await getPrivacyLevel());
    })();
  }, [getPrivacyLevel]);

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
        testID="send.confirm.scroll-view"
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
        <View style={{ marginHorizontal: 10 }}>
          <FadeText style={{ marginTop: 10 }}>{translate('send.confirm-privacy-level') as string}</FadeText>
          <RegText>{privacyLevel}</RegText>
        </View>
        {[sendPageState.toaddr].map(to => {
          return (
            <View key={to.id} style={{ margin: 10 }}>
              <FadeText>{translate('send.to') as string}</FadeText>
              <AddressItem address={to.to} />

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
              {!!to.memo && (
                <>
                  <FadeText style={{ marginTop: 10 }}>{translate('send.confirm-memo') as string}</FadeText>
                  <RegText testID="send.confirm-memo">
                    {`${to.memo || ''}${to.includeUAMemo ? '\nReply to: \n' + uaAddress : ''}`}
                  </RegText>
                </>
              )}
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
