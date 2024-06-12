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
import simpleBiometrics from '../../../app/simpleBiometrics';
import moment from 'moment';
import 'moment/locale/es';
import 'moment/locale/pt';
import 'moment/locale/ru';

import { ThemeType } from '../../../app/types';
import RPC from '../../../app/rpc';
import Utils from '../../../app/utils';
import { ButtonTypeEnum, CommandEnum, PrivacyLevelFromEnum, GlobalConst } from '../../../app/AppState';
import { CurrencyEnum } from '../../../app/AppState';
import { RPCAdressKindEnum } from '../../../app/rpc/enums/RPCAddressKindEnum';
import { RPCReceiversEnum } from '../../../app/rpc/enums/RPCReceiversEnum';
import { RPCParseStatusEnum } from '../../../app/rpc/enums/RPCParseStatusEnum';

type ConfirmProps = {
  calculatedFee: number;
  donationAmount: number;
  closeModal: () => void;
  openModal: () => void;
  confirmSend: () => void;
  //sendAllAmount: boolean;
  calculateFeeWithPropose: (amount: string, address: string, memo: string, includeUAMemo: boolean) => Promise<void>;
};
const Confirm: React.FunctionComponent<ConfirmProps> = ({
  closeModal,
  confirmSend,
  calculatedFee,
  donationAmount,
  //sendAllAmount,
  openModal,
  calculateFeeWithPropose,
}) => {
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
    security,
    language,
  } = context;
  const { colors } = useTheme() as unknown as ThemeType;
  moment.locale(language);

  const [privacyLevel, setPrivacyLevel] = useState<string>('-');
  const [sendingTotal, setSendingTotal] = useState<number>(0);

  const memoTotal: string = `${sendPageState.toaddr.memo || ''}${
    sendPageState.toaddr.includeUAMemo ? '\nReply to: \n' + uaAddress : ''
  }`;

  const getPrivacyLevel = useCallback(async () => {
    if (!netInfo.isConnected) {
      addLastSnackbar({ message: translate('loadedapp.connection-error') as string });
      return '-';
    }

    let from: PrivacyLevelFromEnum = PrivacyLevelFromEnum.nonePrivacyLevel;
    // amount + fee
    if (
      Utils.parseStringLocaleToNumberFloat(sendPageState.toaddr.amount) + calculatedFee <=
      totalBalance.spendableOrchard
    ) {
      from = PrivacyLevelFromEnum.orchardPrivacyLevel;
    } else if (
      totalBalance.spendableOrchard > 0 &&
      Utils.parseStringLocaleToNumberFloat(sendPageState.toaddr.amount) + calculatedFee <=
        totalBalance.spendableOrchard + totalBalance.spendablePrivate
    ) {
      from = PrivacyLevelFromEnum.orchardAndSaplingPrivacyLevel;
    } else if (
      Utils.parseStringLocaleToNumberFloat(sendPageState.toaddr.amount) + calculatedFee <=
      totalBalance.spendablePrivate
    ) {
      from = PrivacyLevelFromEnum.saplingPrivacyLevel;
    }

    if (from === PrivacyLevelFromEnum.nonePrivacyLevel) {
      return '-';
    }

    const result: string = await RPCModule.execute(CommandEnum.parse_address, sendPageState.toaddr.to);
    if (result) {
      if (result.toLowerCase().startsWith(GlobalConst.error) || result.toLowerCase() === 'null') {
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

    //console.log('parse-address', address, resultJSON.status === RPCParseStatusEnum.success);

    if (resultJSON.status !== RPCParseStatusEnum.successParse || resultJSON.chain_name !== server.chain_name) {
      return '-';
    }

    //console.log(from, result, resultJSON);

    // Private -> orchard to orchard (UA with orchard receiver)
    if (
      from === PrivacyLevelFromEnum.orchardPrivacyLevel &&
      resultJSON.address_kind === RPCAdressKindEnum.unifiedAddressKind &&
      resultJSON.receivers_available?.includes(RPCReceiversEnum.orchardRPCReceiver)
    ) {
      return translate('send.private') as string;
    }

    // Private -> sapling to sapling (ZA or UA with sapling receiver and NO orchard receiver)
    if (
      from === PrivacyLevelFromEnum.saplingPrivacyLevel &&
      (resultJSON.address_kind === RPCAdressKindEnum.saplingAddressKind ||
        (resultJSON.address_kind === RPCAdressKindEnum.unifiedAddressKind &&
          resultJSON.receivers_available?.includes(RPCReceiversEnum.saplingRPCReceiver) &&
          !resultJSON.receivers_available?.includes(RPCReceiversEnum.orchardRPCReceiver)))
    ) {
      return translate('send.private') as string;
    }

    // Amount Revealed -> orchard to sapling (ZA or UA with sapling receiver)
    if (
      from === PrivacyLevelFromEnum.orchardPrivacyLevel &&
      (resultJSON.address_kind === RPCAdressKindEnum.saplingAddressKind ||
        (resultJSON.address_kind === RPCAdressKindEnum.unifiedAddressKind &&
          resultJSON.receivers_available?.includes(RPCReceiversEnum.saplingRPCReceiver)))
    ) {
      return translate('send.amountrevealed') as string;
    }

    // Amount Revealed -> sapling to orchard (UA with orchard receiver)
    if (
      from === PrivacyLevelFromEnum.saplingPrivacyLevel &&
      resultJSON.address_kind === RPCAdressKindEnum.unifiedAddressKind &&
      resultJSON.receivers_available?.includes(RPCReceiversEnum.orchardRPCReceiver)
    ) {
      return translate('send.amountrevealed') as string;
    }

    // Amount Revealed -> sapling+orchard to orchard or sapling (UA with orchard receiver or ZA or
    // UA with sapling receiver)
    if (
      from === PrivacyLevelFromEnum.orchardAndSaplingPrivacyLevel &&
      (resultJSON.address_kind === RPCAdressKindEnum.saplingAddressKind ||
        (resultJSON.address_kind === RPCAdressKindEnum.unifiedAddressKind &&
          (resultJSON.receivers_available?.includes(RPCReceiversEnum.orchardRPCReceiver) ||
            resultJSON.receivers_available?.includes(RPCReceiversEnum.saplingRPCReceiver))))
    ) {
      return translate('send.amountrevealed') as string;
    }

    // Deshielded -> orchard or sapling or orchard+sapling to transparent
    if (
      (from === PrivacyLevelFromEnum.orchardPrivacyLevel ||
        from === PrivacyLevelFromEnum.saplingPrivacyLevel ||
        from === PrivacyLevelFromEnum.orchardAndSaplingPrivacyLevel) &&
      resultJSON.address_kind === RPCAdressKindEnum.transparentAddressKind
    ) {
      return translate('send.deshielded') as string;
    }

    // whatever else
    return '-';
  }, [
    addLastSnackbar,
    calculatedFee,
    netInfo.isConnected,
    sendPageState.toaddr.amount,
    sendPageState.toaddr.to,
    server.chain_name,
    totalBalance.spendableOrchard,
    totalBalance.spendablePrivate,
    translate,
  ]);

  const confirmSendBiometrics = async () => {
    const resultBio = security.sendConfirm ? await simpleBiometrics({ translate: translate }) : true;
    // can be:
    // - true      -> the user do pass the authentication
    // - false     -> the user do NOT pass the authentication
    // - undefined -> no biometric authentication available -> Passcode.
    //console.log('BIOMETRIC --------> ', resultBio);
    if (resultBio === false) {
      // snack with Error
      addLastSnackbar({ message: translate('biometrics-error') as string });
    } else {
      confirmSend();
    }
  };

  useEffect(() => {
    const sendingTot =
      Utils.parseStringLocaleToNumberFloat(sendPageState.toaddr.amount) + calculatedFee + donationAmount;
    setSendingTotal(sendingTot);
  }, [calculatedFee, donationAmount, sendPageState.toaddr.amount]);

  useEffect(() => {
    (async () => {
      setPrivacyLevel(await getPrivacyLevel());
    })();
  }, [getPrivacyLevel]);

  // the App is about to send - activate the interrupt syncing flag
  useEffect(() => {
    (async () => await RPC.rpc_setInterruptSyncAfterBatch(GlobalConst.true))();
  }, []);

  useEffect(() => {
    calculateFeeWithPropose(
      sendPageState.toaddr.amount,
      sendPageState.toaddr.to,
      sendPageState.toaddr.memo,
      sendPageState.toaddr.includeUAMemo,
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  //console.log(sendPageState, calculatedFee, Utils.parseStringLocaleToNumberFloat(sendPageState.toaddr.amount));

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
            currencyName={info.currencyName}
            amtZec={sendingTotal}
            privacy={false}
            size={36}
            smallPrefix={true}
          />
          <CurrencyAmount amtZec={sendingTotal} price={zecPrice.zecPrice} currency={currency} privacy={false} />
        </View>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
          <View style={{ marginHorizontal: 10 }}>
            <FadeText style={{ marginTop: 10 }}>{translate('send.confirm-privacy-level') as string}</FadeText>
            <RegText>{privacyLevel}</RegText>
          </View>
          <View style={{ margin: 10 }}>
            <FadeText>{translate('send.fee') as string}</FadeText>
            <ZecAmount currencyName={info.currencyName} size={18} amtZec={calculatedFee} privacy={privacy} />
          </View>
          {currency === CurrencyEnum.USDCurrency && (
            <View style={{ margin: 10, alignItems: 'flex-end' }}>
              <FadeText style={{ opacity: 0 }}>{translate('send.fee') as string}</FadeText>
              <CurrencyAmount
                style={{ fontSize: 18 }}
                amtZec={calculatedFee}
                price={zecPrice.zecPrice}
                currency={currency}
                privacy={privacy}
              />
            </View>
          )}
        </View>

        {[sendPageState.toaddr].map(to => {
          return (
            <View key={to.id} style={{ margin: 10 }}>
              <FadeText>{translate('send.to') as string}</FadeText>
              <AddressItem address={to.to} withIcon={true} closeModal={closeModal} openModal={openModal} />

              {donationAmount > 0 && (
                <>
                  <FadeText style={{ marginTop: 10 }}>{translate('send.confirm-donation') as string}</FadeText>
                  <View
                    style={{
                      display: 'flex',
                      flexDirection: 'row',
                      justifyContent: 'space-between',
                    }}>
                    <ZecAmount currencyName={info.currencyName} size={18} amtZec={donationAmount} privacy={privacy} />
                    <CurrencyAmount
                      style={{ fontSize: 18 }}
                      amtZec={donationAmount}
                      price={zecPrice.zecPrice}
                      currency={currency}
                      privacy={privacy}
                    />
                  </View>
                </>
              )}

              <FadeText style={{ marginTop: 10 }}>{translate('send.confirm-amount') as string}</FadeText>
              <View
                style={{
                  display: 'flex',
                  flexDirection: 'row',
                  justifyContent: 'space-between',
                }}>
                <ZecAmount
                  currencyName={info.currencyName}
                  size={18}
                  amtZec={Utils.parseStringLocaleToNumberFloat(to.amount)}
                  privacy={privacy}
                />
                <CurrencyAmount
                  style={{ fontSize: 18 }}
                  amtZec={Utils.parseStringLocaleToNumberFloat(to.amount)}
                  price={zecPrice.zecPrice}
                  currency={currency}
                  privacy={privacy}
                />
              </View>
              {!!to.memo && (
                <>
                  <FadeText style={{ marginTop: 10 }}>{translate('send.confirm-memo') as string}</FadeText>
                  <RegText testID="send.confirm-memo">{memoTotal}</RegText>
                </>
              )}
            </View>
          );
        })}
        <View style={{ marginBottom: 30 }} />
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
            type={ButtonTypeEnum.Primary}
            title={
              /*sendAllAmount ? (translate('send.confirm-button-all') as string) :*/ translate('confirm') as string
            }
            onPress={() => confirmSendBiometrics()}
          />
          <Button
            type={ButtonTypeEnum.Secondary}
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
